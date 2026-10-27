import { projectStore } from '../core/state-store';
import { ActiveTool, OpeningType, StructureType } from '../core/types';
import { FURNITURE_CATALOG } from '../catalog/furniture-presets';
import { showToast } from './toast-notifier';
import { ThreeSceneManager } from '../webgl3d/three-scene';

export type NavRailTab = 'floorplan' | 'furniture' | 'materials' | 'lighting';

// Curated Inline SVG Icons for World-Class SaaS Aesthetic
const ICONS = {
  // Navigation Rail Icons
  logo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  plan: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  furniture: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2z"/><path d="M2 12v6a1 1 0 0 0 1 1h1"/><path d="M22 12v6a1 1 0 0 1-1 1h-1"/><path d="M6 14v4"/><path d="M18 14v4"/></svg>`,
  materials: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/></svg>`,
  lighting: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,

  // Architectural 17 Tools
  importBlueprint: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="m14 14 3-3 3 3"/></svg>`,
  straightWall: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 12h18"/><path d="M9 6v6"/><path d="M15 12v6"/></svg>`,
  rectangleWall: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1" stroke-dasharray="2 2"/></svg>`,
  arcWall: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20C4 11.163 11.163 4 20 4"/><circle cx="4" cy="20" r="2" fill="currentColor"/><circle cx="20" cy="4" r="2" fill="currentColor"/></svg>`,
  externalArea: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a9 9 0 0 1 9 9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a9 9 0 0 1 9-9Z"/><path d="M12 11v9"/><path d="m8 15 4-4 4 4"/></svg>`,
  door: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="M6 20V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M14 12h.01"/><path d="M6 20a10 10 0 0 1 10-10" stroke-dasharray="2 2"/></svg>`,
  window: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>`,
  bayWindow: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18"/><path d="M5 18 8 7h8l3 11"/><path d="M8 7v11"/><path d="M16 7v11"/></svg>`,
  opening: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 20V8a4 4 0 0 1 8 0v12"/></svg>`,
  niche: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7" y="6" width="10" height="12" rx="1" fill="currentColor" fill-opacity="0.15"/></svg>`,
  bayWindowSill: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="10" width="20" height="6" rx="2"/><path d="M4 16v3"/><path d="M20 16v3"/></svg>`,
  column: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16"/><path d="M4 20h16"/><path d="M7 4v16"/><path d="M17 4v16"/><path d="M12 4v16"/></svg>`,
  beam: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="8" rx="1"/><path d="M2 12h20" stroke-dasharray="2 2"/></svg>`,
  staircase: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4v-4h4v-4h4V8h4V4"/><path d="m14 16 3-3m0 0 3 3m-3-3v6"/></svg>`,
  flue: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="m4 4 16 16"/><path d="m20 4-16 16"/></svg>`,
  floorOpening: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1" stroke-dasharray="3 3"/><path d="m8 8 8 8"/><path d="m16 8-8 8"/></svg>`,
  partitionWall: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="16" rx="1"/><path d="M5 12h14"/><path d="M12 4v8"/></svg>`,
  cursorSelect: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7 18 3-7 7-3L3 3z"/><path d="m13 13 8 8"/></svg>`
};

export class LeftDockController {
  private container: HTMLElement;
  private railContainer: HTMLElement | null = null;
  private threeScene?: ThreeSceneManager;
  private currentTab: NavRailTab = 'floorplan';
  private selectedCategory: string = 'all';
  private searchQuery: string = '';

  // Track active sub-types for multi-variant tools (prevents select dropdown overflow)
  private currentSubtypes: Record<string, string> = {
    door: 'single_door',
    window: 'casement_window',
    bay_window: 'rectangular_bay',
    opening: 'opening',
    column: 'square',
    staircase: 'straight',
    partition_wall: 'half'
  };

  constructor(container: HTMLElement, threeScene?: ThreeSceneManager) {
    this.container = container;
    this.threeScene = threeScene;
    this.railContainer = document.getElementById('nav-rail');

    // Pointer Event Isolation: Stop propagation so dock and nav clicks never trigger canvas drawing
    const stopEvents = ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'wheel'];
    for (const evt of stopEvents) {
      this.container.addEventListener(evt, e => e.stopPropagation());
      if (this.railContainer) {
        this.railContainer.addEventListener(evt, e => e.stopPropagation());
      }
    }

    this.renderRail();
    this.renderDock();
    this.bindEvents();

