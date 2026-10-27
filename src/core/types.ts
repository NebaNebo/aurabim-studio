/**
 * AuraBIM Spatial Data Model
 * Single Source of Truth (SSOT) representations for 2D CAD & 3D Interior Design
 * Obeying the 17-Tool Architectural Specification
 */

export interface Point2D {
  id: string;
  x: number; // Stored in millimeters (mm)
  y: number; // Stored in millimeters (mm)
  cornerStyle?: 'sharp' | 'fillet' | 'chamfer'; // Smooth curve or bevel at corner
  filletRadiusMm?: number; // Fillet/chamfer radius in millimeters (e.g. 400mm)
}

export type OpeningType = 
  | 'door' 
  | 'double_door' 
  | 'sliding_door' 
  | 'unequal_double_door'
  | 'window' 
  | 'floor_to_ceiling_window' 
  | 'sliding_window'
  | 'bay_window' 
  | 'trapezoid_bay' 
  | 'corner_bay'
  | 'opening' 
  | 'arched_opening'
  | 'niche'
  | 'bay_window_sill'
  | 'cased_opening';

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  offset: number;              // Center distance from wall startNode in mm
  offsetFromStart?: number;    // Backwards-compatibility alias
  width: number;               // Millimeters (e.g. 907 for single, 1800 for double)
  height: number;              // Millimeters (e.g. 2100 for door, 1500 for window)
  sillHeight: number;          // Millimeters from floor (0 for doors, 900 for windows, 500 for bay window)
  depth?: number;              // Millimeters protrusion/recess (e.g. 600 for bay window, 150 for niche)
  swingSide?: 1 | -1;          // +1 or -1 (which room side the door/protrusion faces)
  hingeSide?: 'left' | 'right'; // Which edge holds the hinge pin
  swingDirection?: 'left' | 'right'; // Compatibility alias
  subType?: string;
  openAngleDeg?: number;       // Opening rotation in 3D (0° = closed, 35° = ajar, 90° = open)
}

export interface HoverOpeningPreview {
  active: boolean;
  type: OpeningType;
  wallId: string | null;       // null if cursor is > 500mm from any wall (draws red invalid box)
  worldX: number;              // Snapped X (or raw mouse X if unattached)
  worldY: number;              // Snapped Y (or raw mouse Y if unattached)
  angle: number;               // Wall angle in radians (0 if unattached)
  offset: number;              // Distance along wall vector from startNode in mm
  width: number;               // Opening width in mm (e.g. 907)
  height: number;              // Opening height in mm
  depth?: number;              // Depth for bay window or niche
  swingSide: 1 | -1;           // Dynamically flipped by cursor side relative to wall centerline
  hingeSide: 'left' | 'right'; // Toggled via Spacebar
  leftObstacleOffset: number;  // Start of available wall span in mm
  rightObstacleOffset: number; // End of available wall span in mm
  leftClearanceMm: number;     // Distance from left obstacle to opening left edge (e.g. 2808)
  rightClearanceMm: number;    // Distance from opening right edge to right obstacle (e.g. 3728)
}

export interface Wall {
  id: string;
  startNodeId: string; // Reference to Point2D id
  endNodeId: string;   // Reference to Point2D id
  thickness: number;   // Millimeters (default 240mm or 120mm)
  height: number;      // Millimeters (default 2800mm, or 1200mm for pony wall, or 150mm for curb)
  openings: Opening[];
  exteriorMaterial: string;
  interiorMaterial: string;
  isPartition?: boolean; // Half-height or thin divider wall
  isCurved?: boolean;    // Arc wall
  arcSagitta?: number;   // Signed sagitta height h in mm
  arcRadius?: number;    // Radius R in mm
  arcCenter?: { x: number; y: number };
  arcStartAngle?: number;
  arcEndAngle?: number;
  isExternalAreaBoundary?: boolean; // Outdoor curb/railing
}

export interface RoomPolygon {
  id: string;
  name: string;             // e.g. "Living Room", "Master Bedroom", "Balcony"
  nodeIds: string[];        // Ordered cycle of node IDs (counter-clockwise)
  points: { x: number; y: number }[]; // Pre-computed polygon vertices in mm
  areaSquareMeters: number; // Computed via Shoelace formula
  perimeterMeters: number;  // Computed boundary perimeter
  floorMaterial: string;    // 'oak_parquet' | 'herringbone' | 'marble' | 'tile' | 'concrete' | 'outdoor_deck'
  ceilingMaterial: string;
  isExternalArea?: boolean; // Balcony / Outdoor patio (no ceiling slab)
}

