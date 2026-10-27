import { describe, it, expect } from 'vitest';
import { computeOpeningHover } from '../../src/math/opening-projection';
import { Wall, Point2D } from '../../src/core/types';

describe('Opening Magnetic Snapping & Clearance Math', () => {
  const nodes: Record<string, Point2D> = {
    n1: { id: 'n1', x: 0, y: 2000 },
    n2: { id: 'n2', x: 7443, y: 2000 }
  };

  const wall: Wall = {
    id: 'w1',
    startNodeId: 'n1',
    endNodeId: 'n2',
    thickness: 200,
    height: 2800,
    openings: []
  };

  it('returns free-floating status when cursor is > 500mm perpendicular distance', () => {
    const mouseFar = { x: 3000, y: 1200 }; // 800mm from y=2000
    const preview = computeOpeningHover(mouseFar, [wall], nodes, 'door', 907, 'right');
    expect(preview.wallId).toBeNull();
    expect(preview.worldX).toBe(3000);
    expect(preview.worldY).toBe(1200);
  });

  it('magnetically snaps to wall centerline when cursor is <= 500mm perpendicular distance', () => {
    const mouseNear = { x: 3261.5, y: 2150 }; // 150mm from y=2000
    const preview = computeOpeningHover(mouseNear, [wall], nodes, 'door', 907, 'right');
    expect(preview.wallId).toBe('w1');
    expect(preview.worldY).toBe(2000);
  });

  it('determines swing side via cross product based on cursor side of wall', () => {
    // Cursor above wall: y = 2150 -> swingSide = 1
    const mouseAbove = { x: 3261.5, y: 2150 };
    const previewAbove = computeOpeningHover(mouseAbove, [wall], nodes, 'door', 907, 'right');
    expect(previewAbove.swingSide).toBe(1);

    // Cursor below wall: y = 1850 -> swingSide = -1
    const mouseBelow = { x: 3261.5, y: 1850 };
    const previewBelow = computeOpeningHover(mouseBelow, [wall], nodes, 'door', 907, 'right');
    expect(previewBelow.swingSide).toBe(-1);
  });

  it('calculates split clearance dimensions (left / width / right) correctly', () => {
    const mouseExact = { x: 3361.5, y: 2050 };
    const previewExact = computeOpeningHover(mouseExact, [wall], nodes, 'door', 907, 'right');
    expect(previewExact.leftClearanceMm).toBe(2808);
    expect(previewExact.width).toBe(907);
    expect(previewExact.rightClearanceMm).toBeGreaterThan(0);
  });

  it('supports bidirectional offset recalculation from left clearance', () => {
    const mouseExact = { x: 3361.5, y: 2050 };
    const previewExact = computeOpeningHover(mouseExact, [wall], nodes, 'door', 907, 'right');
    const newLeft = 2808;
    const updatedOffset = previewExact.leftObstacleOffset + newLeft + previewExact.width / 2;
    expect(Math.round(updatedOffset)).toBe(Math.round(previewExact.offset));
  });

  it('supports bidirectional offset recalculation from right clearance', () => {
    const mouseExact = { x: 3361.5, y: 2050 };
    const previewExact = computeOpeningHover(mouseExact, [wall], nodes, 'door', 907, 'right');
    const newRight = previewExact.rightClearanceMm;
    const updatedOffset = previewExact.rightObstacleOffset - newRight - previewExact.width / 2;
    expect(Math.round(updatedOffset)).toBe(Math.round(previewExact.offset));
  });
});
