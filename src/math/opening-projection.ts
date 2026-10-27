import { Wall, Point2D, OpeningType, HoverOpeningPreview, Opening } from '../core/types';
import { Vec2, dist } from './vector2d';

/**
 * Computes real-time magnetic wall snapping, auto swing-side flipping,
 * obstacle bounds, and split clearances (e.g. 2808 | 907 | 3728).
 */
export function computeOpeningHover(
  mouseWorld: Vec2,
  wallsInput: Record<string, Wall> | Wall[],
  nodes: Record<string, Point2D>,
  type: OpeningType,
  width: number,
  currentHinge: 'left' | 'right',
  ignoreOpeningId?: string
): HoverOpeningPreview {
  const walls = Array.isArray(wallsInput) ? wallsInput : Object.values(wallsInput);

  let closestWall: Wall | null = null;
  let minPerpDist = Infinity;
  let bestT = 0;
  let bestClosestPoint: Vec2 = { x: mouseWorld.x, y: mouseWorld.y };
  let bestLength = 0;
  let bestP1: Point2D | null = null;
  let bestP2: Point2D | null = null;

  for (const wall of walls) {
    const p1 = nodes[wall.startNodeId];
    const p2 = nodes[wall.endNodeId];
    if (!p1 || !p2) continue;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    const len = Math.sqrt(lenSq);
    if (len < 1e-4) continue;

    // Project mouseWorld P(xm, ym) onto vector AB
    let t = ((mouseWorld.x - p1.x) * dx + (mouseWorld.y - p1.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const cx = p1.x + t * dx;
    const cy = p1.y + t * dy;
    const perpDist = Math.hypot(mouseWorld.x - cx, mouseWorld.y - cy);

    if (perpDist < minPerpDist) {
      minPerpDist = perpDist;
      closestWall = wall;
      bestT = t;
      bestClosestPoint = { x: cx, y: cy };
      bestLength = len;
      bestP1 = p1;
      bestP2 = p2;
    }
  }

  const defaultHeight = type.includes('door') ? 2100 : (type.includes('bay') ? 1600 : (type.includes('floor_to_ceiling') ? 2400 : 1500));

  // Free-floating invalid state (perpendicular distance > 500mm or no wall)
  if (!closestWall || !bestP1 || !bestP2 || minPerpDist > 500) {
    return {
      active: true,
      type,
      wallId: null,
      worldX: mouseWorld.x,
      worldY: mouseWorld.y,
      angle: 0,
      offset: 0,
      width,
      height: defaultHeight,
      swingSide: 1,
      hingeSide: currentHinge,
      leftObstacleOffset: 0,
      rightObstacleOffset: 0,
      leftClearanceMm: 0,
      rightClearanceMm: 0
    };
  }

  const p1 = bestP1;
  const p2 = bestP2;
  const wallLen = bestLength;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const wallAngle = Math.atan2(dy, dx);
  const rawOffset = bestT * wallLen;

  // Auto-detect swing direction via signed 2D cross product:
  // cross = (x2 - x1)*(ym - y1) - (y2 - y1)*(xm - x1)
  const cross = dx * (mouseWorld.y - p1.y) - dy * (mouseWorld.x - p1.x);
  const swingSide: 1 | -1 = cross >= 0 ? 1 : -1;

  // Calculate Obstacle Bounds along this wall:
  // Start inner corner
  const halfThick = closestWall.thickness / 2;
  const obstacles: number[] = [halfThick, wallLen - halfThick];

  // Intersecting T-junction walls
  for (const w of walls) {
    if (w.id === closestWall.id) continue;
    const otherP1 = nodes[w.startNodeId];
    const otherP2 = nodes[w.endNodeId];
    if (!otherP1 || !otherP2) continue;

    // Check if other wall connects into startNode or endNode
    if (w.startNodeId === closestWall.startNodeId || w.endNodeId === closestWall.startNodeId) {
      obstacles.push(Math.max(halfThick, w.thickness / 2));
    }
    if (w.startNodeId === closestWall.endNodeId || w.endNodeId === closestWall.endNodeId) {
      obstacles.push(wallLen - Math.max(halfThick, w.thickness / 2));
    }

    // Check if other wall has an endpoint resting along this wall's centerline
    for (const endPt of [otherP1, otherP2]) {
      const dStart = dist(p1, endPt);
      const dEnd = dist(p2, endPt);
      if (Math.abs((dStart + dEnd) - wallLen) < 10) { // On wall line
        obstacles.push(dStart - w.thickness / 2);
        obstacles.push(dStart + w.thickness / 2);
      }
    }
  }

  // Existing openings on this wall
  for (const ex of closestWall.openings) {
    if (ignoreOpeningId && ex.id === ignoreOpeningId) continue;
    const exOffset = ex.offset ?? ex.offsetFromStart ?? 0;
    obstacles.push(exOffset - ex.width / 2);
    obstacles.push(exOffset + ex.width / 2);
  }

  // Sort unique obstacles
  const sortedObstacles = [...new Set(obstacles)].sort((a, b) => a - b);

  // Find left obstacle (closest obstacle <= rawOffset)
  // and right obstacle (closest obstacle >= rawOffset)
  let leftObstacleOffset = halfThick;
  for (const obs of sortedObstacles) {
    if (obs <= rawOffset) {
      leftObstacleOffset = obs;
    }
  }

  let rightObstacleOffset = wallLen - halfThick;
  for (let i = sortedObstacles.length - 1; i >= 0; i--) {
    const obs = sortedObstacles[i];
    if (obs >= rawOffset) {
      rightObstacleOffset = obs;
    }
  }

  // Clamp offset inside obstacle span [leftObstacle + width/2, rightObstacle - width/2]
  const minOffset = leftObstacleOffset + width / 2;
  const maxOffset = rightObstacleOffset - width / 2;

  let offset = rawOffset;
  if (minOffset <= maxOffset) {
    offset = Math.max(minOffset, Math.min(maxOffset, rawOffset));
  } else {
    // Span is tighter than door width: center in span
    offset = (leftObstacleOffset + rightObstacleOffset) / 2;
  }

  // Clearances
  const leftClearanceMm = Math.max(0, Math.round((offset - width / 2) - leftObstacleOffset));
  const rightClearanceMm = Math.max(0, Math.round(rightObstacleOffset - (offset + width / 2)));

  // Snapped position in world mm
  const worldX = p1.x + (offset / wallLen) * dx;
  const worldY = p1.y + (offset / wallLen) * dy;

  return {
    active: true,
    type,
    wallId: closestWall.id,
    worldX,
    worldY,
    angle: wallAngle,
    offset: Math.round(offset),
    width,
    height: defaultHeight,
    swingSide,
    hingeSide: currentHinge,
    leftObstacleOffset: Math.round(leftObstacleOffset),
    rightObstacleOffset: Math.round(rightObstacleOffset),
    leftClearanceMm,
    rightClearanceMm
  };
}
