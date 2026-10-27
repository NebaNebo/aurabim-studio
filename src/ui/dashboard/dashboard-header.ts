import { ICONS } from '../icons';

export interface DashboardHeaderProps {
  displayName: string;
  isGuest: boolean;
  totalProjects: number;
  totalAreaM2: number;
  searchQuery: string;
}

export class DashboardHeaderRenderer {
  public static renderNavbar(props: DashboardHeaderProps): string {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    return `
      <header class="dash-navbar">
        <div class="dash-nav-left">
          <div class="dash-brand">
            <span class="dash-logo-icon">${ICONS.brandLogo}</span>
            <span class="dash-logo-text">AuraBIM</span>
            <span class="dash-version-pill">STUDIO</span>
          </div>
        </div>

        <div class="dash-nav-center">
          <div class="dash-search-box">
            <span class="dash-search-icon">${ICONS.search}</span>
            <input
              type="text"
              id="dash-search-input"
              class="dash-search-input"
              placeholder="Search architectural designs..."
              value="${escapeHtml(props.searchQuery)}"
            />
            <span class="dash-search-kbd">⌘K</span>
            <button class="dash-search-clear" id="btn-search-clear" title="Clear search" style="${props.searchQuery ? 'display: flex;' : 'display: none;'}">
              ${ICONS.close}
            </button>
          </div>
        </div>

        <div class="dash-nav-right">
          <button class="dash-theme-btn" id="btn-dash-theme-toggle" title="Toggle Theme (Obsidian / Alabaster)">
            ${isDark ? ICONS.themeSun : ICONS.themeMoon}
          </button>

          <button class="btn btn-sm btn-ghost" id="btn-dash-import-aur" title="Import native .aur or JSON project">
            <span class="btn-icon">${ICONS.importFile}</span>
            <span>Import .aur</span>
          </button>
          <input type="file" id="input-dash-aur-import" accept=".aur,.json" style="display: none;" />

          <button class="btn-primary-terracotta" id="btn-dash-new-project">
            <span class="btn-icon">${ICONS.plus}</span>
            <span>New Project</span>
          </button>

          <!-- User Profile Chip -->
          <div class="dash-user-badge" id="dash-user-chip">
            <div class="dash-avatar">${escapeHtml(props.displayName.charAt(0).toUpperCase())}</div>
            <div class="dash-user-info">
              <span class="dash-user-name">${escapeHtml(props.displayName)}</span>
              <span class="dash-user-role">${props.isGuest ? 'Guest Designer' : 'Architect'}</span>
            </div>
            <button class="dash-signout-btn" id="btn-dash-signout" title="Sign Out of Studio">
              ${ICONS.signout}
            </button>
          </div>
        </div>
      </header>
    `;
  }

  public static renderHeroBanner(props: DashboardHeaderProps): string {
    return `
      <section class="dash-hero-banner">
        <div class="dash-hero-left">
          <h1 class="dash-hero-title">Welcome back, ${escapeHtml(props.displayName)}</h1>
          <p class="dash-hero-desc">Tactile architectural CAD & 3D BIM workspace with real-time cloud telemetry.</p>
        </div>
        <div class="dash-stats-group">
          <div class="dash-stat-item">
            <span class="dash-stat-label">TOTAL DESIGNS</span>
            <span class="dash-stat-num tabular-nums">${props.totalProjects}</span>
          </div>
          <div class="dash-stat-divider"></div>
          <div class="dash-stat-item">
            <span class="dash-stat-label">DESIGNED AREA</span>
            <span class="dash-stat-num tabular-nums">${props.totalAreaM2} <span class="stat-unit">m²</span></span>
          </div>
          <div class="dash-stat-divider"></div>
          <div class="dash-stat-item">
            <span class="dash-stat-label">CLOUD STATUS</span>
            <div class="dash-cloud-status">
              <span class="dash-pulse-dot"></span>
              <span class="dash-cloud-text">Cloud Connected</span>
            </div>
            <span class="dash-cloud-sub">CARVAZON3D · UYD1VCNG</span>
          </div>
        </div>
      </section>
    `;
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
