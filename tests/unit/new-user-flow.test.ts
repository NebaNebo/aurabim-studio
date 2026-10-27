import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../../src/services/auth-service';
import { projectRepository } from '../../src/services/project-repository';
import { autoSaveManager } from '../../src/services/auto-save-manager';
import { createBlankCanvasTemplate, createModernStudioTemplate } from '../../src/core/templates';

// In-memory localStorage mock for node test runner
const storageMap = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => storageMap.set(k, String(v)),
    removeItem: (k: string) => storageMap.delete(k),
    clear: () => storageMap.clear(),
    get length() { return storageMap.size; },
    key: (i: number) => Array.from(storageMap.keys())[i] ?? null
  };
}

describe('New User Project Creation & Persistence Flow', () => {
  beforeEach(async () => {
    localStorage.clear();
    await authService.signOut();
  });

  it('ensures a brand new user starts with 0 projects in their workspace', async () => {
    const newUser = await authService.signUpWithEmail('zahahadid@aurabim.com', 'password123', 'Zaha Hadid');
    expect(newUser.email).toBe('zahahadid@aurabim.com');
    expect(newUser.uid).toContain('local_user_');

    const initialProjects = await projectRepository.listProjects(newUser.uid);
    expect(initialProjects).toEqual([]);
    expect(initialProjects.length).toBe(0);
  });

  it('saves and persists a new project for a new user cleanly', async () => {
    const user = await authService.signUpWithEmail('normanfoster@aurabim.com', 'securepass1', 'Norman Foster');
    
    // Simulate NewProjectModal creating a blank canvas project
    const blankState = createBlankCanvasTemplate();
    blankState.id = 'proj_norman_01';
    blankState.name = 'Foster Gherkin Concept';

    const saved = await projectRepository.saveProject(user.uid, blankState, undefined, 'blank');
    expect(saved.id).toBe('proj_norman_01');
    expect(saved.name).toBe('Foster Gherkin Concept');
    expect(saved.userId).toBe(user.uid);

    // Verify it is listed in the user's workspace
    const list = await projectRepository.listProjects(user.uid);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('proj_norman_01');
    expect(list[0].name).toBe('Foster Gherkin Concept');

    // Verify full project state is loadable
    const loaded = await projectRepository.getProject(user.uid, 'proj_norman_01');
    expect(loaded).not.toBeNull();
    expect(loaded!.state.name).toBe('Foster Gherkin Concept');
  });

  it('guarantees deterministic UID so projects persist across sign out and sign in', async () => {
    const email = 'mies@aurabim.com';
    const pass = 'lessIsMore123';

    // 1. New user signs up and saves a design
    const signupUser = await authService.signUpWithEmail(email, pass, 'Mies van der Rohe');
    const project = createModernStudioTemplate();
    project.id = 'proj_mies_pavilion';
    project.name = 'Barcelona Pavilion';
    await projectRepository.saveProject(signupUser.uid, project);

    // 2. User signs out
    await authService.signOut();
    expect(authService.getCurrentUser()).toBeNull();

    // 3. User signs back in with the same email
    const signinUser = await authService.signInWithEmail(email, pass);
    expect(signinUser.uid).toBe(signupUser.uid);

    // 4. Projects created during sign-up are still intact
    const userProjects = await projectRepository.listProjects(signinUser.uid);
    expect(userProjects.length).toBe(1);
    expect(userProjects[0].name).toBe('Barcelona Pavilion');
  });

  it('detects state modifications with sensitive auto-save hash', () => {
    const state = createModernStudioTemplate();
    const initialHash = autoSaveManager.computeQuickHash(state);

    // Moving a corner node should change the hash
    const firstNodeKey = Object.keys(state.nodes)[0];
    state.nodes[firstNodeKey].x += 500;
    const movedHash = autoSaveManager.computeQuickHash(state);
    expect(movedHash).not.toBe(initialHash);

    // Adding an opening should change the hash
    const firstWallKey = Object.keys(state.walls)[0];
    state.walls[firstWallKey].openings.push({
      id: 'op_test_window',
      wallId: firstWallKey,
      type: 'window',
      offset: 1200,
      offsetFromStart: 1200,
      width: 1000,
      height: 1200,
      sillHeight: 900,
      swingSide: 1,
      hingeSide: 'left'
    });
    const openingHash = autoSaveManager.computeQuickHash(state);
    expect(openingHash).not.toBe(movedHash);
  });

  it('synchronously flushes unsaved state with saveProjectSync before page unload', async () => {
    const user = await authService.signInAsGuest('Speedy Architect');
    const state = createBlankCanvasTemplate();
    state.id = 'proj_sync_test';
    state.name = 'Rapid Prototype';

    // Synchronous save
    const item = projectRepository.saveProjectSync(user.uid, state);
    expect(item.id).toBe('proj_sync_test');

    // Immediately verifiable in listProjects
    const list = await projectRepository.listProjects(user.uid);
    expect(list.some(p => p.id === 'proj_sync_test')).toBe(true);
  });

  it('strictly isolates new user workspaces from each other', async () => {
    const userA = await authService.signUpWithEmail('alice@aurabim.com', 'passA123', 'Alice');
    const userB = await authService.signUpWithEmail('bob@aurabim.com', 'passB123', 'Bob');

    // Alice creates a design
    const aliceProject = createBlankCanvasTemplate();
    aliceProject.id = 'proj_alice_loft';
    aliceProject.name = "Alice's Studio";
    await projectRepository.saveProject(userA.uid, aliceProject);

    // Bob has zero projects and cannot see Alice's design
    const bobProjects = await projectRepository.listProjects(userB.uid);
    expect(bobProjects.length).toBe(0);

    const bobInspectAlice = await projectRepository.getProject(userB.uid, 'proj_alice_loft');
    expect(bobInspectAlice).toBeNull();
  });
});
