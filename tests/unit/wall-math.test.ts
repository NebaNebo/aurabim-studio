import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectStore } from '../../src/core/state-store';
import { calculateAreaM2, calculateSignedAreaMm2, calculateCentroid, isPointInsidePolygon, calculatePerimeterM } from '../../src/math/polygon-area';
import { snapToGrid, calculateSnapping } from '../../src/math/snapping';
import { detectRooms } from '../../src/math/cycle-detector';
import { segmentSegmentIntersection, dist } from '../../src/math/vector2d';

describe('AuraBIM Core Geometry & Math Engine', () => {
  let store: ProjectStore;

  beforeEach(() => {
    store = new ProjectStore();
    // Reset to empty state for testing
    store.loadProject({
      nodes: {},
      walls: {},
      rooms: {},
      furniture: {},
      structures: {}
    });
  });

  describe('Wall Creation Edge Cases (0mm clicks & negative inputs)', () => {
    it('rejects 0mm wall clicks when start and end node are identical', () => {
      const n1 = store.getOrCreateNode(1000, 1000);
      const wall = store.addWall(n1.id, n1.id, 240);
      expect(wall).toBeNull();
      expect(Object.keys(store.getState().walls).length).toBe(0);
    });

    it('rejects 0mm wall clicks when two distinct nodes are at the exact same coordinates', () => {
      // Force two nodes with same coords (bypassing snapping threshold)
      const n1 = store.getOrCreateNode(1000, 1000, 0);
      // Manually inject a second node at exact same position
      const n2 = { id: 'node_dup', x: 1000, y: 1000 };
      store.getState().nodes['node_dup'] = n2;

      const wall = store.addWall(n1.id, n2.id, 240);
      expect(wall).toBeNull();
    });

    it('sanitizes negative thickness inputs to positive values', () => {
      const n1 = store.getOrCreateNode(0, 0);
      const n2 = store.getOrCreateNode(3000, 0);
      const wall = store.addWall(n1.id, n2.id, -240);

      expect(wall).not.toBeNull();
      expect(wall!.thickness).toBeGreaterThan(0);
      expect(wall!.thickness).toBe(240);
    });

    it('sanitizes negative thickness on updateWall', () => {
      const n1 = store.getOrCreateNode(0, 0);
      const n2 = store.getOrCreateNode(3000, 0);
      const wall = store.addWall(n1.id, n2.id, 240)!;

      store.updateWall(wall.id, { thickness: -150 });
      expect(store.getState().walls[wall.id].thickness).toBe(150);
    });
  });

  describe('Self-Intersecting Walls & Split Detection', () => {
    it('detects segment-segment intersection accurately', () => {
      // Segment 1: (0, 1000) to (4000, 1000)
      // Segment 2: (2000, 0) to (2000, 4000)
      const p1 = { x: 0, y: 1000 };
      const p2 = { x: 4000, y: 1000 };
      const p3 = { x: 2000, y: 0 };
      const p4 = { x: 2000, y: 4000 };

      const isect = segmentSegmentIntersection(p1, p2, p3, p4);
      expect(isect).not.toBeNull();
      expect(isect!.point.x).toBeCloseTo(2000);
      expect(isect!.point.y).toBeCloseTo(1000);
    });

    it('automatically splits walls at intersection point when cross-drawing', () => {
      // Create horizontal wall: (0, 2000) -> (6000, 2000)
      const h1 = store.getOrCreateNode(0, 2000);
      const h2 = store.getOrCreateNode(6000, 2000);
      store.addWall(h1.id, h2.id, 240);

      // Create vertical wall that cuts across: (3000, 0) -> (3000, 4000)
      const v1 = store.getOrCreateNode(3000, 0);
      const v2 = store.getOrCreateNode(3000, 4000);
      store.addWall(v1.id, v2.id, 240);

      // Should now have 4 split segments meeting at (3000, 2000)
      const walls = Object.values(store.getState().walls);
      expect(walls.length).toBe(4);

      // Verify node at (3000, 2000) was created
      const midNode = Object.values(store.getState().nodes).find(
        n => Math.abs(n.x - 3000) < 5 && Math.abs(n.y - 2000) < 5
      );
      expect(midNode).toBeDefined();
    });
  });

  describe('Polygon Room Area (m²) and Cycle Detection', () => {
    it('calculates exact square room area in m²', () => {
      // 5m x 4m room = 20.00 m²
      const poly = [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        { x: 5000, y: 4000 },
        { x: 0, y: 4000 }
      ];

      expect(calculateAreaM2(poly)).toBe(20.00);
      expect(calculatePerimeterM(poly)).toBe(18.00);
    });

    it('calculates polygon centroid correctly', () => {
      const poly = [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 }
      ];
      const centroid = calculateCentroid(poly);
      expect(centroid.x).toBe(2000);
      expect(centroid.y).toBe(2000);
    });

    it('correctly determines if a point is inside a polygon', () => {
      const poly = [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 }
      ];

      expect(isPointInsidePolygon({ x: 2000, y: 2000 }, poly)).toBe(true);
      expect(isPointInsidePolygon({ x: 5000, y: 2000 }, poly)).toBe(false);
    });

    it('detects enclosed room cycles from 4 wall segments', () => {
      const n1 = store.getOrCreateNode(0, 0);
      const n2 = store.getOrCreateNode(4000, 0);
      const n3 = store.getOrCreateNode(4000, 3000);
      const n4 = store.getOrCreateNode(0, 3000);

      store.addWall(n1.id, n2.id, 240);
      store.addWall(n2.id, n3.id, 240);
      store.addWall(n3.id, n4.id, 240);
      store.addWall(n4.id, n1.id, 240);

      const rooms = Object.values(store.getState().rooms);
      expect(rooms.length).toBe(1);
      expect(rooms[0].areaSquareMeters).toBe(12.00);
    });
  });

  describe('Grid & Ortho Snapping', () => {
    it('snaps coordinates to grid step', () => {
      const snapped = snapToGrid({ x: 123, y: 167 }, 100);
      expect(snapped.x).toBe(100);
      expect(snapped.y).toBe(200);

      const snapped50 = snapToGrid({ x: 249, y: 251 }, 50);
      expect(snapped50.x).toBe(250);
      expect(snapped50.y).toBe(250);
    });

    it('snaps angles within threshold to orthogonal orientations', () => {
      const start = { x: 0, y: 0 };
      // 3 degrees from horizontal -> should snap to angle 0 deg
      const pNear0 = { x: 1000, y: 40 };
      const snapResult = calculateSnapping(pNear0, {}, start, 100, 200, true);
      expect(snapResult.snappedTo).toBe('angle');
      expect(snapResult.point.y).toBe(0);

      // Near 90 degrees vertical
      const pNear90 = { x: 30, y: 1000 };
      const snapResult90 = calculateSnapping(pNear90, {}, start, 100, 200, true);
      expect(snapResult90.snappedTo).toBe('angle');
      expect(snapResult90.point.x).toBe(0);
    });
  });
});
