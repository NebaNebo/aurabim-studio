/**
 * 2D Vector & Geometry Utility functions (Millimeter space)
 */

export interface Vec2 {
  x: number;
  y: number;
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distSq(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function perp(v: Vec2): Vec2 {
  // Returns perpendicular normal vector (rotated 90 deg counter-clockwise)
  return { x: -v.y, y: v.x };
}

/**
 * Projects a point P onto line segment AB.
 * Returns the closest point on the segment, and the parameter t in [0, 1].
 */
export function projectPointOntoSegment(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number; distance: number } {
  const ab = sub(b, a);
  const abLenSq = distSq(a, b);
  if (abLenSq < 1e-6) {
    return { point: { ...a }, t: 0, distance: dist(p, a) };
  }

  const ap = sub(p, a);
  let t = dot(ap, ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const closest = add(a, scale(ab, t));
  return {
    point: closest,
    t,
    distance: dist(p, closest)
  };
}

/**
 * Calculates intersection between two infinite 2D lines defined by (p1, d1) and (p2, d2).
 * Returns null if lines are parallel.
 */
export function lineLineIntersection(p1: Vec2, d1: Vec2, p2: Vec2, d2: Vec2): Vec2 | null {
  const denom = cross(d1, d2);
  if (Math.abs(denom) < 1e-6) {
    return null; // Parallel or collinear
  }

  const dp = sub(p2, p1);
  const t = cross(dp, d2) / denom;
  return add(p1, scale(d1, t));
}

/**
 * Checks for strict interior intersection between two line segments A1A2 and B1B2.
 */
export function segmentSegmentIntersection(
  a1: Vec2, 
  a2: Vec2, 
  b1: Vec2, 
  b2: Vec2, 
  tolerance = 0.001
): { point: Vec2; tA: number; tB: number } | null {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const denom = cross(d1, d2);
  if (Math.abs(denom) < 1e-6) return null;

  const dp = sub(b1, a1);
  const tA = cross(dp, d2) / denom;
  const tB = cross(dp, d1) / denom;

  if (tA > tolerance && tA < 1 - tolerance && tB > tolerance && tB < 1 - tolerance) {
    return {
      point: add(a1, scale(d1, tA)),
      tA,
      tB
    };
  }
  return null;
}

/**
 * Computes 3-click circular arc parameters from chord A->B and sagitta height h.
 * R = h/2 + ||AB||^2 / (8h)
 */
export function calculateArcFromSagitta(p1: Vec2, p2: Vec2, sagitta: number): {
  center: Vec2;
  radius: number;
  startAngle: number;
  endAngle: number;
  midPoint: Vec2;
  anticlockwise: boolean;
} {
  const chord = sub(p2, p1);
  const chordLen = dist(p1, p2);
  const h = Math.abs(sagitta) < 1 ? (sagitta >= 0 ? 1 : -1) : sagitta;
  const radius = Math.abs(h / 2 + (chordLen * chordLen) / (8 * h));
  const chordMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const chordNorm = normalize(perp(chord));
  const distToCenter = radius - Math.abs(h);
  const dirSign = h >= 0 ? 1 : -1;
  const center = sub(chordMid, scale(chordNorm, distToCenter * dirSign));
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
  const midPoint = add(chordMid, scale(chordNorm, h));
  const anticlockwise = h < 0;

  return {
    center,
    radius,
    startAngle,
    endAngle,
    midPoint,
    anticlockwise
  };
}

