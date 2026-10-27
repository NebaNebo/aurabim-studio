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

  // 5. Update Status HUD Bar
  const hudStats = document.getElementById('status-hud-stats');
  if (hudStats) {
    projectStore.subscribe(state => {
      const wallCount = Object.keys(state.walls).length;
      const roomCount = Object.keys(state.rooms).length;
      const furnCount = Object.keys(state.furniture).length;
      let totalAreaM2 = 0;
      for (const r of Object.values(state.rooms)) {
        totalAreaM2 += r.areaSquareMeters;
      }
      hudStats.textContent = `Walls: ${wallCount} | Rooms: ${roomCount} (${totalAreaM2.toFixed(1)} m²) | Furniture: ${furnCount}`;
    });
  }

  // 6. Initialize Dashboard View
  const dashboardView = new DashboardView(dashboardContainer, {
    onOpenProject: async (projectId: string) => {
      const user = authService.getCurrentUser();
      const userId = user ? user.uid : 'guest_local';
      const p = await projectRepository.getProject(userId, projectId);
      if (p) {
        projectStore.loadProject(p.state);
        cadViewport.centerView();
        threeScene.fitToExtents();
        router.navigateTo('editor');
        cadViewport.resizeCanvas();
        threeScene.resizeCanvas();
        showToast(`Opened "${p.name}"`);
      }
    },
    onNewProject: async (opts: NewProjectOptions) => {
      const user = authService.getCurrentUser();
      const userId = user ? user.uid : 'guest_local';
      await projectRepository.saveProject(userId, opts.initialState, undefined, opts.templateType);
      projectStore.loadProject(opts.initialState);
      cadViewport.centerView();
      threeScene.fitToExtents();
      router.navigateTo('editor');
      cadViewport.resizeCanvas();
      threeScene.resizeCanvas();
      showToast(`Created "${opts.name}" (${opts.templateType})`);
    },
    onSignOut: async () => {
      await authService.signOut();
      router.navigateTo('auth');
      authModal.show('signin');
      showToast('Signed out successfully');
    }
  });

  // 7. Initialize Auth Modal
  const authModal = new AuthModal(authContainer, (user: AuthUserProfile) => {
    router.navigateTo('dashboard');
    dashboardView.refresh();
  });

  // 8. Auth State Router Guard
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

  // Initial check: if already authenticated or cached guest, show dashboard
  if (authService.getCurrentUser()) {
    router.navigateTo('dashboard');
    dashboardView.refresh();
  } else {
    router.navigateTo('auth');
    authModal.show('signin');
  }
});
