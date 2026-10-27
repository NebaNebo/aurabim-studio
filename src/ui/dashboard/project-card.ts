import { SavedProjectItem } from '../../services/project-repository';
import { customConfirm, customPrompt } from '../custom-dialog';

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
        <!-- Thumbnail Container (clipped corners) -->
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
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              <span class="card-thumb-fallback-text">${project.templateType || 'CAD Blueprint'}</span>
            </div>
          `}
          <div class="card-badge-row">
            <span class="card-metric-badge">📐 ${project.roomCount} Rooms</span>
            <span class="card-metric-badge">⚡ ${project.totalAreaM2} m²</span>
          </div>
        </div>

        <div class="card-body" data-action="open-card">
          <div class="card-title-row">
            <span class="card-title" title="Click to open or double-click to rename">${project.name}</span>
            <button class="card-action-btn" data-action="menu" title="Project options">⋮</button>

            <!-- Unclipped Apple Popover Menu -->
            <div class="card-dropdown-menu" style="display: none;">
              <button class="dropdown-item" data-action="open">✏️ Open Studio</button>
              <button class="dropdown-item" data-action="duplicate">📄 Duplicate</button>
              <button class="dropdown-item" data-action="rename">🏷️ Rename</button>
              <button class="dropdown-item" data-action="export">💾 Export .aur Project</button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item text-danger" data-action="delete">🗑️ Delete</button>
            </div>
          </div>

          <div class="card-meta-row">
            <span class="card-meta-time">Updated ${timeAgo}</span>
            <span class="card-meta-tag">${project.wallCount} walls</span>
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

    // 3. Toggle popover menu
    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menuDropdown?.style.display === 'flex';
      // Close all menus
      document.querySelectorAll('.card-dropdown-menu').forEach(m => (m as HTMLElement).style.display = 'none');
      document.querySelectorAll('.dash-project-card').forEach(c => c.classList.remove('menu-open'));

      if (!isVisible && menuDropdown) {
        menuDropdown.style.display = 'flex';
        cardEl.classList.add('menu-open');
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      if (menuDropdown) menuDropdown.style.display = 'none';
      cardEl.classList.remove('menu-open');
    });

    // 4. Popover Actions
    menuDropdown?.querySelector('[data-action="open"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.style.display = 'none';
      callbacks.onOpen(projectId);
    });

    menuDropdown?.querySelector('[data-action="duplicate"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.style.display = 'none';
      callbacks.onDuplicate(projectId);
    });

    menuDropdown?.querySelector('[data-action="export"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.style.display = 'none';
      callbacks.onExport?.(projectId);
    });

    menuDropdown?.querySelector('[data-action="rename"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      menuDropdown.style.display = 'none';
      const currentName = titleEl?.textContent || 'Project';
      const newName = await customPrompt('Rename Architectural Design', 'Enter a new title for this BIM design:', currentName);
      if (newName && newName.trim()) {
        callbacks.onRename(projectId, newName.trim());
      }
    });

    menuDropdown?.querySelector('[data-action="delete"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      menuDropdown.style.display = 'none';
      const confirmed = await customConfirm('Delete Design Project', 'Are you sure you want to permanently delete this project? This action cannot be undone.', { isDanger: true });
      if (confirmed) {
        callbacks.onDelete(projectId);
      }
    });

    // 5. Double-click inline renaming
    titleEl?.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const currentText = titleEl.textContent || '';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'card-title-input';
      input.value = currentText;
      titleEl.replaceWith(input);
      input.focus();
      input.select();

      const finishRename = () => {
        const val = input.value.trim() || currentText;
        input.replaceWith(titleEl);
        titleEl.textContent = val;
        if (val !== currentText) {
          callbacks.onRename(projectId, val);
        }
      };

      input.addEventListener('blur', finishRename);
      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') {
          ke.preventDefault();
          finishRename();
        } else if (ke.key === 'Escape') {
          input.replaceWith(titleEl);
        }
      });
    });
  }

  private static formatTimeAgo(timestamp: number): string {
    const diffMs = Date.now() - timestamp;
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
