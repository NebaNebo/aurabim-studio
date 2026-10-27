import { projectStore } from '../core/state-store';
import { ProjectState, ActiveTool, Point2D, Wall, Opening, HoverOpeningPreview, StructureType, OpeningType } from '../core/types';
import { Vec2, dist, sub, add, scale, calculateArcFromSagitta } from '../math/vector2d';
import { calculateSnapping, snapToWallSegment, SnapResult } from '../math/snapping';
import { computeWallContours, Wall2DContour } from '../math/mitering';
import { calculateCentroid, isPointInsidePolygon } from '../math/polygon-area';
import { FURNITURE_CATALOG } from '../catalog/furniture-presets';
import { computeOpeningHover } from '../math/opening-projection';
import { OpeningOverlay } from './opening-overlay';
import { OpeningRenderer } from './opening-renderer';
import { BlueprintManager } from './blueprint-manager';
import { StructureRenderer } from './structure-renderer';
import { showToast } from '../ui/toast-notifier';

export function isOpeningTool(tool: ActiveTool): boolean {
  return [
    'door',
    'window',
    'bay_window',
    'opening',
    'niche',
    'bay_window_sill',
    'place_opening'
  ].includes(tool);
}

export function isStructureTool(tool: ActiveTool): boolean {
  return [
    'column',
    'beam',
    'staircase',
    'flue',
    'floor_opening',
    'place_structure'
  ].includes(tool);
}

export class CadViewport {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: ProjectState;
  private unsubscribe: () => void;

  // Viewport Matrix (World mm to Screen px)
  private pan: Vec2 = { x: 300, y: 250 }; // Screen origin offset
  private zoom: number = 0.08; // 1 pixel = 12.5mm (zoom 0.08)

  // Interaction State
  private isPanning: boolean = false;
  private lastMousePos: Vec2 = { x: 0, y: 0 };
  private activeDrawStart: Point2D | null = null;
  private activeDragNodeId: string | null = null;
  private activeDragFurnitureId: string | null = null;
  private furnDragOffsetMm: Vec2 = { x: 0, y: 0 };
  private currentCursorMm: Vec2 = { x: 0, y: 0 };
  private currentSnap: SnapResult = { point: { x: 0, y: 0 }, snappedTo: 'none' };

  // Door / Window Hover & Split Clearances
  private hoverOpeningPreview: HoverOpeningPreview | null = null;
  private currentHingeSide: 'left' | 'right' = 'right';
  private openingOverlay: OpeningOverlay | null = null;
  private activeDragOpeningId: string | null = null;

  // Rect Room preview state
  private rectRoomStartMm: Vec2 | null = null;

  // Category 2: Arc Wall (3-Click Circular Arc) & External Area
  private arcStartNode: Point2D | null = null;
  private arcEndNode: Point2D | null = null;
  private arcSagitta: number = 0;
  private currentWallThickness: number = 240; // Tab toggles 240mm / 120mm

  // Category 4: Structure Dragging & Placement
  private activeDragStructureId: string | null = null;
  private structDragOffsetMm: Vec2 = { x: 0, y: 0 };

  // Active Room Action Pill Bounds & Hover State (Matching Coohom [Edit] | [Split area])
  private activeRoomPillBounds: {
    x: number;
    y: number;
    w: number;
    h: number;
    roomId: string;
  } | null = null;
  private hoveredPillSection: 'edit' | 'split' | null = null;

  // Render loop
  private animFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;

    this.state = projectStore.getState();
    this.unsubscribe = projectStore.subscribe(s => {
      this.state = s;
      this.requestRender();
    });