export type StructureType = 
  | 'column' 
  | 'beam' 
  | 'staircase' 
  | 'flue' 
  | 'floor_opening' 
  | 'bay_window_sill';

export interface StructureItem {
  id: string;
  type: StructureType;
  subType?: string; // 'square' | 'round' | 'straight' | 'l_shaped' | 'u_shaped' | 'spiral'
  position: { x: number; y: number; z: number }; // mm
  rotation: number; // degrees
  dimensions: { width: number; length: number; height: number }; // mm
  wallThickness?: number; // for flue (e.g. 60mm)
  distanceFromTop?: number; // for beam (e.g. 0mm)
  riserCount?: number; // for staircase (e.g. 16)
  elevation?: number; // for sill or beam
  material?: string;
  roomPolygonId?: string; // for floor_opening
}

export interface BlueprintUnderlay {
  imageUrl: string;
  imageElement?: HTMLImageElement;
  x: number; // mm
  y: number; // mm
  widthPx: number;
  heightPx: number;
  mmPerPixel: number; // scale calibration (e.g. 10mm per pixel)
  opacity: number; // 0 to 1 (default 0.45)
  locked: boolean;
  visible3D: boolean; // render on Y = -1mm ground plane in 3D
  calibrationState: 'none' | 'pick_p1' | 'pick_p2' | 'enter_length';
  calibrationP1?: { x: number; y: number };
  calibrationP2?: { x: number; y: number };
}

export type FurnitureCategory = 'seating' | 'tables' | 'beds' | 'storage' | 'lighting' | 'plants' | 'decor';

export interface FurnitureItem {
  id: string;
  catalogId: string;
  name: string;
  category: FurnitureCategory;
  position: { x: number; y: number; z: number }; // mm in 3D world (z is elevation above floor)
  rotation: number; // Rotation in degrees around vertical Y axis
  dimensions: { width: number; depth: number; height: number }; // mm
  colorTint: string;
  modelType: string; // Procedural primitive type or asset identifier
}

export interface ProjectSettings {
  wallHeight: number;       // default 2800 mm
  wallThickness: number;    // default 240 mm (spec standard)
  slabThickness: number;    // default 150 mm
  gridSizeMm: number;       // default 100 mm (major ticks at 1000mm)
  snapAngleDeg: number;     // default 45 deg
  measurementUnit: 'mm' | 'm';
  floorOpacity: number;     // default 1.0, lowered to 0.45 when 2D drawing is imported
  autoCutawayWall: boolean; // 3D dollhouse auto cutaway
}

export type ActiveTool = 
  | 'select' 
  // Category 1
  | 'import_2d_drawing'
  // Category 2
  | 'straight_wall' 
  | 'rectangle_wall' 
  | 'arc_wall' 
  | 'external_area'
  // Category 3
  | 'door'
  | 'window'
  | 'bay_window'
  | 'opening'
  // Category 4
  | 'column'
  | 'beam'
  | 'staircase'
  | 'flue'
  | 'floor_opening'
  | 'partition_wall'
  | 'bay_window_sill'
  | 'niche'
  // Core aliases
  | 'draw_wall' 
  | 'draw_rect_room' 
  | 'place_opening'
  | 'place_structure'
  | 'place_furniture'
  | 'split_wall' 
  | 'delete';

export interface SelectionState {
  type: 'none' | 'node' | 'wall' | 'opening' | 'room' | 'furniture' | 'structure' | 'blueprint';
  id: string | null;
}

export interface ProjectState {
  version: string;
  id: string;
  name: string;
  settings: ProjectSettings;
  nodes: Record<string, Point2D>;
  walls: Record<string, Wall>;
  rooms: Record<string, RoomPolygon>;
  structures: Record<string, StructureItem>;
  furniture: Record<string, FurnitureItem>;
  blueprintUnderlay: BlueprintUnderlay | null;
  selection: SelectionState;
  activeTool: ActiveTool;
  pendingOpeningType?: OpeningType;
  pendingStructureType?: StructureType;
  pendingStructureSubType?: string;
  pendingFurnitureCatalogId?: string;
  viewMode: '2d_main' | '3d_main' | 'walkthrough';
  pipVisible: boolean;
}
