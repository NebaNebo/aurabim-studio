import { Point2D, Wall } from '../core/types';
import { Vec2, sub, normalize, perp, scale, add, lineLineIntersection, dist } from './vector2d';

export interface Wall2DContour {
  wallId: string;
  // 4 corner vertices forming the closed 2D polygon of the wall:
  // [startLeft, startRight, endRight, endLeft]
  polygon: Vec2[];
  startLeft: Vec2;
  startRight: Vec2;
  endLeft: Vec2;
  endRight: Vec2;
  centerlineStart: Vec2;
  centerlineEnd: Vec2;
  lengthMm: number;
}

/**
 * Computes crisp mitered 2D wall polygons for all walls in the project.
 */
export function computeWallContours(
  walls: Record<string, Wall>,
  nodes: Record<string, Point2D>
): Record<string, Wall2DContour> {
  const contours: Record<string, Wall2DContour> = {};

  // Build node-to-connected-walls adjacency map
  const nodeConnections: Record<string, Array<{ wall: Wall; isStart: boolean }>> = {};
  for (const node of Object.values(nodes)) {
    nodeConnections[node.id] = [];
  }

  for (const wall of Object.values(walls)) {
    if (nodeConnections[wall.startNodeId]) {
      nodeConnections[wall.startNodeId].push({ wall, isStart: true });
    }
    if (nodeConnections[wall.endNodeId]) {
      nodeConnections[wall.endNodeId].push({ wall, isStart: false });
    }
  }

  // Helper to compute standard offset corners for a single wall segment
  for (const wall of Object.values(walls)) {
    const startNode = nodes[wall.startNodeId];
    const endNode = nodes[wall.endNodeId];
    if (!startNode || !endNode) continue;

    const pStart: Vec2 = { x: startNode.x, y: startNode.y };
    const pEnd: Vec2 = { x: endNode.x, y: endNode.y };

    const dir = sub(pEnd, pStart);
    const length = Math.hypot(dir.x, dir.y);
    if (length < 1e-4) continue;

    const halfThick = wall.thickness / 2;

    // Curved wall arc polygon generation
    if (wall.isCurved && wall.arcSagitta && Math.abs(wall.arcSagitta) > 1) {
      const arcPoly = generateCurvedWallPolygon(pStart, pEnd, wall.arcSagitta, halfThick);
      contours[wall.id] = {
        wallId: wall.id,
        polygon: arcPoly,
        startLeft: arcPoly[0],
        startRight: arcPoly[arcPoly.length - 1],
        endLeft: arcPoly[Math.floor(arcPoly.length / 2) - 1],
        endRight: arcPoly[Math.floor(arcPoly.length / 2)],
        centerlineStart: pStart,
        centerlineEnd: pEnd,
        lengthMm: Math.round(length)
      };
      continue;
    }

    const unitDir = normalize(dir);
    const normal = perp(unitDir); // left normal

    // Default square ends
    let startLeft = add(pStart, scale(normal, halfThick));
    let startRight = add(pStart, scale(normal, -halfThick));
    let endLeft = add(pEnd, scale(normal, halfThick));
    let endRight = add(pEnd, scale(normal, -halfThick));

    // Check Start Node for miter joint with adjacent wall
    const startConns = nodeConnections[wall.startNodeId] || [];
    if (startConns.length === 2) {
      const other = startConns.find(c => c.wall.id !== wall.id);
      if (other) {
        const miter = calculateMiterAtNode(pStart, wall, other.wall, nodes, true, other.isStart);
        if (miter) {
          startLeft = miter.left;
          startRight = miter.right;
        }
      }
    } else if (startConns.length > 2) {
      // 3-way or multi-wall corner: clip seamlessly to corner vertex
      startLeft = add(pStart, scale(normal, halfThick * 0.7));
      startRight = add(pStart, scale(normal, -halfThick * 0.7));
    }

    // Check End Node for miter joint with adjacent wall
    const endConns = nodeConnections[wall.endNodeId] || [];
    if (endConns.length === 2) {
      const other = endConns.find(c => c.wall.id !== wall.id);
      if (other) {
        const miter = calculateMiterAtNode(pEnd, wall, other.wall, nodes, false, other.isStart);
        if (miter) {
          endLeft = miter.left;
          endRight = miter.right;
        }
      }
    } else if (endConns.length > 2) {
      endLeft = add(pEnd, scale(normal, halfThick * 0.7));
      endRight = add(pEnd, scale(normal, -halfThick * 0.7));
    }

    contours[wall.id] = {
      wallId: wall.id,
      polygon: [startLeft, startRight, endRight, endLeft],
      startLeft,
      startRight,
      endLeft,
      endRight,
      centerlineStart: pStart,
      centerlineEnd: pEnd,
      lengthMm: Math.round(length)
    };
  }

  return contours;
}

