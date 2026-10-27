import { projectRepository, SavedProjectItem } from '../../services/project-repository';
import { authService } from '../../services/auth-service';
import { ProjectCardRenderer } from './project-card';
import { NewProjectModal, NewProjectOptions } from './new-project-modal';
import { DashboardHeaderRenderer, DashboardHeaderProps } from './dashboard-header';
import { exportAsAurFile, parseAurOrJson } from '../../core/aur-file-system';
import { showToast } from '../toast-notifier';
import { customConfirm, customAlert } from '../custom-dialog';
import { ICONS } from '../icons';

export interface DashboardCallbacks {
  onOpenProject: (projectId: string) => void;
  onNewProject: (opts: NewProjectOptions) => void;
  onSignOut: () => void;
}

export class DashboardView {
  private container: HTMLElement;
  private callbacks: DashboardCallbacks;
  private projects: SavedProjectItem[] = [];
  private searchQuery: string = '';
  private selectedIds: Set<string> = new Set();
  private newProjectModal: NewProjectModal;

  constructor(container: HTMLElement, callbacks: DashboardCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    let modalSlot = document.getElementById('new-project-modal-slot');
    if (!modalSlot) {
      modalSlot = document.createElement('div');
      modalSlot.id = 'new-project-modal-slot';
      document.body.appendChild(modalSlot);
    }
    this.newProjectModal = new NewProjectModal(modalSlot, (opts) => {
      this.callbacks.onNewProject(opts);
    });
  }

  public async show() {
    this.container.style.display = 'block';
    await this.refresh();
  }

  public hide() {
    this.container.style.display = 'none';
  }

  public async refresh(autoPromptNewIfEmpty: boolean = true) {
    this.projects = await projectRepository.listProjects(this.getUserId());
    const validIds = new Set(this.projects.map(p => p.id));
    this.selectedIds = new Set([...this.selectedIds].filter(id => validIds.has(id)));

    this.render();
    this.bindEvents();

    if (this.projects.length === 0 && autoPromptNewIfEmpty && !this.searchQuery) {
      this.newProjectModal.show();
    }
  }

