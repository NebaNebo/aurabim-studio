import { ThreeSceneManager } from '../../webgl3d/three-scene';
import { showToast } from '../toast-notifier';
import { ICONS } from '../icons';

export class LightingDockRenderer {
  public static render(container: HTMLElement, threeScene?: ThreeSceneManager): void {
    container.innerHTML = `
      <div class="dock-header-bar">
        <div class="dock-breadcrumb-pill">
          <span class="dock-breadcrumb-icon">${ICONS.lighting}</span>
          <span class="dock-breadcrumb-text">Lighting & Sun</span>
        </div>
      </div>
      <div class="dock-scroll-area" style="display: flex; flex-direction: column; gap: 14px; padding-top: 6px;">
        <div class="prop-row">
          <span class="prop-label">Sun Intensity</span>
          <input type="range" min="0.5" max="3.5" step="0.1" value="2.0" class="slider-input" id="light-sun-intensity" />
        </div>
        <div class="prop-row">
          <span class="prop-label">Time of Day</span>
          <select class="prop-select" id="light-time-of-day">
            <option value="9">09:00 AM (Morning Sun)</option>
            <option value="14" selected>02:00 PM (Afternoon Sun)</option>
            <option value="18">06:00 PM (Golden Hour)</option>
            <option value="21">09:00 PM (Night Blue)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="btn-dock-render" style="margin-top: 8px;">
          ${ICONS.renderCamera}
          <span>Capture 3D Snapshot</span>
        </button>
      </div>
    `;

    const intensitySlider = container.querySelector('#light-sun-intensity') as HTMLInputElement | null;
    intensitySlider?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      threeScene?.setSunlightIntensity(val);
    });

    const timeSelect = container.querySelector('#light-time-of-day') as HTMLSelectElement | null;
    timeSelect?.addEventListener('change', () => {
      const val = parseFloat(timeSelect.value);
      threeScene?.setTimeOfDay(val);
      showToast(`Sun updated to ${timeSelect.selectedOptions[0].text}`);
    });

    container.querySelector('#btn-dock-render')?.addEventListener('click', () => {
      if (threeScene) {
        try {
          const dataUrl = threeScene.captureScreenshot();
          const link = document.createElement('a');
          link.download = `render_3d_${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
          showToast('3D Render snapshot saved');
        } catch {
          showToast('Could not capture 3D render');
        }
      }
    });
  }
}
