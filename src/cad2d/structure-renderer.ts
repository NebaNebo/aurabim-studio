import { Vec2 } from '../math/vector2d';
import { StructureItem } from '../core/types';

export class StructureRenderer {
  public static renderStructure(
    ctx: CanvasRenderingContext2D,
    struct: StructureItem,
    zoom: number,
    worldToScreen: (v: Vec2) => Vec2,
    isSelected: boolean = false
  ) {
    const { position, rotation, dimensions, type, subType } = struct;
    const centerScr = worldToScreen({ x: position.x, y: position.y });
    const wPx = dimensions.width * zoom;
    const lPx = dimensions.length * zoom;

    ctx.save();
    ctx.translate(centerScr.x, centerScr.y);
    ctx.rotate((rotation * Math.PI) / 180);

    const halfW = wPx / 2;
    const halfL = lPx / 2;

    switch (type) {
      case 'column': {
        // Solid structural column with diagonal cross hatching or circle
        if (subType === 'round') {
          const radius = Math.min(halfW, halfL);
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = isSelected ? '#0071e3' : '#1e293b';
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Center cross mark
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-radius * 0.5, 0);
          ctx.lineTo(radius * 0.5, 0);
          ctx.moveTo(0, -radius * 0.5);
          ctx.lineTo(0, radius * 0.5);
          ctx.stroke();
        } else {
          // Square/Rectangular structural column
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = isSelected ? '#0071e3' : '#1e293b';
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.rect(-halfW, -halfL, wPx, lPx);
          ctx.fill();
          ctx.stroke();

          // Hatching
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-halfW, -halfL);
          ctx.lineTo(halfW, halfL);
          ctx.moveTo(-halfW, halfL);
          ctx.lineTo(halfW, -halfL);
          ctx.stroke();
        }
        break;
      }

      case 'beam': {
        // Ceiling beam: dashed cyan/grey outline across room
        ctx.fillStyle = 'rgba(14, 165, 233, 0.08)';
        ctx.strokeStyle = isSelected ? '#0071e3' : '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.rect(-halfW, -halfL, wPx, lPx);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.font = '600 10px -apple-system, sans-serif';
        ctx.fillStyle = '#0284c7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BEAM', 0, 0);
        break;
      }

      case 'staircase': {
        // Architectural staircase tread grid (16 step lines), diagonal break line, "UP ➔"
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = isSelected ? '#0071e3' : '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(-halfW, -halfL, wPx, lPx);
        ctx.fill();
        ctx.stroke();

        const risers = struct.riserCount || 16;
        const stepH = lPx / risers;

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < risers; i++) {
          const y = -halfL + i * stepH;
          ctx.moveTo(-halfW, y);
          ctx.lineTo(halfW, y);
        }
        ctx.stroke();

        // Direction arrow UP ➔
        ctx.strokeStyle = '#0071e3';
        ctx.fillStyle = '#0071e3';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, halfL - 10);
        ctx.lineTo(0, -halfL + 16);
        ctx.lineTo(-4, -halfL + 22);
        ctx.moveTo(0, -halfL + 16);
        ctx.lineTo(4, -halfL + 22);
        ctx.stroke();

        ctx.font = '700 9.5px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('UP', 0, halfL - 20);
        break;
      }

      case 'flue': {
        // HVAC / Plumbing Shaft: double-lined hollow rectangle with inner diagonal cross (X)
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = isSelected ? '#0071e3' : '#334155';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.rect(-halfW, -halfL, wPx, lPx);
        ctx.fill();
        ctx.stroke();

        // Inner wall thickness (e.g. 60mm)
        const innerInset = Math.max(3, (struct.wallThickness || 60) * zoom);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.strokeRect(-halfW + innerInset, -halfL + innerInset, wPx - innerInset * 2, lPx - innerInset * 2);

        // Inner X symbol
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(-halfW + innerInset, -halfL + innerInset);
        ctx.lineTo(halfW - innerInset, halfL - innerInset);
        ctx.moveTo(-halfW + innerInset, halfL - innerInset);
        ctx.lineTo(halfW - innerInset, -halfL + innerInset);
        ctx.stroke();
        break;
      }

      case 'floor_opening': {
        // Floor void opening: rectangular outline with diagonal corner-to-corner X void mark
        ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
        ctx.strokeStyle = isSelected ? '#0071e3' : '#dc2626';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.rect(-halfW, -halfL, wPx, lPx);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Diagonal X void
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-halfW, -halfL);
        ctx.lineTo(halfW, halfL);
        ctx.moveTo(-halfW, halfL);
        ctx.lineTo(halfW, -halfL);
        ctx.stroke();

        ctx.font = '700 10px -apple-system, sans-serif';
        ctx.fillStyle = '#dc2626';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FLOOR OPENING', 0, 0);
        break;
      }

      case 'bay_window_sill': {
        // Marble sill slab
        ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
        ctx.strokeStyle = isSelected ? '#0071e3' : '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-halfW, -halfL, wPx, lPx, 3);
        ctx.fill();
        ctx.stroke();
        break;
      }
    }

    // Selection Grips if selected
    if (isSelected) {
      ctx.fillStyle = '#0071e3';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      const gripSize = 6;
      const grips = [
        { x: -halfW, y: -halfL },
        { x: halfW, y: -halfL },
        { x: halfW, y: halfL },
        { x: -halfW, y: halfL },
        { x: 0, y: -halfL - 14 } // Rotation handle
      ];

      for (const g of grips) {
        ctx.beginPath();
        ctx.arc(g.x, g.y, gripSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Stem to rotation handle
      ctx.beginPath();
      ctx.moveTo(0, -halfL);
      ctx.lineTo(0, -halfL - 14);
      ctx.strokeStyle = '#0071e3';
      ctx.stroke();
    }

    ctx.restore();
  }
}
