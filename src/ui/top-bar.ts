import { projectStore } from '../core/state-store';
import { showToast } from './toast-notifier';
import { ThreeSceneManager } from '../webgl3d/three-scene';
import { CadViewport } from '../cad2d/cad-viewport';
import { openShortcutsModal } from './shortcuts-modal';
import { openTemplateModal } from './template-picker-modal';
import { autoSaveManager, AutoSaveStatus } from '../services/auto-save-manager';
import { exportAsAurFile, parseAurOrJson } from '../core/aur-file-system';
import { customAlert, customConfirm } from './custom-dialog';

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

    // Pointer Event Isolation: Stop propagation so top-bar clicks never trigger canvas drawing
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
        if (dot) dot.style.backgroundColor = '#f59e0b';
        badge.classList.add('saving');
      } else if (status === 'saved') {
        text.textContent = 'Cloud Synced';
        if (dot) dot.style.backgroundColor = '#10b981';
        badge.classList.remove('saving');
      } else if (status === 'error') {
        text.textContent = 'Local (Offline)';
        if (dot) dot.style.backgroundColor = '#94a3b8';
        badge.classList.remove('saving');
      } else {
        text.textContent = 'Saved';
        if (dot) dot.style.backgroundColor = '#10b981';
      }
    });
  }

  private render() {
    const currentState = projectStore.getState();
    this.container.innerHTML = `
      <div class="top-bar-section">
        <button class="btn btn-sm btn-ghost" id="btn-back-dashboard" title="Return to Projects Dashboard">
          <span style="font-size: 13px;">←</span>
          <span>Dashboard</span>
        </button>

        <div class="studio-brand">
          <span class="studio-logo-icon">🏛️</span>
          <span class="studio-logo-name">AuraBIM</span>
          <span class="studio-status-badge" id="top-autosave-badge">
            <span class="studio-status-dot"></span>
            <span id="top-autosave-text">Saved</span>
          </span>
        </div>

        <div class="project-title-wrapper">
          <input type="text" class="project-title-input" id="input-project-title" value="${currentState.name || 'Studio Apartment'}" title="Click to rename project" />
        </div>

        <div class="top-bar-divider"></div>

        <button class="btn btn-sm" id="btn-file-template" title="Select Architectural Blueprint Template">📁 Templates</button>
        <button class="btn btn-sm" id="btn-file-open" title="Import .aur or JSON Blueprint">📂 Open</button>
        <input type="file" id="input-file-import" accept=".aur,.json" style="display: none;" />
        <button class="btn btn-sm" id="btn-file-export" title="Export .aur Project Archive">💾 Export .aur</button>
        <button class="btn btn-sm" id="btn-export-png" title="Export 2D Blueprint as High-Res PNG">📐 Blueprint</button>
      </div>

      <div class="top-bar-section">
        <div class="segmented-control" id="top-view-mode-toggle">
          <button class="seg-btn active" data-vmode="2d_main" id="btn-view-2d" title="2D CAD Drafting View">2D CAD</button>
          <button class="seg-btn" data-vmode="3d_main" id="btn-view-3d" title="3D Realistic Preview">3D View</button>
          <button class="seg-btn" data-vmode="split" id="btn-view-split" title="Side-by-side 2D & 3D Split View">◫ Split Screen</button>
        </div>
      </div>

      <div class="top-bar-section">
        <button class="btn btn-icon btn-sm" id="btn-undo" title="Undo (Ctrl+Z)">↩</button>
        <button class="btn btn-icon btn-sm" id="btn-redo" title="Redo (Ctrl+Y)">↪</button>
        <button class="btn btn-sm btn-danger" id="btn-clear" title="Clear Canvas">🧹 Clear</button>

        <div class="top-bar-divider"></div>

        <button class="btn btn-sm" id="btn-shortcuts" title="Keyboard Shortcuts & Controls">⌨️ Shortcuts</button>
        <button class="btn btn-icon btn-sm" id="btn-fullscreen" title="Toggle Fullscreen">⛶</button>
        <button class="btn btn-sm btn-primary btn-pill" id="btn-snapshot-3d" title="Capture High-Resolution 3D Snapshot">📷 Render 3D</button>
      </div>
    `;
  }

  private bindEvents() {
    // Back to Dashboard with immediate auto-save
    this.container.querySelector('#btn-back-dashboard')?.addEventListener('click', async () => {
      await autoSaveManager.forceSaveNow();
      if (this.onBackToDashboard) {
        this.onBackToDashboard();
      }
    });

    // Project title rename
    const titleInput = this.container.querySelector('#input-project-title') as HTMLInputElement;
    titleInput?.addEventListener('change', () => {
      const val = titleInput.value.trim();
      if (val) {
        projectStore.setProjectName(val);
        showToast(`Project renamed to: ${val}`);
      }
    });

    // Undo / Redo
    this.container.querySelector('#btn-undo')?.addEventListener('click', () => {
      if (projectStore.undo()) showToast('Undo');
    });
    this.container.querySelector('#btn-redo')?.addEventListener('click', () => {
      if (projectStore.redo()) showToast('Redo');
    });

    // View toggles
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
      showToast('3D Real-Time Render View');
    });

    this.container.querySelector('#btn-view-split')?.addEventListener('click', () => {
      document.getElementById('btn-hud-split')?.click();
    });

    // Templates Modal
    this.container.querySelector('#btn-file-template')?.addEventListener('click', () => {
      this.openTemplateModal();
    });

    // Open File button & file picker
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
          await customAlert('Import Error', err.message || 'Error parsing imported project file.', { type: 'error' });
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });

    // Save File (Export .aur Archive)
    this.container.querySelector('#btn-file-export')?.addEventListener('click', () => {
      const state = projectStore.getState();
      exportAsAurFile(state);
      showToast(`Exported "${state.name}".aur Archive`);
    });

    // Export 2D Blueprint PNG
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

    // 3D Snapshot Render
    this.container.querySelector('#btn-snapshot-3d')?.addEventListener('click', () => {
      try {
        const dataUrl = this.threeScene.captureScreenshot();
        const link = document.createElement('a');
        link.download = `render_3d_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        showToast('📸 3D High-Res Render Snapshot saved!');
      } catch (err) {
        showToast('Could not capture 3D snapshot');
      }
    });

    // Clear canvas
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

    // Shortcuts Modal
    this.container.querySelector('#btn-shortcuts')?.addEventListener('click', () => {
      this.openShortcutsModal();
    });

    // Fullscreen toggle
    this.container.querySelector('#btn-fullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  private openTemplateModal() {
    openTemplateModal(this.threeScene, this.cadViewport);
  }

  private openShortcutsModal() {
    openShortcutsModal();
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
