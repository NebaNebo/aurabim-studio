import { Point2D, Wall } from '../core/types';
import { Vec2, dist, normalize, scale, add, sub, projectPointOntoSegment } from './vector2d';

export interface AlignmentGuide {
  axis: 'x' | 'y';
  pos: number;
  from: Vec2;
  to: Vec2;
}

export interface SnapResult {
  point: Vec2;
  snappedTo: 'none' | 'grid' | 'node' | 'angle' | 'wall' | 'alignment';
  targetNodeId?: string;
  targetWallId?: string;
  angleDeg?: number;
  alignmentGuides?: AlignmentGuide[];
}

/**
 * Snaps a point to the nearest grid step.
 */
export function snapToGrid(p: Vec2, gridSizeMm: number): Vec2 {
  if (gridSizeMm <= 1) return { x: Math.round(p.x), y: Math.round(p.y) };
  return {
    x: Math.round(p.x / gridSizeMm) * gridSizeMm,
    y: Math.round(p.y / gridSizeMm) * gridSizeMm
  };
}

/**
 * Snaps cursor point to existing nodes, orthogonal angles, or grid.
 */
export function calculateSnapping(
  cursorMm: Vec2,
  nodes: Record<string, Point2D>,
  activeStartPoint?: Vec2,
  gridSizeMm: number = 100,
  nodeSnapRadiusMm: number = 200,
  snapAngles: boolean = true,
  ignoreNodeId?: string,
  connectedNeighbors?: Point2D[]
): SnapResult {
  // 1. Check existing node proximity (highest priority, excluding ignored node)
  let closestNode: Point2D | null = null;
  let minNodeDist = nodeSnapRadiusMm;

  for (const node of Object.values(nodes)) {
    if (ignoreNodeId && node.id === ignoreNodeId) continue;
    const d = dist(cursorMm, node);
    if (d < minNodeDist) {
      minNodeDist = d;
      closestNode = node;
    }
  }

  if (closestNode) {
    return {
      point: { x: closestNode.x, y: closestNode.y },
      snappedTo: 'node',
      targetNodeId: closestNode.id
    };
  }

  // 2. Orthogonal Alignment Guide Snapping (X and Y alignment with connected neighbor vertices)
  if (connectedNeighbors && connectedNeighbors.length > 0) {
    const guides: AlignmentGuide[] = [];
    let snappedX = cursorMm.x;
    let snappedY = cursorMm.y;
    let hasAlign = false;
    const alignRadius = Math.max(50, nodeSnapRadiusMm * 0.45);

    for (const neighbor of connectedNeighbors) {
      // Check X alignment (vertical wall line)
      if (Math.abs(cursorMm.x - neighbor.x) <= alignRadius) {
        snappedX = neighbor.x;
        hasAlign = true;
        guides.push({
          axis: 'x',
          pos: neighbor.x,
          from: { x: neighbor.x, y: Math.min(cursorMm.y, neighbor.y) - 600 },
          to: { x: neighbor.x, y: Math.max(cursorMm.y, neighbor.y) + 600 }
        });
      }
      // Check Y alignment (horizontal wall line)
      if (Math.abs(cursorMm.y - neighbor.y) <= alignRadius) {
        snappedY = neighbor.y;
        hasAlign = true;
        guides.push({
          axis: 'y',
          pos: neighbor.y,
          from: { x: Math.min(cursorMm.x, neighbor.x) - 600, y: neighbor.y },
          to: { x: Math.max(cursorMm.x, neighbor.x) + 600, y: neighbor.y }
        });
      }
    }

    if (hasAlign) {
      return {
        point: { x: Math.round(snappedX), y: Math.round(snappedY) },
        snappedTo: 'alignment',
        alignmentGuides: guides
      };
    }
  }

  // 3. Angle snapping if we have an active drawing origin
  if (activeStartPoint && snapAngles) {
    const delta = sub(cursorMm, activeStartPoint);
    const length = Math.hypot(delta.x, delta.y);

    if (length > 50) {
      const angleRad = Math.atan2(delta.y, delta.x);
      const angleDeg = (angleRad * 180) / Math.PI;

      // Snap to increments of 45 degrees: 0, 45, 90, 135, 180, -45, -90, -135
      const snapStep = 45;
      const nearestAngleDeg = Math.round(angleDeg / snapStep) * snapStep;
      const angleDiff = Math.abs(angleDeg - nearestAngleDeg);

      // Snap threshold: 6 degrees
      if (angleDiff < 6) {
        const rad = (nearestAngleDeg * Math.PI) / 180;
        const dir = { x: Math.cos(rad), y: Math.sin(rad) };
        const snappedPoint = add(activeStartPoint, scale(dir, length));

        return {
          point: {
            x: Math.round(snappedPoint.x),
            y: Math.round(snappedPoint.y)
          },
          snappedTo: 'angle',
          angleDeg: nearestAngleDeg
        };
      }
    }
  }

  // 4. Fallback to grid snapping
  const gridPoint = snapToGrid(cursorMm, gridSizeMm);
  return {
    point: gridPoint,
    snappedTo: 'grid'
  };
}

/**
 * Snaps a cursor point directly to the closest wall segment for door/window placement.
 */
export function snapToWallSegment(
  cursorMm: Vec2,
  walls: Record<string, Wall>,
  nodes: Record<string, Point2D>,
  maxDistanceMm: number = 400
): { wall: Wall; offsetFromStart: number; projectedPoint: Vec2 } | null {
  let closestWall: Wall | null = null;
  let minDistance = maxDistanceMm;
  let bestOffset = 0;
  let bestPoint = cursorMm;

  for (const wall of Object.values(walls)) {
    const startNode = nodes[wall.startNodeId];
    const endNode = nodes[wall.endNodeId];
    if (!startNode || !endNode) continue;

    const proj = projectPointOntoSegment(cursorMm, startNode, endNode);
    if (proj.distance < minDistance) {
      minDistance = proj.distance;
      closestWall = wall;
      const wallLen = dist(startNode, endNode);
      bestOffset = proj.t * wallLen;
      bestPoint = proj.point;
    }
  }

  if (closestWall) {
    return {
      wall: closestWall,
      offsetFromStart: Math.round(bestOffset),
      projectedPoint: bestPoint
    };
  }

  return null;
}
