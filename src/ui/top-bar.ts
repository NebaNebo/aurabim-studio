import { projectStore } from '../core/state-store';
import { showToast } from './toast-notifier';
import { ThreeSceneManager } from '../webgl3d/three-scene';
import { CadViewport } from '../cad2d/cad-viewport';
import { openShortcutsModal } from './shortcuts-modal';
import { openTemplateModal } from './template-picker-modal';
import { autoSaveManager, AutoSaveStatus } from '../services/auto-save-manager';
import { exportAsAurFile, parseAurOrJson } from '../core/aur-file-system';
import { customAlert, customConfirm } from './custom-dialog';
import { ICONS } from './icons';

export class TopBarController {
  private container: HTMLElement;
  private threeScene: ThreeSceneManager;
  private cadViewport: CadViewport;
  private onBackToDashboard?: () => void;

  constructor(
    container: HTMLElement,
    threeScene: ThreeSceneManager,
    cadViewport: CadViewport,
    onBackToDashboard?: () => void
  ) {
    this.container = container;
    this.threeScene = threeScene;
    this.cadViewport = cadViewport;
    this.onBackToDashboard = onBackToDashboard;

    // Pointer Event Isolation
    const stopEvents = ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'wheel'];
    for (const evt of stopEvents) {
      this.container.addEventListener(evt, e => e.stopPropagation());
    }

    this.render();
    this.bindEvents();

    projectStore.subscribe(state => {
      this.updateActiveStates(state.viewMode, state.name);
    });

