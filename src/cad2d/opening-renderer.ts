import { Vec2, sub, add, scale, dist } from '../math/vector2d';
import { OpeningType } from '../core/types';

/**
 * Dedicated 2D CAD renderer for architectural doors, windows,
 * swing arcs, and split clearance dimension lines (2808 | 907 | 3728).
 */
export class OpeningRenderer {
  /**
   * Draws architectural opening symbol (door swing arc, double door, or window glazing) on canvas.
   */
  public static renderOpening(
    ctx: CanvasRenderingContext2D,
    p1: Vec2,
    p2: Vec2,
    wallThickness: number,
    offsetMm: number,
    widthMm: number,
    type: OpeningType,
    swingSide: 1 | -1,
    hingeSide: 'left' | 'right',
    zoom: number,
    worldToScreen: (v: Vec2) => Vec2,
    isSelected: boolean = false,
    isHover: boolean = false
  ) {
    const wallLen = dist(p1, p2);
    if (wallLen < 1) return;

    const dirX = (p2.x - p1.x) / wallLen;
    const dirY = (p2.y - p1.y) / wallLen;

    // Normal vector perpendicular to wall
    const normX = -dirY;
    const normY = dirX;
    const halfThick = wallThickness / 2;

    const centerMm = {
      x: p1.x + dirX * offsetMm,
      y: p1.y + dirY * offsetMm
    };

    const halfW = widthMm / 2;
    const startMm = {
      x: centerMm.x - dirX * halfW,
      y: centerMm.y - dirY * halfW
    };
    const endMm = {
      x: centerMm.x + dirX * halfW,
      y: centerMm.y + dirY * halfW
    };

    const sStart = worldToScreen(startMm);
    const sEnd = worldToScreen(endMm);
    const sCenter = worldToScreen(centerMm);

    // 1. Clear Wall Cutout Slot
    const pLeft1 = worldToScreen({ x: startMm.x + normX * halfThick, y: startMm.y + normY * halfThick });
    const pLeft2 = worldToScreen({ x: endMm.x + normX * halfThick, y: endMm.y + normY * halfThick });
    const pRight2 = worldToScreen({ x: endMm.x - normX * halfThick, y: endMm.y - normY * halfThick });
    const pRight1 = worldToScreen({ x: startMm.x - normX * halfThick, y: startMm.y - normY * halfThick });

    ctx.save();
    ctx.fillStyle = isHover ? 'rgba(56, 189, 248, 0.15)' : '#10141b';
    ctx.beginPath();
    ctx.moveTo(pLeft1.x, pLeft1.y);
    ctx.lineTo(pLeft2.x, pLeft2.y);
    ctx.lineTo(pRight2.x, pRight2.y);
    ctx.lineTo(pRight1.x, pRight1.y);
    ctx.closePath();
    ctx.fill();

    // Draw Jamb Lines (end caps of wall opening)
    ctx.strokeStyle = isSelected ? '#38bdf8' : (isHover ? '#38bdf8' : '#94a3b8');
    ctx.lineWidth = isSelected || isHover ? 2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(pLeft1.x, pLeft1.y);
    ctx.lineTo(pRight1.x, pRight1.y);
    ctx.moveTo(pLeft2.x, pLeft2.y);
    ctx.lineTo(pRight2.x, pRight2.y);
    ctx.stroke();

    // 2. Draw Specific Opening Symbols
    if (type === 'door') {
      const radiusPx = widthMm * zoom;
      const wallAngle = Math.atan2(dirY, dirX);

      // Hinge position: startMm (left jamb) or endMm (right jamb)
      const isLeft = hingeSide === 'left';
      const hingeScr = isLeft ? sStart : sEnd;

      // Leaf vector extends into room along (normal * swingSide)
      const swingAngleOffset = isLeft 
        ? (swingSide === 1 ? Math.PI / 2 : -Math.PI / 2)
        : (swingSide === 1 ? Math.PI / 2 : -Math.PI / 2);

      const leafAngle = wallAngle + swingAngleOffset;
      const leafEndScr = {
        x: hingeScr.x + Math.cos(leafAngle) * radiusPx,
        y: hingeScr.y + Math.sin(leafAngle) * radiusPx
      };

      // Swing Arc Angle Span
      // From opposite jamb direction toward leaf tip
      let startAngle = isLeft ? wallAngle : wallAngle + Math.PI;
      let endAngle = leafAngle;
      let counterClockwise = false;

      if (isLeft) {
        counterClockwise = swingSide !== 1;
      } else {
        counterClockwise = swingSide === 1;
      }

      // Draw subtle transparent swing fill
      ctx.fillStyle = isSelected 
        ? 'rgba(56, 189, 248, 0.12)' 
        : (isHover ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)');
      ctx.beginPath();
      ctx.moveTo(hingeScr.x, hingeScr.y);
      ctx.arc(hingeScr.x, hingeScr.y, radiusPx, startAngle, endAngle, counterClockwise);
      ctx.closePath();
      ctx.fill();

      // Swing Arc stroke
      ctx.strokeStyle = isSelected ? '#38bdf8' : (isHover ? '#38bdf8' : '#cbd5e1');
      ctx.lineWidth = isSelected || isHover ? 1.8 : 1.2;
      ctx.setLineDash(isHover ? [4, 4] : []);
      ctx.beginPath();
      ctx.arc(hingeScr.x, hingeScr.y, radiusPx, startAngle, endAngle, counterClockwise);
      ctx.stroke();
      ctx.setLineDash([]);

      // Thick Door Leaf Line
      ctx.lineWidth = isSelected ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(hingeScr.x, hingeScr.y);
      ctx.lineTo(leafEndScr.x, leafEndScr.y);
      ctx.stroke();

      // Hinge Pin indicator dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(hingeScr.x, hingeScr.y, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (type === 'double_door') {
      const halfRadiusPx = (widthMm / 2) * zoom;
      const wallAngle = Math.atan2(dirY, dirX);
      const swingAngleOffset = swingSide === 1 ? Math.PI / 2 : -Math.PI / 2;
      const leafAngle = wallAngle + swingAngleOffset;

      ctx.strokeStyle = isSelected || isHover ? '#38bdf8' : '#cbd5e1';
      ctx.lineWidth = 1.5;

      // Left leaf & arc
      ctx.beginPath();
      ctx.arc(sStart.x, sStart.y, halfRadiusPx, wallAngle, leafAngle, swingSide !== 1);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(sStart.x + Math.cos(leafAngle) * halfRadiusPx, sStart.y + Math.sin(leafAngle) * halfRadiusPx);
      ctx.stroke();

      // Right leaf & arc
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sEnd.x, sEnd.y, halfRadiusPx, wallAngle + Math.PI, leafAngle, swingSide === 1);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sEnd.x, sEnd.y);
      ctx.lineTo(sEnd.x + Math.cos(leafAngle) * halfRadiusPx, sEnd.y + Math.sin(leafAngle) * halfRadiusPx);
      ctx.stroke();

    } else if (type === 'bay_window' || type === 'trapezoid_bay' || type === 'corner_bay') {
      // 3-Sided Glass Window Box Protruding Depth Outward along wall normal (swingSide)
      const depthMm = 600;
      const protrudeVec = { x: normX * depthMm * swingSide, y: normY * depthMm * swingSide };
      const bLeft = worldToScreen({ x: startMm.x + protrudeVec.x, y: startMm.y + protrudeVec.y });
      const bRight = worldToScreen({ x: endMm.x + protrudeVec.x, y: endMm.y + protrudeVec.y });

      // Protruding glass box fill & stroke
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.strokeStyle = isSelected || isHover ? '#0071e3' : '#0ea5e9';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(bLeft.x, bLeft.y);
      ctx.lineTo(bRight.x, bRight.y);
      ctx.lineTo(sEnd.x, sEnd.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Interior sill ledge line
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(sEnd.x, sEnd.y);
      ctx.stroke();

    } else if (type === 'opening' || type === 'arched_opening') {
      // Cased Opening: Clears wall fill, draws dashed lines along wall faces with solid jamb end-caps
      ctx.strokeStyle = isSelected || isHover ? '#0071e3' : '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      // Dashed wall face lines
      ctx.beginPath();
      ctx.moveTo(pLeft1.x, pLeft1.y);
      ctx.lineTo(pLeft2.x, pLeft2.y);
      ctx.moveTo(pRight1.x, pRight1.y);
      ctx.lineTo(pRight2.x, pRight2.y);
      ctx.stroke();
      ctx.setLineDash([]);

    } else if (type === 'niche') {
      // Niche: Cuts only ONE side of the wall polygon to depth 150mm on swingSide, leaving back solid!
      const nicheDepthMm = 150;
      const recessVec = { x: normX * nicheDepthMm * swingSide, y: normY * nicheDepthMm * swingSide };
      const nLeft = worldToScreen({ x: startMm.x + recessVec.x, y: startMm.y + recessVec.y });
      const nRight = worldToScreen({ x: endMm.x + recessVec.x, y: endMm.y + recessVec.y });

      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.strokeStyle = isSelected || isHover ? '#0071e3' : '#f59e0b';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(nLeft.x, nLeft.y);
      ctx.lineTo(nRight.x, nRight.y);
      ctx.lineTo(sEnd.x, sEnd.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Niche back wall mark
      ctx.strokeStyle = '#d97706';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(nLeft.x, nLeft.y);
      ctx.lineTo(nRight.x, nRight.y);
      ctx.stroke();
      ctx.setLineDash([]);

    } else if (type === 'bay_window_sill') {
      // Bay window sill marble slab
      ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pLeft1.x, pLeft1.y);
      ctx.lineTo(pLeft2.x, pLeft2.y);
      ctx.lineTo(pRight2.x, pRight2.y);
      ctx.lineTo(pRight1.x, pRight1.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else {
      // 3-Line Casement / Sliding / Floor-to-Ceiling Window
      ctx.strokeStyle = isSelected || isHover ? '#0071e3' : '#0ea5e9';
      ctx.lineWidth = 1.5;

      // Outer sill lines
      ctx.beginPath();
      ctx.moveTo(pLeft1.x, pLeft1.y);
      ctx.lineTo(pLeft2.x, pLeft2.y);
      ctx.moveTo(pRight1.x, pRight1.y);
      ctx.lineTo(pRight2.x, pRight2.y);
      ctx.stroke();

      // Middle double glass pane
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(sEnd.x, sEnd.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draws CAD split dimension lines and extension lines (e.g. 2808 | 907 | 3728).
   */
  public static renderSplitDimensions(
    ctx: CanvasRenderingContext2D,
    p1: Vec2,
    p2: Vec2,
    wallThickness: number,
    offsetMm: number,
    widthMm: number,
    leftObsMm: number,
    rightObsMm: number,
    leftClrMm: number,
    rightClrMm: number,
    swingSide: 1 | -1,
    zoom: number,
    worldToScreen: (v: Vec2) => Vec2
  ) {
    const wallLen = dist(p1, p2);
    if (wallLen < 1) return;

    const dirX = (p2.x - p1.x) / wallLen;
    const dirY = (p2.y - p1.y) / wallLen;
    const normX = -dirY;
    const normY = dirX;

    const halfW = widthMm / 2;
    const openStartMm = offsetMm - halfW;
    const openEndMm = offsetMm + halfW;

    // Offset 350mm from wall face on swingSide
    const dimDistMm = (wallThickness / 2 + 350) * swingSide;

    // 4 Key anchor positions along wall vector
    const ptLeftObs = { x: p1.x + dirX * leftObsMm, y: p1.y + dirY * leftObsMm };
    const ptOpenStart = { x: p1.x + dirX * openStartMm, y: p1.y + dirY * openStartMm };
    const ptOpenEnd = { x: p1.x + dirX * openEndMm, y: p1.y + dirY * openEndMm };
    const ptRightObs = { x: p1.x + dirX * rightObsMm, y: p1.y + dirY * rightObsMm };

    // Corresponding points on dimension line
    const dLeftObs = { x: ptLeftObs.x + normX * dimDistMm, y: ptLeftObs.y + normY * dimDistMm };
    const dOpenStart = { x: ptOpenStart.x + normX * dimDistMm, y: ptOpenStart.y + normY * dimDistMm };
    const dOpenEnd = { x: ptOpenEnd.x + normX * dimDistMm, y: ptOpenEnd.y + normY * dimDistMm };
    const dRightObs = { x: ptRightObs.x + normX * dimDistMm, y: ptRightObs.y + normY * dimDistMm };

    // Convert to screen
    const sPtLeftObs = worldToScreen(ptLeftObs);
    const sPtOpenStart = worldToScreen(ptOpenStart);
    const sPtOpenEnd = worldToScreen(ptOpenEnd);
    const sPtRightObs = worldToScreen(ptRightObs);

    const sDLeftObs = worldToScreen(dLeftObs);
    const sDOpenStart = worldToScreen(dOpenStart);
    const sDOpenEnd = worldToScreen(dOpenEnd);
    const sDRightObs = worldToScreen(dRightObs);

    ctx.save();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;

    // 1. Draw Extension Lines (from wall to dimension line)
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(sPtLeftObs.x, sPtLeftObs.y);
    ctx.lineTo(sDLeftObs.x, sDLeftObs.y);

    ctx.moveTo(sPtOpenStart.x, sPtOpenStart.y);
    ctx.lineTo(sDOpenStart.x, sDOpenStart.y);

    ctx.moveTo(sPtOpenEnd.x, sPtOpenEnd.y);
    ctx.lineTo(sDOpenEnd.x, sDOpenEnd.y);

    ctx.moveTo(sPtRightObs.x, sPtRightObs.y);
    ctx.lineTo(sDRightObs.x, sDRightObs.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Draw Left Clearance Dimension Line
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sDLeftObs.x, sDLeftObs.y);
    ctx.lineTo(sDOpenStart.x, sDOpenStart.y);
    ctx.stroke();

    // 3. Draw Right Clearance Dimension Line
    ctx.beginPath();
    ctx.moveTo(sDOpenEnd.x, sDOpenEnd.y);
    ctx.lineTo(sDRightObs.x, sDRightObs.y);
    ctx.stroke();

    // 4. Draw Center Dimension Line Across Opening
    ctx.strokeStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(sDOpenStart.x, sDOpenStart.y);
    ctx.lineTo(sDOpenEnd.x, sDOpenEnd.y);
    ctx.stroke();

    // 5. Architectural 45-degree slash ticks at dimension break points
    const tick = 4;
    const drawTick = (pt: Vec2) => {
      ctx.beginPath();
      ctx.moveTo(pt.x - tick, pt.y + tick);
      ctx.lineTo(pt.x + tick, pt.y - tick);
      ctx.stroke();
    };

    ctx.lineWidth = 1.5;
    drawTick(sDLeftObs);
    drawTick(sDOpenStart);
    drawTick(sDOpenEnd);
    drawTick(sDRightObs);

    // 6. Center opening width badge (e.g. | 907 |) directly on blueprint
    const sCenter = worldToScreen({
      x: p1.x + dirX * offsetMm + normX * (dimDistMm * 0.4),
      y: p1.y + dirY * offsetMm + normY * (dimDistMm * 0.4)
    });

    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${widthMm}`, sCenter.x, sCenter.y);

    ctx.restore();
  }

  /**
   * Draws free-floating invalid preview symbol at mouse cursor when distance > 500mm from any wall.
   */
  public static renderInvalidFloatingPreview(
    ctx: CanvasRenderingContext2D,
    mouseScr: Vec2,
    type: OpeningType,
    widthMm: number,
    zoom: number
  ) {
    const wPx = Math.max(40, widthMm * zoom);
    const hPx = 22;

    ctx.save();
    ctx.translate(mouseScr.x, mouseScr.y);

    // Red dashed warning box
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.roundRect(-wPx / 2, -hPx / 2, wPx, hPx, 4);
    ctx.fill();
    ctx.stroke();

    // Warning Badge Text
    ctx.fillStyle = '#ef4444';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`⚠️ Snap to wall to place`, 0, -hPx / 2 - 4);

    // Opening icon
    const icon = type.includes('door') ? '🚪' : '🪟';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 0);

    ctx.restore();
  }
}
