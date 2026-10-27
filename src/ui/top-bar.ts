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
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

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

        <div class="top-bar-divider"></div>

        <!-- Quiet Utility Bar -->
        <button class="btn btn-sm btn-ghost-cad" id="btn-top-save" title="Save Project (Ctrl+S)">
          <span class="btn-icon">${ICONS.save}</span>
          <span>Save</span>
        </button>
        <button class="btn btn-sm btn-ghost-cad" id="btn-file-template" title="Architectural Blueprint Templates">
          <span class="btn-icon">${ICONS.templateFolder}</span>
          <span>Templates</span>
        </button>
        <button class="btn btn-sm btn-ghost-cad" id="btn-file-open" title="Import .aur or JSON Blueprint">
          <span class="btn-icon">${ICONS.folderOpen}</span>
          <span>Open</span>
        </button>
        <input type="file" id="input-file-import" accept=".aur,.json" style="display: none;" />
        <button class="btn btn-sm btn-ghost-cad" id="btn-file-export" title="Export .aur Project Archive">
          <span class="btn-icon">${ICONS.exportFile}</span>
          <span>Export .aur</span>
        </button>
        <button class="btn btn-sm btn-ghost-cad" id="btn-export-png" title="Export High-Res PNG Blueprint">
          <span class="btn-icon">${ICONS.blueprint}</span>
          <span>Blueprint</span>
        </button>
        <button class="btn btn-sm btn-ghost-cad btn-clear-cad" id="btn-clear" title="Clear Canvas">
          <span class="btn-icon">${ICONS.broom}</span>
          <span>Clear</span>
        </button>
      </div>

      <!-- Recessed View Switcher -->
      <div class="top-bar-section">
        <div class="segmented-control" id="top-view-mode-toggle">
          <button class="seg-btn active" data-vmode="2d_main" id="btn-view-2d" title="2D CAD Drafting View">2D CAD</button>
          <button class="seg-btn" data-vmode="3d_main" id="btn-view-3d" title="3D Realistic Spatial Preview">3D View</button>
          <button class="seg-btn" data-vmode="split" id="btn-view-split" title="Side-by-side Split View">
            <span class="btn-icon" style="margin-right: 4px;">${ICONS.splitScreen}</span>
            <span>Split Screen</span>
          </button>
        </div>
      </div>

      <!-- Actions & Render CTA -->
      <div class="top-bar-section">
        <button class="btn btn-icon btn-sm" id="btn-undo" title="Undo (Ctrl+Z)">${ICONS.undo}</button>
        <button class="btn btn-icon btn-sm" id="btn-redo" title="Redo (Ctrl+Y)">${ICONS.redo}</button>

        <div class="top-bar-divider"></div>

        <button class="btn btn-icon btn-sm" id="btn-top-theme" title="Toggle Theme (Obsidian / Alabaster)">
          ${isDark ? ICONS.themeSun : ICONS.themeMoon}
        </button>
        <button class="btn btn-sm btn-ghost-cad" id="btn-shortcuts" title="Keyboard Shortcuts">
          <span class="btn-icon">${ICONS.keyboard}</span>
          <span>[?]</span>
        </button>
        <button class="btn btn-icon btn-sm" id="btn-fullscreen" title="Toggle Fullscreen">${ICONS.fullscreen}</button>
        <button class="btn btn-sm btn-primary-terracotta" id="btn-snapshot-3d" title="Capture High-Resolution 3D Render">
          <span class="btn-icon">${ICONS.renderCamera}</span>
          <span>Render 3D</span>
        </button>
      </div>
    `;
  }

  private bindEvents() {
    this.container.querySelector('#btn-top-save')?.addEventListener('click', async () => {
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

    // Theme toggle
    this.container.querySelector('#btn-top-theme')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('aurabim_theme', next);
      this.render();
      this.bindEvents();
    });

    const titleInput = this.container.querySelector('#input-project-title') as HTMLInputElement;
    titleInput?.addEventListener('change', () => {
      const val = titleInput.value.trim();
      if (val) {
        projectStore.setProjectName(val);
        showToast(`Project renamed to: ${val}`);
      }
    });

    this.container.querySelector('#btn-undo')?.addEventListener('click', () => {
      if (projectStore.undo()) showToast('Undo');
    });
    this.container.querySelector('#btn-redo')?.addEventListener('click', () => {
      if (projectStore.redo()) showToast('Redo');
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

    this.container.querySelector('#btn-view-split')?.addEventListener('click', () => {
      document.getElementById('btn-hud-split')?.click();
    });

    this.container.querySelector('#btn-file-template')?.addEventListener('click', () => {
      openTemplateModal(this.threeScene, this.cadViewport);
    });

    const fileInput = this.container.querySelector('#input-file-import') as HTMLInputElement;
    this.container.querySelector('#btn-file-open')?.addEventListener('click', () => {
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
      const state = projectStore.getState();
      exportAsAurFile(state);
      showToast(`Exported "${state.name}".aur Archive`);
    });

    this.container.querySelector('#btn-export-png')?.addEventListener('click', () => {
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
      const confirmed = await customConfirm(
        'Clear Entire Canvas',
        'Are you sure you want to clear the entire project? All walls, openings, and rooms will be removed.',
        { isDanger: true, confirmText: 'Clear Canvas' }
      );
      if (confirmed) {
        projectStore.clearProject();
        showToast('Canvas cleared');
      }
    });

    this.container.querySelector('#btn-shortcuts')?.addEventListener('click', () => {
      openShortcutsModal();
    });

    this.container.querySelector('#btn-fullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  private updateActiveStates(viewMode: string, projectName?: string) {
    const centerViewport = document.getElementById('center-viewport');
    const isSplit = centerViewport?.classList.contains('split-screen');

    const btn2d = this.container.querySelector('#btn-view-2d');
    const btn3d = this.container.querySelector('#btn-view-3d');
    const btnSplit = this.container.querySelector('#btn-view-split');

    btn2d?.classList.toggle('active', !isSplit && viewMode === '2d_main');
    btn3d?.classList.toggle('active', !isSplit && viewMode === '3d_main');
    btnSplit?.classList.toggle('active', !!isSplit);

    const titleInput = this.container.querySelector('#input-project-title') as HTMLInputElement;
    if (titleInput && projectName && document.activeElement !== titleInput) {
      titleInput.value = projectName;
    }
  }
}
