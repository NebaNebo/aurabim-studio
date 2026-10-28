export type AppViewMode = 'auth' | 'dashboard' | 'editor';

export interface AppRoute {
  view: AppViewMode;
  projectId: string | null;
}

export type RouteChangeCallback = (route: AppRoute) => void;

export const ROUTE_STORAGE_VIEW_KEY = 'aurabim_active_view';
export const ROUTE_STORAGE_PROJECT_KEY = 'aurabim_active_project_id';

function safeGetStorage(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
}

export function parseRouteFromHash(hash: string): AppRoute | null {
  if (!hash) return null;
  const clean = hash.replace(/^#\/?/, '').trim();
  if (!clean) return null;

  const [path, queryString] = clean.split('?');
  const normalizedPath = path.toLowerCase();
  const params = new URLSearchParams(queryString || '');
  const projectId = params.get('project') || params.get('id') || null;

  if (normalizedPath === 'editor') {
    return { view: 'editor', projectId };
  } else if (normalizedPath === 'dashboard') {
    return { view: 'dashboard', projectId: null };
  } else if (normalizedPath === 'auth') {
    return { view: 'auth', projectId: null };
  }

  return null;
}

export function formatRouteHash(view: AppViewMode, projectId?: string | null): string {
  if (view === 'editor') {
    return projectId ? `#/editor?project=${encodeURIComponent(projectId)}` : `#/editor`;
  } else if (view === 'dashboard') {
    return `#/dashboard`;
  } else if (view === 'auth') {
    return `#/auth`;
  }
  return `#/dashboard`;
}

export class AppRouter {
  private authContainer: HTMLElement;
  private dashboardContainer: HTMLElement;
  private editorContainer: HTMLElement;
  private currentView: AppViewMode = 'dashboard';
  private currentProjectId: string | null = null;
  private onNavigateCallbacks: Set<(view: AppViewMode, projectId: string | null) => void> = new Set();
  private onRouteChangeCallbacks: Set<RouteChangeCallback> = new Set();
  private hashListener: (() => void) | null = null;

  constructor(
    authContainer: HTMLElement,
    dashboardContainer: HTMLElement,
    editorContainer: HTMLElement
  ) {
    this.authContainer = authContainer;
    this.dashboardContainer = dashboardContainer;
    this.editorContainer = editorContainer;

    if (typeof window !== 'undefined') {
      this.hashListener = () => {
        const parsed = parseRouteFromHash(window.location.hash);
        if (parsed) {
          const effectiveProjectId = parsed.projectId || (parsed.view === 'editor' ? this.getSavedProjectId() : null);
          const fullRoute: AppRoute = { view: parsed.view, projectId: effectiveProjectId };
          for (const cb of this.onRouteChangeCallbacks) {
            cb(fullRoute);
          }
        }
      };
      window.addEventListener('hashchange', this.hashListener);
    }
  }

  public getSavedView(): AppViewMode | null {
    const v = safeGetStorage(ROUTE_STORAGE_VIEW_KEY);
    if (v === 'auth' || v === 'dashboard' || v === 'editor') {
      return v;
    }
    return null;
  }

  public getSavedProjectId(): string | null {
    return safeGetStorage(ROUTE_STORAGE_PROJECT_KEY);
  }

  public getInitialRoute(): AppRoute {
    // 1. Check URL hash first
    if (typeof window !== 'undefined' && window.location.hash) {
      const parsed = parseRouteFromHash(window.location.hash);
      if (parsed) {
        if (parsed.view === 'editor' && !parsed.projectId) {
          parsed.projectId = this.getSavedProjectId();
        }
        return parsed;
      }
    }

    // 2. Fall back to local storage
    const savedView = this.getSavedView();
    if (savedView === 'editor') {
      return { view: 'editor', projectId: this.getSavedProjectId() };
    } else if (savedView === 'auth') {
      return { view: 'auth', projectId: null };
    } else if (savedView === 'dashboard') {
      return { view: 'dashboard', projectId: null };
    }

    // 3. Default route
    return { view: 'dashboard', projectId: null };
  }

  public navigateTo(view: AppViewMode, projectId?: string | null, updateHash: boolean = true) {
    this.currentView = view;
    if (view === 'editor') {
      if (projectId !== undefined) {
        this.currentProjectId = projectId;
      }
    } else {
      this.currentProjectId = null;
    }

    // Toggle container display
    if (view === 'auth') {
      this.authContainer.style.display = 'flex';
      this.dashboardContainer.style.display = 'none';
      this.editorContainer.style.display = 'none';
    } else if (view === 'dashboard') {
      this.authContainer.style.display = 'none';
      this.dashboardContainer.style.display = 'block';
      this.editorContainer.style.display = 'none';
    } else if (view === 'editor') {
      this.authContainer.style.display = 'none';
      this.dashboardContainer.style.display = 'none';
      this.editorContainer.style.display = 'flex';
    }

    // Persist active state across page reloads
    safeSetStorage(ROUTE_STORAGE_VIEW_KEY, view);
    if (view === 'editor' && this.currentProjectId) {
      safeSetStorage(ROUTE_STORAGE_PROJECT_KEY, this.currentProjectId);
    }

    // Sync URL hash
    if (updateHash && typeof window !== 'undefined') {
      const targetHash = formatRouteHash(view, this.currentProjectId);
      if (window.location.hash !== targetHash) {
        try {
          window.location.hash = targetHash;
        } catch {
          // ignore
        }
      }
    }

    for (const cb of this.onNavigateCallbacks) {
      cb(view, this.currentProjectId);
    }
  }

  public setEditorProject(projectId: string) {
    this.currentProjectId = projectId;
    safeSetStorage(ROUTE_STORAGE_PROJECT_KEY, projectId);
    if (this.currentView === 'editor' && typeof window !== 'undefined') {
      const targetHash = formatRouteHash('editor', projectId);
      if (window.location.hash !== targetHash) {
        try {
          window.location.hash = targetHash;
        } catch {
          // ignore
        }
      }
    }
  }

  public getCurrentView(): AppViewMode {
    return this.currentView;
  }

  public getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  public onNavigate(callback: (view: AppViewMode, projectId: string | null) => void): () => void {
    this.onNavigateCallbacks.add(callback);
    return () => this.onNavigateCallbacks.delete(callback);
  }

  public onRouteChange(callback: RouteChangeCallback): () => void {
    this.onRouteChangeCallbacks.add(callback);
    return () => this.onRouteChangeCallbacks.delete(callback);
  }

  public dispose() {
    if (this.hashListener && typeof window !== 'undefined') {
      window.removeEventListener('hashchange', this.hashListener);
      this.hashListener = null;
    }
    this.onNavigateCallbacks.clear();
    this.onRouteChangeCallbacks.clear();
  }
}
