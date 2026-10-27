import { SavedProjectItem } from '../../services/project-repository';
import { customConfirm, customPrompt } from '../custom-dialog';
import { ICONS } from '../icons';

export interface ProjectCardCallbacks {
  onOpen: (projectId: string) => void;
  onDuplicate: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onRename: (projectId: string, newName: string) => void;
  onSelectToggle?: (projectId: string, selected: boolean) => void;
  onExport?: (projectId: string) => void;
}

export class ProjectCardRenderer {
  public static renderCard(project: SavedProjectItem, isSelected: boolean = false, hasAnySelection: boolean = false): string {
    const timeAgo = this.formatTimeAgo(project.updatedAt);
    const hasThumb = project.thumbnailUrl && project.thumbnailUrl.startsWith('http');

    return `
      <div class="dash-project-card ${isSelected ? 'is-selected' : ''}" data-project-id="${project.id}">
        <!-- Thumbnail Viewport (190px height) -->
        <div class="card-thumb-area" data-action="open-card">
          <!-- Selection Checkbox -->
          <label class="card-select-label ${hasAnySelection ? 'has-selection' : ''}" title="Select for bulk action">
            <input type="checkbox" class="card-select-checkbox" data-select-id="${project.id}" ${isSelected ? 'checked' : ''} />
            <span class="card-checkbox-custom"></span>
          </label>

          <!-- Hover Overlay -->
          <div class="card-thumb-hover-overlay">
            <span>Open in Studio →</span>
          </div>

          ${hasThumb ? `
            <img src="${project.thumbnailUrl}" class="card-thumb-img" alt="${project.name}" loading="lazy" />
          ` : `
            <div class="card-thumb-fallback">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              <span class="card-thumb-fallback-text">${project.templateType || 'CAD Blueprint'}</span>
            </div>
          `}
          <div class="card-badge-row">
            <span class="card-metric-badge">${ICONS.rooms} ${project.roomCount} Rooms</span>
            <span class="card-metric-badge tabular-nums">${ICONS.area} ${project.totalAreaM2} m²</span>
          </div>
        </div>

        <div class="card-body" data-action="open-card">
          <div class="card-title-row">
            <span class="card-title" title="Click to open or double-click to rename">${project.name}</span>
            <button class="card-action-btn" data-action="menu" title="Project options">
              ${ICONS.moreVertical}
            </button>

            <!-- Unclipped Popover Menu -->
            <div class="card-dropdown-menu" style="display: none;">
              <button class="dropdown-item" data-action="open">
                <span class="dropdown-icon">${ICONS.edit}</span>
                <span>Open Studio</span>
              </button>
              <button class="dropdown-item" data-action="duplicate">
                <span class="dropdown-icon">${ICONS.copy}</span>
                <span>Duplicate</span>
              </button>
              <button class="dropdown-item" data-action="rename">
                <span class="dropdown-icon">${ICONS.tag}</span>
                <span>Rename</span>
              </button>
              <button class="dropdown-item" data-action="export">
                <span class="dropdown-icon">${ICONS.exportFile}</span>
                <span>Export .aur Archive</span>
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item text-danger" data-action="delete">
                <span class="dropdown-icon">${ICONS.trash}</span>
                <span>Delete</span>
              </button>
            </div>
          </div>

          <div class="card-meta-row">
            <span class="card-meta-time">Updated ${timeAgo}</span>
            <span class="card-meta-tag">[${project.wallCount} walls]</span>
          </div>
        </div>
      </div>
    `;
  }

  public static bindCardEvents(cardEl: HTMLElement, callbacks: ProjectCardCallbacks) {
    const projectId = cardEl.getAttribute('data-project-id');
    if (!projectId) return;

    const titleEl = cardEl.querySelector('.card-title');
    const menuBtn = cardEl.querySelector('.card-action-btn[data-action="menu"]');
    const menuDropdown = cardEl.querySelector('.card-dropdown-menu') as HTMLElement | null;
    const checkbox = cardEl.querySelector('.card-select-checkbox') as HTMLInputElement | null;

    // 1. Entire card clickable to open studio (except when clicking controls)
    cardEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.card-action-btn') || target.closest('.card-dropdown-menu') || target.closest('.card-select-label') || target.closest('.card-title-input')) {
        return;
      }
      callbacks.onOpen(projectId);
    });

    // 2. Selection checkbox
    checkbox?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    checkbox?.addEventListener('change', (e) => {
      e.stopPropagation();
      callbacks.onSelectToggle?.(projectId, checkbox.checked);
    });

    // 3. Dropdown Menu toggle
    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!menuDropdown) return;

      const isVisible = menuDropdown.style.display === 'block';
      document.querySelectorAll('.card-dropdown-menu').forEach(el => (el as HTMLElement).style.display = 'none');

      if (!isVisible) {
        menuDropdown.style.display = 'block';
      }
    });

    // 4. Menu actions
    menuDropdown?.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        menuDropdown.style.display = 'none';

        const action = item.getAttribute('data-action');
        if (action === 'open') {
          callbacks.onOpen(projectId);
        } else if (action === 'duplicate') {
          callbacks.onDuplicate(projectId);
        } else if (action === 'rename') {
          this.triggerInlineRename(cardEl, projectId, callbacks);
        } else if (action === 'export') {
          callbacks.onExport?.(projectId);
        } else if (action === 'delete') {
          const title = titleEl?.textContent || 'this project';
          const confirmed = await customConfirm(
            'Delete Project',
            `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
            { confirmText: 'Delete Project', isDanger: true }
          );
          if (confirmed) {
            callbacks.onDelete(projectId);
          }
        }
      });
    });

    // 5. Double click title to inline rename
    titleEl?.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.triggerInlineRename(cardEl, projectId, callbacks);
    });
  }

  private static triggerInlineRename(cardEl: HTMLElement, projectId: string, callbacks: ProjectCardCallbacks) {
    const titleEl = cardEl.querySelector('.card-title') as HTMLElement | null;
    if (!titleEl) return;

    const currentName = titleEl.textContent || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'card-title-input';
    input.value = currentName;

    const commitRename = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        titleEl.textContent = newName;
        callbacks.onRename(projectId, newName);
      }
      input.replaceWith(titleEl);
    };

    input.addEventListener('blur', commitRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = currentName;
        input.blur();
      }
    });

    titleEl.replaceWith(input);
    input.focus();
    input.select();
  }

  private static formatTimeAgo(timestamp: number): string {
    const elapsed = Date.now() - timestamp;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(elapsed / 3600000);
    const days = Math.floor(elapsed / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }
}