    projectStore.subscribe(state => {
      this.updateActiveToolUI(
        state.activeTool, 
        state.pendingOpeningType, 
        state.pendingStructureType, 
        state.pendingFurnitureCatalogId
      );
    });
  }

  private renderRail() {
    if (!this.railContainer) return;

    this.railContainer.innerHTML = `
      <div class="rail-logo" id="btn-rail-home" title="AuraBIM Studio Workspace">
        ${ICONS.logo}
      </div>

      <button class="rail-btn ${this.currentTab === 'floorplan' ? 'active' : ''}" data-tab="floorplan" title="Floor Plan Drafting (17 BIM Tools)">
        ${ICONS.plan}
        <span class="rail-label">Plan</span>
      </button>

      <button class="rail-btn ${this.currentTab === 'furniture' ? 'active' : ''}" data-tab="furniture" title="Furniture & Decor Catalog">
        ${ICONS.furniture}
        <span class="rail-label">Decor</span>
      </button>

      <button class="rail-btn ${this.currentTab === 'materials' ? 'active' : ''}" data-tab="materials" title="Materials & Finishes">
        ${ICONS.materials}
        <span class="rail-label">Finishes</span>
      </button>

      <button class="rail-btn ${this.currentTab === 'lighting' ? 'active' : ''}" data-tab="lighting" title="Lighting & Sun Simulation">
        ${ICONS.lighting}
        <span class="rail-label">Lighting</span>
      </button>

      <div class="rail-spacer"></div>

      <button class="rail-btn" id="btn-rail-settings" title="Project Settings">
        ${ICONS.settings}
        <span class="rail-label">Config</span>
      </button>

      <div class="rail-user-avatar" title="Architect Studio • Active Profile">
        AB
      </div>
    `;

    this.railContainer.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as NavRailTab;
        this.currentTab = tab;
        this.renderRail();
        this.renderDock();
        this.bindEvents();
      });
    });

    this.railContainer.querySelector('#btn-rail-home')?.addEventListener('click', () => {
      projectStore.setActiveTool('select');
      showToast('Select & Move Tool active (Esc / V)');
    });
  }

  private renderDock() {
    if (this.currentTab === 'floorplan') {
      this.renderFloorPlanDock();
    } else if (this.currentTab === 'furniture') {
      this.renderFurnitureDock();
    } else if (this.currentTab === 'materials') {
      this.renderMaterialsDock();
    } else if (this.currentTab === 'lighting') {
      this.renderLightingDock();
    }
  }

  private renderFloorPlanDock() {
    const underlay = projectStore.getState().blueprintUnderlay;
    const activeTool = projectStore.getState().activeTool;

    this.container.innerHTML = `
      <div class="dock-header-bar">
        <div class="dock-breadcrumb-pill" title="Current Workspace Mode">
          <span class="dock-breadcrumb-icon">📁</span>
          <span class="dock-breadcrumb-text">Floor Plan / 17 Tools</span>
          <span class="dock-breadcrumb-arrow">⌄</span>
        </div>
        <button class="btn btn-icon btn-sm ${activeTool === 'select' ? 'active' : ''}" id="btn-select-tool" title="Select & Move (V / Esc)">
          ${ICONS.cursorSelect}
        </button>
      </div>

      <div class="dock-search-wrap">
        <span class="dock-search-icon">🔍</span>
        <input 
          type="text" 
          class="dock-search-input" 
          id="input-dock-search" 
          placeholder="Find tool or opening..." 
          value="${this.searchQuery}" 
        />
      </div>

      <input type="file" id="blueprint-file-input" accept=".png,.jpg,.jpeg,.webp,.svg" style="display: none;" />

      <div class="dock-scroll-area">

        <!-- CATEGORY 1: IMPORT FLOOR PLAN -->
        <div class="dock-section" data-section="import">
          <div class="dock-section-header">
            <div class="dock-section-title">
              <span>1. Import Floor Plan</span>
            </div>
            <div class="dock-section-meta">
              <span class="dock-badge-pill">${underlay ? 'Loaded' : '1'}</span>
              <span class="dock-collapse-chevron">⌃</span>
            </div>
          </div>
          <div class="dock-section-body">
            <div class="tool-tile" id="tile-import-blueprint" data-tool="import_2d_drawing" title="Import 2D Blueprint underlay (.png, .jpg, .webp, .svg)">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-sky">${ICONS.importBlueprint}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Import 2D Drawing</span>
                  <span class="tool-tile-desc">${underlay ? `Active (${underlay.mmPerPixel.toFixed(1)} mm/px)` : '2-point scale calibration underlay'}</span>
                </div>
                <span class="dock-badge-pill" style="font-size: 9.5px; background: #e0f2fe; color: #0284c7;">IMG</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CATEGORY 2: DRAW ROOM (TOPOLOGY & GRAPH GENERATORS) -->
        <div class="dock-section" data-section="draw">
          <div class="dock-section-header">
            <div class="dock-section-title">
              <span>2. Draw Room</span>
            </div>
            <div class="dock-section-meta">
              <span class="dock-badge-pill">4</span>
              <span class="dock-collapse-chevron">⌃</span>
            </div>
          </div>
          <div class="dock-section-body">
            <div class="tool-tile" data-tool="straight_wall" title="Straight Wall: Continuous walls with auto-split intersections (Shortcut: B)">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-slate">${ICONS.straightWall}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Straight Wall</span>
                  <span class="tool-tile-desc">240mm / 120mm (Tab to toggle)</span>
                </div>
                <kbd class="tool-shortcut-badge">B</kbd>
              </div>
            </div>

            <div class="tool-tile" data-tool="rectangle_wall" title="Rectangle Wall: Instant 4-wall room with collinear overlap merge (Shortcut: F)">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-amber">${ICONS.rectangleWall}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Rectangle Wall</span>
                  <span class="tool-tile-desc">4 walls with collinear merge & area</span>
                </div>
                <kbd class="tool-shortcut-badge">F</kbd>
              </div>
            </div>

            <div class="tool-tile" data-tool="arc_wall" title="Arc Wall: 3-click circular arc with sagitta curvature h (Shortcut: H)">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-orange">${ICONS.arcWall}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Arc Wall</span>
                  <span class="tool-tile-desc">3-point circular curved wall</span>
                </div>
                <kbd class="tool-shortcut-badge">H</kbd>
              </div>
            </div>

            <div class="tool-tile" data-tool="external_area" title="External Area: Balcony/patio slab with 50mm curb and deck hatch">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-emerald">${ICONS.externalArea}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">External Area</span>
                  <span class="tool-tile-desc">Balcony & patio 50mm curb</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CATEGORY 3: PLACE DOORS AND WINDOWS (1D WALL-HOSTED PARAMETRIC OPENINGS) -->
        <div class="dock-section" data-section="openings">
          <div class="dock-section-header">
            <div class="dock-section-title">
              <span>3. Doors & Windows</span>
            </div>
            <div class="dock-section-meta">
              <span class="dock-badge-pill">6</span>
              <span class="dock-collapse-chevron">⌃</span>
            </div>
          </div>
          <div class="dock-section-body">
            
            <!-- Door Tool -->
            <div class="tool-tile" data-opening="door" data-current-sub="${this.currentSubtypes.door}" title="Door: 1D wall hosted with split clearances & swing arc">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-teal">${ICONS.door}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Door</span>
                  <span class="tool-tile-desc">Wall-hosted clearance dimensions</span>
                </div>
                <span class="tool-subtype-badge" data-badge-for="door">${this.getSubtypeBadgeText('door')} ▾</span>
              </div>
              <div class="tool-subchips">
                <button class="subchip ${this.currentSubtypes.door === 'single_door' ? 'active' : ''}" data-sub="single_door">Single (907mm)</button>
                <button class="subchip ${this.currentSubtypes.door === 'double_door' ? 'active' : ''}" data-sub="double_door">Double (1800mm)</button>
                <button class="subchip ${this.currentSubtypes.door === 'sliding_door' ? 'active' : ''}" data-sub="sliding_door">Sliding (1600mm)</button>
                <button class="subchip ${this.currentSubtypes.door === 'unequal_double_door' ? 'active' : ''}" data-sub="unequal_double_door">Unequal Double</button>
              </div>
            </div>

            <!-- Window Tool -->
            <div class="tool-tile" data-opening="window" data-current-sub="${this.currentSubtypes.window}" title="Window: Architectural 3-line glazing with mullions">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-sky">${ICONS.window}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Window</span>
                  <span class="tool-tile-desc">PBR glass pane & aluminum frame</span>
                </div>
                <span class="tool-subtype-badge" data-badge-for="window">${this.getSubtypeBadgeText('window')} ▾</span>
              </div>
              <div class="tool-subchips">
                <button class="subchip ${this.currentSubtypes.window === 'casement_window' ? 'active' : ''}" data-sub="casement_window">Casement (1800×1500)</button>
                <button class="subchip ${this.currentSubtypes.window === 'floor_to_ceiling_window' ? 'active' : ''}" data-sub="floor_to_ceiling_window">Floor-to-Ceiling (2400)</button>
                <button class="subchip ${this.currentSubtypes.window === 'sliding_window' ? 'active' : ''}" data-sub="sliding_window">Sliding Window</button>
              </div>
            </div>

            <!-- Bay Window Tool -->
            <div class="tool-tile" data-opening="bay_window" data-current-sub="${this.currentSubtypes.bay_window}" title="Bay Window: 3-sided glass box protruding 600mm with sill slab">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-sky">${ICONS.bayWindow}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Bay Window</span>
                  <span class="tool-tile-desc">Protruding 600mm with exterior soffit</span>
                </div>
                <span class="tool-subtype-badge" data-badge-for="bay_window">${this.getSubtypeBadgeText('bay_window')} ▾</span>
              </div>
              <div class="tool-subchips">
                <button class="subchip ${this.currentSubtypes.bay_window === 'rectangular_bay' ? 'active' : ''}" data-sub="rectangular_bay">Rectangular Bay</button>
                <button class="subchip ${this.currentSubtypes.bay_window === 'trapezoid_bay' ? 'active' : ''}" data-sub="trapezoid_bay">Trapezoid Bay</button>
                <button class="subchip ${this.currentSubtypes.bay_window === 'corner_bay' ? 'active' : ''}" data-sub="corner_bay">L-Corner Bay</button>
              </div>
            </div>

            <!-- Opening Tool -->
            <div class="tool-tile" data-opening="opening" data-current-sub="${this.currentSubtypes.opening}" title="Opening: Cased wall portal without door leaf">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-slate">${ICONS.opening}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Opening</span>
                  <span class="tool-tile-desc">Drywall cased portal void</span>
                </div>
                <span class="tool-subtype-badge" data-badge-for="opening">${this.getSubtypeBadgeText('opening')} ▾</span>
              </div>
              <div class="tool-subchips">
                <button class="subchip ${this.currentSubtypes.opening === 'opening' ? 'active' : ''}" data-sub="opening">Pass-Through (1200mm)</button>
                <button class="subchip ${this.currentSubtypes.opening === 'arched_opening' ? 'active' : ''}" data-sub="arched_opening">Arched Opening</button>
              </div>
            </div>

            <!-- Niche Tool -->
            <div class="tool-tile" data-opening="niche" title="Niche: Partial-depth wall recess shelf">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-purple">${ICONS.niche}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Niche (Wall Recess)</span>
                  <span class="tool-tile-desc">800×1000 alcove shelf</span>
                </div>
              </div>
            </div>

            <!-- Bay Window Sill Tool -->
            <div class="tool-tile" data-structure="bay_window_sill" title="Bay Window Sill: 40mm slab with 20mm bullnose overhang">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-stone">${ICONS.bayWindowSill}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Bay Window Sill</span>
                  <span class="tool-tile-desc">Marble / wood ledge slab</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- CATEGORY 4: ADD STRUCTURES (ARCHITECTURAL & VOLUMETRIC ELEMENTS) -->
        <div class="dock-section" data-section="structures">
          <div class="dock-section-header">
            <div class="dock-section-title">
              <span>4. Add Structures</span>
            </div>
            <div class="dock-section-meta">
              <span class="dock-badge-pill">6</span>
              <span class="dock-collapse-chevron">⌃</span>
            </div>
          </div>
          <div class="dock-section-body">
            
            <!-- Column Tool -->
            <div class="tool-tile" data-structure="column" data-current-sub="${this.currentSubtypes.column}" title="Column: Structural vertical pillar (snaps to corners & walls)">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-purple">${ICONS.column}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Column</span>
                  <span class="tool-tile-desc">Corner & wall face snapping</span>
                </div>
                <span class="tool-subtype-badge" data-badge-for="column">${this.getSubtypeBadgeText('column')} ▾</span>
              </div>
              <div class="tool-subchips">
                <button class="subchip ${this.currentSubtypes.column === 'square' ? 'active' : ''}" data-sub="square">Square (300×300)</button>
                <button class="subchip ${this.currentSubtypes.column === 'round' ? 'active' : ''}" data-sub="round">Round (Ø300)</button>
              </div>
            </div>

            <!-- Beam Tool -->
            <div class="tool-tile" data-structure="beam" title="Beam: 300×600mm ceiling structural beam (dashed cyan in 2D)">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-cyan">${ICONS.beam}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Beam</span>
                  <span class="tool-tile-desc">Suspended ceiling beam at 2200mm</span>
                </div>
              </div>
            </div>

            <!-- Staircase Tool -->
            <div class="tool-tile" data-structure="staircase" data-current-sub="${this.currentSubtypes.staircase}" title="Staircase: 16-step tread grid with direction arrow UP ➔">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-amber">${ICONS.staircase}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Staircase</span>
                  <span class="tool-tile-desc">16 treads with glass balustrade</span>
                </div>
                <span class="tool-subtype-badge" data-badge-for="staircase">${this.getSubtypeBadgeText('staircase')} ▾</span>
              </div>
              <div class="tool-subchips">
                <button class="subchip ${this.currentSubtypes.staircase === 'straight' ? 'active' : ''}" data-sub="straight">Straight (16 Risers)</button>
                <button class="subchip ${this.currentSubtypes.staircase === 'l_shaped' ? 'active' : ''}" data-sub="l_shaped">L-Shaped Stair</button>
                <button class="subchip ${this.currentSubtypes.staircase === 'u_shaped' ? 'active' : ''}" data-sub="u_shaped">U-Shaped Stair</button>
                <button class="subchip ${this.currentSubtypes.staircase === 'spiral' ? 'active' : ''}" data-sub="spiral">Spiral Stair</button>
              </div>
            </div>

            <!-- Flue Tool -->
            <div class="tool-tile" data-structure="flue" title="Flue: 450×450mm HVAC / plumbing shaft with inner X void">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-slate">${ICONS.flue}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Flue / Shaft</span>
                  <span class="tool-tile-desc">450×450 plumbing & duct shaft</span>
                </div>
              </div>
            </div>

            <!-- Floor Opening Tool -->
            <div class="tool-tile" data-structure="floor_opening" title="Floor Opening: 2000×2000mm void through floor slab">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-rose">${ICONS.floorOpening}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Floor Opening</span>
                  <span class="tool-tile-desc">Rectangular void cutter on slab</span>
                </div>
              </div>
            </div>

            <!-- Partition Wall Tool -->
            <div class="tool-tile" data-tool="partition_wall" data-current-sub="${this.currentSubtypes.partition_wall}" title="Partition Wall: Thin divider or half-height pony wall">
              <div class="tool-tile-main">
                <div class="tool-tile-icon icon-slate">${ICONS.partitionWall}</div>
                <div class="tool-tile-content">
                  <span class="tool-tile-label">Partition Wall</span>
                  <span class="tool-tile-desc">120mm dwarf / divider wall</span>
                </div>
                <span class="tool-subtype-badge" data-badge-for="partition_wall">${this.getSubtypeBadgeText('partition_wall')} ▾</span>
              </div>
              <div class="tool-subchips">
                <button class="subchip ${this.currentSubtypes.partition_wall === 'half' ? 'active' : ''}" data-sub="half">Half-Height (1200mm)</button>
                <button class="subchip ${this.currentSubtypes.partition_wall === 'thin' ? 'active' : ''}" data-sub="thin">Thin Divider (2800mm)</button>
              </div>
            </div>

          </div>
        </div>

      </div>
    `;
  }

  private getSubtypeBadgeText(toolKey: string): string {
    const val = this.currentSubtypes[toolKey];
    switch (val) {
      case 'single_door': return 'Single';
      case 'double_door': return 'Double';
      case 'sliding_door': return 'Sliding';
      case 'unequal_double_door': return 'Unequal';
      case 'casement_window': return 'Casement';
      case 'floor_to_ceiling_window': return 'Floor-to-Ceil';
      case 'sliding_window': return 'Sliding';
      case 'rectangular_bay': return 'Rectangular';
      case 'trapezoid_bay': return 'Trapezoid';
      case 'corner_bay': return 'Corner';
      case 'opening': return '1200mm';
      case 'arched_opening': return 'Arched';
      case 'square': return 'Square';
      case 'round': return 'Round';
      case 'straight': return 'Straight';
      case 'l_shaped': return 'L-Shaped';
      case 'u_shaped': return 'U-Shaped';
      case 'spiral': return 'Spiral';
      case 'half': return 'Half';
      case 'thin': return 'Thin';
      default: return val || '';
    }
  }

  private renderFurnitureDock() {
    const categories = [
      { id: 'all', label: 'All' },
      { id: 'seating', label: 'Living' },
      { id: 'beds', label: 'Bedroom' },
      { id: 'tables', label: 'Dining' },
      { id: 'storage', label: 'Storage' },
      { id: 'plants', label: 'Decor' }
    ];

    let items = this.selectedCategory === 'all'
      ? FURNITURE_CATALOG
      : FURNITURE_CATALOG.filter(i => i.category === this.selectedCategory);

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }

    this.container.innerHTML = `
      <div class="dock-header-bar">
        <div class="dock-breadcrumb-pill">
          <span class="dock-breadcrumb-icon">🛋️</span>
          <span class="dock-breadcrumb-text">Furniture Catalog</span>
        </div>
        <button class="btn btn-icon btn-sm" id="btn-select-tool" title="Select & Move (V / Esc)">
          ${ICONS.cursorSelect}
        </button>
      </div>

      <div class="dock-search-wrap">
        <span class="dock-search-icon">🔍</span>
        <input 
          type="text" 
          class="dock-search-input" 
          id="input-dock-search" 
          placeholder="Search 3D catalog items..." 
          value="${this.searchQuery}" 
        />
      </div>

      <div style="display: flex; gap: 4px; padding: 0 14px 10px 14px; overflow-x: auto;">
        ${categories.map(c => `
          <button class="btn btn-sm ${this.selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}" style="padding: 3px 8px; font-size: 10.5px; border-radius: var(--radius-full);">
            ${c.label}
          </button>
        `).join('')}
      </div>

      <div class="catalog-scroll dock-scroll-area">
        ${items.map(item => `
          <div class="catalog-item-card" data-furniture="${item.id}" title="${item.description}">
            <div class="catalog-item-icon">${item.icon}</div>
            <div class="catalog-item-info">
              <span class="catalog-item-name">${item.name}</span>
              <span class="catalog-item-dim">${item.dimensions.width} × ${item.dimensions.depth} mm</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.container.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.getAttribute('data-cat') || 'all';
        this.renderFurnitureDock();
        this.bindEvents();
      });
    });
  }

  private renderMaterialsDock() {
    const finishes = [
      { id: 'oak_parquet', name: 'Warm Oak Parquet', type: 'floor', color: '#c4ab93', icon: '🪵' },
      { id: 'marble', name: 'Carrara White Marble', type: 'floor', color: '#f5f6f8', icon: '🏛️' },
      { id: 'tile', name: 'Dark Slate Ceramic', type: 'floor', color: '#2d3748', icon: '⬛' },
      { id: 'plaster_white', name: 'Clean White Plaster', type: 'wall', color: '#f8fafc', icon: '🧱' },
      { id: 'concrete', name: 'Architectural Concrete', type: 'wall', color: '#94a3b8', icon: '🏢' }
    ];

    this.container.innerHTML = `
      <div class="dock-header-bar">
        <div class="dock-breadcrumb-pill">
          <span class="dock-breadcrumb-icon">🎨</span>
          <span class="dock-breadcrumb-text">Finishes & Materials</span>
        </div>
      </div>
      <div style="padding: 0 14px; font-size: 11px; color: var(--text-secondary); margin-bottom: 10px;">
        Click a finish below, then select any enclosed room or wall on the blueprint:
      </div>
      <div class="dock-scroll-area">
        ${finishes.map(f => `
          <div class="catalog-item-card" data-material="${f.id}" style="cursor: pointer; border-left: 4px solid ${f.color}; margin-bottom: 6px;">
            <div class="catalog-item-icon" style="font-size: 20px;">${f.icon}</div>
            <div class="catalog-item-info">
              <span class="catalog-item-name">${f.name}</span>
              <span class="catalog-item-dim">${f.type.toUpperCase()} FINISH</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.container.querySelectorAll('[data-material]').forEach(el => {
      el.addEventListener('click', () => {
        const matId = el.getAttribute('data-material')!;
        const sel = projectStore.getState().selection;
        if (sel.type === 'room' && sel.id) {
          projectStore.updateRoom(sel.id, { floorMaterial: matId });
          showToast(`Applied ${matId.replace('_', ' ')} to floor`);
        } else {
          showToast(`Selected ${matId.replace('_', ' ')}. Click a room on the floor plan!`);
        }
      });
    });
  }

  private renderLightingDock() {
    this.container.innerHTML = `
      <div class="dock-header-bar">
        <div class="dock-breadcrumb-pill">
          <span class="dock-breadcrumb-icon">💡</span>
          <span class="dock-breadcrumb-text">Lighting & Sun</span>
        </div>
      </div>
      <div class="dock-scroll-area" style="display: flex; flex-direction: column; gap: 14px; padding-top: 6px;">
        <div class="prop-row">
          <span class="prop-label">Sun Intensity</span>
          <input type="range" min="0.5" max="3.5" step="0.1" value="2.0" class="slider-input" id="light-sun-intensity" style="accent-color: #10b981;" />
        </div>
        <div class="prop-row">
          <span class="prop-label">Time of Day</span>
          <select class="prop-select" id="light-time-of-day">
            <option value="9">09:00 AM (Morning Sun)</option>
            <option value="14" selected>02:00 PM (Afternoon Sun)</option>
            <option value="18">06:00 PM (Golden Hour)</option>
            <option value="21">09:00 PM (Night Blue)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="btn-dock-render" style="margin-top: 8px;">📷 Capture 3D Snapshot</button>
      </div>
    `;

    const intensitySlider = this.container.querySelector('#light-sun-intensity') as HTMLInputElement;
    intensitySlider?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.threeScene?.setSunlightIntensity(val);
    });

    const timeSelect = this.container.querySelector('#light-time-of-day') as HTMLSelectElement;
    timeSelect?.addEventListener('change', () => {
      const val = parseFloat(timeSelect.value);
      this.threeScene?.setTimeOfDay(val);
      showToast(`Sun updated to ${timeSelect.selectedOptions[0].text}`);
    });

    this.container.querySelector('#btn-dock-render')?.addEventListener('click', () => {
      if (this.threeScene) {
        try {
          const dataUrl = this.threeScene.captureScreenshot();
          const link = document.createElement('a');
          link.download = `render_3d_${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
          showToast('📸 3D Render snapshot saved!');
        } catch {
          showToast('Could not capture 3D render');
        }
      }
    });
  }

  private bindEvents() {
    // Select tool
    this.container.querySelector('#btn-select-tool')?.addEventListener('click', () => {
      projectStore.setActiveTool('select');
      showToast('Select & Move Tool active (Esc / V)');
    });

    // Accordion category collapse/expand headers
    this.container.querySelectorAll('.dock-section-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const section = hdr.closest('.dock-section');
        section?.classList.toggle('collapsed');
      });
    });

    // Real-time search input filtering across tools
    const searchInput = this.container.querySelector('#input-dock-search') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value.toLowerCase().trim();
      if (this.currentTab === 'furniture') {
        this.renderFurnitureDock();
        this.bindEvents();
        const nextInput = this.container.querySelector('#input-dock-search') as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
        return;
      }

      // Filter tool cards in floorplan dock
      this.container.querySelectorAll('.tool-tile').forEach(tile => {
        const text = tile.textContent?.toLowerCase() || '';
        const match = !this.searchQuery || text.includes(this.searchQuery);
        (tile as HTMLElement).style.display = match ? 'flex' : 'none';
      });

      // Hide category if all its tools are hidden
      this.container.querySelectorAll('.dock-section').forEach(sec => {
        const visibleTiles = sec.querySelectorAll('.tool-tile:not([style*="display: none"])');
        (sec as HTMLElement).style.display = (visibleTiles.length > 0 || !this.searchQuery) ? 'block' : 'none';
      });
    });

    // Sub-type Chip selection clicks
    this.container.querySelectorAll('.subchip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetTile = chip.closest('.tool-tile') as HTMLElement;
        if (!targetTile) return;

        const subType = chip.getAttribute('data-sub')!;
        targetTile.querySelectorAll('.subchip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        // Identify tool category
        const toolKey = targetTile.getAttribute('data-opening') 
          || targetTile.getAttribute('data-structure') 
          || targetTile.getAttribute('data-tool');

        if (toolKey) {
          this.currentSubtypes[toolKey] = subType;
          targetTile.setAttribute('data-current-sub', subType);
          const badge = targetTile.querySelector('.tool-subtype-badge');
          if (badge) {
            badge.textContent = `${this.getSubtypeBadgeText(toolKey)} ▾`;
          }
        }

        // Activate corresponding tool in project store
        if (targetTile.hasAttribute('data-opening')) {
          projectStore.setActiveTool('place_opening', subType as OpeningType);
          showToast(`Active: ${subType.replace(/_/g, ' ')}`);
        } else if (targetTile.hasAttribute('data-structure')) {
          const struct = targetTile.getAttribute('data-structure') as StructureType;
          projectStore.setActiveTool('place_structure', undefined, struct, undefined, subType);
          showToast(`Active: ${struct} (${subType})`);
        } else if (targetTile.getAttribute('data-tool') === 'partition_wall') {
          projectStore.setActiveTool('partition_wall', undefined, undefined, undefined, subType);
          showToast(`Active: Partition Wall (${subType})`);
        }
      });
    });

    // Sub-type Badge click toggles chip visibility
    this.container.querySelectorAll('.tool-subtype-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const tile = badge.closest('.tool-tile') as HTMLElement;
        tile?.classList.toggle('expanded');
      });
    });

    // Category 1: Import 2D Blueprint trigger
    const fileInput = this.container.querySelector('#blueprint-file-input') as HTMLInputElement;
    this.container.querySelector('#tile-import-blueprint')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          const imageUrl = ev.target?.result as string;
          const img = new Image();
          img.src = imageUrl;
          img.onload = () => {
            projectStore.setBlueprintUnderlay({
              imageUrl,
              x: 0,
              y: 0,
              widthPx: img.naturalWidth,
              heightPx: img.naturalHeight,
              mmPerPixel: 1.0,
              opacity: 0.45,
              locked: false,
              visible3D: false,
              calibrationState: 'pick_p1'
            });
            projectStore.setActiveTool('import_2d_drawing');
            showToast('📐 Blueprint loaded! Click Point 1 on a known dimension line to calibrate scale.');
            this.renderFloorPlanDock();
            this.bindEvents();
          };
        };
        reader.readAsDataURL(file);
      }
    });

    // Category 2 & General Tool tiles
    this.container.querySelectorAll('[data-tool]').forEach(el => {
      if (el.id === 'tile-import-blueprint') return;
      el.addEventListener('click', () => {
        const tool = el.getAttribute('data-tool') as ActiveTool;
        const subType = this.currentSubtypes[tool];
        projectStore.setActiveTool(tool, undefined, undefined, undefined, subType);

        if (tool === 'straight_wall') showToast('🧱 Straight Wall Tool (B) — Tab toggles 240/120mm');
        if (tool === 'rectangle_wall') showToast('⬜ Rectangle Wall Tool (F) — Drag to draw room');
        if (tool === 'arc_wall') showToast('🪃 Arc Wall Tool (H) — Click 1: Start, Click 2: End, Move: Curvature');
        if (tool === 'external_area') showToast('🌿 External Area Tool — Draw 50mm boundary curb for Balcony/Deck');
        if (tool === 'partition_wall') showToast(`🧱 Partition Wall (${subType ?? '120mm divider'})`);
      });
    });

    // Category 3: Opening tiles
    this.container.querySelectorAll('[data-opening]').forEach(el => {
      el.addEventListener('click', () => {
        const opKey = el.getAttribute('data-opening')!;
        const currentSub = this.currentSubtypes[opKey] || opKey;
        projectStore.setActiveTool('place_opening', currentSub as OpeningType);
        showToast(`Hover over any wall to place ${currentSub.replace(/_/g, ' ')}`);
      });
    });

    // Category 4: Structure tiles
    this.container.querySelectorAll('[data-structure]').forEach(el => {
      el.addEventListener('click', () => {
        const structType = el.getAttribute('data-structure') as StructureType;
        const subType = this.currentSubtypes[structType];
        projectStore.setActiveTool('place_structure', undefined, structType, undefined, subType);
        showToast(`Click blueprint to place ${structType.replace(/_/g, ' ')}`);
      });
    });

    // Furniture cards
    this.container.querySelectorAll('[data-furniture]').forEach(el => {
      el.addEventListener('click', () => {
        const furnId = el.getAttribute('data-furniture')!;
        projectStore.setActiveTool('place_furniture', undefined, undefined, furnId);
        showToast('Click anywhere on the blueprint to place furniture');
      });
    });
  }

  private updateActiveToolUI(
    activeTool: ActiveTool, 
    pendingOpening?: OpeningType, 
    pendingStructure?: StructureType,
    pendingFurnId?: string
  ) {
    // Select tool button state
    const selectBtn = this.container.querySelector('#btn-select-tool');
    if (selectBtn) {
      selectBtn.classList.toggle('active', activeTool === 'select');
    }

    this.container.querySelectorAll('.tool-tile').forEach(el => {
      const toolAttr = el.getAttribute('data-tool');
      const opAttr = el.getAttribute('data-opening');
      const structAttr = el.getAttribute('data-structure');

      let isActive = false;
      if (activeTool === 'place_opening' && opAttr) {
        isActive = Boolean(pendingOpening && (pendingOpening.includes(opAttr) || (opAttr === 'bay_window' && pendingOpening.includes('bay'))));
        if (isActive && pendingOpening) {
          this.currentSubtypes[opAttr] = pendingOpening;
          el.setAttribute('data-current-sub', pendingOpening);
          const badge = el.querySelector('.tool-subtype-badge');
          if (badge) badge.textContent = `${this.getSubtypeBadgeText(opAttr)} ▾`;
          el.querySelectorAll('.subchip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-sub') === pendingOpening);
          });
        }
      } else if (activeTool === 'place_structure' && structAttr) {
        isActive = (pendingStructure === structAttr);
        if (isActive) {
          const sub = projectStore.getState().pendingStructureSubType;
          if (sub) {
            this.currentSubtypes[structAttr] = sub;
            el.setAttribute('data-current-sub', sub);
            const badge = el.querySelector('.tool-subtype-badge');
            if (badge) badge.textContent = `${this.getSubtypeBadgeText(structAttr)} ▾`;
            el.querySelectorAll('.subchip').forEach(c => {
              c.classList.toggle('active', c.getAttribute('data-sub') === sub);
            });
          }
        }
      } else if (toolAttr === activeTool) {
        isActive = true;
      }

      el.classList.toggle('active', isActive);
    });

    this.container.querySelectorAll('.catalog-item-card').forEach(el => {
      const furnAttr = el.getAttribute('data-furniture');
      el.classList.toggle('active', activeTool === 'place_furniture' && furnAttr === pendingFurnId);
    });
  }
}
