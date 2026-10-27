import { projectStore } from '../core/state-store';
import { 
  createCoohomCurvedShowcaseTemplate,
  createModernStudioTemplate, 
  createTwoBedroomSuiteTemplate, 
  createBlankCanvasTemplate 
} from '../core/templates';
import { showToast } from './toast-notifier';
import { ThreeSceneManager } from '../webgl3d/three-scene';
import { CadViewport } from '../cad2d/cad-viewport';

export class TopBarController {
  private container: HTMLElement;
  private threeScene: ThreeSceneManager;
  private cadViewport: CadViewport;

  constructor(container: HTMLElement, threeScene: ThreeSceneManager, cadViewport: CadViewport) {
    this.container = container;
    this.threeScene = threeScene;
    this.cadViewport = cadViewport;

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
  }

  private render() {
    const currentState = projectStore.getState();
    this.container.innerHTML = `
      <div class="top-bar-section">
        <div class="studio-brand">
          <span class="studio-logo-icon">🏛️</span>
          <span class="studio-logo-name">AuraBIM</span>
          <span class="studio-status-badge">
            <span class="studio-status-dot"></span>
            <span>Saved</span>
          </span>
        </div>

        <div class="project-title-wrapper">
          <input type="text" class="project-title-input" id="input-project-title" value="${currentState.name || 'Studio Apartment'}" title="Click to rename project" />
        </div>

        <div class="top-bar-divider"></div>

        <button class="btn btn-sm" id="btn-file-template" title="Select Architectural Blueprint Template">📁 Templates</button>
        <button class="btn btn-sm" id="btn-file-open" title="Open Project JSON">📂 Open</button>
        <input type="file" id="input-file-import" accept=".json" style="display: none;" />
        <button class="btn btn-sm" id="btn-file-export" title="Save Project as JSON">💾 Save</button>
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
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target?.result as string);
          if (parsed.nodes && parsed.walls) {
            projectStore.loadProject(parsed);
            this.cadViewport.centerView();
            this.threeScene.fitToExtents();
            showToast('Project imported successfully');
          } else {
            alert('Invalid AuraBIM project JSON format.');
          }
        } catch {
          alert('Error parsing JSON file.');
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });

    // Save File (Export JSON)
    this.container.querySelector('#btn-file-export')?.addEventListener('click', () => {
      const state = projectStore.getState();
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(state.name || 'project').toLowerCase().replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Project JSON saved');
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
    this.container.querySelector('#btn-clear')?.addEventListener('click', () => {
      if (confirm('Clear entire project? All walls, openings, and rooms will be removed.')) {
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
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">Select Architectural Template</span>
          <button class="btn btn-sm btn-icon" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="catalog-item-card" id="tmpl-curved" style="padding: 14px; border: 1.5px solid var(--accent-blue); background: #f0f7ff;">
            <div class="catalog-item-icon" style="font-size: 26px; width: 48px; height: 48px;">🏢</div>
            <div class="catalog-item-info">
              <span class="catalog-item-name" style="font-size: 13.5px; font-weight: 700; color: #1e40af;">Curved Penthouse Suite (Coohom)</span>
              <span class="catalog-item-dim" style="font-size: 11px;">180.6 m² Curved Wing + 3 Suites • Arc Wall, Partition Dividers & Openings</span>
            </div>
          </div>

          <div class="catalog-item-card" id="tmpl-studio" style="padding: 14px;">
            <div class="catalog-item-icon" style="font-size: 26px; width: 48px; height: 48px;">🏙️</div>
            <div class="catalog-item-info">
              <span class="catalog-item-name" style="font-size: 13.5px;">Modern Studio Apartment</span>
              <span class="catalog-item-dim" style="font-size: 11px;">7.2m × 5.6m (40.3 m²) • Living, Bedroom, Bathroom, Kitchen</span>
            </div>
          </div>

          <div class="catalog-item-card" id="tmpl-2bed" style="padding: 14px;">
            <div class="catalog-item-icon" style="font-size: 26px; width: 48px; height: 48px;">🏰</div>
            <div class="catalog-item-info">
              <span class="catalog-item-name" style="font-size: 13.5px;">Luxury 2-Bedroom Suite</span>
              <span class="catalog-item-dim" style="font-size: 11px;">10.0m × 7.0m (70.0 m²) • Master Suite, Guest Bed, Dining & Living</span>
            </div>
          </div>

          <div class="catalog-item-card" id="tmpl-blank" style="padding: 14px;">
            <div class="catalog-item-icon" style="font-size: 26px; width: 48px; height: 48px;">📝</div>
            <div class="catalog-item-info">
              <span class="catalog-item-name" style="font-size: 13.5px;">Blank Blueprint</span>
              <span class="catalog-item-dim" style="font-size: 11px;">Start drafting from a clean millimeter canvas</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-sm" id="modal-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#modal-close')?.addEventListener('click', close);
    overlay.querySelector('#modal-cancel')?.addEventListener('click', close);

    overlay.querySelector('#tmpl-curved')?.addEventListener('click', () => {
      projectStore.loadProject(createCoohomCurvedShowcaseTemplate());
      this.cadViewport.centerView();
      this.threeScene.fitToExtents();
      showToast('Loaded Curved Penthouse Suite');
      close();
    });

    overlay.querySelector('#tmpl-studio')?.addEventListener('click', () => {
      projectStore.loadProject(createModernStudioTemplate());
      this.cadViewport.centerView();
      this.threeScene.fitToExtents();
      showToast('Loaded Modern Studio Apartment');
      close();
    });

    overlay.querySelector('#tmpl-2bed')?.addEventListener('click', () => {
      projectStore.loadProject(createTwoBedroomSuiteTemplate());
      this.cadViewport.centerView();
      this.threeScene.fitToExtents();
      showToast('Loaded Luxury 2-Bedroom Suite');
      close();
    });

    overlay.querySelector('#tmpl-blank')?.addEventListener('click', () => {
      projectStore.loadProject(createBlankCanvasTemplate());
      this.cadViewport.centerView();
      showToast('Loaded Blank Blueprint');
      close();
    });
  }

  private openShortcutsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
          <span class="modal-title">⌨️ Keyboard & Mouse Controls</span>
          <button class="btn btn-sm btn-icon" id="modal-close">✕</button>
        </div>
        <div class="modal-body" style="gap: 10px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span>Draw Straight Wall</span>
            <kbd class="tool-shortcut-badge">B</kbd>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span>Draw Rectangle Room</span>
            <kbd class="tool-shortcut-badge">F</kbd>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span>Select & Move Tool</span>
            <kbd class="tool-shortcut-badge">V / Esc</kbd>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span>Flip Door Swing Direction</span>
            <kbd class="tool-shortcut-badge">Spacebar</kbd>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span>Delete Selected Element</span>
            <kbd class="tool-shortcut-badge">Del / Backspace</kbd>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span>Undo / Redo</span>
            <kbd class="tool-shortcut-badge">Ctrl+Z / Ctrl+Y</kbd>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span>Pan 2D Canvas</span>
            <span style="color: var(--text-secondary); font-size: 11px;">Middle Drag or Right Drag</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
            <span>3D Orbit & Zoom</span>
            <span style="color: var(--text-secondary); font-size: 11px;">Left Drag / Wheel Scroll</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-sm btn-primary" id="modal-ok">Got it</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#modal-close')?.addEventListener('click', close);
    overlay.querySelector('#modal-ok')?.addEventListener('click', close);
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
