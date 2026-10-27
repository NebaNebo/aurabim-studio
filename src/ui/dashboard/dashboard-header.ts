/**
 * AuraBIM Studio — Dashboard Header & Metrics View Component
 */

export interface DashboardHeaderProps {
  displayName: string;
  isGuest: boolean;
  totalProjects: number;
  totalAreaM2: number;
  searchQuery: string;
}

export class DashboardHeaderRenderer {
  public static renderNavbar(props: DashboardHeaderProps): string {
    return `
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
            <input type="text" id="dash-search-input" class="dash-search-input" placeholder="Search architectural projects by name..." value="${escapeHtml(props.searchQuery)}" />
            <button class="dash-search-clear" id="btn-search-clear" title="Clear search" style="${props.searchQuery ? 'display: block;' : 'display: none;'}">✕</button>
          </div>
        </div>

        <div class="dash-nav-right">
          <button class="btn btn-sm btn-ghost" id="btn-dash-import-aur" title="Import native .aur project archive">
            <span>📥 Import .aur</span>
          </button>
          <input type="file" id="input-dash-aur-import" accept=".aur,.json" style="display: none;" />

          <button class="btn-primary-emerald" id="btn-dash-new-project">
            <span style="font-size: 15px; font-weight: 700;">+</span>
            <span>New Project</span>
          </button>

          <!-- User Profile Chip -->
          <div class="dash-user-badge" id="dash-user-chip">
            <div class="dash-avatar">${props.displayName.charAt(0).toUpperCase()}</div>
            <div class="dash-user-info">
              <span class="dash-user-name">${escapeHtml(props.displayName)}</span>
              <span class="dash-user-role">${props.isGuest ? 'Guest Designer' : 'Architect'}</span>
            </div>
            <button class="dash-signout-btn" id="btn-dash-signout" title="Sign Out of Studio">↪</button>
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
          <p class="dash-hero-desc">Your BIM projects are synced in real-time with Firebase Firestore & Cloudinary CDN.</p>
        </div>
        <div class="dash-stats-group">
          <div class="dash-stat-item">
            <span class="dash-stat-num">${props.totalProjects}</span>
            <span class="dash-stat-label">Total Designs</span>
          </div>
          <div class="dash-stat-divider"></div>
          <div class="dash-stat-item">
            <span class="dash-stat-num">${props.totalAreaM2} m²</span>
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
    `;
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
