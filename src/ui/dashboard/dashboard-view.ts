import { projectRepository, SavedProjectItem } from '../../services/project-repository';
import { authService } from '../../services/auth-service';
import { ProjectCardRenderer } from './project-card';
import { NewProjectModal, NewProjectOptions } from './new-project-modal';
import { showToast } from '../toast-notifier';

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

  public async refresh() {
    const user = authService.getCurrentUser();
    const userId = user ? user.uid : 'guest_local';

    await projectRepository.seedDefaultProjectsIfEmpty(userId);
    this.projects = await projectRepository.listProjects(userId);
    // Prune selected IDs that no longer exist
    const validIds = new Set(this.projects.map(p => p.id));
    this.selectedIds = new Set([...this.selectedIds].filter(id => validIds.has(id)));

    this.render();
    this.bindEvents();
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
      if (p.wallCount === 0 && p.roomCount === 0) {
        emptyDraftCount++;
      }
    }
    totalAreaM2 = Math.round(totalAreaM2 * 10) / 10;
    const hasSelection = this.selectedIds.size > 0;

    this.container.innerHTML = `
      <div class="dash-root">
        <!-- Apple Liquid Glass Navigation Bar -->
        <header class="dash-navbar">
          <div class="dash-nav-left">
            <div class="dash-brand">
              <span class="dash-logo-icon">🏛️</span>
              <span class="dash-logo-text">AuraBIM</span>
              <span class="dash-version-badge">Studio</span>
            </div>
          </div>

          <div class="dash-nav-center">
            <div class="dash-search-box">
              <span class="dash-search-icon">🔍</span>
              <input type="text" id="dash-search-input" class="dash-search-input" placeholder="Search architectural projects by name..." value="${this.searchQuery}" />
              <button class="dash-search-clear" id="btn-search-clear" title="Clear search" style="${this.searchQuery ? 'display: block;' : 'display: none;'}">✕</button>
            </div>
          </div>

          <div class="dash-nav-right">
            <button class="btn-primary-emerald" id="btn-dash-new-project">
              <span style="font-size: 15px; font-weight: 700;">+</span>
              <span>New Project</span>
            </button>

            <!-- User Profile Chip -->
            <div class="dash-user-badge" id="dash-user-chip">
              <div class="dash-avatar">${displayName.charAt(0).toUpperCase()}</div>
              <div class="dash-user-info">
                <span class="dash-user-name">${displayName}</span>
                <span class="dash-user-role">${user?.isGuest ? 'Guest Designer' : 'Architect'}</span>
              </div>
              <button class="dash-signout-btn" id="btn-dash-signout" title="Sign Out of Studio">↪</button>
            </div>
          </div>
        </header>

        <!-- Main Architectural Workspace -->
        <main class="dash-main">
          <!-- Spatial Metrics Banner with Animated Status Dot -->
          <section class="dash-hero-banner">
            <div class="dash-hero-left">
              <h1 class="dash-hero-title">Welcome back, ${displayName}</h1>
              <p class="dash-hero-desc">Your BIM projects are synced in real-time with Firebase Firestore & Cloudinary CDN.</p>
            </div>
            <div class="dash-stats-group">
              <div class="dash-stat-item">
                <span class="dash-stat-num">${totalProjects}</span>
                <span class="dash-stat-label">Total Designs</span>
              </div>
              <div class="dash-stat-divider"></div>
              <div class="dash-stat-item">
                <span class="dash-stat-num">${totalAreaM2} m²</span>
                <span class="dash-stat-label">Designed Area</span>
              </div>
              <div class="dash-stat-divider"></div>
              <div class="dash-stat-item">
                <span class="dash-stat-badge">
                  <span class="dash-pulse-dot"></span>
                  <span>Cloud Connected</span>
                </span>
                <span class="dash-stat-label">carvazon3d · uyd1vcng</span>
              </div>
            </div>
          </section>

          <!-- Recent Projects Section Header & Controls -->
          <section class="dash-projects-section">
            <div class="dash-section-header">
              <h2 class="dash-section-title" id="dash-section-title">
                Recent Projects (${filtered.length}${this.searchQuery ? ` of ${totalProjects}` : ''})
              </h2>

              <div class="dash-section-actions">
                ${emptyDraftCount > 1 ? `
                  <button class="btn-cleanup-drafts" id="btn-clean-empty-drafts" title="Clean up 0-wall drafts in one click">
                    <span>🧹 Clean Up Empty Drafts (${emptyDraftCount})</span>
                  </button>
                ` : ''}
              </div>
            </div>

            ${filtered.length === 0 ? `
              <div class="dash-empty-state">
                <div class="dash-empty-icon">📐</div>
                <h3>${this.searchQuery ? 'No matching projects found' : 'No projects created yet'}</h3>
                <p>${this.searchQuery ? `No project names match "${this.searchQuery}". Try clearing search.` : 'Begin with a clean isometric grid or pick one of our luxury architectural templates.'}</p>
                <button class="btn-primary-emerald" id="btn-dash-empty-new">
                  ${this.searchQuery ? 'Clear Search Filter' : 'Create First Project'}
                </button>
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
              <button class="btn-danger-pill" id="btn-bulk-delete">🗑️ Delete Selected</button>
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
      if (clearBtn) clearBtn.style.display = this.searchQuery ? 'block' : 'none';
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

    this.container.querySelector('#btn-clean-empty-drafts')?.addEventListener('click', async () => {
      const user = authService.getCurrentUser();
      const userId = user ? user.uid : 'guest_local';
      const empties = this.projects.filter(p => p.wallCount === 0 && p.roomCount === 0);
      if (empties.length === 0) return;

      if (confirm(`Clean up and remove ${empties.length} empty draft designs?`)) {
        for (const p of empties) {
          await projectRepository.deleteProject(userId, p.id);
        }
        showToast(`Cleaned up ${empties.length} empty drafts`);
        await this.refresh();
      }
    });

    // Bulk selection bar buttons
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
      if (confirm(`Delete ${count} selected project${count > 1 ? 's' : ''}?`)) {
        const user = authService.getCurrentUser();
        const userId = user ? user.uid : 'guest_local';
        for (const id of this.selectedIds) {
          await projectRepository.deleteProject(userId, id);
        }
        this.selectedIds.clear();
        showToast(`Deleted ${count} project${count > 1 ? 's' : ''}`);
        await this.refresh();
      }
    });

    this.container.querySelector('#btn-dash-signout')?.addEventListener('click', () => {
      if (confirm('Sign out of AuraBIM Studio?')) {
        this.callbacks.onSignOut();
      }
    });

    this.bindCardEvents();
  }

  private bindCardEvents() {
    const cards = this.container.querySelectorAll('.dash-project-card');
    cards.forEach(card => {
      ProjectCardRenderer.bindCardEvents(card as HTMLElement, {
        onOpen: (id) => this.callbacks.onOpenProject(id),
        onSelectToggle: (id, selected) => {
          if (selected) {
            this.selectedIds.add(id);
          } else {
            this.selectedIds.delete(id);
          }
          this.render();
          this.bindEvents();
        },
        onDuplicate: async (id) => {
          const user = authService.getCurrentUser();
          const userId = user ? user.uid : 'guest_local';
          const dup = await projectRepository.duplicateProject(userId, id);
          if (dup) {
            showToast(`Duplicated "${dup.name}"`);
            await this.refresh();
          }
        },
        onDelete: async (id) => {
          const user = authService.getCurrentUser();
          const userId = user ? user.uid : 'guest_local';
          await projectRepository.deleteProject(userId, id);
          showToast('Project deleted');
          await this.refresh();
        },
        onRename: async (id, newName) => {
          const user = authService.getCurrentUser();
          const userId = user ? user.uid : 'guest_local';
          const p = await projectRepository.getProject(userId, id);
          if (p) {
            p.state.name = newName;
            p.name = newName;
            await projectRepository.saveProject(userId, p.state);
            showToast(`Renamed to "${newName}"`);
            await this.refresh();
          }
        },
        onExport: async (id) => {
          const user = authService.getCurrentUser();
          const userId = user ? user.uid : 'guest_local';
          const p = await projectRepository.getProject(userId, id);
          if (p) {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(p.state, null, 2));
            const dl = document.createElement('a');
            dl.setAttribute('href', dataStr);
            dl.setAttribute('download', `${p.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_blueprint.json`);
            dl.click();
            showToast(`Exported "${p.name}"`);
          }
        }
      });
    });
  }
}