/**
 * Generates an accurate 2D closed polygon for an extruded curved arc wall.
 */
function generateCurvedWallPolygon(p1: Vec2, p2: Vec2, sagitta: number, halfThick: number): Vec2[] {
  const segments = 24;
  const chordLen = dist(p1, p2);
  const h = Math.abs(sagitta) < 1 ? (sagitta >= 0 ? 1 : -1) : sagitta;
  const radius = Math.abs(h / 2 + (chordLen * chordLen) / (8 * h));

  const chord = sub(p2, p1);
  const chordMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const chordDir = normalize(chord);
  const chordNorm = { x: -chordDir.y, y: chordDir.x };
  const distToCenter = radius - Math.abs(h);
  const dirSign = h >= 0 ? 1 : -1;
  const center = sub(chordMid, scale(chordNorm, distToCenter * dirSign));

  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const theta = 2 * Math.asin(Math.min(1.0, chordLen / (2 * radius)));

  const targetMid = add(chordMid, scale(chordNorm, h));
  const midPos = { x: center.x + Math.cos(startAngle + theta / 2) * radius, y: center.y + Math.sin(startAngle + theta / 2) * radius };
  const midNeg = { x: center.x + Math.cos(startAngle - theta / 2) * radius, y: center.y + Math.sin(startAngle - theta / 2) * radius };
  const sweep = dist(midPos, targetMid) < dist(midNeg, targetMid) ? theta : -theta;

  const outerPts: Vec2[] = [];
  const innerPts: Vec2[] = [];
  const rOuter = radius + (sweep >= 0 ? halfThick : -halfThick);
  const rInner = radius - (sweep >= 0 ? halfThick : -halfThick);

  const angleStep = sweep / segments;
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + i * angleStep;
    outerPts.push({ x: center.x + Math.cos(a) * rOuter, y: center.y + Math.sin(a) * rOuter });
    innerPts.push({ x: center.x + Math.cos(a) * rInner, y: center.y + Math.sin(a) * rInner });
  }

  return [...outerPts, ...innerPts.reverse()];
}

/**
 * Calculates the corner miter intersection between two walls meeting at a common node.
 */
function calculateMiterAtNode(
  nodePoint: Vec2,
  wallA: Wall,
  wallB: Wall,
  nodes: Record<string, Point2D>,
  isStartA: boolean,
  isStartB: boolean
): { left: Vec2; right: Vec2 } | null {
  const otherNodeA = nodes[isStartA ? wallA.endNodeId : wallA.startNodeId];
  const otherNodeB = nodes[isStartB ? wallB.endNodeId : wallB.startNodeId];
  if (!otherNodeA || !otherNodeB) return null;

  // Vector pointing away from the shared node along wall A
  const dirA = normalize(sub(otherNodeA, nodePoint));
  // Vector pointing away from the shared node along wall B
  const dirB = normalize(sub(otherNodeB, nodePoint));

  const normalA = perp(dirA);
  const normalB = perp(dirB);

  const halfThickA = wallA.thickness / 2;
  const halfThickB = wallB.thickness / 2;

  // Offset lines for wall A
  const pA_left = add(nodePoint, scale(normalA, halfThickA));
  const pA_right = add(nodePoint, scale(normalA, -halfThickA));

  // Offset lines for wall B
  const pB_left = add(nodePoint, scale(normalB, halfThickB));
  const pB_right = add(nodePoint, scale(normalB, -halfThickB));

  // Intersections
  const interLeft = lineLineIntersection(pA_left, dirA, pB_right, dirB) || lineLineIntersection(pA_left, dirA, pB_left, dirB);
  const interRight = lineLineIntersection(pA_right, dirA, pB_left, dirB) || lineLineIntersection(pA_right, dirA, pB_right, dirB);

  if (!interLeft || !interRight) return null;

  // Clamp excessively sharp spikes (if angle < 20 deg)
  const maxMiterDist = (wallA.thickness + wallB.thickness);
  if (dist(nodePoint, interLeft) > maxMiterDist || dist(nodePoint, interRight) > maxMiterDist) {
    return null;
  }

  // Orient relative to wall A's start or end
  if (isStartA) {
    return { left: interLeft, right: interRight };
  } else {
    // End of wall A reverses left/right relative to direction
    return { left: interRight, right: interLeft };
  }
}
