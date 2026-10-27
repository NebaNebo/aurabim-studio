import { Vec2 } from './vector2d';

/**
 * Calculates the signed area of a 2D polygon in square millimeters using the Shoelace Formula.
 * Positive value = Counter-Clockwise (CCW), Negative value = Clockwise (CW).
 */
export function calculateSignedAreaMm2(points: Vec2[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

/**
 * Returns absolute area in square meters (m²) rounded to 2 decimal places.
 */
export function calculateAreaM2(points: Vec2[]): number {
  const areaMm2 = Math.abs(calculateSignedAreaMm2(points));
  // 1 m² = 1,000,000 mm²
  return Math.round((areaMm2 / 1_000_000) * 100) / 100;
}

/**
 * Calculates the total perimeter of a polygon in meters.
 */
export function calculatePerimeterM(points: Vec2[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let totalMm = 0;
  for (let i = 0; i < n; i++) {
    const next = points[(i + 1) % n];
    const dx = next.x - points[i].x;
    const dy = next.y - points[i].y;
    totalMm += Math.hypot(dx, dy);
  }
  return Math.round((totalMm / 1000) * 100) / 100;
}

/**
 * Computes the geometric centroid of a polygon.
 */
export function calculateCentroid(points: Vec2[]): Vec2 {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { ...points[0] };
  if (n === 2) return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };

  let cx = 0;
  let cy = 0;
  let signedArea = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const factor = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * factor;
    cy += (points[i].y + points[j].y) * factor;
    signedArea += factor;
  }

  signedArea *= 0.5;
  if (Math.abs(signedArea) < 1e-4) {
    // Collinear fallback: average of vertices
    let sx = 0, sy = 0;
    for (const p of points) { sx += p.x; sy += p.y; }
    return { x: sx / n, y: sy / n };
  }

  cx /= 6 * signedArea;
  cy /= 6 * signedArea;

  return { x: Math.round(cx), y: Math.round(cy) };
}

/**
 * Ray casting algorithm to determine if a point is inside a polygon.
 */
export function isPointInsidePolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
