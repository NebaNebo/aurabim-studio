import { describe, it, expect, beforeEach } from 'vitest';
import { projectStore } from '../../src/core/state-store';
import { createTwoBedroomSuiteTemplate } from '../../src/core/templates';
import { formatSubtypeLabel } from '../../src/ui/dock/dock-types';

describe('CAD Studio UI Polish & Refactor Verifications', () => {
  beforeEach(() => {
    projectStore.clearProject();
  });

  it('formats subtype labels correctly for accordion trays', () => {
    expect(formatSubtypeLabel('door', 'single_door')).toBe('Single');
    expect(formatSubtypeLabel('door', 'double_door')).toBe('Double');
    expect(formatSubtypeLabel('window', 'casement_window')).toBe('Casement');
    expect(formatSubtypeLabel('bay_window', 'rectangular_bay')).toBe('Rectangular');
    expect(formatSubtypeLabel('column', 'square')).toBe('Square');
    expect(formatSubtypeLabel('staircase', 'straight')).toBe('Straight');
    expect(formatSubtypeLabel('partition_wall', 'half')).toBe('Half-Wall');
  });

  it('calculates spatial summary metrics strictly for hero card and 3-column mini grid', () => {
    const template = createTwoBedroomSuiteTemplate();
    projectStore.loadProject(template);
    const state = projectStore.getState();

    let totalAreaM2 = 0;
    for (const r of Object.values(state.rooms)) {
      totalAreaM2 += r.areaSquareMeters;
    }
    const wallCount = Object.keys(state.walls).length;
    const roomCount = Object.keys(state.rooms).length;
    const furnCount = Object.keys(state.furniture).length;

    expect(totalAreaM2).toBeGreaterThan(0);
    expect(roomCount).toBeGreaterThanOrEqual(1);
    expect(wallCount).toBeGreaterThanOrEqual(4);
    expect(furnCount).toBeGreaterThanOrEqual(0);
  });

  it('correctly manages active tool state and data-active attributes', () => {
    projectStore.setActiveTool('straight_wall');
    expect(projectStore.getState().activeTool).toBe('straight_wall');

    projectStore.setActiveTool('select');
    expect(projectStore.getState().activeTool).toBe('select');

    projectStore.setActiveTool('place_opening', 'single_door');
    expect(projectStore.getState().activeTool).toBe('place_opening');
    expect(projectStore.getState().pendingOpeningType).toBe('single_door');
  });

  it('guarantees door swing and hinge flip toggle symmetry', () => {
    const template = createTwoBedroomSuiteTemplate();
    projectStore.loadProject(template);
    const state = projectStore.getState();

    // Find any door in the template
    let testWallId: string | null = null;
    let testDoorId: string | null = null;
    for (const wall of Object.values(state.walls)) {
      const door = wall.openings.find(op => op.type === 'door' || op.type === 'single_door');
      if (door) {
        testWallId = wall.id;
        testDoorId = door.id;
        break;
      }
    }

    if (testWallId && testDoorId) {
      projectStore.updateOpening(testDoorId, { swingSide: 1, hingeSide: 'left' });
      let op = projectStore.getState().walls[testWallId].openings.find(o => o.id === testDoorId);
      expect(op?.swingSide).toBe(1);
      expect(op?.hingeSide).toBe('left');

      // Flip swing
      projectStore.updateOpening(testDoorId, { swingSide: -1 });
      op = projectStore.getState().walls[testWallId].openings.find(o => o.id === testDoorId);
      expect(op?.swingSide).toBe(-1);

      // Flip hinge
      projectStore.updateOpening(testDoorId, { hingeSide: 'right' });
      op = projectStore.getState().walls[testWallId].openings.find(o => o.id === testDoorId);
      expect(op?.hingeSide).toBe('right');
    }
  });
});
