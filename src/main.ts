import { projectStore } from './core/state-store';
import { createCoohomCurvedShowcaseTemplate } from './core/templates';
import { CadViewport } from './cad2d/cad-viewport';
import { ThreeSceneManager } from './webgl3d/three-scene';
import { TopBarController } from './ui/top-bar';
import { LeftDockController } from './ui/left-dock';
import { InspectorController } from './ui/inspector';
import { PipController } from './ui/pip-controller';
import { showToast } from './ui/toast-notifier';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load initial architectural template (Coohom Curved Penthouse layout matching Images 1, 2, 3)
  const initialTemplate = createCoohomCurvedShowcaseTemplate();
  projectStore.loadProject(initialTemplate);

  // 2. Initialize 2D CAD Viewport
  const cadCanvas = document.getElementById('cad-canvas') as HTMLCanvasElement;
  const cadViewport = new CadViewport(cadCanvas);

  // 3. Initialize 3D WebGL Three.js Scene
  const threeCanvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  const threeScene = new ThreeSceneManager(threeCanvas);

  // 4. Initialize UI Controllers
  const topBarElem = document.getElementById('top-command-bar')!;
  new TopBarController(topBarElem, threeScene, cadViewport);

  const leftDockElem = document.getElementById('left-dock')!;
  new LeftDockController(leftDockElem, threeScene);

  const inspectorElem = document.getElementById('right-inspector')!;
  new InspectorController(inspectorElem, threeScene);

  const pipWindowElem = document.getElementById('pip-window')!;
  const centerViewportElem = document.getElementById('center-viewport')!;
  new PipController(pipWindowElem, centerViewportElem, threeScene, cadViewport);

  // 5. Update Status HUD on state changes if present
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

  // Welcome Toast
  setTimeout(() => {
    showToast('Welcome to AuraBIM Studio! 2D & 3D real-time spatial sync active.', 3500);
  }, 400);
});