  private render() {
    const user = authService.getCurrentUser();
    const displayName = user?.displayName || user?.email?.split('@')[0] || 'Designer';

    const filtered = this.projects.filter(p =>
      p.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );

    const totalProjects = this.projects.length;
    let totalAreaM2 = 0;
    let emptyDraftCount = 0;

    for (const p of this.projects) {
      totalAreaM2 += p.totalAreaM2;
      if (p.wallCount === 0 && p.roomCount === 0) emptyDraftCount++;
    }
    totalAreaM2 = Math.round(totalAreaM2 * 10) / 10;
    const hasSelection = this.selectedIds.size > 0;

    const headerProps: DashboardHeaderProps = {
      displayName,
      isGuest: !!user?.isGuest,
      totalProjects,
      totalAreaM2,
      searchQuery: this.searchQuery
    };

    this.container.innerHTML = `
      <div class="dash-root">
        ${DashboardHeaderRenderer.renderNavbar(headerProps)}

        <main class="dash-main">
          ${DashboardHeaderRenderer.renderHeroBanner(headerProps)}

          <!-- Recent Projects Bento Section -->
          <section class="dash-projects-section">
            <div class="dash-section-header">
              <h2 class="dash-section-title" id="dash-section-title">
                Recent Projects <span class="dash-count-badge tabular-nums">(${filtered.length}${this.searchQuery ? ` / ${totalProjects}` : ''})</span>
              </h2>

              <div class="dash-section-actions">
                ${emptyDraftCount > 1 ? `
                  <button class="btn-cleanup-drafts" id="btn-clean-empty-drafts" title="Clean up 0-wall drafts">
                    <span class="btn-icon">${ICONS.broom}</span>
                    <span>Clean Up Drafts (${emptyDraftCount})</span>
                  </button>
                ` : ''}
              </div>
            </div>

            ${filtered.length === 0 ? `
              <div class="dash-empty-state">
                <div class="dash-empty-icon">${ICONS.blueprint}</div>
                <h3>${this.searchQuery ? 'No matching designs found' : 'No architectural designs yet'}</h3>
                <p>${this.searchQuery ? `No designs match "${this.searchQuery}". Try clearing search.` : 'Begin with a clean CAD viewport or explore architectural showcase templates.'}</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 8px;">
                  <button class="btn-primary-terracotta" id="btn-dash-empty-new">
                    <span class="btn-icon">${ICONS.plus}</span>
                    <span>${this.searchQuery ? 'Clear Search Filter' : 'Create New Project'}</span>
                  </button>
                  ${!this.searchQuery ? `
                    <button class="btn-ghost-pill" id="btn-seed-samples">
                      <span class="btn-icon">${ICONS.sparkles}</span>
                      <span>Explore Showcase</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            ` : `
              <div class="dash-projects-grid" id="dash-projects-grid">
                ${filtered.map(p => ProjectCardRenderer.renderCard(p, this.selectedIds.has(p.id), hasSelection)).join('')}
              </div>
            `}
          </section>
        </main>

        <!-- Floating Bulk Action Bar -->
        ${hasSelection ? `
          <div class="dash-bulk-bar" id="dash-bulk-bar">
            <span class="dash-bulk-info">${this.selectedIds.size} design${this.selectedIds.size > 1 ? 's' : ''} selected</span>
            <div class="dash-bulk-actions">
              <button class="btn-ghost-pill" id="btn-bulk-select-all">Select All</button>
              <button class="btn-danger-pill" id="btn-bulk-delete">
                <span class="btn-icon">${ICONS.trash}</span>
                <span>Delete Selected</span>
              </button>
              <button class="btn-ghost-pill" id="btn-bulk-cancel">Cancel</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private bindEvents() {
    ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick'].forEach(evt => {
      this.container.addEventListener(evt, e => e.stopPropagation());
    });

    const searchInput = this.container.querySelector('#dash-search-input') as HTMLInputElement | null;
    const clearBtn = this.container.querySelector('#btn-search-clear') as HTMLButtonElement | null;

    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      if (clearBtn) clearBtn.style.display = this.searchQuery ? 'flex' : 'none';
      this.render();
      this.bindEvents();
    });

    clearBtn?.addEventListener('click', () => {
      this.searchQuery = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearBtn.style.display = 'none';
      this.render();
      this.bindEvents();
    });

    // Theme toggle
    this.container.querySelector('#btn-dash-theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('aurabim_theme', next);
      this.render();
      this.bindEvents();
    });

    // Import .aur native project archive
    const aurInput = this.container.querySelector('#input-dash-aur-import') as HTMLInputElement | null;
    this.container.querySelector('#btn-dash-import-aur')?.addEventListener('click', () => {
      aurInput?.click();
    });

    aurInput?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const content = evt.target?.result as string;
          const { state, isAur, meta } = parseAurOrJson(content);
          const userId = this.getUserId();
          state.id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await projectRepository.saveProject(userId, state, meta?.thumbnailUrl, 'imported_aur');
          showToast(isAur ? `Imported .aur archive: "${state.name}"` : `Imported design: "${state.name}"`);
          await this.refresh();
        } catch (err: any) {
          await customAlert('Import Error', err.message || 'Error parsing imported file.', { isDanger: true });
        }
      };
      reader.readAsText(file);
      aurInput.value = '';
    });

    this.container.querySelector('#btn-dash-new-project')?.addEventListener('click', () => {
      this.newProjectModal.show();
    });

    this.container.querySelector('#btn-dash-empty-new')?.addEventListener('click', () => {
      if (this.searchQuery) {
        this.searchQuery = '';
        this.render();
        this.bindEvents();
      } else {
        this.newProjectModal.show();
      }
    });

    this.container.querySelector('#btn-seed-samples')?.addEventListener('click', async () => {
      await projectRepository.seedDefaultProjectsIfEmpty(this.getUserId());
      showToast('Loaded 3 architectural showcase designs');
      await this.refresh(false);
    });

    this.container.querySelector('#btn-clean-empty-drafts')?.addEventListener('click', async () => {
      const empties = this.projects.filter(p => p.wallCount === 0 && p.roomCount === 0);
      if (empties.length === 0) return;

      const confirmed = await customConfirm(
        'Clean Up Empty Drafts',
        `Remove ${empties.length} empty draft designs with 0 walls?`,
        { isDanger: true, confirmText: 'Clean Up' }
      );
      if (confirmed) {
        const uid = this.getUserId();
        for (const p of empties) {
          await projectRepository.deleteProject(uid, p.id);
        }
        showToast(`Cleaned up ${empties.length} empty drafts`);
        await this.refresh();
      }
    });

    // Bulk selection buttons
    this.container.querySelector('#btn-bulk-select-all')?.addEventListener('click', () => {
      this.selectedIds = new Set(this.projects.map(p => p.id));
      this.render();
      this.bindEvents();
    });

    this.container.querySelector('#btn-bulk-cancel')?.addEventListener('click', () => {
      this.selectedIds.clear();
      this.render();
      this.bindEvents();
    });

    this.container.querySelector('#btn-bulk-delete')?.addEventListener('click', async () => {
      const count = this.selectedIds.size;
      if (count === 0) return;
      const confirmed = await customConfirm(
        'Delete Selected Designs',
        `Permanently delete ${count} selected project design${count > 1 ? 's' : ''}?`,
        { isDanger: true, confirmText: 'Delete Selected' }
      );
      if (confirmed) {
        const uid = this.getUserId();
        for (const id of this.selectedIds) {
          await projectRepository.deleteProject(uid, id);
        }
        this.selectedIds.clear();
        showToast(`Deleted ${count} project${count > 1 ? 's' : ''}`);
        await this.refresh();
      }
    });

    this.container.querySelector('#btn-dash-signout')?.addEventListener('click', async () => {
      const confirmed = await customConfirm(
        'Sign Out of AuraBIM Studio',
        'Are you sure you want to sign out of your workspace session?',
        { confirmText: 'Sign Out' }
      );
      if (confirmed) {
        this.callbacks.onSignOut();
      }
    });

    this.bindCardEvents();
  }

  private getUserId(): string {
    const user = authService.getCurrentUser();
    return user ? user.uid : 'guest_local';
  }

  private bindCardEvents() {
    const cards = this.container.querySelectorAll('.dash-project-card');
    cards.forEach(card => {
      ProjectCardRenderer.bindCardEvents(card as HTMLElement, {
        onOpen: (id) => this.callbacks.onOpenProject(id),
        onSelectToggle: (id, selected) => {
          if (selected) this.selectedIds.add(id);
          else this.selectedIds.delete(id);
          this.render();
          this.bindEvents();
        },
        onDuplicate: async (id) => {
          const dup = await projectRepository.duplicateProject(this.getUserId(), id);
          if (dup) {
            showToast(`Duplicated "${dup.name}"`);
            await this.refresh();
          }
        },
        onDelete: async (id) => {
          await projectRepository.deleteProject(this.getUserId(), id);
          showToast('Project deleted');
          await this.refresh();
        },
        onRename: async (id, newName) => {
          const uid = this.getUserId();
          const p = await projectRepository.getProject(uid, id);
          if (p) {
            p.state.name = newName;
            p.name = newName;
            await projectRepository.saveProject(uid, p.state);
            showToast(`Renamed to "${newName}"`);
            await this.refresh();
          }
        },
        onExport: async (id) => {
          const p = await projectRepository.getProject(this.getUserId(), id);
          if (p) {
            exportAsAurFile(p.state, p.thumbnailUrl);
            showToast(`Exported "${p.name}".aur Archive`);
          }
        }
      });
    });
  }
}
