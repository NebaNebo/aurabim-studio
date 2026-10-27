import { computeOpeningHover } from '../src/math/opening-projection';
import { Wall, Point2D, Opening } from '../src/core/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Testing Door/Window Snapping & Math System ---');

// Mock a horizontal wall from A(0, 2000) to B(7443, 2000), thickness = 200mm
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

// 1. Free-floating test (> 500mm perpendicular distance)
const mouseFar = { x: 3000, y: 1200 }; // 800mm from y=2000
const previewFar = computeOpeningHover(mouseFar, [wall], nodes, 'door', 907, 'right');
assert(previewFar.wallId === null, 'Free-floating cursor (> 500mm) returns wallId: null');
assert(previewFar.worldX === 3000 && previewFar.worldY === 1200, 'Free-floating retains raw cursor world coords');

// 2. Magnetic snapping test (<= 500mm)
const mouseNear = { x: 3261.5, y: 2150 }; // 150mm from y=2000
const previewNear = computeOpeningHover(mouseNear, [wall], nodes, 'door', 907, 'right');
assert(previewNear.wallId === 'w1', 'Near cursor (150mm <= 500mm) snaps to wall w1');
assert(previewNear.worldY === 2000, 'Snapped position projects exactly onto wall centerline y=2000');

// 3. Cross-product auto-swing test
// AB = (7443, 0).
// Cursor above wall: y = 2150 -> cross = 7443 * (2150 - 2000) - 0 = + > 0 -> swingSide = 1
assert(previewNear.swingSide === 1, 'Cursor above wall produces swingSide = 1');

// Cursor below wall: y = 1850 -> cross = 7443 * (1850 - 2000) < 0 -> swingSide = -1
const mouseBelow = { x: 3261.5, y: 1850 };
const previewBelow = computeOpeningHover(mouseBelow, [wall], nodes, 'door', 907, 'right');
assert(previewBelow.swingSide === -1, 'Cursor below wall produces swingSide = -1');

// 4. Split Clearance Math (2808 | 907 | 3728)
// Wall length = 7443mm, thickness = 200mm
// Start obstacle = 100mm, End obstacle = 7443 - 100 = 7343mm
// Span = 7343 - 100 = 7243mm
// If door width = 907mm, and left clearance = 2808mm:
// left edge = 100 + 2808 = 2908mm
// door center offset = 2908 + 907 / 2 = 3361.5mm
// right clearance = 7343 - (2908 + 907) = 7343 - 3815 = 3528mm
const mouseExact = { x: 3361.5, y: 2050 };
const previewExact = computeOpeningHover(mouseExact, [wall], nodes, 'door', 907, 'right');
assert(previewExact.leftClearanceMm === 2808, `Left clearance is 2808mm (got ${previewExact.leftClearanceMm})`);
console.log(`Calculated clearances: Left=${previewExact.leftClearanceMm}mm | Width=${previewExact.width}mm | Right=${previewExact.rightClearanceMm}mm`);

// 5. Bi-directional offset update test
// When user edits left input: offset = leftObstacleOffset + newLeftMm + width / 2
const newLeft = 2808;
const updatedOffsetFromLeft = previewExact.leftObstacleOffset + newLeft + previewExact.width / 2;
assert(Math.round(updatedOffsetFromLeft) === Math.round(previewExact.offset), 'Bidirectional left input update accurately recalculates offset');

// When user edits right input: offset = rightObstacleOffset - newRightMm - width / 2
const newRight = previewExact.rightClearanceMm;
const updatedOffsetFromRight = previewExact.rightObstacleOffset - newRight - previewExact.width / 2;
assert(Math.round(updatedOffsetFromRight) === Math.round(previewExact.offset), 'Bidirectional right input update accurately recalculates offset');

console.log('🎉 All geometric projection, magnetic snapping, swing flip, and split dimension tests PASSED!');
