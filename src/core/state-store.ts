import { 
  ProjectState, 
  Point2D, 
  Wall, 
  Opening, 
  OpeningType, 
  RoomPolygon, 
  FurnitureItem, 
  ActiveTool, 
  SelectionState, 
  ProjectSettings,
  StructureItem,
  StructureType,
  BlueprintUnderlay
} from './types';
import { detectRooms } from '../math/cycle-detector';
import { CommandHistory } from './command-history';
import { dist, segmentSegmentIntersection, calculateArcFromSagitta } from '../math/vector2d';
import { calculateAreaM2, calculatePerimeterM } from '../math/polygon-area';

export type StateListener = (state: ProjectState) => void;

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export class StateStore {
  private state: ProjectState;
  private listeners: Set<StateListener> = new Set();
  private history: CommandHistory = new CommandHistory(40);
  private isBatching: boolean = false;

  constructor() {
    this.state = this.createDefaultState();
    this.saveSnapshot('Initial state');
  }

  private createDefaultState(): ProjectState {
    return {
      version: '1.0.0',
      id: generateId('proj'),
      name: 'Architectural Design 01',
      settings: {
        wallHeight: 2800,
        wallThickness: 240, // 240mm standard BIM exterior/interior wall
        slabThickness: 150,
        gridSizeMm: 100,
        snapAngleDeg: 45,
        measurementUnit: 'mm',
        floorOpacity: 1.0,
        autoCutawayWall: true
      },
      nodes: {},
      walls: {},
      rooms: {},
      structures: {},
      furniture: {},
      blueprintUnderlay: null,
      selection: { type: 'none', id: null },
      activeTool: 'select',
      viewMode: '2d_main',
      pipVisible: true
    };
  }

  public getState(): ProjectState {
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    if (this.isBatching) return;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private saveSnapshot(description: string) {
    const json = JSON.stringify(this.state);
    this.history.pushSnapshot(description, json);
  }

  public setProjectName(name: string) {
    this.state.name = name;
    this.saveSnapshot(`Rename project to ${name}`);
    this.emit();
  }

  public loadProject(newState: Partial<ProjectState>) {
    this.state = {
      ...this.createDefaultState(),
      ...newState,
      settings: { ...this.state.settings, ...(newState.settings || {}) },
      structures: newState.structures || {},
      blueprintUnderlay: newState.blueprintUnderlay || null
    };
    this.recalculateRooms(false);
    this.saveSnapshot('Load project');
    this.emit();
  }

  public undo(): boolean {
    const restoredJson = this.history.undo(JSON.stringify(this.state));
    if (restoredJson) {
      this.state = JSON.parse(restoredJson);
      this.recalculateRooms(false);
      this.emit();
      return true;
    }
    return false;
  }

  public redo(): boolean {
    const restoredJson = this.history.redo();
    if (restoredJson) {
      this.state = JSON.parse(restoredJson);
      this.recalculateRooms(false);
      this.emit();
      return true;
    }
    return false;
  }

  public canUndo(): boolean {
    return this.history.canUndo();
  }

  public canRedo(): boolean {
    return this.history.canRedo();
  }

  // --- Graph Node Operations ---

  public getOrCreateNode(x: number, y: number, snapThresholdMm: number = 150): Point2D {
    for (const node of Object.values(this.state.nodes)) {
      if (dist({ x, y }, node) <= snapThresholdMm) {
        return node;
      }
    }

    const id = generateId('node');
    const newNode: Point2D = { id, x, y };
    this.state.nodes[id] = newNode;
    return newNode;
  }

  public moveNode(nodeId: string, x: number, y: number, recordHistory: boolean = false) {
    const node = this.state.nodes[nodeId];
    if (!node) return;

    node.x = x;
    node.y = y;

    // Smoothly update attached rooms in-place without churning room IDs or flickering
    for (const r of Object.values(this.state.rooms)) {
      if (r.nodeIds.includes(nodeId)) {
        r.points = r.nodeIds.map(nid => ({ x: this.state.nodes[nid].x, y: this.state.nodes[nid].y }));
        r.areaSquareMeters = calculateAreaM2(r.points);
        r.perimeterMeters = calculatePerimeterM(r.points);
      }
    }

    if (recordHistory) {
      this.recalculateRooms(false);
      this.saveSnapshot(`Move node ${nodeId}`);
    }
    this.emit();
  }

  public updateNode(nodeId: string, patch: Partial<Point2D>) {
    const node = this.state.nodes[nodeId];
    if (!node) return;
    Object.assign(node, patch);
    this.saveSnapshot(`Update corner node ${nodeId}`);
    this.emit();
  }

  public deleteNode(nodeId: string) {
    if (!this.state.nodes[nodeId]) return;
    const connectedWallIds = Object.values(this.state.walls)
      .filter(w => w.startNodeId === nodeId || w.endNodeId === nodeId)
      .map(w => w.id);
    for (const wid of connectedWallIds) {
      delete this.state.walls[wid];
    }
    delete this.state.nodes[nodeId];
    this.state.selection = { type: 'none', id: null };
    this.recalculateRooms();
    this.saveSnapshot(`Delete corner node ${nodeId}`);
    this.emit();
  }

  // --- Category 1: Blueprint Underlay & Scale Calibration ---

  public setBlueprintUnderlay(underlay: BlueprintUnderlay | null) {
    this.state.blueprintUnderlay = underlay;
    if (underlay) {
      // Automatically lowers bim.floorOpacity to 45% so traced room floors do not obscure blueprint
      this.state.settings.floorOpacity = 0.45;
    } else {
      this.state.settings.floorOpacity = 1.0;
    }
    this.saveSnapshot(underlay ? 'Import 2D Blueprint Underlay' : 'Clear Blueprint Underlay');
    this.emit();
  }

  public updateBlueprintUnderlay(patch: Partial<BlueprintUnderlay>) {
    if (!this.state.blueprintUnderlay) return;
    Object.assign(this.state.blueprintUnderlay, patch);
    this.emit();
  }

  public calibrateScale(inputRealLengthMm: number) {
    const bp = this.state.blueprintUnderlay;
    if (!bp || !bp.calibrationP1 || !bp.calibrationP2) return;

    const pixelDist = dist(bp.calibrationP1, bp.calibrationP2);
    if (pixelDist > 1) {
      bp.mmPerPixel = inputRealLengthMm / pixelDist;
      bp.locked = true;
      bp.calibrationState = 'none';
      this.state.activeTool = 'rectangle_wall';
      this.saveSnapshot(`Calibrate blueprint scale: 1px = ${bp.mmPerPixel.toFixed(2)}mm`);
      this.emit();
    }
  }

  // --- Category 2: Wall & Room Operations ---

  public addWall(
    startNodeId: string, 
    endNodeId: string, 
    thickness?: number, 
    height?: number,
    extraProps?: Partial<Wall>
  ): Wall | null {
    if (startNodeId === endNodeId) return null;

    const pA = this.state.nodes[startNodeId];
    const pB = this.state.nodes[endNodeId];
    if (!pA || !pB) return null;
    if (dist(pA, pB) < 1) return null; // 0mm wall click rejection

    // Check if wall between these two nodes already exists
    for (const w of Object.values(this.state.walls)) {
      if (
        (w.startNodeId === startNodeId && w.endNodeId === endNodeId) ||
        (w.startNodeId === endNodeId && w.endNodeId === startNodeId)
      ) {
        return w; // Wall already exists
      }
    }

    // AUTO-SPLIT INTERSECTION RULE:
    // If the new wall crosses an existing wall segment, split the existing wall and new wall
    if (pA && pB && !extraProps?.isCurved) {
      for (const existingWall of Object.values(this.state.walls)) {
        if (existingWall.id === startNodeId || existingWall.id === endNodeId) continue;
        if (existingWall.startNodeId === startNodeId || existingWall.startNodeId === endNodeId) continue;
        if (existingWall.endNodeId === startNodeId || existingWall.endNodeId === endNodeId) continue;

        const pC = this.state.nodes[existingWall.startNodeId];
        const pD = this.state.nodes[existingWall.endNodeId];
        if (!pC || !pD) continue;

        const isect = segmentSegmentIntersection(pA, pB, pC, pD);
        if (isect) {
          const splitNode = this.getOrCreateNode(Math.round(isect.point.x), Math.round(isect.point.y), 30);
          
          // Split existing wall into two walls
          const oldOpenings = [...existingWall.openings];
          const distCD = dist(pC, pD);
          const distCtoSplit = dist(pC, splitNode);

          delete this.state.walls[existingWall.id];

          const wallC1 = this.addWall(pC.id, splitNode.id, existingWall.thickness, existingWall.height, {
            exteriorMaterial: existingWall.exteriorMaterial,
            interiorMaterial: existingWall.interiorMaterial
          });
          const wallC2 = this.addWall(splitNode.id, pD.id, existingWall.thickness, existingWall.height, {
            exteriorMaterial: existingWall.exteriorMaterial,
            interiorMaterial: existingWall.interiorMaterial
          });

          // Re-assign openings relative to split nodes
          if (wallC1 && wallC2) {
            for (const op of oldOpenings) {
              if (op.offset <= distCtoSplit) {
                wallC1.openings.push({ ...op, wallId: wallC1.id });
              } else {
                wallC2.openings.push({ ...op, wallId: wallC2.id, offset: Math.max(0, op.offset - distCtoSplit) });
              }
            }
          }

          // Split new wall into two segments sharing splitNode
          const newW1 = this.addWall(startNodeId, splitNode.id, thickness, height, extraProps);
          const newW2 = this.addWall(splitNode.id, endNodeId, thickness, height, extraProps);
          return newW2 || newW1;
        }
      }
    }

    const id = generateId('wall');
    const wall: Wall = {
      id,
      startNodeId,
      endNodeId,
      thickness: Math.max(10, Math.abs(thickness ?? this.state.settings.wallThickness)),
      height: Math.max(100, Math.abs(height ?? this.state.settings.wallHeight)),
      openings: [],
      exteriorMaterial: 'granite_tile',
      interiorMaterial: 'white_plaster',
      ...extraProps
    };

    this.state.walls[id] = wall;
    if (!this.isBatching) {
      this.recalculateRooms(false);
      this.saveSnapshot(`Add wall`);
      this.emit();
    }
    return wall;
  }

  public addArcWall(
    startNodeId: string, 
    endNodeId: string, 
    sagitta: number, 
    thickness?: number, 
    height?: number
  ): Wall | null {
    const p1 = this.state.nodes[startNodeId];
    const p2 = this.state.nodes[endNodeId];
    if (!p1 || !p2) return null;

    const arcData = calculateArcFromSagitta(p1, p2, sagitta);
    return this.addWall(startNodeId, endNodeId, thickness, height, {
      isCurved: true,
      arcSagitta: sagitta,
      arcRadius: arcData.radius,
      arcCenter: arcData.center,
      arcStartAngle: arcData.startAngle,
      arcEndAngle: arcData.endAngle
    });
  }

  public addRectRoom(x: number, y: number, width: number, height: number, isExternal: boolean = false) {
    this.isBatching = true;
    const n1 = this.getOrCreateNode(x, y);
    const n2 = this.getOrCreateNode(x + width, y);
    const n3 = this.getOrCreateNode(x + width, y + height);
    const n4 = this.getOrCreateNode(x, y + height);

    const thick = isExternal ? 50 : this.state.settings.wallThickness;
    const hgt = isExternal ? 150 : this.state.settings.wallHeight;

    // Collinear Merge & Overlap Rule: addWall checks if segment already exists
    this.addWall(n1.id, n2.id, thick, hgt, { isExternalAreaBoundary: isExternal });
    this.addWall(n2.id, n3.id, thick, hgt, { isExternalAreaBoundary: isExternal });
    this.addWall(n3.id, n4.id, thick, hgt, { isExternalAreaBoundary: isExternal });
    this.addWall(n4.id, n1.id, thick, hgt, { isExternalAreaBoundary: isExternal });

    this.isBatching = false;
    this.recalculateRooms(false);
    this.saveSnapshot(isExternal ? 'Add external area' : 'Add rectangular room');
    this.emit();
  }

  public addExternalArea(points: { x: number; y: number }[]) {
    if (points.length < 3) return;
    this.isBatching = true;
    const nodeIds: string[] = [];
    for (const pt of points) {
      const node = this.getOrCreateNode(pt.x, pt.y);
      nodeIds.push(node.id);
    }
    for (let i = 0; i < nodeIds.length; i++) {
      const j = (i + 1) % nodeIds.length;
      this.addWall(nodeIds[i], nodeIds[j], 50, 150, { isExternalAreaBoundary: true });
    }
    this.isBatching = false;
    this.recalculateRooms(false);
    this.saveSnapshot('Add external balcony / patio area');
    this.emit();
  }

  public deleteWall(wallId: string) {
    const wall = this.state.walls[wallId];
    if (!wall) return;

    delete this.state.walls[wallId];

    const { startNodeId, endNodeId } = wall;
    this.cleanupOrphanNode(startNodeId);
    this.cleanupOrphanNode(endNodeId);

    if (this.state.selection.type === 'wall' && this.state.selection.id === wallId) {
      this.state.selection = { type: 'none', id: null };
    }

    this.recalculateRooms(false);
    this.saveSnapshot(`Delete wall`);
    this.emit();
  }

  private cleanupOrphanNode(nodeId: string) {
    for (const w of Object.values(this.state.walls)) {
      if (w.startNodeId === nodeId || w.endNodeId === nodeId) {
        return;
      }
    }
    delete this.state.nodes[nodeId];
  }

  public updateWall(wallId: string, patch: Partial<Wall>) {
    const wall = this.state.walls[wallId];
    if (!wall) return;

    if (patch.thickness !== undefined) {
      patch.thickness = Math.max(10, Math.abs(patch.thickness));
    }
    if (patch.height !== undefined) {
      patch.height = Math.max(100, Math.abs(patch.height));
    }

    Object.assign(wall, patch);
    this.saveSnapshot('Update wall');
    this.emit();
  }

  // --- Category 3: 1D Wall-Hosted Openings (Door, Window, Bay Window, Opening, Niche) ---

  public addOpening(
    wallId: string, 
    type: OpeningType, 
    offset: number, 
    width?: number, 
    height?: number, 
    sillHeight?: number,
    depth?: number,
    swingSide: 1 | -1 = 1,
    hingeSide: 'left' | 'right' = 'right',
    subType?: string
  ): Opening | null {
    const wall = this.state.walls[wallId];
    if (!wall) return null;

    let defaultWidth = 907;
    let defaultHeight = 2100;
    let defaultSill = 0;
    let finalDepth = depth;

    if (type.includes('double')) {
      defaultWidth = 1800;
    } else if (type === 'window' || type === 'sliding_window') {
      defaultWidth = 1800;
      defaultHeight = 1500;
      defaultSill = 900;
    } else if (type === 'floor_to_ceiling_window') {
      defaultWidth = 1800;
      defaultHeight = 2400;
      defaultSill = 100;
    } else if (type.includes('bay_window')) {
      defaultWidth = 2000;
      defaultHeight = 1600;
      defaultSill = 500;
      finalDepth = depth ?? 600;
    } else if (type === 'opening' || type === 'arched_opening') {
      defaultWidth = 1200;
      defaultHeight = 2100;
      defaultSill = 0;
    } else if (type === 'niche') {
      defaultWidth = 800;
      defaultHeight = 1000;
      defaultSill = 900;
      // Niche depth constraint: clamped to hostWall.thickness - 40mm
      const maxNicheDepth = Math.max(50, wall.thickness - 40);
      finalDepth = Math.min(depth ?? 150, maxNicheDepth);
    } else if (type === 'bay_window_sill') {
      defaultWidth = 1800;
      defaultHeight = 40;
      defaultSill = 500;
      finalDepth = 600;
    }

    const finalOffset = Math.max(0, Math.round(offset));
    const opening: Opening = {
      id: generateId('op'),
      wallId,
      type,
      offset: finalOffset,
      offsetFromStart: finalOffset,
      width: width ?? defaultWidth,
      height: height ?? defaultHeight,
      sillHeight: sillHeight ?? defaultSill,
      depth: finalDepth,
      swingSide,
      hingeSide,
      swingDirection: hingeSide,
      subType
    };

    wall.openings.push(opening);
    this.setSelection('opening', opening.id);
    this.saveSnapshot(`Add ${type}`);
    this.emit();
    return opening;
  }

  public updateOpening(openingId: string, patch: Partial<Opening>) {
    for (const wall of Object.values(this.state.walls)) {
      const op = wall.openings.find(o => o.id === openingId);
      if (op) {
        if (patch.offset !== undefined) {
          patch.offsetFromStart = patch.offset;
        } else if (patch.offsetFromStart !== undefined) {
          patch.offset = patch.offsetFromStart;
        }
        if (op.type === 'niche' && patch.depth !== undefined) {
          const maxNicheDepth = Math.max(50, wall.thickness - 40);
          patch.depth = Math.min(patch.depth, maxNicheDepth);
        }
        Object.assign(op, patch);
        this.saveSnapshot('Update opening');
        this.emit();
        return;
      }
    }
  }

  public deleteOpening(openingId: string) {
    for (const wall of Object.values(this.state.walls)) {
      const idx = wall.openings.findIndex(o => o.id === openingId);
      if (idx !== -1) {
        wall.openings.splice(idx, 1);
        if (this.state.selection.type === 'opening' && this.state.selection.id === openingId) {
          this.state.selection = { type: 'none', id: null };
        }
        this.saveSnapshot('Delete opening');
        this.emit();
        return;
      }
    }
  }

  // --- Category 4: Add Structures (Column, Beam, Staircase, Flue, Floor Opening, Partition Wall) ---

  public addStructure(item: Omit<StructureItem, 'id'>): StructureItem {
    const id = generateId('struct');
    const newStructure: StructureItem = { ...item, id };
    this.state.structures[id] = newStructure;
    this.setSelection('structure', id);
    this.saveSnapshot(`Add ${item.type}`);
    this.emit();
    return newStructure;
  }

  public updateStructure(id: string, patch: Partial<StructureItem>) {
    const struct = this.state.structures[id];
    if (!struct) return;
    Object.assign(struct, patch);
    this.saveSnapshot('Update structure');
    this.emit();
  }

  public deleteStructure(id: string) {
    if (this.state.structures[id]) {
      delete this.state.structures[id];
      if (this.state.selection.type === 'structure' && this.state.selection.id === id) {
        this.state.selection = { type: 'none', id: null };
      }
      this.saveSnapshot('Delete structure');
      this.emit();
    }
  }

  // --- Furniture Operations ---

  public addFurniture(item: Omit<FurnitureItem, 'id'>): FurnitureItem {
    const id = generateId('furn');
    const newItem: FurnitureItem = { ...item, id };
    this.state.furniture[id] = newItem;
    this.setSelection('furniture', id);
    this.saveSnapshot(`Add ${newItem.name}`);
    this.emit();
    return newItem;
  }

  public updateFurniture(id: string, patch: Partial<FurnitureItem>) {
    const item = this.state.furniture[id];
    if (!item) return;

    Object.assign(item, patch);
    this.saveSnapshot('Update furniture');
    this.emit();
  }

  public deleteFurniture(id: string) {
    if (this.state.furniture[id]) {
      delete this.state.furniture[id];
      if (this.state.selection.type === 'furniture' && this.state.selection.id === id) {
        this.state.selection = { type: 'none', id: null };
      }
      this.saveSnapshot('Delete furniture');
      this.emit();
    }
  }

  // --- Room Operations ---

  public updateRoom(roomId: string, patch: Partial<RoomPolygon>) {
    const room = this.state.rooms[roomId];
    if (!room) return;

    Object.assign(room, patch);
    this.saveSnapshot('Update room');
    this.emit();
  }

  public recalculateRooms(shouldEmit: boolean = true) {
    const detected = detectRooms(this.state.nodes, this.state.walls, this.state.rooms);
    for (const [id, r] of Object.entries(this.state.rooms)) {
      if (r.points && r.points.length > 4 && !detected[id]) {
        detected[id] = r;
      }
    }
    this.state.rooms = detected;
    if (shouldEmit) this.emit();
  }

  // --- UI & Tool Mode Operations ---

  public setSelection(type: SelectionState['type'], id: string | null) {
    this.state.selection = { type, id };
    this.emit();
  }

  public setActiveTool(
    tool: ActiveTool, 
    pendingOpening?: OpeningType, 
    pendingStructure?: StructureType,
    pendingFurnCatalogId?: string,
    pendingSubtype?: string
  ) {
    this.state.activeTool = tool;
    this.state.pendingOpeningType = pendingOpening;
    this.state.pendingStructureType = pendingStructure;
    this.state.pendingStructureSubType = pendingSubtype;
    this.state.pendingFurnitureCatalogId = pendingFurnCatalogId;
    this.emit();
  }

  public setViewMode(mode: '2d_main' | '3d_main' | 'walkthrough') {
    this.state.viewMode = mode;
    this.emit();
  }

  public togglePip() {
    this.state.pipVisible = !this.state.pipVisible;
    this.emit();
  }

  public swapViews() {
    if (this.state.viewMode === '2d_main') {
      this.state.viewMode = '3d_main';
    } else {
      this.state.viewMode = '2d_main';
    }
    this.emit();
  }

  public updateSettings(patch: Partial<ProjectSettings>) {
    Object.assign(this.state.settings, patch);
    this.saveSnapshot('Update project settings');
    this.emit();
  }

  public clearProject() {
    this.state.nodes = {};
    this.state.walls = {};
    this.state.rooms = {};
    this.state.structures = {};
    this.state.furniture = {};
    this.state.blueprintUnderlay = null;
    this.state.selection = { type: 'none', id: null };
    this.saveSnapshot('Clear project');
    this.emit();
  }
}

export const projectStore = new StateStore();
export { StateStore as ProjectStore };
