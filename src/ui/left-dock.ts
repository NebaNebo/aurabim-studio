import { projectStore } from '../core/state-store';
import { ActiveTool, OpeningType, StructureType } from '../core/types';
import { showToast } from './toast-notifier';
import { ThreeSceneManager } from '../webgl3d/three-scene';
import { ICONS } from './icons';
import { NavRailTab, DockSubtypes, formatSubtypeLabel } from './dock/dock-types';
import { FloorPlanDockRenderer } from './dock/dock-floorplan';
import { FurnitureDockRenderer } from './dock/dock-furniture';
import { FinishesDockRenderer } from './dock/dock-finishes';
import { LightingDockRenderer } from './dock/dock-lighting';

export type { NavRailTab };

export class LeftDockController {
  private container: HTMLElement;
  private railContainer: HTMLElement | null = null;
  private threeScene?: ThreeSceneManager;
  private currentTab: NavRailTab = 'floorplan';
  private selectedCategory: string = 'all';
  private searchQuery: string = '';

  private currentSubtypes: DockSubtypes = {
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

    // Pointer Event Isolation: Prevent drawing canvas on UI interaction
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
    const tabs: { id: NavRailTab; label: string; icon: string; title: string }[] = [
      { id: 'floorplan', label: 'Plan', icon: ICONS.plan, title: 'Floor Plan Drafting (17 Tools)' },
      { id: 'furniture', label: 'Decor', icon: ICONS.furniture, title: 'Furniture & Decor Catalog' },
      { id: 'materials', label: 'Finishes', icon: ICONS.finishes, title: 'Materials & Finishes' },
      { id: 'lighting', label: 'Lighting', icon: ICONS.lighting, title: 'Lighting & Sun Simulation' }
    ];

    this.railContainer.innerHTML = `
      <div class="rail-logo" id="btn-rail-home" title="AuraBIM Studio Workspace">${ICONS.brandLogo}</div>
      ${tabs.map(t => `
        <button class="rail-btn ${this.currentTab === t.id ? 'active' : ''}" data-tab="${t.id}" title="${t.title}">
          ${t.icon}<span class="rail-label">${t.label}</span>
        </button>
      `).join('')}
      <div class="rail-spacer"></div>
      <button class="rail-btn" id="btn-rail-settings" title="Project Settings">${ICONS.config}<span class="rail-label">Config</span></button>
      <div class="rail-user-avatar" title="Architect Studio • Active Profile">AB</div>
    `;

    this.railContainer.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.getAttribute('data-tab') as NavRailTab;
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
      FloorPlanDockRenderer.render(this.container, this.currentSubtypes, this.searchQuery);
    } else if (this.currentTab === 'furniture') {
      FurnitureDockRenderer.render(this.container, this.selectedCategory, this.searchQuery, (cat) => {
        this.selectedCategory = cat;
        this.renderDock();
        this.bindEvents();
      });
    } else if (this.currentTab === 'materials') {
      FinishesDockRenderer.render(this.container);
    } else if (this.currentTab === 'lighting') {
      LightingDockRenderer.render(this.container, this.threeScene);
    }
  }

  private bindEvents() {
    // Select tool
    this.container.querySelector('#btn-select-tool')?.addEventListener('click', () => {
      projectStore.setActiveTool('select');
      showToast('Select & Move Tool active (Esc / V)');
    });

    // Accordion category collapse/expand
    this.container.querySelectorAll('.dock-section-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        hdr.closest('.dock-section')?.classList.toggle('collapsed');
      });
    });

    // Real-time search
    const searchInput = this.container.querySelector('#input-dock-search') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value.toLowerCase().trim();
      if (this.currentTab === 'furniture') {
        this.renderDock();
        this.bindEvents();
        const next = this.container.querySelector('#input-dock-search') as HTMLInputElement | null;
        if (next) {
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }
        return;
      }

      this.container.querySelectorAll('.tool-card').forEach(card => {
        const text = card.textContent?.toLowerCase() || '';
        const match = !this.searchQuery || text.includes(this.searchQuery);
        (card as HTMLElement).style.display = match ? 'flex' : 'none';
        const group = card.nextElementSibling as HTMLElement | null;
        if (group && group.classList.contains('tool-subchip-group')) {
          group.style.display = match ? 'flex' : 'none';
        }
      });

      this.container.querySelectorAll('.dock-section').forEach(sec => {
        const visible = sec.querySelectorAll('.tool-card:not([style*="display: none"])');
        (sec as HTMLElement).style.display = (visible.length > 0 || !this.searchQuery) ? 'block' : 'none';
      });
    });

    // Sub-type Chip clicks
    this.container.querySelectorAll('.tool-subchip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = chip.closest('.tool-subchip-group') as HTMLElement | null;
        const targetCard = group ? (group.previousElementSibling as HTMLElement | null) : null;
        if (!targetCard) return;

        const subType = chip.getAttribute('data-sub')!;
        group?.querySelectorAll('.tool-subchip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const toolKey = targetCard.getAttribute('data-opening') 
          || targetCard.getAttribute('data-structure') 
          || targetCard.getAttribute('data-tool');

        if (toolKey) {
          this.currentSubtypes[toolKey] = subType;
          targetCard.setAttribute('data-current-sub', subType);
          const badge = targetCard.querySelector('.tool-card-subbadge');
          if (badge) badge.textContent = `${formatSubtypeLabel(toolKey, subType)} ▾`;
        }

        if (targetCard.hasAttribute('data-opening')) {
          projectStore.setActiveTool('place_opening', subType as OpeningType);
          showToast(`Active: ${subType.replace(/_/g, ' ')}`);
        } else if (targetCard.hasAttribute('data-structure')) {
          const struct = targetCard.getAttribute('data-structure') as StructureType;
          projectStore.setActiveTool('place_structure', undefined, struct, undefined, subType);
          showToast(`Active: ${struct} (${subType})`);
        } else if (targetCard.getAttribute('data-tool') === 'partition_wall') {
          projectStore.setActiveTool('partition_wall', undefined, undefined, undefined, subType);
          showToast(`Active: Partition Wall (${subType})`);
        }
      });
    });

    // Subbadge pill clicks: explicitly toggle accordion tray
    this.container.querySelectorAll('.tool-card-subbadge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = badge.closest('.tool-card') as HTMLElement | null;
        const group = card?.nextElementSibling as HTMLElement | null;
        if (group && group.classList.contains('tool-subchip-group')) {
          group.classList.toggle('expanded');
        }
      });
    });

    // Blueprint File Input
    const fileInput = this.container.querySelector('#blueprint-file-input') as HTMLInputElement | null;
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
            showToast('Blueprint loaded! Click Point 1 to calibrate scale');
            this.renderDock();
            this.bindEvents();
          };
        };
        reader.readAsDataURL(file);
      }
    });

    // Tool Cards clicks
    this.container.querySelectorAll('[data-tool]').forEach(el => {
      if (el.id === 'tile-import-blueprint') return;
      el.addEventListener('click', () => {
        const tool = el.getAttribute('data-tool') as ActiveTool;
        const subType = this.currentSubtypes[tool];
        projectStore.setActiveTool(tool, undefined, undefined, undefined, subType);

        if (tool === 'straight_wall') showToast('Straight Wall (B) — Tab toggles 240/120mm');
        if (tool === 'rectangle_wall') showToast('Rectangle Wall (F) — Drag to draw room');
        if (tool === 'arc_wall') showToast('Arc Wall (H) — 3-point curved wall');
        if (tool === 'external_area') showToast('External Area — Balcony/patio slab');
        if (tool === 'partition_wall') showToast(`Partition Wall (${subType ?? 'half'})`);
      });
    });

    // Opening Cards clicks
    this.container.querySelectorAll('[data-opening]').forEach(el => {
      el.addEventListener('click', () => {
        const opKey = el.getAttribute('data-opening')!;
        const currentSub = this.currentSubtypes[opKey] || opKey;
        projectStore.setActiveTool('place_opening', currentSub as OpeningType);
        showToast(`Hover over wall to place ${currentSub.replace(/_/g, ' ')}`);
      });
    });

    // Structure Cards clicks
    this.container.querySelectorAll('[data-structure]').forEach(el => {
      el.addEventListener('click', () => {
        const structType = el.getAttribute('data-structure') as StructureType;
        const subType = this.currentSubtypes[structType];
        projectStore.setActiveTool('place_structure', undefined, structType, undefined, subType);
        showToast(`Click blueprint to place ${structType.replace(/_/g, ' ')}`);
      });
    });

    // Furniture item clicks
    this.container.querySelectorAll('[data-furniture]').forEach(el => {
      el.addEventListener('click', () => {
        const furnId = el.getAttribute('data-furniture')!;
        projectStore.setActiveTool('place_furniture', undefined, undefined, furnId);
        showToast('Click anywhere on blueprint to place furniture');
      });
    });
  }

  private updateActiveToolUI(
    activeTool: ActiveTool, 
    pendingOpening?: OpeningType, 
    pendingStructure?: StructureType,
    pendingFurnId?: string
  ) {
    const selectBtn = this.container.querySelector('#btn-select-tool');
    if (selectBtn) {
      selectBtn.classList.toggle('active', activeTool === 'select');
    }

    this.container.querySelectorAll('.tool-card').forEach(el => {
      const toolAttr = el.getAttribute('data-tool');
      const opAttr = el.getAttribute('data-opening');
      const structAttr = el.getAttribute('data-structure');

      let isActive = false;
      if (activeTool === 'place_opening' && opAttr) {
        isActive = Boolean(pendingOpening && (pendingOpening.includes(opAttr) || (opAttr === 'bay_window' && pendingOpening.includes('bay'))));
        if (isActive && pendingOpening) {
          this.currentSubtypes[opAttr] = pendingOpening;
          el.setAttribute('data-current-sub', pendingOpening);
          const badge = el.querySelector('.tool-card-subbadge');
          if (badge) badge.textContent = `${formatSubtypeLabel(opAttr, pendingOpening)} ▾`;
          const group = el.nextElementSibling as HTMLElement | null;
          group?.querySelectorAll('.tool-subchip').forEach(c => {
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
            const badge = el.querySelector('.tool-card-subbadge');
            if (badge) badge.textContent = `${formatSubtypeLabel(structAttr, sub)} ▾`;
            const group = el.nextElementSibling as HTMLElement | null;
            group?.querySelectorAll('.tool-subchip').forEach(c => {
              c.classList.toggle('active', c.getAttribute('data-sub') === sub);
            });
          }
        }
      } else if (toolAttr === activeTool) {
        isActive = true;
      }

      el.classList.toggle('active', isActive);
      el.setAttribute('data-active', isActive ? 'true' : 'false');
    });

    this.container.querySelectorAll('.catalog-item-card').forEach(el => {
      const furnAttr = el.getAttribute('data-furniture');
      el.classList.toggle('active', activeTool === 'place_furniture' && furnAttr === pendingFurnId);
    });
  }
}
