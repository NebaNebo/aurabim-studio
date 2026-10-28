import { projectStore } from './core/state-store';
import { CadViewport } from './cad2d/cad-viewport';
import { ThreeSceneManager } from './webgl3d/three-scene';
import { TopBarController } from './ui/top-bar';
import { LeftDockController } from './ui/left-dock';
import { InspectorController } from './ui/inspector';
import { PipController } from './ui/pip-controller';
import { showToast } from './ui/toast-notifier';
import { authService, AuthUserProfile } from './services/auth-service';
import { projectRepository } from './services/project-repository';
import { autoSaveManager } from './services/auto-save-manager';
import { AppRouter } from './ui/app-router';
import { AuthModal } from './ui/auth/auth-modal';
import { DashboardView } from './ui/dashboard/dashboard-view';
import { NewProjectOptions } from './ui/dashboard/new-project-modal';

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure Light Mode is default for every account
  const savedTheme = localStorage.getItem('aurabim_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // 1. Get DOM Containers
  const authContainer = document.getElementById('auth-container')!;
  const dashboardContainer = document.getElementById('dashboard-container')!;
  const editorContainer = document.getElementById('app-container')!;

  // 2. Initialize Navigation Router
  const router = new AppRouter(authContainer, dashboardContainer, editorContainer);

  // 3. Initialize 2D CAD & 3D Three.js Viewports
  const cadCanvas = document.getElementById('cad-canvas') as HTMLCanvasElement;
  const cadViewport = new CadViewport(cadCanvas);

  const threeCanvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  const threeScene = new ThreeSceneManager(threeCanvas);

  autoSaveManager.setCanvasReference(cadCanvas);

  // 4. Initialize Top Bar with Dashboard navigation
  const topBarElem = document.getElementById('top-command-bar')!;
  new TopBarController(topBarElem, threeScene, cadViewport, () => {
    // Return to dashboard
    dashboardView.refresh();
    router.navigateTo('dashboard');
  });

  const leftDockElem = document.getElementById('left-dock')!;
  new LeftDockController(leftDockElem, threeScene);

  const inspectorElem = document.getElementById('right-inspector')!;
  new InspectorController(inspectorElem, threeScene);

  const pipWindowElem = document.getElementById('pip-window')!;
  const centerViewportElem = document.getElementById('center-viewport')!;
  new PipController(pipWindowElem, centerViewportElem, threeScene, cadViewport);

  // 5. Update Status HUD Bar Viewport Telemetry & Constraints
  const hudCoords = document.getElementById('hud-coords');
  const hudSnap = document.getElementById('hud-snap');
  const hudOrtho = document.getElementById('hud-ortho');
  if (hudCoords) {
    cadViewport.onCursorMove((pos, snap, ortho) => {
      hudCoords.textContent = `X: ${Math.round(pos.x).toLocaleString()} Y: ${Math.round(pos.y).toLocaleString()}`;
      if (hudSnap) hudSnap.textContent = snap;
      if (hudOrtho) hudOrtho.textContent = ortho;
    });
  }

  // 6. Project In-Editor Opener Helper
  const openProjectInEditor = async (projectId: string, announce: boolean = true): Promise<boolean> => {
    const user = authService.getCurrentUser();
    const userId = user ? user.uid : 'guest_local';
    const p = await projectRepository.getProject(userId, projectId);
    if (p) {
      projectStore.loadProject(p.state);
      autoSaveManager.markAsSaved(p.state);
      router.navigateTo('editor', p.id);
      requestAnimationFrame(() => {
        cadViewport.resizeCanvas();
        threeScene.resizeCanvas();
        cadViewport.centerView();
        threeScene.fitToExtents();
      });
      if (announce) {
        showToast(`Opened "${p.name}"`);
      }
      return true;
    }
    return false;
  };

  // 7. Initialize Dashboard View
  const dashboardView = new DashboardView(dashboardContainer, {
    onOpenProject: async (projectId: string) => {
      await openProjectInEditor(projectId, true);
    },
    onNewProject: async (opts: NewProjectOptions) => {
      const user = authService.getCurrentUser();
      const userId = user ? user.uid : 'guest_local';
      await projectRepository.saveProject(userId, opts.initialState, undefined, opts.templateType);
      projectStore.loadProject(opts.initialState);
      autoSaveManager.markAsSaved(opts.initialState);
      router.navigateTo('editor', opts.initialState.id);
      requestAnimationFrame(() => {
        cadViewport.resizeCanvas();
        threeScene.resizeCanvas();
        cadViewport.centerView();
        threeScene.fitToExtents();
      });
      showToast(`Created "${opts.name}" (${opts.templateType})`);
    },
    onSignOut: async () => {
      await authService.signOut();
      router.navigateTo('auth');
      authModal.show('signin');
      showToast('Signed out successfully');
    }
  });

  // 8. Keep active project synced with router
  let lastActiveProjectId = '';
  projectStore.subscribe(state => {
    if (router.getCurrentView() === 'editor' && state.id && state.id !== lastActiveProjectId) {
      lastActiveProjectId = state.id;
      router.setEditorProject(state.id);
    }
  });

  // 9. Handle browser Back / Forward URL hash changes
  router.onRouteChange(async (route) => {
    if (route.view === 'editor') {
      if (route.projectId && route.projectId !== projectStore.getState().id) {
        await openProjectInEditor(route.projectId, false);
      } else {
        router.navigateTo('editor', route.projectId, false);
      }
    } else if (route.view === 'dashboard') {
      dashboardView.refresh();
      router.navigateTo('dashboard', null, false);
    } else if (route.view === 'auth') {
      router.navigateTo('auth', null, false);
      authModal.show('signin');
    }
  });

  // 10. Initialize Auth Modal
  const authModal = new AuthModal(authContainer, (user: AuthUserProfile) => {
    router.navigateTo('dashboard');
    dashboardView.refresh();
  });

  // 11. Auth State Router Guard
  authService.onAuthChange((user: AuthUserProfile | null) => {
    if (user) {
      if (router.getCurrentView() === 'auth') {
        router.navigateTo('dashboard');
        dashboardView.refresh();
      }
    } else if (router.getCurrentView() === 'auth') {
      authModal.show('signin');
    }
  });

  // 12. Initial check & Page Refresh Restorer: stay in the current page when refreshed
  const initApp = async () => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.navigateTo('auth');
      authModal.show('signin');
      return;
    }

    const initialRoute = router.getInitialRoute();
    if (initialRoute.view === 'editor') {
      let loaded = false;
      if (initialRoute.projectId) {
        loaded = await openProjectInEditor(initialRoute.projectId, false);
      }
      if (!loaded) {
        const userId = user.uid || 'guest_local';
        const userProjects = await projectRepository.listProjects(userId);
        if (userProjects.length > 0) {
          loaded = await openProjectInEditor(userProjects[0].id, false);
        }
      }
      if (!loaded) {
        router.navigateTo('dashboard');
        dashboardView.refresh();
      }
    } else if (initialRoute.view === 'auth') {
      router.navigateTo('auth');
      authModal.show('signin');
    } else {
      router.navigateTo('dashboard');
      dashboardView.refresh();
    }
  };

  await initApp();
});
