import { projectStore } from '../core/state-store';
import {
  createCoohomCurvedShowcaseTemplate,
  createModernStudioTemplate,
  createTwoBedroomSuiteTemplate,
  createBlankCanvasTemplate
} from '../core/templates';
import { showToast } from './toast-notifier';
import { ThreeSceneManager } from '../webgl3d/three-scene';
import { CadViewport } from '../cad2d/cad-viewport';
import { ICONS } from './icons';

export function openTemplateModal(threeScene: ThreeSceneManager, cadViewport: CadViewport) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">Architectural Templates</span>
        <button class="btn btn-sm btn-icon" id="modal-close">${ICONS.close}</button>
      </div>
      <div class="modal-body">
        <div class="catalog-item-card" id="tmpl-curved">
          <div class="catalog-item-icon">${ICONS.blueprint}</div>
          <div class="catalog-item-info">
            <span class="catalog-item-name">Curved Penthouse Suite (Coohom)</span>
            <span class="catalog-item-dim">180.6 m² Curved Wing + 3 Suites • Arc Wall, Partition Dividers & Openings</span>
          </div>
        </div>

        <div class="catalog-item-card" id="tmpl-studio">
          <div class="catalog-item-icon">${ICONS.plan}</div>
          <div class="catalog-item-info">
            <span class="catalog-item-name">Modern Studio Apartment</span>
            <span class="catalog-item-dim">7.2m × 5.6m (40.3 m²) • Living, Bedroom, Bathroom, Kitchen</span>
          </div>
        </div>

        <div class="catalog-item-card" id="tmpl-2bed">
          <div class="catalog-item-icon">${ICONS.rooms}</div>
          <div class="catalog-item-info">
            <span class="catalog-item-name">Luxury 2-Bedroom Suite</span>
            <span class="catalog-item-dim">10.0m × 7.0m (70.0 m²) • Master Suite, Guest Bed, Dining & Living</span>
          </div>
        </div>

        <div class="catalog-item-card" id="tmpl-blank">
          <div class="catalog-item-icon">${ICONS.edit}</div>
          <div class="catalog-item-info">
            <span class="catalog-item-name">Blank Blueprint</span>
            <span class="catalog-item-dim">Start drafting from a clean millimeter canvas</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#tmpl-curved')?.addEventListener('click', () => {
    projectStore.loadProject(createCoohomCurvedShowcaseTemplate());
    cadViewport.centerView();
    threeScene.fitToExtents();
    showToast('Loaded Curved Penthouse Suite');
    close();
  });

  overlay.querySelector('#tmpl-studio')?.addEventListener('click', () => {
    projectStore.loadProject(createModernStudioTemplate());
    cadViewport.centerView();
    threeScene.fitToExtents();
    showToast('Loaded Modern Studio Apartment');
    close();
  });

  overlay.querySelector('#tmpl-2bed')?.addEventListener('click', () => {
    projectStore.loadProject(createTwoBedroomSuiteTemplate());
    cadViewport.centerView();
    threeScene.fitToExtents();
    showToast('Loaded Luxury 2-Bedroom Suite');
    close();
  });

  overlay.querySelector('#tmpl-blank')?.addEventListener('click', () => {
    projectStore.loadProject(createBlankCanvasTemplate());
    cadViewport.centerView();
    showToast('Loaded Blank Blueprint');
    close();
  });
}