    this.initOpeningOverlay();
    this.setupEvents();
    this.resizeCanvas();
    this.centerView();
  }

  private initOpeningOverlay() {
    let overlayDiv = document.getElementById('opening-overlay-root');
    if (!overlayDiv) {
      overlayDiv = document.createElement('div');
      overlayDiv.id = 'opening-overlay-root';
      overlayDiv.style.position = 'absolute';
      overlayDiv.style.inset = '0';
      overlayDiv.style.pointerEvents = 'none';
      overlayDiv.style.zIndex = '45';
      this.canvas.parentElement?.appendChild(overlayDiv);
    }

    this.openingOverlay = new OpeningOverlay(overlayDiv, this, {
      onUpdateClearance: (side, newClearanceMm) => {
        this.handleUpdateClearance(side, newClearanceMm);
      },
      onUpdateWidth: (newWidthMm) => {
        this.handleUpdateWidth(newWidthMm);
      },
      onCommitHover: () => {
        this.commitHoverOpening();
      },
      onFlipSwing: () => {
        this.handleFlipSwing();
      },
      onFlipHinge: () => {
        this.handleFlipHinge();
      },
      onDelete: () => {
        if (this.state.selection.type === 'opening' && this.state.selection.id) {
          projectStore.deleteOpening(this.state.selection.id);
        }
      }
    });
  }

  public destroy() {
    this.unsubscribe();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.openingOverlay?.hide();
  }

  private handleUpdateClearance(side: 'left' | 'right', newClearanceMm: number) {
    if (this.state.activeTool === 'place_opening' && this.hoverOpeningPreview?.wallId) {
      const prev = this.hoverOpeningPreview;
      let newOffset = prev.offset;
      if (side === 'left') {
        newOffset = prev.leftObstacleOffset + newClearanceMm + (prev.width / 2);
      } else {
        newOffset = prev.rightObstacleOffset - newClearanceMm - (prev.width / 2);
      }
      prev.offset = Math.round(newOffset);
      prev.leftClearanceMm = Math.max(0, Math.round((prev.offset - prev.width / 2) - prev.leftObstacleOffset));
      prev.rightClearanceMm = Math.max(0, Math.round(prev.rightObstacleOffset - (prev.offset + prev.width / 2)));
      this.requestRender();
    } else if (this.state.selection.type === 'opening' && this.state.selection.id) {
      const openingId = this.state.selection.id;
      for (const wall of Object.values(this.state.walls)) {
        const op = wall.openings.find(o => o.id === openingId);
        if (op) {
          const p1 = this.state.nodes[wall.startNodeId];
          const p2 = this.state.nodes[wall.endNodeId];
          if (!p1 || !p2) continue;
          const wallLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          let leftObs = wall.thickness / 2;
          let rightObs = wallLen - wall.thickness / 2;
          const opOffset = op.offset ?? op.offsetFromStart ?? 0;
          for (const ex of wall.openings) {
            if (ex.id === op.id) continue;
            const exOff = ex.offset ?? ex.offsetFromStart ?? 0;
            if (exOff + ex.width / 2 <= opOffset - op.width / 2) {
              leftObs = Math.max(leftObs, exOff + ex.width / 2);
            }
            if (exOff - ex.width / 2 >= opOffset + op.width / 2) {
              rightObs = Math.min(rightObs, exOff - ex.width / 2);
            }
          }
          let newOffset = opOffset;
          if (side === 'left') {
            newOffset = leftObs + newClearanceMm + (op.width / 2);
          } else {
            newOffset = rightObs - newClearanceMm - (op.width / 2);
          }
          newOffset = Math.max(leftObs + op.width / 2, Math.min(rightObs - op.width / 2, newOffset));
          projectStore.updateOpening(op.id, { offset: Math.round(newOffset) });
          break;
        }
      }
    }
  }

  private handleUpdateWidth(newWidthMm: number) {
    if (this.state.activeTool === 'place_opening' && this.hoverOpeningPreview) {
      this.hoverOpeningPreview.width = newWidthMm;
      this.requestRender();
    } else if (this.state.selection.type === 'opening' && this.state.selection.id) {
      projectStore.updateOpening(this.state.selection.id, { width: newWidthMm });
    }
  }

  private commitHoverOpening() {
    const prev = this.hoverOpeningPreview;
    if (prev && prev.wallId) {
      projectStore.addOpening(
        prev.wallId,
        prev.type,
        prev.offset,
        prev.width,
        prev.height,
        undefined,
        prev.depth,
        prev.swingSide,
        prev.hingeSide
      );
      this.hoverOpeningPreview = null;
      this.openingOverlay?.hide();
      projectStore.setActiveTool('select');
    }
  }

  private handleFlipSwing() {
    if (this.state.activeTool === 'place_opening' && this.hoverOpeningPreview) {
      this.hoverOpeningPreview.swingSide = (this.hoverOpeningPreview.swingSide === 1) ? -1 : 1;
      this.requestRender();
    } else if (this.state.selection.type === 'opening' && this.state.selection.id) {
      const opId = this.state.selection.id;
      for (const wall of Object.values(this.state.walls)) {
        const op = wall.openings.find(o => o.id === opId);
        if (op) {
          const newSide: 1 | -1 = (op.swingSide === -1) ? 1 : -1;
          projectStore.updateOpening(op.id, { swingSide: newSide });
          break;
        }
      }
    }
  }

  private handleFlipHinge() {
    this.currentHingeSide = (this.currentHingeSide === 'left') ? 'right' : 'left';
    if (this.state.activeTool === 'place_opening' && this.hoverOpeningPreview) {
      this.hoverOpeningPreview.hingeSide = this.currentHingeSide;
      this.requestRender();
    } else if (this.state.selection.type === 'opening' && this.state.selection.id) {
      const opId = this.state.selection.id;
      for (const wall of Object.values(this.state.walls)) {
        const op = wall.openings.find(o => o.id === opId);
        if (op) {
          const newHinge: 'left' | 'right' = (op.hingeSide === 'left') ? 'right' : 'left';
          projectStore.updateOpening(op.id, { hingeSide: newHinge, swingDirection: newHinge });
          break;
        }
      }
    }
  }

  public resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }
    this.requestRender();
  }

  public centerView() {
    const nodes = Object.values(this.state.nodes);
    if (nodes.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      }
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      const rect = this.canvas.getBoundingClientRect();
      this.pan = {
        x: rect.width / 2 - midX * this.zoom,
        y: rect.height / 2 - midY * this.zoom
      };
    } else {
      const rect = this.canvas.getBoundingClientRect();
      this.pan = { x: rect.width / 2, y: rect.height / 2 };
    }
    this.requestRender();
  }

  public setZoom(newZoom: number) {
    this.zoom = Math.max(0.015, Math.min(0.5, newZoom));
    this.requestRender();
  }

  public getZoom(): number {
    return this.zoom;
  }

  // --- Coordinate Transformations ---

  public screenToWorld(screenPx: Vec2): Vec2 {
    return {
      x: (screenPx.x - this.pan.x) / this.zoom,
      y: (screenPx.y - this.pan.y) / this.zoom
    };
  }

  public worldToScreen(worldMm: Vec2): Vec2 {
    return {
      x: worldMm.x * this.zoom + this.pan.x,
      y: worldMm.y * this.zoom + this.pan.y
    };
  }

  // --- Event Listeners ---

  private setupEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseScreen: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const mouseWorldBefore = this.screenToWorld(mouseScreen);

      // Smooth geometric zoom factor
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newZoom = Math.max(0.012, Math.min(0.6, this.zoom * zoomFactor));

      // Adjust pan so point under cursor stays invariant
      this.pan.x = mouseScreen.x - mouseWorldBefore.x * newZoom;
      this.pan.y = mouseScreen.y - mouseWorldBefore.y * newZoom;
      this.zoom = newZoom;

      this.requestRender();
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseScreen: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.lastMousePos = mouseScreen;

      // Middle click or Space/Alt key triggers Pan
      if (e.button === 1 || e.altKey || e.shiftKey && e.button === 0 && this.state.activeTool === 'select' && e.ctrlKey) {
        this.isPanning = true;
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      if (e.button === 0) {
        this.handleLeftMouseDown(mouseScreen);
      } else if (e.button === 2) {
        // Right click cancels current drawing action
        this.cancelActiveDrawing();
      }
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseScreen: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (this.isPanning) {
        const dx = mouseScreen.x - this.lastMousePos.x;
        const dy = mouseScreen.y - this.lastMousePos.y;
        this.pan.x += dx;
        this.pan.y += dy;
        this.lastMousePos = mouseScreen;
        this.requestRender();
        return;
      }

      this.lastMousePos = mouseScreen;

      // Handle hover state over active room floating pill [ Edit ] | [ Split area ]
      if (this.activeRoomPillBounds) {
        const b = this.activeRoomPillBounds;
        if (
          mouseScreen.x >= b.x &&
          mouseScreen.x <= b.x + b.w &&
          mouseScreen.y >= b.y &&
          mouseScreen.y <= b.y + b.h
        ) {
          this.canvas.style.cursor = 'pointer';
          const section = mouseScreen.x < b.x + b.w / 2 ? 'edit' : 'split';
          if (this.hoveredPillSection !== section) {
            this.hoveredPillSection = section;
            this.requestRender();
          }
          return;
        } else if (this.hoveredPillSection !== null) {
          this.hoveredPillSection = null;
          this.requestRender();
        }
      }

      const rawWorldMm = this.screenToWorld(mouseScreen);

      // Find connected neighbor nodes if dragging an existing vertex to enable orthogonal alignment
      let connectedNeighbors: Point2D[] = [];
      if (this.activeDragNodeId) {
        for (const wall of Object.values(this.state.walls)) {
          if (wall.startNodeId === this.activeDragNodeId) {
            const neighbor = this.state.nodes[wall.endNodeId];
            if (neighbor) connectedNeighbors.push(neighbor);
          } else if (wall.endNodeId === this.activeDragNodeId) {
            const neighbor = this.state.nodes[wall.startNodeId];
            if (neighbor) connectedNeighbors.push(neighbor);
          }
        }
      }

      // Snapping computation (ignores active drag node to prevent feedback loops, supports alignment guides & smooth 10mm precision)
      const originPoint = this.activeDrawStart ? { x: this.activeDrawStart.x, y: this.activeDrawStart.y } : undefined;
      const snapRadius = 200 / (this.zoom * 10);
      const isShiftDown = e.shiftKey;
      const effectiveGridSize = this.activeDragNodeId ? (isShiftDown ? 1 : 10) : (isShiftDown ? 10 : this.state.settings.gridSizeMm);

      this.currentSnap = calculateSnapping(
        rawWorldMm,
        this.state.nodes,
        originPoint,
        effectiveGridSize,
        snapRadius,
        true,
        this.activeDragNodeId || undefined,
        connectedNeighbors
      );
      this.currentCursorMm = this.currentSnap.point;

      // Handle Node Dragging (real-time smooth position update)
      if (this.activeDragNodeId) {
        projectStore.moveNode(this.activeDragNodeId, this.currentCursorMm.x, this.currentCursorMm.y, false);
      }

      // Handle Furniture Dragging
      if (this.activeDragFurnitureId) {
        const furn = this.state.furniture[this.activeDragFurnitureId];
        if (furn) {
          const newX = Math.round(this.currentCursorMm.x + this.furnDragOffsetMm.x);
          const newY = Math.round(this.currentCursorMm.y + this.furnDragOffsetMm.y);
          projectStore.updateFurniture(this.activeDragFurnitureId, {
            position: { x: newX, y: newY, z: furn.position.z }
          });
        }
      }

      // Handle Structure Dragging
      if (this.activeDragStructureId) {
        const struct = this.state.structures[this.activeDragStructureId];
        if (struct) {
          const newX = Math.round(this.currentCursorMm.x + this.structDragOffsetMm.x);
          const newY = Math.round(this.currentCursorMm.y + this.structDragOffsetMm.y);
          projectStore.updateStructure(this.activeDragStructureId, {
            position: { x: newX, y: newY, z: struct.position.z ?? 0 }
          });
        }
      }

      // Handle Arc Wall Live Curvature Calculation
      if (this.state.activeTool === 'arc_wall' && this.arcStartNode && this.arcEndNode) {
        const chordLen = dist(this.arcStartNode, this.arcEndNode);
        if (chordLen > 10) {
          const dx = this.arcEndNode.x - this.arcStartNode.x;
          const dy = this.arcEndNode.y - this.arcStartNode.y;
          const normX = -dy / chordLen;
          const normY = dx / chordLen;
          const vPx = this.currentCursorMm.x - this.arcStartNode.x;
          const vPy = this.currentCursorMm.y - this.arcStartNode.y;
          this.arcSagitta = Math.round(vPx * normX + vPy * normY);
        }
      }

      // Handle Opening Placement Hover Preview (Magnetic snap within 500mm & cross-product swing flip)
      if (isOpeningTool(this.state.activeTool)) {
        let openingType: OpeningType = (this.state.pendingOpeningType || (this.state.activeTool as any)) || 'door';
        if ((openingType as string) === 'place_opening') openingType = 'door';
        const defaultWidth = openingType.includes('double') ? 1800 : (openingType.includes('bay') ? 2000 : (openingType === 'window' ? 1800 : 907));
        const prevWidth = this.hoverOpeningPreview?.width ?? defaultWidth;
        this.hoverOpeningPreview = computeOpeningHover(
          rawWorldMm,
          this.state.walls,
          this.state.nodes,
          openingType,
          prevWidth,
          this.currentHingeSide
        );
      } else {
        this.hoverOpeningPreview = null;
      }

      // Handle Opening Dragging along wall vector
      if (this.activeDragOpeningId) {
        for (const wall of Object.values(this.state.walls)) {
          const op = wall.openings.find(o => o.id === this.activeDragOpeningId);
          if (op) {
            const preview = computeOpeningHover(
              rawWorldMm,
              [wall],
              this.state.nodes,
              op.type,
              op.width,
              op.hingeSide ?? (op.swingDirection === 'left' ? 'left' : 'right'),
              op.id
            );
            if (preview.wallId === wall.id) {
              projectStore.updateOpening(op.id, {
                offset: preview.offset,
                swingSide: preview.swingSide
              });
            }
            break;
          }
        }
      }

      this.requestRender();
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = 'crosshair';
      }

      if (this.activeDragNodeId) {
        projectStore.moveNode(this.activeDragNodeId, this.currentCursorMm.x, this.currentCursorMm.y, true);
        this.activeDragNodeId = null;
      }

      if (this.activeDragFurnitureId) {
        this.activeDragFurnitureId = null;
      }

      if (this.activeDragStructureId) {
        this.activeDragStructureId = null;
      }

      if (this.activeDragOpeningId) {
        this.activeDragOpeningId = null;
      }

      // Commit drag-created rectangular room on mouseup if dragged > 500mm
      const isRectTool = this.state.activeTool === 'draw_rect_room' || this.state.activeTool === 'rectangle_wall';
      if (isRectTool && this.rectRoomStartMm) {
        const width = this.currentCursorMm.x - this.rectRoomStartMm.x;
        const height = this.currentCursorMm.y - this.rectRoomStartMm.y;
        if (Math.abs(width) >= 500 && Math.abs(height) >= 500) {
          projectStore.addRectRoom(
            Math.min(this.rectRoomStartMm.x, this.currentCursorMm.x),
            Math.min(this.rectRoomStartMm.y, this.currentCursorMm.y),
            Math.abs(width),
            Math.abs(height)
          );
          const areaM2 = ((Math.abs(width) * Math.abs(height)) / 1_000_000).toFixed(1);
          showToast(`Room created: ${areaM2} m²`);
          this.rectRoomStartMm = null;
          projectStore.setActiveTool('select');
          this.requestRender();
        }
      }
    });

    // Context menu disable on canvas so right click can cancel tools cleanly
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard shortcuts (Blender-style, keyboard-first workflow)
    window.addEventListener('keydown', (e) => {
      // Input Hotkey Guard: disable all global shortcuts whenever an input or select is focused
      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = (el: HTMLElement | null) =>
        el &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLSelectElement ||
          el instanceof HTMLTextAreaElement ||
          el.isContentEditable ||
          el.tagName === 'INPUT' ||
          el.tagName === 'SELECT' ||
          el.tagName === 'TEXTAREA');

      if (isInput(target) || isInput(activeEl)) {
        return;
      }

      const sel = this.state.selection;
      const step = this.state.settings.gridSizeMm;
      const bigStep = this.state.settings.gridSizeMm * 10;

      if (e.key === 'Escape') {
        this.cancelActiveDrawing();
        projectStore.setActiveTool('select');
        projectStore.setSelection('none', null);
      } else if (e.code === 'Space') {
        // Spacebar flips hingeSide in hover preview or selected opening
        e.preventDefault();
        this.handleFlipHinge();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (this.state.activeTool === 'draw_wall' || this.state.activeTool === 'straight_wall' || this.state.activeTool === 'partition_wall') {
          // Tab toggles wall thickness between 240mm (exterior) and 120mm (interior)
          this.currentWallThickness = this.currentWallThickness === 240 ? 120 : 240;
          showToast(`Wall Thickness: ${this.currentWallThickness} mm`);
          this.requestRender();
        } else if (isOpeningTool(this.state.activeTool) || (sel.type === 'opening' && sel.id)) {
          this.openingOverlay?.focusLeftInput();
        } else {
          this.cycleFurnitureSelection(e.shiftKey ? -1 : 1);
        }
      } else if (e.key === 'Enter') {
        if (isOpeningTool(this.state.activeTool) && this.hoverOpeningPreview?.wallId) {
          e.preventDefault();
          this.commitHoverOpening();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace' || e.key.toLowerCase() === 'x') {
        if (sel.type !== 'none' && sel.id) {
          e.preventDefault();
          this.deleteSelection();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          projectStore.redo();
        } else {
          projectStore.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        projectStore.redo();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Nudge selection (Blender-style precision movement)
        const s = e.shiftKey ? bigStep : step;
        if (sel.type === 'furniture' && sel.id && this.state.furniture[sel.id]) {
          e.preventDefault();
          const furn = this.state.furniture[sel.id];
          projectStore.updateFurniture(furn.id, {
            position: {
              x: Math.round(furn.position.x + (e.key === 'ArrowRight' ? s : e.key === 'ArrowLeft' ? -s : 0)),
              y: Math.round(furn.position.y + (e.key === 'ArrowDown' ? s : e.key === 'ArrowUp' ? -s : 0)),
              z: furn.position.z
            }
          });
        } else if (sel.type === 'structure' && sel.id && this.state.structures[sel.id]) {
          e.preventDefault();
          const struct = this.state.structures[sel.id];
          projectStore.updateStructure(struct.id, {
            position: {
              x: Math.round(struct.position.x + (e.key === 'ArrowRight' ? s : e.key === 'ArrowLeft' ? -s : 0)),
              y: Math.round(struct.position.y + (e.key === 'ArrowDown' ? s : e.key === 'ArrowUp' ? -s : 0)),
              z: struct.position.z ?? 0
            }
          });
        } else if (sel.type === 'opening' && sel.id) {
          e.preventDefault();
          const opening = this.findOpeningById(sel.id);
          if (opening) {
            if (e.key === 'ArrowLeft') {
              projectStore.updateOpening(opening.id, { offset: Math.max(0, opening.offset - s) });
            } else if (e.key === 'ArrowRight') {
              projectStore.updateOpening(opening.id, { offset: opening.offset + s });
            } else if (e.key === 'ArrowUp') {
              projectStore.updateOpening(opening.id, { sillHeight: Math.max(0, opening.sillHeight + s) });
            } else if (e.key === 'ArrowDown') {
              projectStore.updateOpening(opening.id, { sillHeight: Math.max(0, opening.sillHeight - s) });
            }
          }
        }
      } else if (e.key === 'b' || e.key === 'B') {
        projectStore.setActiveTool('straight_wall');
        showToast('Straight wall tool (B) — Tab toggles 240/120mm');
      } else if (e.key === 'f' || e.key === 'F') {
        projectStore.setActiveTool('rectangle_wall');
        showToast('Rectangle room tool (F)');
      } else if (e.key === 'h' || e.key === 'H') {
        projectStore.setActiveTool('arc_wall');
        showToast('Arc wall tool (H) — 3-point circular arc');
      } else if (e.key === 'v' || e.key === 'V') {
        projectStore.setActiveTool('select');
      } else if (e.key === 'r' || e.key === 'R') {
        if (sel.type === 'structure') {
          this.rotateSelectedStructure(e.shiftKey ? -45 : 45);
        } else {
          this.rotateSelectedFurniture(e.shiftKey ? -45 : 45);
        }
      } else if (e.key === '[') {
        if (sel.type === 'structure') {
          this.rotateSelectedStructure(-45);
        } else {
          this.rotateSelectedFurniture(-45);
        }
      } else if (e.key === ']') {
        if (sel.type === 'structure') {
          this.rotateSelectedStructure(45);
        } else {
          this.rotateSelectedFurniture(45);
        }
      } else if (e.key.toLowerCase() === 'd' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Duplicate selection
        if (sel.type === 'furniture' && sel.id && this.state.furniture[sel.id]) {
          this.duplicateFurniture(sel.id);
        }
      } else if (e.key === '.') {
        this.centerView();
        showToast('Fit to view extents');
      } else if (e.key === '?') {
        showToast(
          '⌨️ V Select · B Wall (Tab=240/120) · F Rect Room · H Arc Wall · ↑↓←→ Nudge · R/[/] Rotate · Tab Cycle · Space Flip Hinge · X Delete',
          6000
        );
      }
    });
  }

  private findOpeningById(openingId: string): Opening | null {
    for (const wall of Object.values(this.state.walls)) {
      const op = wall.openings.find(o => o.id === openingId);
      if (op) return op;
    }
    return null;
  }

  private duplicateFurniture(originId: string) {
    const origin = this.state.furniture[originId];
    if (!origin) return;
    const offset = this.state.settings.gridSizeMm * 5;
    projectStore.addFurniture({
      ...origin,
      position: {
        x: Math.round(origin.position.x + offset),
        y: Math.round(origin.position.y + offset),
        z: origin.position.z
      }
    });
    showToast(`${origin.name} duplicated (+${offset}mm offset)`);
  }

  private rotateSelectedFurniture(deltaDeg: number) {
    const sel = this.state.selection;
    if (sel.type === 'furniture' && sel.id && this.state.furniture[sel.id]) {
      const furn = this.state.furniture[sel.id];
      projectStore.updateFurniture(furn.id, {
        rotation: (furn.rotation + deltaDeg % 360 + 360) % 360
      });
    }
  }

  private cycleFurnitureSelection(direction: 1 | -1) {
    const keys = Object.keys(this.state.furniture);
    if (keys.length === 0) return;

    const currentIndex = keys.indexOf(this.state.selection.id || '');
    const nextIndex = (currentIndex + direction + keys.length) % keys.length;
    const nextId = keys[nextIndex];

    projectStore.setSelection('furniture', nextId);
    const furn = this.state.furniture[nextId];
    showToast(`Selected: ${furn.name}`, 1500);
  }

  private rotateSelectedStructure(deltaDeg: number) {
    const sel = this.state.selection;
    if (sel.type === 'structure' && sel.id && this.state.structures[sel.id]) {
      const struct = this.state.structures[sel.id];
      projectStore.updateStructure(struct.id, {
        rotation: (struct.rotation + deltaDeg % 360 + 360) % 360
      });
    }
  }

  private handleLeftMouseDown(mouseScreen: Vec2) {
    // 0. Check Click on Active Room Floating Pill [ Edit ] | [ Split area ]
    if (this.activeRoomPillBounds) {
      const b = this.activeRoomPillBounds;
      if (
        mouseScreen.x >= b.x &&
        mouseScreen.x <= b.x + b.w &&
        mouseScreen.y >= b.y &&
        mouseScreen.y <= b.y + b.h
      ) {
        if (mouseScreen.x < b.x + b.w / 2) {
          // [ Edit ] clicked: focus room name in right property inspector
          const input = document.getElementById('room-name') as HTMLInputElement | null;
          if (input) {
            input.focus();
            input.select();
          }
          showToast('Edit room name & floor finish in Right Inspector');
        } else {
          // [ Split area ] clicked: activate partition wall tool to divide room
          projectStore.setActiveTool('partition_wall');
          showToast('Split Area: Click two points across room to place a dividing partition wall');
        }
        this.requestRender();
        return;
      }
    }

    const worldMm = this.currentCursorMm;

    // Category 1: Blueprint Scale Calibration Click Handler
    if (this.state.blueprintUnderlay && this.state.blueprintUnderlay.calibrationState !== 'none') {
      const bp = this.state.blueprintUnderlay;
      if (bp.calibrationState === 'pick_p1') {
        projectStore.updateBlueprintUnderlay({
          calibrationP1: { ...worldMm },
          calibrationState: 'pick_p2'
        });
        showToast('📍 Point 1 set! Click Point 2 at the other end of a known dimension line.');
        this.requestRender();
        return;
      } else if (bp.calibrationState === 'pick_p2') {
        projectStore.updateBlueprintUnderlay({
          calibrationP2: { ...worldMm },
          calibrationState: 'enter_length'
        });
        BlueprintManager.spawnCalibrationPopover(
          mouseScreen,
          (realLengthMm) => {
            projectStore.calibrateScale(realLengthMm);
            showToast(`✅ Scale calibrated! 1px = ${projectStore.getState().blueprintUnderlay?.mmPerPixel.toFixed(2)}mm. Blueprint locked.`);
          },
          () => {
            projectStore.updateBlueprintUnderlay({ calibrationState: 'none' });
          }
        );
        this.requestRender();
        return;
      }
    }

    // Select Tool
    if (this.state.activeTool === 'select') {
      this.handleSelectMouseDown(worldMm);
      this.requestRender();
      return;
    }

    // Category 2: Straight Wall (B)
    if (this.state.activeTool === 'straight_wall' || this.state.activeTool === 'draw_wall') {
      if (!this.activeDrawStart) {
        const startNode = projectStore.getOrCreateNode(worldMm.x, worldMm.y);
        this.activeDrawStart = startNode;
      } else {
        const endNode = projectStore.getOrCreateNode(worldMm.x, worldMm.y);
        if (endNode.id !== this.activeDrawStart.id) {
          projectStore.addWall(this.activeDrawStart.id, endNode.id, this.currentWallThickness);
          const connectedWalls = Object.values(this.state.walls).filter(
            w => w.startNodeId === endNode.id || w.endNodeId === endNode.id
          );
          if (connectedWalls.length >= 2) {
            showToast('Wall loop closed — Room enclosed!');
            this.activeDrawStart = null;
          } else {
            this.activeDrawStart = endNode;
          }
        }
      }
      this.requestRender();
      return;
    }

    // Category 4: Partition Wall (Thin / Half-Height)
    if (this.state.activeTool === 'partition_wall') {
      if (!this.activeDrawStart) {
        const startNode = projectStore.getOrCreateNode(worldMm.x, worldMm.y);
        this.activeDrawStart = startNode;
      } else {
        const endNode = projectStore.getOrCreateNode(worldMm.x, worldMm.y);
        if (endNode.id !== this.activeDrawStart.id) {
          projectStore.addWall(this.activeDrawStart.id, endNode.id, 120, 1200, { isPartition: true });
          showToast('Partition wall placed (120mm)');
          this.activeDrawStart = null;
        }
      }
      this.requestRender();
      return;
    }

    // Category 2: Rectangle Wall (F)
    if (this.state.activeTool === 'rectangle_wall' || this.state.activeTool === 'draw_rect_room') {
      if (!this.rectRoomStartMm) {
        this.rectRoomStartMm = { ...worldMm };
      } else {
        const width = worldMm.x - this.rectRoomStartMm.x;
        const height = worldMm.y - this.rectRoomStartMm.y;
        if (Math.abs(width) >= 500 && Math.abs(height) >= 500) {
          projectStore.addRectRoom(
            Math.min(this.rectRoomStartMm.x, worldMm.x),
            Math.min(this.rectRoomStartMm.y, worldMm.y),
            Math.abs(width),
            Math.abs(height)
          );
          const areaM2 = ((Math.abs(width) * Math.abs(height)) / 1_000_000).toFixed(1);
          showToast(`Room created: ${areaM2} m²`);
        }
        this.rectRoomStartMm = null;
        projectStore.setActiveTool('select');
      }
      this.requestRender();
      return;
    }

    // Category 2: Arc Wall (H) — 3-Click Circular Arc State Machine
    if (this.state.activeTool === 'arc_wall') {
      if (!this.arcStartNode) {
        this.arcStartNode = projectStore.getOrCreateNode(worldMm.x, worldMm.y);
        showToast('Arc Start Node set. Click End Node (Point 2)');
      } else if (!this.arcEndNode) {
        this.arcEndNode = projectStore.getOrCreateNode(worldMm.x, worldMm.y);
        showToast('Arc End Node set. Move mouse to adjust curvature (sagitta), then click to commit!');
      } else {
        const sagitta = Math.abs(this.arcSagitta) > 10 ? this.arcSagitta : 300;
        projectStore.addArcWall(this.arcStartNode.id, this.arcEndNode.id, sagitta, this.currentWallThickness);
        showToast(`Arc wall committed (sagitta ${Math.round(sagitta)}mm)`);
        this.arcStartNode = null;
        this.arcEndNode = null;
        this.arcSagitta = 0;
      }
      this.requestRender();
      return;
    }

    // Category 2: External Area
    if (this.state.activeTool === 'external_area') {
      if (!this.activeDrawStart) {
        this.activeDrawStart = projectStore.getOrCreateNode(worldMm.x, worldMm.y);
        showToast('External area boundary started');
      } else {
        const endNode = projectStore.getOrCreateNode(worldMm.x, worldMm.y);
        if (endNode.id !== this.activeDrawStart.id) {
          projectStore.addWall(this.activeDrawStart.id, endNode.id, 50, 150, { isExternalAreaBoundary: true });
          const connected = Object.values(this.state.walls).filter(
            w => (w.startNodeId === endNode.id || w.endNodeId === endNode.id) && w.isExternalAreaBoundary
          );
          if (connected.length >= 2) {
            showToast('External Area closed! Balcony/Deck slab created');
            this.activeDrawStart = null;
          } else {
            this.activeDrawStart = endNode;
          }
        }
      }
      this.requestRender();
      return;
    }

    // Category 3: Place Doors & Windows (1D Wall-Hosted Openings)
    if (isOpeningTool(this.state.activeTool)) {
      if (this.hoverOpeningPreview && this.hoverOpeningPreview.wallId) {
        this.commitHoverOpening();
      } else {
        showToast('⚠️ Distance > 500mm from wall. Move closer to snap opening to a wall.');
      }
      this.requestRender();
      return;
    }

    // Category 4: Add Structures (Column, Beam, Staircase, Flue, Floor Opening, Sill)
    if (isStructureTool(this.state.activeTool)) {
      let structType: StructureType = (this.state.pendingStructureType || (this.state.activeTool as any)) as StructureType;
      if ((structType as string) === 'place_structure') structType = 'column';
      const subType = this.state.pendingStructureSubType;

      let dimensions = { width: 300, length: 300, height: this.state.settings.wallHeight || 2800 };
      let wallThickness: number | undefined;
      let distanceFromTop: number | undefined;
      let riserCount: number | undefined;
      let elevation: number | undefined;

      if (structType === 'column') {
        dimensions = { width: 300, length: 300, height: this.state.settings.wallHeight || 2800 };
      } else if (structType === 'beam') {
        dimensions = { width: 300, length: 1800, height: 600 };
        distanceFromTop = 0;
      } else if (structType === 'staircase') {
        dimensions = { width: 1200, length: 3200, height: this.state.settings.wallHeight || 2800 };
        riserCount = 16;
      } else if (structType === 'flue') {
        dimensions = { width: 450, length: 450, height: this.state.settings.wallHeight || 2800 };
        wallThickness = 60;
      } else if (structType === 'floor_opening') {
        dimensions = { width: 2000, length: 2000, height: this.state.settings.slabThickness || 120 };
      } else if (structType === 'bay_window_sill') {
        dimensions = { width: 1800, length: 600, height: 40 };
        elevation = 500;
      }

      projectStore.addStructure({
        type: structType,
        subType,
        position: { x: worldMm.x, y: worldMm.y, z: 0 },
        rotation: 0,
        dimensions,
        wallThickness,
        distanceFromTop,
        riserCount,
        elevation
      });

      showToast(`Placed ${structType.replace('_', ' ')}`);
      projectStore.setActiveTool('select');
      this.requestRender();
      return;
    }

    if (this.state.activeTool === 'place_furniture') {
      if (this.state.pendingFurnitureCatalogId) {
        const def = FURNITURE_CATALOG.find(f => f.id === this.state.pendingFurnitureCatalogId);
        if (def) {
          projectStore.addFurniture({
            catalogId: def.id,
            name: def.name,
            category: def.category,
            position: { x: worldMm.x, y: worldMm.y, z: 0 },
            rotation: 0,
            dimensions: { ...def.dimensions },
            colorTint: def.colorTint,
            modelType: def.modelType
          });
        }
        projectStore.setActiveTool('select');
      }
      this.requestRender();
      return;
    }

    if (this.state.activeTool === 'delete') {
      this.handleDeleteAt(worldMm);
      this.requestRender();
      return;
    }

    this.requestRender();
  }

  private handleSelectMouseDown(worldMm: Vec2) {
    // 0. Check Structure click
    for (const struct of Object.values(this.state.structures || {})) {
      const halfW = struct.dimensions.width / 2 + 100;
      const halfL = struct.dimensions.length / 2 + 100;
      if (
        worldMm.x >= struct.position.x - halfW &&
        worldMm.x <= struct.position.x + halfW &&
        worldMm.y >= struct.position.y - halfL &&
        worldMm.y <= struct.position.y + halfL
      ) {
        this.activeDragStructureId = struct.id;
        this.structDragOffsetMm = {
          x: struct.position.x - worldMm.x,
          y: struct.position.y - worldMm.y
        };
        projectStore.setSelection('structure', struct.id);
        return;
      }
    }

    // 1. Check Node click for dragging
    for (const node of Object.values(this.state.nodes)) {
      if (dist(worldMm, node) < 250) {
        this.activeDragNodeId = node.id;
        projectStore.setSelection('node', node.id);
        return;
      }
    }

    // 2. Check Opening click
    for (const wall of Object.values(this.state.walls)) {
      const p1 = this.state.nodes[wall.startNodeId];
      const p2 = this.state.nodes[wall.endNodeId];
      if (!p1 || !p2) continue;

      const wallLen = dist(p1, p2);
      if (wallLen < 1) continue;
      const dir = sub(p2, p1);
      const unit = scale(dir, 1 / wallLen);

      for (const op of wall.openings) {
        const offset = op.offset ?? op.offsetFromStart ?? 0;
        const opCenter = add(p1, scale(unit, offset));
        if (dist(worldMm, opCenter) < (op.width / 2 + 150)) {
          projectStore.setSelection('opening', op.id);
          this.activeDragOpeningId = op.id;
          return;
        }
      }
    }

    // 3. Check Wall click
    const wallSnap = snapToWallSegment(worldMm, this.state.walls, this.state.nodes, 200);
    if (wallSnap) {
      projectStore.setSelection('wall', wallSnap.wall.id);
      return;
    }

    // 4. Check Room click
    for (const room of Object.values(this.state.rooms)) {
      if (isPointInsidePolygon(worldMm, room.points)) {
        projectStore.setSelection('room', room.id);
        return;
      }
    }

    // 5. Check Furniture click
    for (const furn of Object.values(this.state.furniture)) {
      const halfW = furn.dimensions.width / 2;
      const halfD = furn.dimensions.depth / 2;
      if (
        worldMm.x >= furn.position.x - halfW &&
        worldMm.x <= furn.position.x + halfW &&
        worldMm.y >= furn.position.y - halfD &&
        worldMm.y <= furn.position.y + halfD
      ) {
        this.activeDragFurnitureId = furn.id;
        this.furnDragOffsetMm = {
          x: furn.position.x - worldMm.x,
          y: furn.position.y - worldMm.y
        };
        projectStore.setSelection('furniture', furn.id);
        return;
      }
    }

    // Clear selection
    projectStore.setSelection('none', null);
  }

  private handleDeleteAt(worldMm: Vec2) {
    const wallSnap = snapToWallSegment(worldMm, this.state.walls, this.state.nodes, 300);
    if (wallSnap) {
      projectStore.deleteWall(wallSnap.wall.id);
    }
  }

  private cancelActiveDrawing() {
    this.activeDrawStart = null;
    this.rectRoomStartMm = null;
    this.arcStartNode = null;
    this.arcEndNode = null;
    this.arcSagitta = 0;
    this.hoverOpeningPreview = null;
    this.activeDragStructureId = null;
    this.openingOverlay?.hide();
    const existing = document.getElementById('calibration-popover');
    if (existing) existing.remove();
    this.requestRender();
  }

  private deleteSelection() {
    const sel = this.state.selection;
    if (sel.type === 'wall' && sel.id) {
      projectStore.deleteWall(sel.id);
    } else if (sel.type === 'opening' && sel.id) {
      projectStore.deleteOpening(sel.id);
    } else if (sel.type === 'furniture' && sel.id) {
      projectStore.deleteFurniture(sel.id);
    } else if (sel.type === 'structure' && sel.id) {
      projectStore.deleteStructure(sel.id);
    }
  }

  // --- Rendering Pipeline ---

  public requestRender() {
    if (!this.animFrameId) {
      this.animFrameId = requestAnimationFrame(() => {
        this.render();
        this.animFrameId = null;
      });
    }
  }

  private render() {
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;

    // Clear background - Clean bright architectural canvas matching Coohom
    ctx.fillStyle = '#f5f6f8';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Render Infinite Millimeter Grid
    this.renderGrid(rect);

    // Compute Miters
    const wallContours = computeWallContours(this.state.walls, this.state.nodes);

    // Layer 1: Render Blueprint Underlay (above millimeter grid, below rooms/walls)
    BlueprintManager.renderBlueprint(ctx, this.state.blueprintUnderlay, (v) => this.worldToScreen(v), this.zoom);

    // Layer 2: Render Rooms (Floor polygon fill and area tags)
    this.renderRooms();

    // Layer 2.5: Render Structures (Columns, Beams, Staircases, Flues, Floor openings)
    this.renderStructures();

    // Layer 3: Render Wall Contours
    this.renderWalls(wallContours);

    // Layer 4: Render Doors & Windows (Architectural symbols)
    this.renderOpenings();

    // Layer 5: Render Furniture footprints
    this.renderFurniture();

    // Layer 6: Render Dimensions & Interactive Handles
    this.renderDimensionsAndHandles(wallContours);

    // Layer 7: Render Active Tool Previews (Rubber-band wall, rect room, snap cursor, structure ghost)
    this.renderToolPreviews();

    // Layer 8: Update Floating HTML Input Overlay (2808 | 907 | 3728)
    this.updateOpeningOverlay();
  }

  private renderStructures() {
    const ctx = this.ctx;
    for (const struct of Object.values(this.state.structures || {})) {
      const isSelected = this.state.selection.type === 'structure' && this.state.selection.id === struct.id;
      StructureRenderer.renderStructure(ctx, struct, this.zoom, (v) => this.worldToScreen(v), isSelected);
    }
  }

  private renderGrid(rect: DOMRect) {
    const ctx = this.ctx;
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({ x: rect.width, y: rect.height });

    // Adaptive grid step based on zoom
    let minorStep = 100;
    if (this.zoom < 0.04) minorStep = 500;
    if (this.zoom < 0.02) minorStep = 1000;
    const majorStep = minorStep * 10;

    const startX = Math.floor(topLeft.x / minorStep) * minorStep;
    const endX = Math.ceil(bottomRight.x / minorStep) * minorStep;
    const startY = Math.floor(topLeft.y / minorStep) * minorStep;
    const endY = Math.ceil(bottomRight.y / minorStep) * minorStep;

    // Minor Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    for (let x = startX; x <= endX; x += minorStep) {
      const scr = this.worldToScreen({ x, y: 0 });
      ctx.moveTo(scr.x, 0);
      ctx.lineTo(scr.x, rect.height);
    }
    for (let y = startY; y <= endY; y += minorStep) {
      const scr = this.worldToScreen({ x: 0, y });
      ctx.moveTo(0, scr.y);
      ctx.lineTo(rect.width, scr.y);
    }
    ctx.stroke();

    // Major Grid Lines
    ctx.strokeStyle = '#d1d5db';
    ctx.beginPath();
    for (let x = Math.floor(topLeft.x / majorStep) * majorStep; x <= endX; x += majorStep) {
      const scr = this.worldToScreen({ x, y: 0 });
      ctx.moveTo(scr.x, 0);
      ctx.lineTo(scr.x, rect.height);
    }
    for (let y = Math.floor(topLeft.y / majorStep) * majorStep; y <= endY; y += majorStep) {
      const scr = this.worldToScreen({ x: 0, y });
      ctx.moveTo(0, scr.y);
      ctx.lineTo(rect.width, scr.y);
    }
    ctx.stroke();

    // Origin Axes (Red for X, Green for Y)
    const originScr = this.worldToScreen({ x: 0, y: 0 });
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // X-axis
    ctx.beginPath();
    ctx.moveTo(0, originScr.y);
    ctx.lineTo(rect.width, originScr.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'; // Y-axis
    ctx.beginPath();
    ctx.moveTo(originScr.x, 0);
    ctx.lineTo(originScr.x, rect.height);
    ctx.stroke();
  }

  private renderRooms() {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const floorOp = this.state.settings.floorOpacity ?? 1.0;
    this.activeRoomPillBounds = null;

    for (const room of Object.values(this.state.rooms)) {
      if (room.points.length < 3) continue;

      const isSelected = this.state.selection.type === 'room' && this.state.selection.id === room.id;

      ctx.save();
      ctx.beginPath();
      const firstScr = this.worldToScreen(room.points[0]);
      ctx.moveTo(firstScr.x, firstScr.y);

      for (let i = 1; i < room.points.length; i++) {
        const pScr = this.worldToScreen(room.points[i]);
        ctx.lineTo(pScr.x, pScr.y);
      }
      ctx.closePath();

      // Respect floor opacity (45% when blueprint underlay is active)
      ctx.globalAlpha = isSelected ? 0.85 : floorOp;

      const isBalcony = room.name.toLowerCase().includes('balcony') || room.name.toLowerCase().includes('external');
      if (isBalcony) {
        // External Area: Outdoor deck/patio diagonal tile hatch pattern
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();

        ctx.save();
        ctx.clip();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        const totalW = rect.width + rect.height;
        ctx.beginPath();
        for (let d = -totalW; d <= totalW; d += 60) {
          ctx.moveTo(d, 0);
          ctx.lineTo(d + rect.height, rect.height);
        }
        ctx.stroke();
        ctx.restore();
      } else {
        // Interior Room Floor Tone
        ctx.fillStyle = isSelected 
          ? 'rgba(59, 130, 246, 0.22)' 
          : (room.floorMaterial === 'marble' ? '#f8fafc' : room.floorMaterial === 'tile' ? '#334155' : '#c4ab93');
        ctx.fill();

        // Subtle parquet planks pattern
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(120, 90, 65, 0.12)';
        ctx.lineWidth = 1;
        const topL = this.screenToWorld({ x: 0, y: 0 });
        const botR = this.screenToWorld({ x: rect.width, y: rect.height });
        const plankStep = 250;
        const startPlankY = Math.floor(topL.y / plankStep) * plankStep;
        const endPlankY = Math.ceil(botR.y / plankStep) * plankStep;
        ctx.beginPath();
        for (let py = startPlankY; py <= endPlankY; py += plankStep) {
          const sP = this.worldToScreen({ x: topL.x, y: py });
          ctx.moveTo(0, sP.y);
          ctx.lineTo(rect.width, sP.y);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Selected Room Boundary Highlight & Internal Dimensions (Images 1 & 2)
      if (isSelected) {
        // 1. Blue boundary outline
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        const fScr = this.worldToScreen(room.points[0]);
        ctx.moveTo(fScr.x, fScr.y);
        for (let i = 1; i < room.points.length; i++) {
          const pScr = this.worldToScreen(room.points[i]);
          ctx.lineTo(pScr.x, pScr.y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // 2. Internal Dashed Chord & Diagonal Dimensions
        const N = room.points.length;
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
        ctx.lineWidth = 1;

        if (N >= 4) {
          const pA = room.points[0];
          const pB = room.points[Math.floor(N / 2)];
          const sA = this.worldToScreen(pA);
          const sB = this.worldToScreen(pB);

          ctx.beginPath();
          ctx.moveTo(sA.x, sA.y);
          ctx.lineTo(sB.x, sB.y);
          ctx.stroke();

          const midChord = { x: (sA.x + sB.x) / 2, y: (sA.y + sB.y) / 2 };
          const chordMm = Math.round(dist(pA, pB));
          this.drawDimensionBadge(midChord, `${chordMm}`);
        }

        for (let i = 0; i < N; i++) {
          const p1 = room.points[i];
          const p2 = room.points[(i + 1) % N];
          const edgeLen = Math.round(dist(p1, p2));
          if (edgeLen > 1800 && (N <= 8 || i % 2 === 0)) {
            const s1 = this.worldToScreen(p1);
            const s2 = this.worldToScreen(p2);
            const mid = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };
            this.drawDimensionBadge(mid, `${edgeLen}`);
          }
        }
        ctx.restore();

        // 3. Floating Context Action Pill: [ ✏️ Edit ] | [ ✂️ Split area ]
        let minY = Infinity;
        let sumX = 0;
        for (const p of room.points) {
          if (p.y < minY) minY = p.y;
          sumX += p.x;
        }
        const topCenterMm = { x: sumX / room.points.length, y: minY };
        const topCenterScr = this.worldToScreen(topCenterMm);

        const pillW = 168;
        const pillH = 34;
        const pillX = topCenterScr.x - pillW / 2;
        const pillY = Math.max(50, topCenterScr.y - 48);

        this.activeRoomPillBounds = {
          x: pillX,
          y: pillY,
          w: pillW,
          h: pillH,
          roomId: room.id
        };

        // Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;

        const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';

        // Container Background
        ctx.fillStyle = isDarkTheme ? '#1c1e24' : '#ffffff';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 8);
        ctx.fill();
        ctx.restore();

        // Border
        ctx.save();
        ctx.strokeStyle = isDarkTheme ? '#2d313b' : '#dcdad0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 8);
        ctx.stroke();

        // Hover highlight
        if (this.hoveredPillSection === 'edit') {
          ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : '#f4f3ef';
          ctx.beginPath();
          ctx.roundRect(pillX + 1, pillY + 1, pillW / 2 - 1, pillH - 2, [7, 0, 0, 7]);
          ctx.fill();
        } else if (this.hoveredPillSection === 'split') {
          ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : '#f4f3ef';
          ctx.beginPath();
          ctx.roundRect(pillX + pillW / 2, pillY + 1, pillW / 2 - 1, pillH - 2, [0, 7, 7, 0]);
          ctx.fill();
        }

        // Divider
        ctx.strokeStyle = isDarkTheme ? '#2d313b' : '#dcdad0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pillX + pillW / 2, pillY + 6);
        ctx.lineTo(pillX + pillW / 2, pillY + pillH - 6);
        ctx.stroke();

        // Vector Icon & Text for Edit
        const textColor = isDarkTheme ? '#f3f4f6' : '#18181b';
        const mutedColor = isDarkTheme ? '#9ca3af' : '#71717a';

        ctx.strokeStyle = this.hoveredPillSection === 'edit' ? '#e05a47' : mutedColor;
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const editIcoX = pillX + 18;
        const editIcoY = pillY + pillH / 2;
        ctx.beginPath();
        ctx.moveTo(editIcoX - 4, editIcoY + 4);
        ctx.lineTo(editIcoX + 2, editIcoY - 3);
        ctx.lineTo(editIcoX + 4, editIcoY - 1);
        ctx.lineTo(editIcoX - 2, editIcoY + 5);
        ctx.closePath();
        ctx.stroke();

        ctx.font = '500 11.5px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.hoveredPillSection === 'edit' ? (isDarkTheme ? '#ffffff' : '#000000') : textColor;
        ctx.fillText('Edit', editIcoX + 8, editIcoY);

        // Vector Icon & Text for Split Area
        ctx.strokeStyle = this.hoveredPillSection === 'split' ? '#e05a47' : mutedColor;
        const splitIcoX = pillX + pillW / 2 + 16;
        const splitIcoY = pillY + pillH / 2;
        ctx.beginPath();
        ctx.moveTo(splitIcoX - 3, splitIcoY - 4);
        ctx.lineTo(splitIcoX + 3, splitIcoY + 4);
        ctx.moveTo(splitIcoX + 3, splitIcoY - 4);
        ctx.lineTo(splitIcoX - 3, splitIcoY + 4);
        ctx.stroke();

        ctx.fillStyle = this.hoveredPillSection === 'split' ? (isDarkTheme ? '#ffffff' : '#000000') : textColor;
        ctx.fillText('Split Area', splitIcoX + 8, splitIcoY);
        ctx.restore();
      }

      // Room Name & Area Tag at Centroid (Image 1 & 2)
      const centroid = calculateCentroid(room.points);
      const centScr = this.worldToScreen(centroid);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Adaptive Zoom Scaling: Inverse-dampened scaling from 15% to 400%
      const zoomRatio = Math.max(0.15, Math.min(4.0, this.zoom));
      const roomScale = Math.min(1.35, Math.max(0.65, Math.pow(zoomRatio / 0.8, 0.35)));

      const badgeW = Math.round(124 * roomScale);
      const badgeH = Math.round(44 * roomScale);
      const titleFont = Math.round(13 * roomScale);
      const subFont = Math.round(11 * roomScale);
      const offsetTop = Math.round(8 * roomScale);
      const offsetBottom = Math.round(10 * roomScale);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Badge Background matching clean aesthetic
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = isSelected ? '#2563eb' : '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(centScr.x - badgeW / 2, centScr.y - badgeH / 2, badgeW, badgeH, Math.round(6 * roomScale));
      ctx.fill();
      ctx.stroke();

      // Text Labels
      ctx.fillStyle = '#1f2937';
      ctx.font = `700 ${titleFont}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(room.name, centScr.x, centScr.y - offsetTop);

      ctx.fillStyle = '#64748b';
      ctx.font = `600 ${subFont}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(`${room.areaSquareMeters.toFixed(2)} m²`, centScr.x, centScr.y + offsetBottom);

      ctx.restore();
    }
  }

  private drawDimensionBadge(centerScr: Vec2, text: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tm = ctx.measureText(text);
    const bw = Math.max(38, tm.width + 10);
    const bh = 18;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(centerScr.x - bw / 2, centerScr.y - bh / 2, bw, bh, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.fillText(text, centerScr.x, centerScr.y);
    ctx.restore();
  }

  private renderWalls(contours: Record<string, Wall2DContour>) {
    const ctx = this.ctx;

    for (const [wallId, contour] of Object.entries(contours)) {
      const isSelected = this.state.selection.type === 'wall' && this.state.selection.id === wallId;

      ctx.beginPath();
      const p0 = this.worldToScreen(contour.polygon[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < contour.polygon.length; i++) {
        const p = this.worldToScreen(contour.polygon[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();

      // Wall Fill (Architectural dark slate hatch matching Coohom)
      ctx.fillStyle = isSelected ? '#334155' : '#475569';
      ctx.fill();

      // Wall Edges
      ctx.strokeStyle = isSelected ? '#2563eb' : '#1e293b';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Centerline for CAD reference
      const c1 = this.worldToScreen(contour.centerlineStart);
      const c2 = this.worldToScreen(contour.centerlineEnd);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Render solid corner junctions and fillets so corners are 100% continuous without gaps (Image 3 fix)
    for (const node of Object.values(this.state.nodes)) {
      const connected = Object.values(this.state.walls).filter(w => w.startNodeId === node.id || w.endNodeId === node.id);
      if (connected.length < 2) continue;

      const scr = this.worldToScreen(node);
      const isNodeSelected = this.state.selection.type === 'node' && this.state.selection.id === node.id;
      const maxThick = Math.max(...connected.map(w => w.thickness || 240));

      if (node.cornerStyle === 'fillet' && (node.filletRadiusMm || 0) > 0) {
        // Smooth curved fillet corner
        const rPx = (node.filletRadiusMm || 400) * this.zoom;
        ctx.fillStyle = isNodeSelected ? '#334155' : '#475569';
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, rPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isNodeSelected ? '#2563eb' : '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Solid corner seal disc
        const rPx = (maxThick / 2) * this.zoom;
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, rPx, 0, Math.PI * 2);
        ctx.fill();
      }

      // If corner node is selected, render glowing selection ring
      if (isNodeSelected) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderOpenings() {
    const ctx = this.ctx;

    for (const wall of Object.values(this.state.walls)) {
      const p1 = this.state.nodes[wall.startNodeId];
      const p2 = this.state.nodes[wall.endNodeId];
      if (!p1 || !p2 || wall.openings.length === 0) continue;

      const wallLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (wallLen < 1) continue;

      for (const op of wall.openings) {
        const isSelected = this.state.selection.type === 'opening' && this.state.selection.id === op.id;
        const offsetMm = op.offset ?? op.offsetFromStart ?? 0;
        const swingSide: 1 | -1 = op.swingSide ?? 1;
        const hingeSide: 'left' | 'right' = op.hingeSide ?? (op.swingDirection === 'left' ? 'left' : 'right');

        // Draw architectural opening symbol
        OpeningRenderer.renderOpening(
          ctx,
          p1,
          p2,
          wall.thickness,
          offsetMm,
          op.width,
          op.type,
          swingSide,
          hingeSide,
          this.zoom,
          (v) => this.worldToScreen(v),
          isSelected,
          false
        );

        // If selected opening, render split dimension lines (2808 | 907 | 3728)
        if (isSelected) {
          let leftObs = wall.thickness / 2;
          let rightObs = wallLen - wall.thickness / 2;

          for (const ex of wall.openings) {
            if (ex.id === op.id) continue;
            const exOff = ex.offset ?? ex.offsetFromStart ?? 0;
            if (exOff + ex.width / 2 <= offsetMm - op.width / 2) {
              leftObs = Math.max(leftObs, exOff + ex.width / 2);
            }
            if (exOff - ex.width / 2 >= offsetMm + op.width / 2) {
              rightObs = Math.min(rightObs, exOff - ex.width / 2);
            }
          }

          const leftClrMm = Math.max(0, Math.round((offsetMm - op.width / 2) - leftObs));
          const rightClrMm = Math.max(0, Math.round(rightObs - (offsetMm + op.width / 2)));

          OpeningRenderer.renderSplitDimensions(
            ctx,
            p1,
            p2,
            wall.thickness,
            offsetMm,
            op.width,
            leftObs,
            rightObs,
            leftClrMm,
            rightClrMm,
            swingSide,
            this.zoom,
            (v) => this.worldToScreen(v)
          );
        }
      }
    }
  }

  private renderFurniture() {
    const ctx = this.ctx;

    for (const furn of Object.values(this.state.furniture)) {
      const isSelected = this.state.selection.type === 'furniture' && this.state.selection.id === furn.id;
      const scr = this.worldToScreen(furn.position);

      const wPx = furn.dimensions.width * this.zoom;
      const dPx = furn.dimensions.depth * this.zoom;

      ctx.save();
      ctx.translate(scr.x, scr.y);
      ctx.rotate((furn.rotation * Math.PI) / 180);

      // Furniture body box
      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.3)' : 'rgba(74, 111, 165, 0.45)';
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#94a3b8';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(-wPx / 2, -dPx / 2, wPx, dPx, 4);
      ctx.fill();
      ctx.stroke();

      // Orientation marker (tick pointing forward)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, -dPx / 2 + 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label - Always oriented right-side up for readable floor plans (Image 2 fix)
      if (this.zoom > 0.04) {
        ctx.save();
        const normAngle = ((furn.rotation % 360) + 360) % 360;
        if (normAngle > 90 && normAngle <= 270) {
          ctx.rotate(Math.PI);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 10.5px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 3;
        ctx.fillText(furn.name, 0, 0);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  private renderDimensionsAndHandles(contours: Record<string, Wall2DContour>) {
    const ctx = this.ctx;

    // Render Wall Dimensions
    for (const [wallId, contour] of Object.entries(contours)) {
      const p1 = contour.centerlineStart;
      const p2 = contour.centerlineEnd;
      const dir = sub(p2, p1);
      const lengthMm = contour.lengthMm;
      if (lengthMm < 300) continue;

      const unit = scale(dir, 1 / lengthMm);
      const normal = { x: -unit.y, y: unit.x };

      // Dimension line offset 350mm from centerline
      const dimOffset = 380;
      const d1 = this.worldToScreen(add(p1, scale(normal, dimOffset)));
      const d2 = this.worldToScreen(add(p2, scale(normal, dimOffset)));

      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;

      // Extension lines
      const e1Start = this.worldToScreen(p1);
      const e2Start = this.worldToScreen(p2);
      ctx.beginPath();
      ctx.moveTo(e1Start.x, e1Start.y);
      ctx.lineTo(d1.x, d1.y);
      ctx.moveTo(e2Start.x, e2Start.y);
      ctx.lineTo(d2.x, d2.y);
      ctx.stroke();

      // Dimension Line
      ctx.beginPath();
      ctx.moveTo(d1.x, d1.y);
      ctx.lineTo(d2.x, d2.y);
      ctx.stroke();

      // CAD 45-degree architectural slash ticks at ends
      const tickSize = 5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(d1.x - tickSize, d1.y + tickSize);
      ctx.lineTo(d1.x + tickSize, d1.y - tickSize);
      ctx.moveTo(d2.x - tickSize, d2.y + tickSize);
      ctx.lineTo(d2.x + tickSize, d2.y - tickSize);
      ctx.stroke();

      // Dimension Text Badge with Adaptive Zoom Scaling (15% to 400%)
      const midScr = { x: (d1.x + d2.x) / 2, y: (d1.y + d2.y) / 2 };
      const text = `${lengthMm.toLocaleString()} mm`;

      const zoomRatio = Math.max(0.15, Math.min(4.0, this.zoom));
      const adaptiveScale = Math.min(1.3, Math.max(0.65, Math.pow(zoomRatio / 0.8, 0.35)));
      const wallScrLen = Math.hypot(d2.x - d1.x, d2.y - d1.y);
      const fontSize = Math.round(11 * adaptiveScale);

      ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
      const textW = ctx.measureText(text).width;
      const badgeH = Math.round(18 * adaptiveScale);
      const padX = Math.round(5 * adaptiveScale);

      // Collision Guard: only render dimension badge if screen wall length accommodates it
      if (wallScrLen >= textW + 6) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(midScr.x - textW / 2 - padX, midScr.y - badgeH / 2, textW + padX * 2, badgeH, Math.round(4 * adaptiveScale));
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, midScr.x, midScr.y);
      }

      ctx.restore();
    }

    // Render Node Grab Handles
    for (const node of Object.values(this.state.nodes)) {
      const scr = this.worldToScreen(node);
      const isSelected = this.state.selection.type === 'node' && this.state.selection.id === node.id;

      ctx.beginPath();
      ctx.arc(scr.x, scr.y, isSelected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#2563eb' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  private renderToolPreviews() {
    const ctx = this.ctx;
    const curScr = this.worldToScreen(this.currentCursorMm);

    // Category 1: Blueprint Calibration Vector Preview
    if (this.state.blueprintUnderlay?.calibrationState === 'pick_p2' && this.state.blueprintUnderlay.calibrationP1) {
      BlueprintManager.drawCalibrationVector(
        ctx,
        this.state.blueprintUnderlay.calibrationP1,
        this.currentCursorMm,
        (v) => this.worldToScreen(v)
      );
    }

    // Straight Wall / Partition Wall Drawing Rubber-band
    const isWallTool = this.state.activeTool === 'draw_wall' || this.state.activeTool === 'straight_wall' || this.state.activeTool === 'partition_wall';
    if (isWallTool && this.activeDrawStart) {
      const startScr = this.worldToScreen(this.activeDrawStart);

      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(startScr.x, startScr.y);
      ctx.lineTo(curScr.x, curScr.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const drawLenMm = Math.round(dist(this.activeDrawStart, this.currentCursorMm));
      const mid = { x: (startScr.x + curScr.x) / 2, y: (startScr.y + curScr.y) / 2 };
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${drawLenMm} mm (T=${this.currentWallThickness})`, mid.x + 10, mid.y - 10);
      ctx.restore();
    }

    // Rectangular Room Rubber-band
    const isRectTool = this.state.activeTool === 'draw_rect_room' || this.state.activeTool === 'rectangle_wall';
    if (isRectTool && this.rectRoomStartMm) {
      const startScr = this.worldToScreen(this.rectRoomStartMm);
      const wPx = curScr.x - startScr.x;
      const hPx = curScr.y - startScr.y;

      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.strokeRect(startScr.x, startScr.y, wPx, hPx);
      ctx.fillRect(startScr.x, startScr.y, wPx, hPx);
      ctx.setLineDash([]);

      const wMm = Math.round(Math.abs(this.currentCursorMm.x - this.rectRoomStartMm.x));
      const hMm = Math.round(Math.abs(this.currentCursorMm.y - this.rectRoomStartMm.y));
      const areaM2 = ((wMm * hMm) / 1_000_000).toFixed(2);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(`${wMm} × ${hMm} mm (${areaM2} m²)`, curScr.x + 10, curScr.y - 10);
      ctx.restore();
    }

    // Arc Wall Preview (3-Click Circular Arc)
    if (this.state.activeTool === 'arc_wall') {
      if (this.arcStartNode && !this.arcEndNode) {
        const sA = this.worldToScreen(this.arcStartNode);
        ctx.save();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(curScr.x, curScr.y);
        ctx.stroke();
        ctx.fillStyle = '#0284c7';
        ctx.font = '700 11px system-ui, sans-serif';
        const chordLen = Math.round(dist(this.arcStartNode, this.currentCursorMm));
        ctx.fillText(`Chord: ${chordLen} mm`, curScr.x + 10, curScr.y - 10);
        ctx.restore();
      } else if (this.arcStartNode && this.arcEndNode) {
        const arcGeom = calculateArcFromSagitta(this.arcStartNode, this.arcEndNode, this.arcSagitta);
        if (arcGeom) {
          const sCenter = this.worldToScreen(arcGeom.center);
          const rPx = arcGeom.radius * this.zoom;

          ctx.save();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = Math.max(2, this.currentWallThickness * this.zoom);
          ctx.beginPath();
          ctx.arc(sCenter.x, sCenter.y, rPx, arcGeom.startAngle, arcGeom.endAngle, arcGeom.anticlockwise);
          ctx.stroke();

          // Sagitta text badge
          ctx.font = '700 11px system-ui, sans-serif';
          ctx.fillStyle = '#0284c7';
          ctx.fillText(`h: ${this.arcSagitta} mm · R: ${Math.round(arcGeom.radius)} mm`, curScr.x + 10, curScr.y - 10);
          ctx.restore();
        }
      }
    }

    // External Area Preview (Polyline boundary)
    if (this.state.activeTool === 'external_area' && this.activeDrawStart) {
      const sStart = this.worldToScreen(this.activeDrawStart);
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(curScr.x, curScr.y);
      ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText('External Boundary Curb (50mm)', curScr.x + 10, curScr.y - 10);
      ctx.restore();
    }

    // Structure Ghost Preview
    if (isStructureTool(this.state.activeTool)) {
      let structType = (this.state.pendingStructureType || (this.state.activeTool as any)) as StructureType;
      if ((structType as string) === 'place_structure') structType = 'column';
      let wMm = 300, lMm = 300;
      if (structType === 'column') { wMm = 300; lMm = 300; }
      else if (structType === 'beam') { wMm = 300; lMm = 1800; }
      else if (structType === 'staircase') { wMm = 1200; lMm = 3200; }
      else if (structType === 'flue') { wMm = 450; lMm = 450; }
      else if (structType === 'floor_opening') { wMm = 2000; lMm = 2000; }

      const wPx = wMm * this.zoom;
      const lPx = lMm * this.zoom;

      ctx.save();
      ctx.translate(curScr.x, curScr.y);
      ctx.strokeStyle = '#0071e3';
      ctx.fillStyle = 'rgba(0, 113, 227, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-wPx / 2, -lPx / 2, wPx, lPx);
      ctx.fillRect(-wPx / 2, -lPx / 2, wPx, lPx);

      ctx.fillStyle = '#0071e3';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${structType.toUpperCase()} (${wMm}×${lMm})`, 0, -lPx / 2 - 8);
      ctx.restore();
    }

    // Alignment Guides (Dashed cyan orthogonal alignment lines when moving vertex)
    if (this.currentSnap.alignmentGuides && this.currentSnap.alignmentGuides.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      for (const g of this.currentSnap.alignmentGuides) {
        const sA = this.worldToScreen(g.from);
        const sB = this.worldToScreen(g.to);
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Snapping Cursor Indicator
    ctx.save();
    if (this.currentSnap.snappedTo === 'node') {
      ctx.strokeStyle = '#10b981'; // Emerald green for node snap
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(curScr.x, curScr.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.currentSnap.snappedTo === 'alignment') {
      ctx.strokeStyle = '#0284c7'; // Blue for orthogonal guide alignment
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(curScr.x, curScr.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.currentSnap.snappedTo === 'angle') {
      ctx.strokeStyle = '#eab308'; // Yellow for angle snap
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(curScr.x, curScr.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(curScr.x, curScr.y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Door / Window Placement Hover Preview & Split Dimensions
    if (isOpeningTool(this.state.activeTool) && this.hoverOpeningPreview) {
      const prev = this.hoverOpeningPreview;
      if (!prev.wallId) {
        // Red warning box floating at cursor (>500mm free-floating invalid)
        OpeningRenderer.renderInvalidFloatingPreview(
          ctx,
          curScr,
          prev.type,
          prev.width,
          this.zoom
        );
      } else {
        const wall = this.state.walls[prev.wallId];
        if (wall) {
          const p1 = this.state.nodes[wall.startNodeId];
          const p2 = this.state.nodes[wall.endNodeId];
          if (p1 && p2) {
            // Snapped hover preview symbol
            OpeningRenderer.renderOpening(
              ctx,
              p1,
              p2,
              wall.thickness,
              prev.offset,
              prev.width,
              prev.type,
              prev.swingSide,
              prev.hingeSide,
              this.zoom,
              (v) => this.worldToScreen(v),
              false,
              true
            );

            // Split clearance dimensions (2808 | 907 | 3728)
            OpeningRenderer.renderSplitDimensions(
              ctx,
              p1,
              p2,
              wall.thickness,
              prev.offset,
              prev.width,
              prev.leftObstacleOffset,
              prev.rightObstacleOffset,
              prev.leftClearanceMm,
              prev.rightClearanceMm,
              prev.swingSide,
              this.zoom,
              (v) => this.worldToScreen(v)
            );
          }
        }
      }
    }
  }

  private updateOpeningOverlay() {
    let activeOpening: Opening | null = null;
    let activeWall: Wall | null = null;

    if (isOpeningTool(this.state.activeTool) && this.hoverOpeningPreview?.wallId) {
      activeWall = this.state.walls[this.hoverOpeningPreview.wallId] || null;
    } else if (this.state.selection.type === 'opening' && this.state.selection.id) {
      for (const w of Object.values(this.state.walls)) {
        const found = w.openings.find(o => o.id === this.state.selection.id);
        if (found) {
          activeOpening = found;
          activeWall = w;
          break;
        }
      }
    }

    if (activeWall && (this.hoverOpeningPreview?.wallId || activeOpening)) {
      this.openingOverlay?.update(
        isOpeningTool(this.state.activeTool) ? this.hoverOpeningPreview : null,
        activeOpening,
        activeWall,
        this.state.nodes
      );
    } else {
      this.openingOverlay?.hide();
    }
  }
}
