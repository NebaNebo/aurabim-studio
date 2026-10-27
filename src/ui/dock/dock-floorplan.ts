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
              <span class="dock-collapse-chevron">${ICONS.chevronUp}</span>
            </div>
          </div>
          <div class="dock-section-body">
            <div class="tool-card" id="tile-import-blueprint" data-tool="import_2d_drawing" title="Import 2D Blueprint underlay (.png, .jpg, .webp, .svg) • 2-point scale calibration">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.importFile}</span>
                <span class="tool-card-title">Import 2D Drawing</span>
              </div>
              <kbd class="tool-card-shortcut">${underlay ? 'OK' : 'IMG'}</kbd>
            </div>
          </div>
        </div>

        <!-- CATEGORY 2: DRAW ROOM -->
        <div class="dock-section" data-section="draw">
          <div class="dock-section-header">
            <span class="dock-section-title">2. Draw Room</span>
            <div class="dock-section-meta">
              <span class="dock-collapse-chevron">${ICONS.chevronUp}</span>
            </div>
          </div>
          <div class="dock-section-body">
            <div class="tool-card" data-tool="straight_wall" title="Straight Wall: Continuous walls with auto-split intersections • 240mm / 120mm (Tab) (Shortcut: B)">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.straightWall}</span>
                <span class="tool-card-title">Straight Wall</span>
              </div>
              <kbd class="tool-card-shortcut">B</kbd>
            </div>

            <div class="tool-card" data-tool="rectangle_wall" title="Rectangle Wall: Instant 4-wall room with collinear overlap merge (Shortcut: F)">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.rectangleWall}</span>
                <span class="tool-card-title">Rectangle Wall</span>
              </div>
              <kbd class="tool-card-shortcut">F</kbd>
            </div>

            <div class="tool-card" data-tool="arc_wall" title="Arc Wall: 3-point circular curved wall (Shortcut: H)">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.arcWall}</span>
                <span class="tool-card-title">Arc Wall</span>
              </div>
              <kbd class="tool-card-shortcut">H</kbd>
            </div>

            <div class="tool-card" data-tool="external_area" title="External Area: Balcony/patio slab with 50mm curb and deck hatch">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.externalArea}</span>
                <span class="tool-card-title">External Area</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CATEGORY 3: DOORS & WINDOWS -->
        <div class="dock-section" data-section="openings">
          <div class="dock-section-header">
            <span class="dock-section-title">3. Doors & Windows</span>
            <div class="dock-section-meta">
              <span class="dock-collapse-chevron">${ICONS.chevronUp}</span>
            </div>
          </div>
          <div class="dock-section-body">
            
            <!-- Door -->
            <div class="tool-card" data-opening="door" data-current-sub="${subtypes.door}" title="Door: 1D wall hosted with split clearances & swing arc (Click to activate, click pill to switch variant)">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.door}</span>
                <span class="tool-card-title">Door</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="door" title="Click to choose door variant">${formatSubtypeLabel('door', subtypes.door)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="door">
              <button class="tool-subchip ${subtypes.door === 'single_door' ? 'active' : ''}" data-sub="single_door">Single (907mm)</button>
              <button class="tool-subchip ${subtypes.door === 'double_door' ? 'active' : ''}" data-sub="double_door">Double (1800mm)</button>
              <button class="tool-subchip ${subtypes.door === 'sliding_door' ? 'active' : ''}" data-sub="sliding_door">Sliding (1600mm)</button>
              <button class="tool-subchip ${subtypes.door === 'unequal_double_door' ? 'active' : ''}" data-sub="unequal_double_door">Unequal</button>
            </div>

            <!-- Window -->
            <div class="tool-card" data-opening="window" data-current-sub="${subtypes.window}" title="Window: Architectural 3-line glazing with mullions (Click to activate, click pill to switch variant)">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.window}</span>
                <span class="tool-card-title">Window</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="window" title="Click to choose window variant">${formatSubtypeLabel('window', subtypes.window)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="window">
              <button class="tool-subchip ${subtypes.window === 'casement_window' ? 'active' : ''}" data-sub="casement_window">Casement (1800×1500)</button>
              <button class="tool-subchip ${subtypes.window === 'floor_to_ceiling_window' ? 'active' : ''}" data-sub="floor_to_ceiling_window">Floor-to-Ceiling (2400)</button>
              <button class="tool-subchip ${subtypes.window === 'sliding_window' ? 'active' : ''}" data-sub="sliding_window">Sliding</button>
            </div>

            <!-- Bay Window -->
            <div class="tool-card" data-opening="bay_window" data-current-sub="${subtypes.bay_window}" title="Bay Window: Protruding 600mm with sill slab (Click to activate, click pill to switch variant)">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.bayWindow}</span>
                <span class="tool-card-title">Bay Window</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="bay_window" title="Click to choose bay window variant">${formatSubtypeLabel('bay_window', subtypes.bay_window)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="bay_window">
              <button class="tool-subchip ${subtypes.bay_window === 'rectangular_bay' ? 'active' : ''}" data-sub="rectangular_bay">Rectangular</button>
              <button class="tool-subchip ${subtypes.bay_window === 'trapezoid_bay' ? 'active' : ''}" data-sub="trapezoid_bay">Trapezoid</button>
              <button class="tool-subchip ${subtypes.bay_window === 'l_corner_bay' ? 'active' : ''}" data-sub="l_corner_bay">L-Corner</button>
            </div>

            <!-- Wall Opening -->
            <div class="tool-card" data-opening="opening" title="Wall Opening: Cased opening without door slab">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.opening}</span>
                <span class="tool-card-title">Wall Opening</span>
              </div>
            </div>

            <!-- Niche -->
            <div class="tool-card" data-opening="niche" title="Wall Niche: Partial wall cut with backing slab">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.niche}</span>
                <span class="tool-card-title">Wall Niche</span>
              </div>
            </div>

            <!-- Bay Window Sill -->
            <div class="tool-card" data-opening="bay_window_sill" title="Bay Window Sill: Low-level cantilevered stone bench">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.bayWindowSill}</span>
                <span class="tool-card-title">Bay Window Sill</span>
              </div>
            </div>

          </div>
        </div>

        <!-- CATEGORY 4: STRUCTURE & MEP -->
        <div class="dock-section" data-section="structure">
          <div class="dock-section-header">
            <span class="dock-section-title">4. Structure & MEP</span>
            <div class="dock-section-meta">
              <span class="dock-collapse-chevron">${ICONS.chevronUp}</span>
            </div>
          </div>
          <div class="dock-section-body">
            
            <!-- Column -->
            <div class="tool-card" data-structure="column" data-current-sub="${subtypes.column}" title="Column: Structural vertical load-bearing post (Click to activate, click pill to switch variant)">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.column}</span>
                <span class="tool-card-title">Column</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="column" title="Click to choose column profile">${formatSubtypeLabel('column', subtypes.column)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="column">
              <button class="tool-subchip ${subtypes.column === 'square' ? 'active' : ''}" data-sub="square">Square (400)</button>
              <button class="tool-subchip ${subtypes.column === 'round' ? 'active' : ''}" data-sub="round">Round (Ø400)</button>
              <button class="tool-subchip ${subtypes.column === 'l_shaped' ? 'active' : ''}" data-sub="l_shaped">L-Shaped</button>
            </div>

            <!-- Structural Beam -->
            <div class="tool-card" data-structure="beam" title="Structural Beam: Overhead beam drop for 3D ceiling clearance">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.beam}</span>
                <span class="tool-card-title">Structural Beam</span>
              </div>
            </div>

            <!-- Staircase -->
            <div class="tool-card" data-structure="staircase" data-current-sub="${subtypes.staircase}" title="Staircase: Parametric stairs with risers and treads (Click to activate, click pill to switch variant)">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.staircase}</span>
                <span class="tool-card-title">Staircase</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="staircase" title="Click to choose staircase geometry">${formatSubtypeLabel('staircase', subtypes.staircase)} ▾</span>
            </div>
            <div class="tool-subchip-group" data-group-for="staircase">
              <button class="tool-subchip ${subtypes.staircase === 'straight' ? 'active' : ''}" data-sub="straight">Straight</button>
              <button class="tool-subchip ${subtypes.staircase === 'l_shaped' ? 'active' : ''}" data-sub="l_shaped">L-Shape</button>
              <button class="tool-subchip ${subtypes.staircase === 'u_shaped' ? 'active' : ''}" data-sub="u_shaped">U-Shape</button>
            </div>

            <!-- Chimney Flue -->
            <div class="tool-card" data-structure="flue" title="Flue / Shaft: Vertical HVAC / exhaust duct cavity">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.flue}</span>
                <span class="tool-card-title">Flue / Duct Shaft</span>
              </div>
            </div>

            <!-- Floor Opening -->
            <div class="tool-card" data-structure="floor_opening" title="Floor Opening: Slab penetration for duplex mezzanine">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.floorOpening}</span>
                <span class="tool-card-title">Floor Opening</span>
              </div>
            </div>

            <!-- Partition Wall -->
            <div class="tool-card" data-tool="partition_wall" data-current-sub="${subtypes.partition_wall}" title="Partition Wall: Lightweight internal division (Click to activate, click pill to switch variant)">
              <div class="tool-card-left">
                <span class="tool-card-icon">${ICONS.partitionWall}</span>
                <span class="tool-card-title">Partition Wall</span>
              </div>
              <span class="tool-card-subbadge" data-badge-for="partition_wall" title="Click to choose partition type">${formatSubtypeLabel('partition_wall', subtypes.partition_wall)} ▾</span>
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
