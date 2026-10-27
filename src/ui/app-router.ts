export type AppViewMode = 'auth' | 'dashboard' | 'editor';

export class AppRouter {
  private authContainer: HTMLElement;
  private dashboardContainer: HTMLElement;
  private editorContainer: HTMLElement;
  private currentView: AppViewMode = 'dashboard';
  private onNavigateCallbacks: Set<(view: AppViewMode) => void> = new Set();

  constructor(
    authContainer: HTMLElement,
    dashboardContainer: HTMLElement,
    editorContainer: HTMLElement
  ) {
    this.authContainer = authContainer;
    this.dashboardContainer = dashboardContainer;
    this.editorContainer = editorContainer;
  }

  public navigateTo(view: AppViewMode) {
    this.currentView = view;

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

    for (const cb of this.onNavigateCallbacks) {
      cb(view);
    }
  }

  public getCurrentView(): AppViewMode {
    return this.currentView;
  }

  public onNavigate(callback: (view: AppViewMode) => void): () => void {
    this.onNavigateCallbacks.add(callback);
    return () => this.onNavigateCallbacks.delete(callback);
  }
}
