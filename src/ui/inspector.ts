import { projectStore } from '../core/state-store';
import { ProjectState, StructureItem, Point2D, OpeningType } from '../core/types';
import { dist } from '../math/vector2d';
import { showToast } from './toast-notifier';
import { ThreeSceneManager } from '../webgl3d/three-scene';

export type InspectorTab = 'properties' | 'materials' | 'settings';

export class InspectorController {
  private container: HTMLElement;
  private threeScene?: ThreeSceneManager;
  private activeTab: InspectorTab = 'properties';

  constructor(container: HTMLElement, threeScene?: ThreeSceneManager) {
    this.container = container;
    this.threeScene = threeScene;

    // Pointer Event Isolation: Stop propagation so inspector interactions never trigger canvas drawing
    const stopEvents = ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'wheel'];
    for (const evt of stopEvents) {
      this.container.addEventListener(evt, e => e.stopPropagation());
    }

    projectStore.subscribe(state => this.render(state));
  }

  private render(state: ProjectState) {
    const sel = state.selection;

    let contentHtml = '';
    if (this.activeTab === 'materials') {
      contentHtml = this.renderMaterialsTab(state);
    } else if (this.activeTab === 'settings') {
      contentHtml = this.renderSettingsTab(state);
    } else {
      // Properties tab
      if (sel.type === 'node' && sel.id && state.nodes[sel.id]) {
        contentHtml = this.renderNodeInspector(state.nodes[sel.id], state);
      } else if (sel.type === 'wall' && sel.id && state.walls[sel.id]) {
        contentHtml = this.renderWallInspector(state.walls[sel.id], state);
      } else if (sel.type === 'opening' && sel.id) {
        contentHtml = this.renderOpeningInspector(sel.id, state);
      } else if (sel.type === 'room' && sel.id && state.rooms[sel.id]) {
        contentHtml = this.renderRoomInspector(state.rooms[sel.id], state);
      } else if (sel.type === 'furniture' && sel.id && state.furniture[sel.id]) {
        contentHtml = this.renderFurnitureInspector(state.furniture[sel.id]);
      } else if (sel.type === 'structure' && sel.id && state.structures[sel.id]) {
        contentHtml = this.renderStructureInspector(state.structures[sel.id]);
      } else {
        contentHtml = this.renderProjectSummary(state);
      }
    }

    this.container.innerHTML = `
      <div class="inspector-header">
        <div class="segmented-control" style="width: 100%;">
          <button class="seg-btn ${this.activeTab === 'properties' ? 'active' : ''}" data-itab="properties" style="flex: 1; justify-content: center;">Inspect</button>
          <button class="seg-btn ${this.activeTab === 'materials' ? 'active' : ''}" data-itab="materials" style="flex: 1; justify-content: center;">Finishes</button>
          <button class="seg-btn ${this.activeTab === 'settings' ? 'active' : ''}" data-itab="settings" style="flex: 1; justify-content: center;">Settings</button>
        </div>
      </div>
      <div class="inspector-scroll-body">
        ${contentHtml}
      </div>
    `;

    this.container.scrollLeft = 0;
    const scrollBody = this.container.querySelector('.inspector-scroll-body') as HTMLElement | null;
    if (scrollBody) {
      scrollBody.scrollLeft = 0;
    }

    this.bindEvents(state);
  }

  private renderProjectSummary(state: ProjectState) {
    let totalAreaM2 = 0;
    for (const r of Object.values(state.rooms)) {
      totalAreaM2 += r.areaSquareMeters;
    }
    const wallCount = Object.keys(state.walls).length;
    const roomCount = Object.keys(state.rooms).length;
    const furnCount = Object.keys(state.furniture).length;

    return `
      <div class="inspector-card">
        <div class="inspector-card-title">Spatial Summary</div>
        <div class="spatial-hero-card">
          <div class="spatial-hero-lbl">Total Interior Area</div>
          <div class="spatial-hero-val">${totalAreaM2.toFixed(1)} <span class="spatial-hero-unit">m²</span></div>
        </div>
        <div class="spatial-mini-grid">
          <div class="spatial-mini-stat">
            <div class="spatial-mini-num">${roomCount}</div>
            <div class="spatial-mini-lbl">Rooms</div>
          </div>
          <div class="spatial-mini-stat">
            <div class="spatial-mini-num">${wallCount}</div>
            <div class="spatial-mini-lbl">Walls</div>
          </div>
          <div class="spatial-mini-stat">
            <div class="spatial-mini-num">${furnCount}</div>
            <div class="spatial-mini-lbl">Items</div>
          </div>
        </div>
      </div>

      <div class="inspector-card">
        <div class="inspector-card-title">BIM Dimensions</div>
        <div class="prop-group">
          <div class="prop-row">
            <span class="prop-label">Wall Height</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="set-wall-h" value="${state.settings.wallHeight}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Wall Thickness</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="set-wall-t" value="${state.settings.wallThickness}" step="10" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Slab Thickness</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="set-slab-t" value="${state.settings.slabThickness}" step="10" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
        </div>
      </div>

      <div class="inspector-card">
        <div class="inspector-card-title">Grid & Snapping</div>
        <div class="prop-group">
          <div class="prop-row">
            <span class="prop-label">Snap Grid</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="set-grid-size" value="${state.settings.gridSizeMm || 100}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Snap Angle</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="set-snap-angle" value="${state.settings.snapAngleDeg || 45}" step="15" />
              <span class="prop-unit">deg</span>
            </div>
          </div>
        </div>
      </div>

      ${state.blueprintUnderlay ? `
        <div class="inspector-card" style="border: 1px solid #bfdbfe; background: #f8fafc;">
          <div class="inspector-card-title" style="color: #0284c7;">📐 Blueprint Underlay</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="prop-row">
              <span class="prop-label">Scale Ratio</span>
              <span style="font-weight: 700; color: #0284c7; font-size: 12px;">1px = ${state.blueprintUnderlay.mmPerPixel.toFixed(2)} mm</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Underlay Opacity</span>
              <input type="range" id="bp-opacity" min="0.1" max="1.0" step="0.05" value="${state.blueprintUnderlay.opacity}" style="width: 100px; accent-color: #0284c7;" />
            </div>
            <div class="prop-row">
              <span class="prop-label">Show in 3D (Y = -1mm)</span>
              <input type="checkbox" id="bp-show-3d" ${state.blueprintUnderlay.visible3D ? 'checked' : ''} style="accent-color: #0284c7;" />
            </div>
            <div class="prop-row">
              <span class="prop-label">Lock Underlay</span>
              <input type="checkbox" id="bp-locked" ${state.blueprintUnderlay.locked ? 'checked' : ''} style="accent-color: #0284c7;" />
            </div>
            <div style="display: flex; gap: 6px; margin-top: 4px;">
              <button class="btn btn-sm" id="btn-recalib-bp" style="flex: 1;">Recalibrate Scale</button>
              <button class="btn btn-sm btn-danger" id="btn-del-bp" style="flex: 1;">Remove</button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  private renderWallInspector(wall: any, state: ProjectState) {
    const p1 = state.nodes[wall.startNodeId];
    const p2 = state.nodes[wall.endNodeId];
    const lengthMm = (p1 && p2) ? Math.round(dist(p1, p2)) : 0;

    return `
      <div class="inspector-card">
        <div class="inspector-card-title">Wall Properties</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prop-row">
            <span class="prop-label">Length</span>
            <span style="font-weight: 700; color: var(--accent-blue); font-size: 13px;">${lengthMm.toLocaleString()} mm</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Thickness</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="wall-thick" value="${wall.thickness}" step="10" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Height</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="wall-height" value="${wall.height}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
        </div>
      </div>

      <div class="inspector-card">
        <button class="btn btn-danger" id="btn-del-wall" style="width: 100%;">Delete Wall</button>
      </div>
    `;
  }

  private renderNodeInspector(node: Point2D, state: ProjectState) {
    const connectedWalls = Object.values(state.walls).filter(
      w => w.startNodeId === node.id || w.endNodeId === node.id
    );
    const currentStyle = node.cornerStyle || 'sharp';
    const radius = node.filletRadiusMm ?? 400;

    return `
      <div class="inspector-card">
        <div class="inspector-card-title">Corner Point (${node.id})</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prop-row">
            <span class="prop-label">Coordinates</span>
            <span style="font-weight: 600; color: var(--text-primary); font-size: 11px;">
              X: ${Math.round(node.x)} mm, Y: ${Math.round(node.y)} mm
            </span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Connected Walls</span>
            <span style="font-weight: 700; color: var(--accent-blue); font-size: 11.5px;">
              ${connectedWalls.length} wall segments
            </span>
          </div>
        </div>
      </div>

      <div class="inspector-card">
        <div class="inspector-card-title">Corner Geometry / Chamfer</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
          Smooth curved fillet or beveled chamfer in 2D & 3D:
        </div>
        <div class="segmented-control" style="width: 100%; margin-bottom: 12px;">
          <button class="seg-btn ${currentStyle === 'sharp' ? 'active' : ''}" data-corner-style="sharp" style="flex: 1; font-size: 10.5px;">Sharp (90°)</button>
          <button class="seg-btn ${currentStyle === 'fillet' ? 'active' : ''}" data-corner-style="fillet" style="flex: 1; font-size: 10.5px;">Curve (Fillet)</button>
          <button class="seg-btn ${currentStyle === 'chamfer' ? 'active' : ''}" data-corner-style="chamfer" style="flex: 1; font-size: 10.5px;">Bevel (Chamfer)</button>
        </div>

        ${currentStyle !== 'sharp' ? `
          <div class="prop-row" style="margin-bottom: 8px;">
            <span class="prop-label">${currentStyle === 'fillet' ? 'Fillet Radius' : 'Chamfer Size'}</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="node-radius-input" value="${radius}" min="50" max="1500" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <input type="range" id="node-radius-slider" min="50" max="1200" step="25" value="${radius}" style="width: 100%; accent-color: var(--accent-blue);" />
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
            <button class="btn btn-sm" data-radius-preset="200" style="padding: 2px 6px; font-size: 10px;">200 mm</button>
            <button class="btn btn-sm" data-radius-preset="350" style="padding: 2px 6px; font-size: 10px;">350 mm</button>
            <button class="btn btn-sm" data-radius-preset="500" style="padding: 2px 6px; font-size: 10px;">500 mm</button>
            <button class="btn btn-sm" data-radius-preset="800" style="padding: 2px 6px; font-size: 10px;">800 mm</button>
          </div>
        ` : `
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
            <button class="btn btn-sm" data-quick-curve="350" style="padding: 2px 7px; font-size: 10.5px;">+ Smooth Curve 350mm</button>
            <button class="btn btn-sm" data-quick-curve="500" style="padding: 2px 7px; font-size: 10.5px;">+ Smooth Curve 500mm</button>
            <button class="btn btn-sm" data-quick-bevel="300" style="padding: 2px 7px; font-size: 10.5px;">+ Bevel 300mm</button>
          </div>
        `}
      </div>

      <div class="inspector-card">
        <button class="btn btn-danger" id="btn-del-node" style="width: 100%;">Delete Corner Vertex</button>
      </div>
    `;
  }

  private renderOpeningInspector(openingId: string, state: ProjectState) {
    let opening: any = null;
    for (const w of Object.values(state.walls)) {
      const op = w.openings.find(o => o.id === openingId);
      if (op) { opening = op; break; }
    }
    if (!opening) return '';

    const isDoor = opening.type.includes('door');
    const openAngle = opening.openAngleDeg ?? 35;
    const swingSide = opening.swingSide ?? 1;
    const hingeSide = opening.hingeSide ?? (opening.swingDirection === 'left' ? 'left' : 'right');

    return `
      <div class="inspector-card">
        <div class="inspector-card-title">${opening.type.replace(/_/g, ' ').toUpperCase()}</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prop-row">
            <span class="prop-label">Opening Type</span>
            <select class="prop-select" id="op-type-select">
              <option value="door" ${opening.type === 'door' || opening.type === 'single_door' ? 'selected' : ''}>🚪 Single Door</option>
              <option value="double_door" ${opening.type === 'double_door' ? 'selected' : ''}>🚪🚪 Double-Side French Door</option>
              <option value="sliding_door" ${opening.type === 'sliding_door' ? 'selected' : ''}>↔️ Sliding / Pocket Door</option>
              <option value="window" ${opening.type === 'window' ? 'selected' : ''}>🪟 Casement Window</option>
              <option value="floor_to_ceiling_window" ${opening.type === 'floor_to_ceiling_window' ? 'selected' : ''}>🏢 Floor-to-Ceiling Window</option>
              <option value="bay_window" ${opening.type === 'bay_window' ? 'selected' : ''}>🏡 Bay Window</option>
              <option value="cased_opening" ${opening.type === 'cased_opening' ? 'selected' : ''}>🏛️ Cased Opening / Arch</option>
            </select>
          </div>
          <div class="prop-row">
            <span class="prop-label">Width</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="op-width" value="${opening.width}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Height</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="op-height" value="${opening.height}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Sill Height</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="op-sill" value="${opening.sillHeight}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
        </div>
      </div>

      ${isDoor ? `
        <div class="inspector-card">
          <div class="inspector-card-title">Door Swing & 3D Rotation</div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div class="prop-row">
              <span class="prop-label">Open / Swing Angle</span>
              <span id="op-angle-val" style="font-weight: 700; color: var(--accent-blue); font-size: 12.5px;">${openAngle}°</span>
            </div>
            <input type="range" id="op-angle-range" min="0" max="120" step="5" value="${openAngle}" style="width: 100%; accent-color: var(--accent-blue);" />
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <button class="btn btn-sm" data-door-angle="0" style="padding: 2px 6px; font-size: 10px; ${openAngle === 0 ? 'font-weight: 700; border-color: var(--accent-blue);' : ''}">Closed (0°)</button>
              <button class="btn btn-sm" data-door-angle="35" style="padding: 2px 6px; font-size: 10px; ${openAngle === 35 ? 'font-weight: 700; border-color: var(--accent-blue);' : ''}">Ajar (35°)</button>
              <button class="btn btn-sm" data-door-angle="60" style="padding: 2px 6px; font-size: 10px; ${openAngle === 60 ? 'font-weight: 700; border-color: var(--accent-blue);' : ''}">Semi (60°)</button>
              <button class="btn btn-sm" data-door-angle="90" style="padding: 2px 6px; font-size: 10px; ${openAngle === 90 ? 'font-weight: 700; border-color: var(--accent-blue);' : ''}">Open (90°)</button>
              <button class="btn btn-sm" data-door-angle="120" style="padding: 2px 6px; font-size: 10px; ${openAngle === 120 ? 'font-weight: 700; border-color: var(--accent-blue);' : ''}">Wide (120°)</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 4px;">
              <button class="btn btn-sm" id="btn-flip-swing" style="font-size: 10.5px; padding: 4px 4px; text-align: center; justify-content: center;" title="Flip Swing (${swingSide === 1 ? 'Inward' : 'Outward'})">
                ⇋ Swing: <strong>${swingSide === 1 ? 'In' : 'Out'}</strong>
              </button>
              <button class="btn btn-sm" id="btn-flip-hinge" style="font-size: 10.5px; padding: 4px 4px; text-align: center; justify-content: center;" title="Flip Hinge (${hingeSide === 'left' ? 'Left' : 'Right'})">
                ⇄ Hinge: <strong>${hingeSide === 'left' ? 'Left' : 'Right'}</strong>
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="inspector-card">
        <button class="btn btn-danger" id="btn-del-op" style="width: 100%;">Delete Opening</button>
      </div>
    `;
  }

  private renderRoomInspector(room: any, state: ProjectState) {
    const roomPresets = [
      'Living Room', 
      'Primary Bedroom', 
      'Kitchen', 
      'Dining Area', 
      'Bathroom', 
      'Balcony', 
      'Home Office', 
      'Walk-In Closet',
      'Guest Bedroom',
      'Studio'
    ];
    const isIsolated = this.threeScene?.getIsolatedRoomId() === room.id;

    return `
      <div class="inspector-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div class="inspector-card-title" style="margin-bottom: 0;">::: Floor</div>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-sm btn-primary" id="btn-focus-room-3d" style="padding: 3px 8px; font-size: 10px;">🎥 Focus</button>
            <button class="btn btn-sm ${isIsolated ? 'active' : ''}" id="btn-isolate-room" style="padding: 3px 8px; font-size: 10px; ${isIsolated ? 'background: #eff6ff; color: #2563eb; font-weight: 700;' : ''}">
              ${isIsolated ? '✓ Isolated' : 'Isolate'}
            </button>
          </div>
        </div>
        <div class="prop-row" style="margin-top: 6px;">
          <span class="prop-label">Current floor</span>
          <select class="prop-select" style="width: 75px;" id="room-floor-level">
            <option value="1F">1F</option>
            <option value="2F">2F</option>
            <option value="3F" selected>3F</option>
          </select>
        </div>
      </div>

      <div class="inspector-card">
        <div class="inspector-card-title">Basic</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prop-row">
            <span class="prop-label">Interior area</span>
            <span style="font-weight: 700; color: var(--accent-emerald-text); font-size: 13.5px;">${room.areaSquareMeters.toFixed(2)} m²</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Room height</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="set-room-h" value="${state.settings.wallHeight || 2800}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Slab thickness</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="set-slab-t2" value="${state.settings.slabThickness || 120}" step="10" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
        </div>
      </div>

      <div class="inspector-card">
        <div class="inspector-card-title">Opacity</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prop-row">
            <span class="prop-label">Wall</span>
            <input type="range" id="opacity-wall" min="10" max="100" value="100" style="width: 100px; accent-color: var(--accent-blue);" />
          </div>
          <div class="prop-row">
            <span class="prop-label">Floor</span>
            <input type="range" id="opacity-floor" min="10" max="100" value="${Math.round((state.settings.floorOpacity ?? 1) * 100)}" style="width: 100px; accent-color: var(--accent-blue);" />
          </div>
        </div>
      </div>

      <div class="inspector-card">
        <div class="inspector-card-title">Room Label</div>
        <div class="prop-row" style="margin-bottom: 8px;">
          <span class="prop-label">Name</span>
          <div class="prop-input-wrap" style="flex: 1; max-width: 155px; height: 28px;">
            <input type="text" class="prop-input" style="text-align: left; padding-left: 6px; font-weight: 600;" id="room-name" value="${room.name}" />
          </div>
        </div>
        <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 6px;">Quick Presets:</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${roomPresets.map(preset => `
            <button class="btn btn-sm" data-room-preset="${preset}" style="padding: 2px 7px; font-size: 10px; ${room.name === preset ? 'border-color: var(--accent-emerald); font-weight: 700; background: #ecfdf5; color: #065f46;' : ''}">
              ${preset}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="inspector-card">
        <div class="inspector-card-title">Floor Finish</div>
        <div class="prop-row">
          <span class="prop-label">Material</span>
          <select class="prop-select" id="room-floor-mat">
            <option value="oak_parquet" ${room.floorMaterial === 'oak_parquet' ? 'selected' : ''}>🪵 Natural Oak Parquet</option>
            <option value="marble" ${room.floorMaterial === 'marble' ? 'selected' : ''}>🏛️ Carrara White Marble</option>
            <option value="tile" ${room.floorMaterial === 'tile' ? 'selected' : ''}>⬛ Dark Slate Tile</option>
          </select>
        </div>
      </div>
    `;
  }

  private renderFurnitureInspector(furn: any) {
    return `
      <div class="inspector-card">
        <div class="inspector-card-title">${furn.name}</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prop-row">
            <span class="prop-label">Rotation</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="furn-rot" value="${furn.rotation}" step="15" />
              <span class="prop-unit">deg</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Width</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="furn-w" value="${furn.dimensions.width}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Depth</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="furn-d" value="${furn.dimensions.depth}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Color Tint</span>
            <input type="color" class="prop-color" id="furn-col" value="${furn.colorTint || '#4a6fa5'}" />
          </div>
        </div>
      </div>

      <div class="inspector-card">
        <button class="btn btn-danger" id="btn-del-furn" style="width: 100%;">Delete Item</button>
      </div>
    `;
  }

  private renderStructureInspector(struct: StructureItem) {
    return `
      <div class="inspector-card">
        <div class="inspector-card-title">${struct.type.replace(/_/g, ' ').toUpperCase()}</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prop-row">
            <span class="prop-label">Width</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="struct-w" value="${struct.dimensions.width}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Length</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="struct-l" value="${struct.dimensions.length}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Height</span>
            <div class="prop-input-well">
              <input type="number" class="prop-input" id="struct-h" value="${struct.dimensions.height}" step="50" />
              <span class="prop-unit">mm</span>
            </div>
          </div>
          ${struct.type === 'column' ? `
            <div class="prop-row">
              <span class="prop-label">Profile</span>
              <select class="prop-select" id="struct-subtype">
                <option value="square" ${struct.subType === 'square' ? 'selected' : ''}>Square (300×300)</option>
                <option value="round" ${struct.subType === 'round' ? 'selected' : ''}>Round (Ø300)</option>
              </select>
            </div>
          ` : ''}
          ${struct.type === 'staircase' ? `
            <div class="prop-row">
              <span class="prop-label">Riser Count</span>
              <div class="prop-input-well">
                <input type="number" class="prop-input" id="struct-risers" value="${struct.riserCount || 16}" min="4" max="32" step="1" />
              </div>
            </div>
          ` : ''}
          ${struct.type === 'flue' ? `
            <div class="prop-row">
              <span class="prop-label">Wall Thickness</span>
              <div class="prop-input-well">
                <input type="number" class="prop-input" id="struct-flue-t" value="${struct.wallThickness || 60}" step="10" />
                <span class="prop-unit">mm</span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="inspector-card">
        <button class="btn btn-danger" id="btn-del-struct" style="width: 100%;">Delete ${struct.type.replace(/_/g, ' ')}</button>
      </div>
    `;
  }

  private renderMaterialsTab(state: ProjectState) {
    const finishes = [
      { id: 'oak_parquet', name: 'Warm Oak Parquet', type: 'floor', color: '#c4ab93', icon: '🪵' },
      { id: 'marble', name: 'Carrara White Marble', type: 'floor', color: '#f5f6f8', icon: '🏛️' },
      { id: 'tile', name: 'Dark Slate Ceramic', type: 'floor', color: '#2d3748', icon: '⬛' },
      { id: 'plaster_white', name: 'Clean White Plaster', type: 'wall', color: '#f8fafc', icon: '🧱' },
      { id: 'concrete', name: 'Architectural Concrete', type: 'wall', color: '#94a3b8', icon: '🏢' }
    ];

    return `
      <div class="inspector-card">
        <div class="inspector-card-title">Finishes Palette</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 10px;">
          Click a finish below to apply to the currently selected room or wall:
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${finishes.map(f => `
            <div class="catalog-item-card" data-apply-finish="${f.id}" style="cursor: pointer; border-left: 4px solid ${f.color};">
              <div class="catalog-item-icon">${f.icon}</div>
              <div class="catalog-item-info">
                <span class="catalog-item-name">${f.name}</span>
                <span class="catalog-item-dim">${f.type.toUpperCase()} FINISH</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderSettingsTab(state: ProjectState) {
    const s = state.settings;
    return `
      <div class="inspector-card">
        <div class="inspector-card-title">Architectural Defaults</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prop-row">
            <span class="prop-label">Default Wall Height</span>
            <input type="number" class="prop-input" id="set-wall-h" value="${s.wallHeight}" step="50" />
          </div>
          <div class="prop-row">
            <span class="prop-label">Default Wall Thickness</span>
            <input type="number" class="prop-input" id="set-wall-t" value="${s.wallThickness}" step="10" />
          </div>
          <div class="prop-row">
            <span class="prop-label">Slab Thickness</span>
            <input type="number" class="prop-input" id="set-slab-t" value="${s.slabThickness}" step="10" />
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(state: ProjectState) {
    // Inspector top tab switching
    this.container.querySelectorAll('[data-itab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-itab') as InspectorTab;
        this.render(projectStore.getState());
      });
    });

    // BIM Dimensions settings
    this.container.querySelector('#set-wall-h')?.addEventListener('change', (e) => {
      projectStore.updateSettings({ wallHeight: Number((e.target as HTMLInputElement).value) });
      showToast('Wall height updated');
    });
    this.container.querySelector('#set-wall-t')?.addEventListener('change', (e) => {
      projectStore.updateSettings({ wallThickness: Number((e.target as HTMLInputElement).value) });
      showToast('Wall thickness updated');
    });
    this.container.querySelector('#set-slab-t')?.addEventListener('change', (e) => {
      projectStore.updateSettings({ slabThickness: Number((e.target as HTMLInputElement).value) });
      showToast('Slab thickness updated');
    });
    this.container.querySelector('#set-grid-size')?.addEventListener('change', (e) => {
      projectStore.updateSettings({ gridSizeMm: Number((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#set-snap-angle')?.addEventListener('change', (e) => {
      projectStore.updateSettings({ snapAngleDeg: Number((e.target as HTMLInputElement).value) });
    });

    // Wall properties
    const sel = state.selection;
    if (sel.type === 'wall' && sel.id) {
      const wallId = sel.id;
      this.container.querySelector('#wall-thick')?.addEventListener('change', (e) => {
        projectStore.updateWall(wallId, { thickness: Number((e.target as HTMLInputElement).value) });
      });
      this.container.querySelector('#wall-height')?.addEventListener('change', (e) => {
        projectStore.updateWall(wallId, { height: Number((e.target as HTMLInputElement).value) });
      });
      this.container.querySelector('#btn-del-wall')?.addEventListener('click', () => {
        projectStore.deleteWall(wallId);
        showToast('Wall deleted');
      });
    }

    // Corner Node properties
    if (sel.type === 'node' && sel.id && state.nodes[sel.id]) {
      const nodeId = sel.id;
      this.container.querySelectorAll('[data-corner-style]').forEach(btn => {
        btn.addEventListener('click', () => {
          const style = btn.getAttribute('data-corner-style') as 'sharp' | 'fillet' | 'chamfer';
          const currentRadius = state.nodes[nodeId]?.filletRadiusMm ?? 400;
          projectStore.updateNode(nodeId, { cornerStyle: style, filletRadiusMm: currentRadius });
          showToast(`Corner set to ${style.toUpperCase()}`);
        });
      });
      this.container.querySelector('#node-radius-input')?.addEventListener('change', (e) => {
        const val = Math.max(0, Number((e.target as HTMLInputElement).value));
        projectStore.updateNode(nodeId, { filletRadiusMm: val });
      });
      this.container.querySelector('#node-radius-slider')?.addEventListener('input', (e) => {
        const val = Number((e.target as HTMLInputElement).value);
        const input = this.container.querySelector('#node-radius-input') as HTMLInputElement | null;
        if (input) input.value = String(val);
        projectStore.updateNode(nodeId, { filletRadiusMm: val });
      });
      this.container.querySelectorAll('[data-radius-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Number(btn.getAttribute('data-radius-preset'));
          projectStore.updateNode(nodeId, { filletRadiusMm: r });
        });
      });
      this.container.querySelectorAll('[data-quick-curve]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Number(btn.getAttribute('data-quick-curve'));
          projectStore.updateNode(nodeId, { cornerStyle: 'fillet', filletRadiusMm: r });
          showToast(`Applied smooth curved corner (R=${r}mm)`);
        });
      });
      this.container.querySelectorAll('[data-quick-bevel]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Number(btn.getAttribute('data-quick-bevel'));
          projectStore.updateNode(nodeId, { cornerStyle: 'chamfer', filletRadiusMm: r });
          showToast(`Applied chamfered bevel corner (${r}mm)`);
        });
      });
      this.container.querySelector('#btn-del-node')?.addEventListener('click', () => {
        projectStore.deleteNode(nodeId);
        showToast('Corner vertex deleted');
      });
    }

    // Opening properties
    if (sel.type === 'opening' && sel.id) {
      const opId = sel.id;
      this.container.querySelector('#op-type-select')?.addEventListener('change', (e) => {
        const newType = (e.target as HTMLSelectElement).value as OpeningType;
        projectStore.updateOpening(opId, { type: newType });
        showToast(`Opening converted to ${newType.replace(/_/g, ' ')}`);
      });
      this.container.querySelector('#op-width')?.addEventListener('change', (e) => {
        projectStore.updateOpening(opId, { width: Number((e.target as HTMLInputElement).value) });
      });
      this.container.querySelector('#op-height')?.addEventListener('change', (e) => {
        projectStore.updateOpening(opId, { height: Number((e.target as HTMLInputElement).value) });
      });
      this.container.querySelector('#op-sill')?.addEventListener('change', (e) => {
        projectStore.updateOpening(opId, { sillHeight: Number((e.target as HTMLInputElement).value) });
      });
      this.container.querySelector('#op-angle-range')?.addEventListener('input', (e) => {
        const val = Number((e.target as HTMLInputElement).value);
        const valSpan = this.container.querySelector('#op-angle-val');
        if (valSpan) valSpan.textContent = `${val}°`;
        projectStore.updateOpening(opId, { openAngleDeg: val });
      });
      this.container.querySelectorAll('[data-door-angle]').forEach(btn => {
        btn.addEventListener('click', () => {
          const angle = Number(btn.getAttribute('data-door-angle'));
          projectStore.updateOpening(opId, { openAngleDeg: angle });
          showToast(`Door open angle set to ${angle}°`);
        });
      });
      this.container.querySelector('#btn-flip-swing')?.addEventListener('click', () => {
        for (const w of Object.values(state.walls)) {
          const op = w.openings.find(o => o.id === opId);
          if (op) {
            const current = op.swingSide ?? 1;
            const newSide = (current === 1 ? -1 : 1) as 1 | -1;
            projectStore.updateOpening(opId, { swingSide: newSide });
            showToast(`Door swing flipped ${newSide === 1 ? 'Inward' : 'Outward'}`);
            break;
          }
        }
      });
      this.container.querySelector('#btn-flip-hinge')?.addEventListener('click', () => {
        for (const w of Object.values(state.walls)) {
          const op = w.openings.find(o => o.id === opId);
          if (op) {
            const currentHinge = op.hingeSide ?? (op.swingDirection === 'left' ? 'left' : 'right');
            const newHinge = currentHinge === 'left' ? 'right' : 'left';
            projectStore.updateOpening(opId, { hingeSide: newHinge, swingDirection: newHinge });
            showToast(`Door hinge moved to ${newHinge}`);
            break;
          }
        }
      });
      this.container.querySelector('#btn-del-op')?.addEventListener('click', () => {
        projectStore.deleteOpening(opId);
        showToast('Opening deleted');
      });
    }

    // Room properties
    if (sel.type === 'room' && sel.id) {
      const roomId = sel.id;
      const roomNameInput = this.container.querySelector('#room-name') as HTMLInputElement | null;
      if (roomNameInput) {
        roomNameInput.addEventListener('input', (e) => {
          const name = (e.target as HTMLInputElement).value;
          projectStore.updateRoom(roomId, { name });
        });
        roomNameInput.addEventListener('change', (e) => {
          const name = (e.target as HTMLInputElement).value;
          projectStore.updateRoom(roomId, { name });
        });
      }
      this.container.querySelector('#btn-focus-room-3d')?.addEventListener('click', () => {
        this.threeScene?.focusRoom(roomId);
        showToast(`Focusing 3D camera on ${state.rooms[roomId]?.name || 'Room'}`);
      });
      this.container.querySelector('#btn-isolate-room')?.addEventListener('click', () => {
        if (this.threeScene?.getIsolatedRoomId() === roomId) {
          this.threeScene.setIsolatedRoom(null);
          showToast('Exited room isolation');
        } else {
          this.threeScene?.setIsolatedRoom(roomId);
          showToast(`Isolated ${state.rooms[roomId]?.name || 'Room'} in 3D`);
        }
      });
      this.container.querySelector('#set-room-h')?.addEventListener('change', (e) => {
        projectStore.updateSettings({ wallHeight: Number((e.target as HTMLInputElement).value) });
        showToast('Room height updated');
      });
      this.container.querySelector('#set-slab-t2')?.addEventListener('change', (e) => {
        projectStore.updateSettings({ slabThickness: Number((e.target as HTMLInputElement).value) });
        showToast('Slab thickness updated');
      });
      this.container.querySelector('#opacity-floor')?.addEventListener('input', (e) => {
        const val = Number((e.target as HTMLInputElement).value) / 100;
        projectStore.updateSettings({ floorOpacity: val });
      });
      this.container.querySelectorAll('[data-room-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          const name = btn.getAttribute('data-room-preset');
          if (name) {
            projectStore.updateRoom(roomId, { name });
            showToast(`Renamed room to ${name}`);
          }
        });
      });
      this.container.querySelector('#room-floor-mat')?.addEventListener('change', (e) => {
        projectStore.updateRoom(roomId, { floorMaterial: (e.target as HTMLSelectElement).value });
        showToast('Updated floor finish');
      });
    }

    // Furniture properties
    if (sel.type === 'furniture' && sel.id) {
      const furnId = sel.id;
      this.container.querySelector('#furn-rot')?.addEventListener('change', (e) => {
        projectStore.updateFurniture(furnId, { rotation: Number((e.target as HTMLInputElement).value) });
      });
      this.container.querySelector('#furn-w')?.addEventListener('change', (e) => {
        const w = Number((e.target as HTMLInputElement).value);
        projectStore.updateFurniture(furnId, { dimensions: { ...state.furniture[furnId].dimensions, width: w } });
      });
      this.container.querySelector('#furn-d')?.addEventListener('change', (e) => {
        const d = Number((e.target as HTMLInputElement).value);
        projectStore.updateFurniture(furnId, { dimensions: { ...state.furniture[furnId].dimensions, depth: d } });
      });
      this.container.querySelector('#furn-col')?.addEventListener('change', (e) => {
        projectStore.updateFurniture(furnId, { colorTint: (e.target as HTMLInputElement).value });
      });
      this.container.querySelector('#btn-del-furn')?.addEventListener('click', () => {
        projectStore.deleteFurniture(furnId);
        showToast('Furniture removed');
      });
    }

    // Structure properties
    if (sel.type === 'structure' && sel.id && state.structures[sel.id]) {
      const structId = sel.id;
      const struct = state.structures[structId];

      this.container.querySelector('#struct-w')?.addEventListener('change', (e) => {
        const w = Number((e.target as HTMLInputElement).value);
        projectStore.updateStructure(structId, { dimensions: { ...struct.dimensions, width: w } });
      });
      this.container.querySelector('#struct-l')?.addEventListener('change', (e) => {
        const l = Number((e.target as HTMLInputElement).value);
        projectStore.updateStructure(structId, { dimensions: { ...struct.dimensions, length: l } });
      });
      this.container.querySelector('#struct-h')?.addEventListener('change', (e) => {
        const h = Number((e.target as HTMLInputElement).value);
        projectStore.updateStructure(structId, { dimensions: { ...struct.dimensions, height: h } });
      });
      this.container.querySelector('#struct-subtype')?.addEventListener('change', (e) => {
        projectStore.updateStructure(structId, { subType: (e.target as HTMLSelectElement).value });
      });
      this.container.querySelector('#struct-risers')?.addEventListener('change', (e) => {
        projectStore.updateStructure(structId, { riserCount: Number((e.target as HTMLInputElement).value) });
      });
      this.container.querySelector('#struct-flue-t')?.addEventListener('change', (e) => {
        projectStore.updateStructure(structId, { wallThickness: Number((e.target as HTMLInputElement).value) });
      });
      this.container.querySelector('#btn-del-struct')?.addEventListener('click', () => {
        projectStore.deleteStructure(structId);
        showToast('Structure removed');
      });
    }

    // Blueprint Underlay controls
    if (state.blueprintUnderlay) {
      this.container.querySelector('#bp-opacity')?.addEventListener('input', (e) => {
        const opacity = parseFloat((e.target as HTMLInputElement).value);
        projectStore.updateBlueprintUnderlay({ opacity });
      });
      this.container.querySelector('#bp-show-3d')?.addEventListener('change', (e) => {
        const visible3D = (e.target as HTMLInputElement).checked;
        projectStore.updateBlueprintUnderlay({ visible3D });
        showToast(visible3D ? 'Showing blueprint on 3D ground plane' : 'Hidden in 3D');
      });
      this.container.querySelector('#bp-locked')?.addEventListener('change', (e) => {
        const locked = (e.target as HTMLInputElement).checked;
        projectStore.updateBlueprintUnderlay({ locked });
        showToast(locked ? 'Blueprint locked' : 'Blueprint unlocked');
      });
      this.container.querySelector('#btn-recalib-bp')?.addEventListener('click', () => {
        projectStore.updateBlueprintUnderlay({
          calibrationState: 'pick_p1',
          calibrationP1: undefined,
          calibrationP2: undefined,
          locked: false
        });
        projectStore.setActiveTool('import_2d_drawing');
        showToast('Click Point 1 on a known dimension line to recalibrate scale.');
      });
      this.container.querySelector('#btn-del-bp')?.addEventListener('click', () => {
        projectStore.setBlueprintUnderlay(null);
        showToast('Blueprint removed');
      });
    }

    // Apply finishes palette
    this.container.querySelectorAll('[data-apply-finish]').forEach(el => {
      el.addEventListener('click', () => {
        const finishId = el.getAttribute('data-apply-finish')!;
        if (sel.type === 'room' && sel.id) {
          projectStore.updateRoom(sel.id, { floorMaterial: finishId });
          showToast(`Applied ${finishId.replace('_', ' ')}`);
        } else {
          showToast(`Click a room to apply ${finishId.replace('_', ' ')}`);
        }
      });
    });
  }
}
