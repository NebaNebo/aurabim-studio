import { projectStore } from '../../core/state-store';
import { ICONS } from '../icons';
import { DockSubtypes, formatSubtypeLabel } from './dock-types';

export class FloorPlanDockRenderer {
  public static render(container: HTMLElement, subtypes: DockSubtypes, searchQuery: string): void {
    const underlay = projectStore.getState().blueprintUnderlay;
    const activeTool = projectStore.getState().activeTool;

    container.innerHTML = `
      <div class="dock-header-bar">
        <div class="dock-breadcrumb-pill" title="Current Workspace Mode">
          <span class="dock-breadcrumb-icon">${ICONS.blueprint}</span>
          <span class="dock-breadcrumb-text">Floor Plan (17 Tools)</span>
          <span class="dock-breadcrumb-arrow">${ICONS.chevronDown}</span>
        </div>
        <button class="dock-select-btn ${activeTool === 'select' ? 'active' : ''}" id="btn-select-tool" title="Select & Move (V / Esc)">
          ${ICONS.cursorSelect}
        </button>
      </div>

      <div class="dock-search-wrap">
        <span class="dock-search-icon">${ICONS.search}</span>
        <input 
          type="text" 
          class="dock-search-input" 
          id="input-dock-search" 
          placeholder="Find tool or opening..." 
          value="${escapeAttr(searchQuery)}" 
        />
      </div>

      <input type="file" id="blueprint-file-input" accept=".png,.jpg,.jpeg,.webp,.svg" style="display: none;" />

      <div class="dock-scroll-area">

        <!-- CATEGORY 1: IMPORT FLOOR PLAN -->
        <div class="dock-section" data-section="import">
          <div class="dock-section-header">
            <span class="dock-section-title">1. Import Floor Plan</span>
            <div class="dock-section-meta">
              <span class="dock-badge-pill">${underlay ? 'Calibrated' : '1'}</span>
              <span class="dock-collapse-chevron">${ICONS.chevronUp}</span>
            </div>
          </div>
          <div class="dock-section-body">
            <div class="tool-card" id="tile-import-blueprint" data-tool="import_2d_drawing" title="Import 2D Blueprint underlay (.png, .jpg, .webp, .svg)">
              <div class="tool-card-icon">${ICONS.importFile}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Import 2D Drawing</span>
                <span class="tool-card-desc">${underlay ? `Active (${underlay.mmPerPixel.toFixed(1)} mm/px)` : '2-point scale calibration underlay'}</span>
              </div>
              <span class="dock-badge-pill">IMG</span>
            </div>
          </div>
        </div>

        <!-- CATEGORY 2: DRAW ROOM -->
        <div class="dock-section" data-section="draw">
          <div class="dock-section-header">
            <span class="dock-section-title">2. Draw Room</span>
            <div class="dock-section-meta">
              <span class="dock-badge-pill">4</span>
              <span class="dock-collapse-chevron">${ICONS.chevronUp}</span>
            </div>
          </div>
          <div class="dock-section-body">
            <div class="tool-card" data-tool="straight_wall" title="Straight Wall: Continuous walls with auto-split intersections (Shortcut: B)">
              <div class="tool-card-icon">${ICONS.straightWall}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Straight Wall</span>
                <span class="tool-card-desc">240mm / 120mm (Tab)</span>
              </div>
              <kbd class="tool-card-shortcut">B</kbd>
            </div>

            <div class="tool-card" data-tool="rectangle_wall" title="Rectangle Wall: Instant 4-wall room with collinear overlap merge (Shortcut: F)">
              <div class="tool-card-icon">${ICONS.rectangleWall}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Rectangle Wall</span>
                <span class="tool-card-desc">4 walls with collinear merge</span>
              </div>
              <kbd class="tool-card-shortcut">F</kbd>
            </div>

            <div class="tool-card" data-tool="arc_wall" title="Arc Wall: 3-point circular curved wall (Shortcut: H)">
              <div class="tool-card-icon">${ICONS.arcWall}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Arc Wall</span>
                <span class="tool-card-desc">3-point circular curved wall</span>
              </div>
              <kbd class="tool-card-shortcut">H</kbd>
            </div>

            <div class="tool-card" data-tool="external_area" title="External Area: Balcony/patio slab with 50mm curb and deck hatch">
              <div class="tool-card-icon">${ICONS.externalArea}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">External Area</span>
                <span class="tool-card-desc">Balcony & patio 50mm curb</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CATEGORY 3: DOORS & WINDOWS -->
        <div class="dock-section" data-section="openings">
          <div class="dock-section-header">
            <span class="dock-section-title">3. Doors & Windows</span>
            <div class="dock-section-meta">
              <span class="dock-badge-pill">6</span>
              <span class="dock-collapse-chevron">${ICONS.chevronUp}</span>
            </div>
          </div>
          <div class="dock-section-body">
            
            <!-- Door -->
            <div class="tool-card" data-opening="door" data-current-sub="${subtypes.door}" title="Door: 1D wall hosted with split clearances & swing arc">
              <div class="tool-card-icon">${ICONS.door}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Door</span>
                <span class="tool-card-desc">Clearance swing dimensions</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="door">${formatSubtypeLabel('door', subtypes.door)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="door">
              <button class="tool-subchip ${subtypes.door === 'single_door' ? 'active' : ''}" data-sub="single_door">Single (907mm)</button>
              <button class="tool-subchip ${subtypes.door === 'double_door' ? 'active' : ''}" data-sub="double_door">Double (1800mm)</button>
              <button class="tool-subchip ${subtypes.door === 'sliding_door' ? 'active' : ''}" data-sub="sliding_door">Sliding (1600mm)</button>
              <button class="tool-subchip ${subtypes.door === 'unequal_double_door' ? 'active' : ''}" data-sub="unequal_double_door">Unequal</button>
            </div>

            <!-- Window -->
            <div class="tool-card" data-opening="window" data-current-sub="${subtypes.window}" title="Window: Architectural 3-line glazing with mullions">
              <div class="tool-card-icon">${ICONS.window}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Window</span>
                <span class="tool-card-desc">Glazing pane & aluminum frame</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="window">${formatSubtypeLabel('window', subtypes.window)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="window">
              <button class="tool-subchip ${subtypes.window === 'casement_window' ? 'active' : ''}" data-sub="casement_window">Casement (1800×1500)</button>
              <button class="tool-subchip ${subtypes.window === 'floor_to_ceiling_window' ? 'active' : ''}" data-sub="floor_to_ceiling_window">Floor-to-Ceiling (2400)</button>
              <button class="tool-subchip ${subtypes.window === 'sliding_window' ? 'active' : ''}" data-sub="sliding_window">Sliding</button>
            </div>

            <!-- Bay Window -->
            <div class="tool-card" data-opening="bay_window" data-current-sub="${subtypes.bay_window}" title="Bay Window: Protruding 600mm with sill slab">
              <div class="tool-card-icon">${ICONS.bayWindow}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Bay Window</span>
                <span class="tool-card-desc">Protruding 600mm with exterior soffit</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="bay_window">${formatSubtypeLabel('bay_window', subtypes.bay_window)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="bay_window">
              <button class="tool-subchip ${subtypes.bay_window === 'rectangular_bay' ? 'active' : ''}" data-sub="rectangular_bay">Rectangular</button>
              <button class="tool-subchip ${subtypes.bay_window === 'trapezoid_bay' ? 'active' : ''}" data-sub="trapezoid_bay">Trapezoid</button>
              <button class="tool-subchip ${subtypes.bay_window === 'l_corner_bay' ? 'active' : ''}" data-sub="l_corner_bay">L-Corner</button>
            </div>

            <!-- Wall Opening -->
            <div class="tool-card" data-opening="opening" title="Wall Opening: Cased opening without door slab">
              <div class="tool-card-icon">${ICONS.opening}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Wall Opening</span>
                <span class="tool-card-desc">Cased opening without door slab</span>
              </div>
            </div>

            <!-- Niche -->
            <div class="tool-card" data-opening="niche" title="Wall Niche: Partial wall cut with backing slab">
              <div class="tool-card-icon">${ICONS.niche}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Wall Niche</span>
                <span class="tool-card-desc">Recessed display shelf cavity</span>
              </div>
            </div>

            <!-- Bay Window Sill -->
            <div class="tool-card" data-opening="bay_window_sill" title="Bay Window Sill: Low-level cantilevered stone bench">
              <div class="tool-card-icon">${ICONS.bayWindowSill}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Bay Window Sill</span>
                <span class="tool-card-desc">Cantilevered stone bench</span>
              </div>
            </div>

          </div>
        </div>

        <!-- CATEGORY 4: STRUCTURE -->
        <div class="dock-section" data-section="structure">
          <div class="dock-section-header">
            <span class="dock-section-title">4. Structure & MEP</span>
            <div class="dock-section-meta">
              <span class="dock-badge-pill">6</span>
              <span class="dock-collapse-chevron">${ICONS.chevronUp}</span>
            </div>
          </div>
          <div class="dock-section-body">
            
            <!-- Column -->
            <div class="tool-card" data-structure="column" data-current-sub="${subtypes.column}" title="Column: Structural vertical load-bearing post">
              <div class="tool-card-icon">${ICONS.column}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Column</span>
                <span class="tool-card-desc">Load-bearing vertical column</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="column">${formatSubtypeLabel('column', subtypes.column)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="column">
              <button class="tool-subchip ${subtypes.column === 'square' ? 'active' : ''}" data-sub="square">Square (400)</button>
              <button class="tool-subchip ${subtypes.column === 'round' ? 'active' : ''}" data-sub="round">Round (Ø400)</button>
              <button class="tool-subchip ${subtypes.column === 'l_shaped' ? 'active' : ''}" data-sub="l_shaped">L-Shaped</button>
            </div>

            <!-- Structural Beam -->
            <div class="tool-card" data-structure="beam" title="Structural Beam: Overhead beam drop for 3D ceiling clearance">
              <div class="tool-card-icon">${ICONS.beam}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Structural Beam</span>
                <span class="tool-card-desc">Overhead drop ceiling beam</span>
              </div>
            </div>

            <!-- Staircase -->
            <div class="tool-card" data-structure="staircase" data-current-sub="${subtypes.staircase}" title="Staircase: Parametric stairs with risers and treads">
              <div class="tool-card-icon">${ICONS.staircase}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Staircase</span>
                <span class="tool-card-desc">Parametric risers & treads</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="staircase">${formatSubtypeLabel('staircase', subtypes.staircase)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="staircase">
              <button class="tool-subchip ${subtypes.staircase === 'straight' ? 'active' : ''}" data-sub="straight">Straight</button>
              <button class="tool-subchip ${subtypes.staircase === 'l_shaped' ? 'active' : ''}" data-sub="l_shaped">L-Shape</button>
              <button class="tool-subchip ${subtypes.staircase === 'u_shaped' ? 'active' : ''}" data-sub="u_shaped">U-Shape</button>
            </div>

            <!-- Chimney Flue -->
            <div class="tool-card" data-structure="flue" title="Flue / Shaft: Vertical HVAC / exhaust duct cavity">
              <div class="tool-card-icon">${ICONS.flue}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Flue / Duct Shaft</span>
                <span class="tool-card-desc">Vertical HVAC cavity</span>
              </div>
            </div>

            <!-- Floor Opening -->
            <div class="tool-card" data-structure="floor_opening" title="Floor Opening: Slab penetration for duplex mezzanine">
              <div class="tool-card-icon">${ICONS.floorOpening}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Floor Opening</span>
                <span class="tool-card-desc">Slab penetration void</span>
              </div>
            </div>

            <!-- Partition Wall -->
            <div class="tool-card" data-tool="partition_wall" data-current-sub="${subtypes.partition_wall}" title="Partition Wall: Lightweight internal division">
              <div class="tool-card-icon">${ICONS.partitionWall}</div>
              <div class="tool-card-text">
                <span class="tool-card-title">Partition Wall</span>
                <span class="tool-card-desc">Lightweight internal divider</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="partition_wall">${formatSubtypeLabel('partition_wall', subtypes.partition_wall)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="partition_wall">
              <button class="tool-subchip ${subtypes.partition_wall === 'half' ? 'active' : ''}" data-sub="half">Half-Wall</button>
              <button class="tool-subchip ${subtypes.partition_wall === 'glass' ? 'active' : ''}" data-sub="glass">Glass Screen</button>
              <button class="tool-subchip ${subtypes.partition_wall === 'curtain' ? 'active' : ''}" data-sub="curtain">Curtain</button>
            </div>

          </div>
        </div>

      </div>
    `;
  }
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;');
}
