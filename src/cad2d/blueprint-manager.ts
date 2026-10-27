import { BlueprintUnderlay } from '../core/types';
import { Vec2 } from '../math/vector2d';
import { projectStore } from '../core/state-store';
import { showToast } from '../ui/toast-notifier';

export class BlueprintManager {
  private static imageCache: Map<string, HTMLImageElement> = new Map();

  /**
   * Renders Blueprint Underlay Image on Layer 1 (above grid, below rooms/walls).
   */
  public static renderBlueprint(
    ctx: CanvasRenderingContext2D,
    underlay: BlueprintUnderlay | null,
    worldToScreen: (v: Vec2) => Vec2,
    zoom: number
  ) {
    if (!underlay || !underlay.imageUrl) return;

    let img = this.imageCache.get(underlay.imageUrl);
    if (!img) {
      img = new Image();
      img.src = underlay.imageUrl;
      this.imageCache.set(underlay.imageUrl, img);
      img.onload = () => {
        projectStore.recalculateRooms(false);
      };
    }

    if (!img.complete || img.naturalWidth === 0) return;

    const screenOrigin = worldToScreen({ x: underlay.x, y: underlay.y });
    const scaleFactor = underlay.mmPerPixel * zoom;
    const widthPx = img.naturalWidth * scaleFactor;
    const heightPx = img.naturalHeight * scaleFactor;

    ctx.save();
    ctx.globalAlpha = underlay.opacity ?? 0.45;
    ctx.drawImage(img, screenOrigin.x, screenOrigin.y, widthPx, heightPx);
    ctx.restore();

    // Calibration Vector Rendering during 2-Point Calibration
    if (underlay.calibrationState === 'pick_p2' && underlay.calibrationP1) {
      // Draw p1 target reticle
      const sP1 = worldToScreen(underlay.calibrationP1);
      this.drawTargetReticle(ctx, sP1, '#0071e3');
    }
  }

  public static drawCalibrationVector(
    ctx: CanvasRenderingContext2D,
    p1: Vec2,
    p2: Vec2,
    worldToScreen: (v: Vec2) => Vec2
  ) {
    const s1 = worldToScreen(p1);
    const s2 = worldToScreen(p2);

    ctx.save();
    ctx.strokeStyle = '#0071e3';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw circular target reticles at both ends
    this.drawTargetReticle(ctx, s1, '#0071e3');
    this.drawTargetReticle(ctx, s2, '#10b981');

    ctx.restore();
  }

  private static drawTargetReticle(ctx: CanvasRenderingContext2D, screenPt: Vec2, color: string) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(screenPt.x, screenPt.y, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(screenPt.x, screenPt.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Crosshairs
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(screenPt.x - r, screenPt.y);
    ctx.lineTo(screenPt.x + r, screenPt.y);
    ctx.moveTo(screenPt.x, screenPt.y - r);
    ctx.lineTo(screenPt.x, screenPt.y + r);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Spawns auto-focused HTML input popover for entering real-world length in mm.
   */
  public static spawnCalibrationPopover(
    screenPt: Vec2,
    onSubmit: (lengthMm: number) => void,
    onCancel: () => void
  ) {
    const existing = document.getElementById('calibration-popover');
    if (existing) existing.remove();

    const popover = document.createElement('div');
    popover.id = 'calibration-popover';
    popover.style.position = 'absolute';
    popover.style.left = `${screenPt.x + 12}px`;
    popover.style.top = `${screenPt.y - 20}px`;
    popover.style.zIndex = '60';
    popover.style.background = '#ffffff';
    popover.style.border = '1px solid #0071e3';
    popover.style.borderRadius = '8px';
    popover.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
    popover.style.padding = '8px 12px';
    popover.style.display = 'flex';
    popover.style.alignItems = 'center';
    popover.style.gap = '6px';
    popover.style.fontFamily = '-apple-system, sans-serif';
    popover.style.fontSize = '12px';

    popover.innerHTML = `
      <span style="font-weight: 600; color: #1e293b;">Real Length:</span>
      <input type="number" id="calib-length-input" value="5000" step="100" style="width: 80px; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700; text-align: center; outline: none;" />
      <span style="color: #64748b; font-size: 11px;">mm</span>
      <button id="calib-submit-btn" style="background: #0071e3; color: #ffffff; border: none; padding: 4px 10px; border-radius: 4px; font-weight: 600; cursor: pointer;">Calibrate</button>
    `;

    document.getElementById('center-viewport')?.appendChild(popover);

    const input = popover.querySelector('#calib-length-input') as HTMLInputElement;
    const submitBtn = popover.querySelector('#calib-submit-btn') as HTMLButtonElement;

    input.focus();
    input.select();

    const submit = () => {
      const val = parseFloat(input.value);
      if (val > 0) {
        onSubmit(val);
        popover.remove();
      }
    };

    submitBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') {
        popover.remove();
        onCancel();
      }
    });
  }
}