    // Real-time Auto-Save Status listener
    autoSaveManager.onStatusChange((status: AutoSaveStatus) => {
      const badge = this.container.querySelector('#top-autosave-badge');
      const text = this.container.querySelector('#top-autosave-text');
      const dot = this.container.querySelector('.studio-status-dot') as HTMLElement | null;

      if (!badge || !text) return;

      if (status === 'saving') {
        text.textContent = 'Saving...';
        if (dot) dot.style.backgroundColor = 'var(--status-warning)';
        badge.classList.add('saving');
      } else if (status === 'saved') {
        text.textContent = 'Synced';
        if (dot) dot.style.backgroundColor = 'var(--status-online)';
        badge.classList.remove('saving');
      } else if (status === 'error') {
        text.textContent = 'Offline';
        if (dot) dot.style.backgroundColor = 'var(--text-disabled)';
        badge.classList.remove('saving');
      } else {
        text.textContent = 'Saved';
        if (dot) dot.style.backgroundColor = 'var(--status-online)';
      }
    });
  }

  private render() {
    const currentState = projectStore.getState();

    this.container.innerHTML = `
      <div class="top-bar-section">
        <button class="btn btn-sm btn-ghost" id="btn-back-dashboard" title="Return to Projects Hub">
          <span class="btn-icon">${ICONS.arrowLeft}</span>
          <span>Hub</span>
        </button>

        <div class="studio-brand">
          <span class="studio-logo-icon">${ICONS.brandLogo}</span>
          <span class="studio-logo-name">AuraBIM</span>
          <span class="studio-status-badge" id="top-autosave-badge">
            <span class="studio-status-dot"></span>
            <span id="top-autosave-text">Synced</span>
          </span>
        </div>

        <div class="project-title-wrapper">
          <input
            type="text"
            class="project-title-input"
            id="input-project-title"
            value="${currentState.name || 'Studio Apartment'}"
            title="Click to rename project"
          />
        </div>

        <!-- Single Compact File ▾ Dropdown -->
        <div class="top-file-dropdown-wrapper" id="file-dropdown-wrap">
          <button class="btn btn-sm btn-ghost-cad" id="btn-file-dropdown" title="File Menu">
            <span class="btn-icon">${ICONS.folderOpen}</span>
            <span>File</span>
            <span class="file-dropdown-caret">▾</span>
          </button>
          <div class="top-file-menu" id="top-file-menu">
            <button class="top-file-menu-item" id="btn-top-save">
              <span class="file-menu-icon">${ICONS.save}</span>
              <span class="file-menu-label">Save Project</span>
              <kbd class="file-menu-kbd">Ctrl+S</kbd>
            </button>
            <button class="top-file-menu-item" id="btn-file-template">
              <span class="file-menu-icon">${ICONS.templateFolder}</span>
              <span class="file-menu-label">Templates...</span>
            </button>
            <button class="top-file-menu-item" id="btn-file-open">
              <span class="file-menu-icon">${ICONS.folderOpen}</span>
              <span class="file-menu-label">Open .aur / JSON...</span>
            </button>
            <button class="top-file-menu-item" id="btn-file-export">
              <span class="file-menu-icon">${ICONS.exportFile}</span>
              <span class="file-menu-label">Export .aur Archive</span>
            </button>
            <button class="top-file-menu-item" id="btn-export-png">
              <span class="file-menu-icon">${ICONS.blueprint}</span>
              <span class="file-menu-label">Export Blueprint (PNG)</span>
            </button>
            <div class="top-file-menu-divider"></div>
            <button class="top-file-menu-item file-item-danger" id="btn-clear">
              <span class="file-menu-icon">${ICONS.broom}</span>
              <span class="file-menu-label">Reset Canvas / New</span>
            </button>
          </div>
        </div>

        <input type="file" id="input-file-import" accept=".aur,.json" style="display: none;" />
      </div>

      <!-- Recessed View Switcher (2D CAD | 3D View) -->
      <div class="top-bar-section">
        <div class="segmented-control" id="top-view-mode-toggle">
          <button class="seg-btn active" data-vmode="2d_main" id="btn-view-2d" title="2D CAD Drafting View">2D CAD</button>
          <button class="seg-btn" data-vmode="3d_main" id="btn-view-3d" title="3D Realistic Spatial Preview">3D View</button>
        </div>
      </div>

      <!-- Actions & Render CTA -->
      <div class="top-bar-section">
        <button class="btn btn-sm btn-ghost-cad" id="btn-shortcuts" title="Keyboard Shortcuts">
          <span class="btn-icon">${ICONS.keyboard}</span>
          <span>[?]</span>
        </button>
        <button class="btn btn-sm btn-primary-terracotta" id="btn-snapshot-3d" title="Capture High-Resolution 3D Render">
          <span class="btn-icon">${ICONS.renderCamera}</span>
          <span>Render 3D</span>
        </button>
      </div>
    `;
  }

  private bindEvents() {
    // File ▾ Dropdown Toggle & Auto-Close
    const dropdownWrap = this.container.querySelector('#file-dropdown-wrap') as HTMLElement | null;
    const dropdownBtn = this.container.querySelector('#btn-file-dropdown');

    dropdownBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownWrap?.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (dropdownWrap?.classList.contains('open') && !dropdownWrap.contains(e.target as Node)) {
        dropdownWrap.classList.remove('open');
      }
    });

    const closeMenu = () => dropdownWrap?.classList.remove('open');

    this.container.querySelector('#btn-top-save')?.addEventListener('click', async () => {
      closeMenu();
      await autoSaveManager.forceSaveNow();
      showToast('Project saved successfully');
    });

    this.container.querySelector('#top-autosave-badge')?.addEventListener('click', async () => {
      await autoSaveManager.forceSaveNow();
      showToast('Project saved successfully');
    });

    window.addEventListener('keydown', async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        await autoSaveManager.forceSaveNow();
        showToast('Project saved successfully');
      }
    });

    this.container.querySelector('#btn-back-dashboard')?.addEventListener('click', async () => {
      await autoSaveManager.forceSaveNow();
      if (this.onBackToDashboard) {
        this.onBackToDashboard();
      }
    });

    const titleInput = this.container.querySelector('#input-project-title') as HTMLInputElement;
    titleInput?.addEventListener('change', () => {
      const val = titleInput.value.trim();
      if (val) {
        projectStore.setProjectName(val);
        showToast(`Project renamed to: ${val}`);
      }
    });

    this.container.querySelector('#btn-view-2d')?.addEventListener('click', () => {
      const centerViewport = document.getElementById('center-viewport');
      if (centerViewport?.classList.contains('split-screen')) {
        document.getElementById('btn-hud-split')?.click();
      }
      projectStore.setViewMode('2d_main');
      showToast('2D CAD Blueprint View');
    });

    this.container.querySelector('#btn-view-3d')?.addEventListener('click', () => {
      const centerViewport = document.getElementById('center-viewport');
      if (centerViewport?.classList.contains('split-screen')) {
        document.getElementById('btn-hud-split')?.click();
      }
      projectStore.setViewMode('3d_main');
      showToast('3D Render View');
    });

    this.container.querySelector('#btn-file-template')?.addEventListener('click', () => {
      closeMenu();
      openTemplateModal(this.threeScene, this.cadViewport);
    });

    const fileInput = this.container.querySelector('#input-file-import') as HTMLInputElement;
    this.container.querySelector('#btn-file-open')?.addEventListener('click', () => {
      closeMenu();
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const content = evt.target?.result as string;
          const { state, isAur } = parseAurOrJson(content);
          projectStore.loadProject(state);
          this.cadViewport.centerView();
          this.threeScene.fitToExtents();
          showToast(isAur ? `Loaded .aur Archive: "${state.name}"` : `Loaded Project: "${state.name}"`);
        } catch (err: any) {
          await customAlert('Import Error', err.message || 'Error parsing imported project file.', { isDanger: true });
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });

    this.container.querySelector('#btn-file-export')?.addEventListener('click', () => {
      closeMenu();
      const state = projectStore.getState();
      exportAsAurFile(state);
      showToast(`Exported "${state.name}".aur Archive`);
    });

    this.container.querySelector('#btn-export-png')?.addEventListener('click', () => {
      closeMenu();
      const cadCanvas = document.getElementById('cad-canvas') as HTMLCanvasElement;
      if (cadCanvas) {
        const link = document.createElement('a');
        link.download = `blueprint_${Date.now()}.png`;
        link.href = cadCanvas.toDataURL('image/png');
        link.click();
        showToast('2D Blueprint exported as high-res PNG');
      }
    });

    this.container.querySelector('#btn-snapshot-3d')?.addEventListener('click', () => {
      try {
        const dataUrl = this.threeScene.captureScreenshot();
        const link = document.createElement('a');
        link.download = `render_3d_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        showToast('3D Render snapshot saved');
      } catch {
        showToast('Could not capture 3D snapshot');
      }
    });

    this.container.querySelector('#btn-clear')?.addEventListener('click', async () => {
      closeMenu();
      const confirmed = await customConfirm(
        'Clear Entire Canvas',
        'Are you sure you want to clear the entire project? All walls, openings, and rooms will be removed.',
        { isDanger: true, confirmText: 'Reset Canvas' }
      );
      if (confirmed) {
        projectStore.clearProject();
        showToast('Canvas cleared');
      }
    });

    this.container.querySelector('#btn-shortcuts')?.addEventListener('click', () => {
      openShortcutsModal();
    });
  }

  private updateActiveStates(viewMode: string, projectName?: string) {
    const centerViewport = document.getElementById('center-viewport');
    const isSplit = centerViewport?.classList.contains('split-screen');

    const btn2d = this.container.querySelector('#btn-view-2d');
    const btn3d = this.container.querySelector('#btn-view-3d');

    btn2d?.classList.toggle('active', !isSplit && viewMode === '2d_main');
    btn3d?.classList.toggle('active', !isSplit && viewMode === '3d_main');

    const titleInput = this.container.querySelector('#input-project-title') as HTMLInputElement;
    if (titleInput && projectName && document.activeElement !== titleInput) {
      titleInput.value = projectName;
    }
  }
}
