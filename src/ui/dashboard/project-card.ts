import { SavedProjectItem } from '../../services/project-repository';

export interface ProjectCardCallbacks {
  onOpen: (projectId: string) => void;
  onDuplicate: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onRename: (projectId: string, newName: string) => void;
}

export class ProjectCardRenderer {
  public static renderCard(project: SavedProjectItem): string {
    const timeAgo = this.formatTimeAgo(project.updatedAt);
    const hasThumb = project.thumbnailUrl && project.thumbnailUrl.startsWith('http');

    return `
      <div class="dash-project-card" data-project-id="${project.id}">
        <div class="card-thumb-area">
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

        <div class="card-body">
          <div class="card-title-row">
            <span class="card-title" title="Click to open project">${project.name}</span>
            <button class="card-action-btn" data-action="menu" title="Project options">⋮</button>
          </div>
          <div class="card-meta-row">
            <span class="card-meta-time">Updated ${timeAgo}</span>
            <span class="card-meta-tag">${project.wallCount} walls</span>
          </div>
        </div>

        <div class="card-dropdown-menu" style="display: none;">
          <button class="dropdown-item" data-action="open">✏️ Open Studio</button>
          <button class="dropdown-item" data-action="duplicate">📄 Duplicate</button>
          <button class="dropdown-item" data-action="rename">🏷️ Rename</button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item text-danger" data-action="delete">🗑️ Delete</button>
        </div>
      </div>
    `;
  }

  public static bindCardEvents(cardEl: HTMLElement, callbacks: ProjectCardCallbacks) {
    const projectId = cardEl.getAttribute('data-project-id');
    if (!projectId) return;

    const thumbArea = cardEl.querySelector('.card-thumb-area');
    const titleEl = cardEl.querySelector('.card-title');
    const menuBtn = cardEl.querySelector('.card-action-btn[data-action="menu"]');
    const menuDropdown = cardEl.querySelector('.card-dropdown-menu') as HTMLElement | null;

    // Open project on thumbnail or title click
    thumbArea?.addEventListener('click', () => callbacks.onOpen(projectId));
    titleEl?.addEventListener('click', () => callbacks.onOpen(projectId));

    // Toggle popover menu
    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other open menus
      document.querySelectorAll('.card-dropdown-menu').forEach(m => {
        if (m !== menuDropdown) (m as HTMLElement).style.display = 'none';
      });
      if (menuDropdown) {
        menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'flex' : 'none';
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      if (menuDropdown) menuDropdown.style.display = 'none';
    });

    // Dropdown actions
    menuDropdown?.querySelector('[data-action="open"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onOpen(projectId);
    });

    menuDropdown?.querySelector('[data-action="duplicate"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onDuplicate(projectId);
    });

    menuDropdown?.querySelector('[data-action="rename"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentName = titleEl?.textContent || 'Project';
      const newName = prompt('Enter new project name:', currentName);
      if (newName && newName.trim()) {
        callbacks.onRename(projectId, newName.trim());
      }
    });

    menuDropdown?.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this project?')) {
        callbacks.onDelete(projectId);
      }
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
