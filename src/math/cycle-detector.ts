import { Point2D, Wall, RoomPolygon } from '../core/types';
import { Vec2 } from './vector2d';
import { calculateAreaM2, calculatePerimeterM, calculateSignedAreaMm2 } from './polygon-area';

interface DirectedEdge {
  fromNodeId: string;
  toNodeId: string;
  angle: number; // Radian angle in [-PI, PI]
  visited: boolean;
}

/**
 * Traverses the planar wall graph to find all minimal closed cycles (rooms).
 */
export function detectRooms(
  nodes: Record<string, Point2D>,
  walls: Record<string, Wall>,
  existingRooms: Record<string, RoomPolygon> = {}
): Record<string, RoomPolygon> {
  const nodeIds = Object.keys(nodes);
  if (nodeIds.length < 3) return {};

  // Build adjacency list of directed half-edges
  const outgoing: Record<string, DirectedEdge[]> = {};
  for (const id of nodeIds) {
    outgoing[id] = [];
  }

  for (const wall of Object.values(walls)) {
    const p1 = nodes[wall.startNodeId];
    const p2 = nodes[wall.endNodeId];
    if (!p1 || !p2) continue;

    const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const angle2 = Math.atan2(p1.y - p2.y, p1.x - p2.x);

    outgoing[wall.startNodeId].push({
      fromNodeId: wall.startNodeId,
      toNodeId: wall.endNodeId,
      angle: angle1,
      visited: false
    });

    outgoing[wall.endNodeId].push({
      fromNodeId: wall.endNodeId,
      toNodeId: wall.startNodeId,
      angle: angle2,
      visited: false
    });
  }

  // Sort outgoing edges around each node counter-clockwise
  for (const id of nodeIds) {
    outgoing[id].sort((a, b) => a.angle - b.angle);
  }

  const detectedCycles: string[][] = [];

  // Face traversal
  for (const startNodeId of nodeIds) {
    for (const edge of outgoing[startNodeId]) {
      if (edge.visited) continue;

      const cycleNodeIds: string[] = [];
      let currEdge: DirectedEdge | null = edge;

      while (currEdge && !currEdge.visited) {
        currEdge.visited = true;
        cycleNodeIds.push(currEdge.fromNodeId);

        const v: string = currEdge.toNodeId;
        const vEdges: DirectedEdge[] = outgoing[v];
        if (!vEdges || vEdges.length === 0) break;

        // Find index of the reverse edge (v -> u)
        const u: string = currEdge.fromNodeId;
        const revIdx: number = vEdges.findIndex((e: DirectedEdge) => e.toNodeId === u);
        if (revIdx === -1) break;

        // In CCW sorted order, taking the previous edge (wrapping around)
        // turns right, yielding minimal counter-clockwise interior faces
        const nextIdx = (revIdx - 1 + vEdges.length) % vEdges.length;
        const nextEdge: DirectedEdge = vEdges[nextIdx];

        if (nextEdge.fromNodeId === edge.fromNodeId && nextEdge.toNodeId === edge.toNodeId) {
          // Returned to start!
          break;
        }

        currEdge = nextEdge;
      }

      if (cycleNodeIds.length >= 3) {
        // Compute signed area to filter out clockwise / outer infinite faces
        const polygonPoints = cycleNodeIds.map(nid => ({ x: nodes[nid].x, y: nodes[nid].y }));
        const signedArea = calculateSignedAreaMm2(polygonPoints);

        // Positive signed area in standard canvas/cartesian coordinates = interior face
        if (signedArea > 100_000) { // At least 0.1 m²
          detectedCycles.push(cycleNodeIds);
        }
      }
    }
  }

  // Deduplicate and build RoomPolygon objects
  const rooms: Record<string, RoomPolygon> = {};
  const roomNames = ['Living Room', 'Primary Bedroom', 'Kitchen', 'Dining Area', 'Guest Bedroom', 'Home Office', 'Bathroom'];
  let roomIndex = 0;

  for (const cycle of detectedCycles) {
    // Generate normalized canonical signature for cycle
    const sorted = [...cycle].sort();
    const signature = sorted.join('-');

    // Find if existing room matches this cycle signature
    let matchedRoom: RoomPolygon | null = null;
    for (const er of Object.values(existingRooms)) {
      if ([...er.nodeIds].sort().join('-') === signature) {
        matchedRoom = er;
        break;
      }
    }

    const roomId = matchedRoom ? matchedRoom.id : `room_${signature}`;
    const defaultName = matchedRoom ? matchedRoom.name : (roomNames[roomIndex % roomNames.length] || `Room ${roomIndex + 1}`);
    const floorMaterial = matchedRoom ? matchedRoom.floorMaterial : 'oak_parquet';

    const points = cycle.map(nid => ({ x: nodes[nid].x, y: nodes[nid].y }));
    const areaSquareMeters = calculateAreaM2(points);
    const perimeterMeters = calculatePerimeterM(points);

    rooms[roomId] = {
      id: roomId,
      name: defaultName,
      nodeIds: cycle,
      points,
      areaSquareMeters,
      perimeterMeters,
      floorMaterial,
      ceilingMaterial: 'plaster_white'
    };

    roomIndex++;
  }

  return rooms;
}
