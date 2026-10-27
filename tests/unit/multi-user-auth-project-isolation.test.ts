import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../../src/services/auth-service';
import { projectRepository } from '../../src/services/project-repository';
import {
  createCoohomCurvedShowcaseTemplate,
  createModernStudioTemplate,
  createBlankCanvasTemplate
} from '../../src/core/templates';

// In-memory localStorage mock for node test environment
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

describe('Multi-User Authentication & Project Isolation Integration', () => {
  beforeEach(async () => {
    localStorage.clear();
    await authService.signOut();
  });

  it('proves complete isolation of projects across multiple distinct user accounts', async () => {
    // ---------------------------------------------------------
    // Phase 1: User 1 (Alice Architect) Registers & Creates Projects
    // ---------------------------------------------------------
    const alice = await authService.signUpWithEmail(
      'alice.architect@aurabim.com',
      'alicePass123!',
      'Alice Architect'
    );
    expect(alice.uid).toBeDefined();
    expect(authService.getCurrentUser()?.email).toBe('alice.architect@aurabim.com');

    // Alice creates 2 projects: a Penthouse and a Blank Canvas
    const aliceP1 = createCoohomCurvedShowcaseTemplate();
    aliceP1.id = 'proj_alice_penthouse_01';
    aliceP1.name = 'Alice Curved Penthouse';
    await projectRepository.saveProject(alice.uid, aliceP1, 'https://cdn.example.com/alice1.jpg', 'curved_penthouse');

    const aliceP2 = createBlankCanvasTemplate();
    aliceP2.id = 'proj_alice_concept_02';
    aliceP2.name = 'Alice Waterfront Concept';
    await projectRepository.saveProject(alice.uid, aliceP2, undefined, 'blank');

    const aliceProjects = await projectRepository.listProjects(alice.uid);
    expect(aliceProjects.length).toBe(2);
    expect(aliceProjects.map(p => p.id)).toContain('proj_alice_penthouse_01');
    expect(aliceProjects.map(p => p.id)).toContain('proj_alice_concept_02');

    // Alice signs out
    await authService.signOut();
    expect(authService.getCurrentUser()).toBeNull();

    // ---------------------------------------------------------
    // Phase 2: User 2 (Bob Designer) Registers
    // ---------------------------------------------------------
    const bob = await authService.signUpWithEmail(
      'bob.designer@aurabim.com',
      'bobPass456!',
      'Bob Designer'
    );
    expect(bob.uid).toBeDefined();
    expect(bob.uid).not.toBe(alice.uid);
    expect(authService.getCurrentUser()?.email).toBe('bob.designer@aurabim.com');

    // Bob starts with 0 projects in his isolated workspace
    const bobInitialProjects = await projectRepository.listProjects(bob.uid);
    expect(bobInitialProjects.length).toBe(0);

    // CRITICAL SECURITY CHECK: Bob cannot access Alice's projects directly
    const bobAccessAliceP1 = await projectRepository.getProject(bob.uid, 'proj_alice_penthouse_01');
    expect(bobAccessAliceP1).toBeNull();

    const bobAccessAliceP2 = await projectRepository.getProject(bob.uid, 'proj_alice_concept_02');
    expect(bobAccessAliceP2).toBeNull();

    // Bob attempts to maliciously delete Alice's project ID under his user ID
    await projectRepository.deleteProject(bob.uid, 'proj_alice_penthouse_01');

    // Bob creates his own project: Modern Studio Loft
    const bobP1 = createModernStudioTemplate();
    bobP1.id = 'proj_bob_studio_01';
    bobP1.name = 'Bob Industrial Loft';
    await projectRepository.saveProject(bob.uid, bobP1, 'https://cdn.example.com/bob1.jpg', 'studio_loft');

    const bobProjects = await projectRepository.listProjects(bob.uid);
    expect(bobProjects.length).toBe(1);
    expect(bobProjects[0].id).toBe('proj_bob_studio_01');
    expect(bobProjects[0].name).toBe('Bob Industrial Loft');

    // Bob signs out
    await authService.signOut();
    expect(authService.getCurrentUser()).toBeNull();

    // ---------------------------------------------------------
    // Phase 3: Guest User Access
    // ---------------------------------------------------------
    const guest = await authService.signInAsGuest('Guest Reviewer');
    expect(guest.isGuest).toBe(true);
    expect(guest.uid).toMatch(/^guest_/);

    // Guest cannot see Alice's or Bob's projects
    const guestProjects = await projectRepository.listProjects(guest.uid);
    expect(guestProjects.length).toBe(0);

    const guestP1 = createBlankCanvasTemplate();
    guestP1.id = 'proj_guest_scratch_01';
    guestP1.name = 'Guest Scratchpad';
    await projectRepository.saveProject(guest.uid, guestP1, undefined, 'blank');

    expect((await projectRepository.listProjects(guest.uid)).length).toBe(1);

    await authService.signOut();
    expect(authService.getCurrentUser()).toBeNull();

    // ---------------------------------------------------------
    // Phase 4: Alice Re-logs in and Verifies Data Integrity
    // ---------------------------------------------------------
    const aliceReLogin = await authService.signInWithEmail('alice.architect@aurabim.com', 'alicePass123!');
    expect(aliceReLogin.uid).toBe(alice.uid);
    expect(aliceReLogin.displayName).toBe('Alice Architect');

    const aliceFinalProjects = await projectRepository.listProjects(aliceReLogin.uid);
    expect(aliceFinalProjects.length).toBe(2);

    // Verify Bob's and Guest's projects are NOT visible to Alice
    expect(aliceFinalProjects.map(p => p.id)).not.toContain('proj_bob_studio_01');
    expect(aliceFinalProjects.map(p => p.id)).not.toContain('proj_guest_scratch_01');

    // Verify Alice's project state was not modified or damaged
    const loadedAliceP1 = await projectRepository.getProject(aliceReLogin.uid, 'proj_alice_penthouse_01');
    expect(loadedAliceP1).not.toBeNull();
    expect(loadedAliceP1!.name).toBe('Alice Curved Penthouse');
    expect(loadedAliceP1!.thumbnailUrl).toBe('https://cdn.example.com/alice1.jpg');
    expect(Object.keys(loadedAliceP1!.state.walls).length).toBeGreaterThan(0);
  });

  it('handles case-insensitive email sign-in across different users', async () => {
    await authService.signUpWithEmail('charlie.urban@aurabim.com', 'charliePass123', 'Charlie Urban');
    await authService.signOut();

    // Sign in with UPPERCASE email
    const user = await authService.signInWithEmail('CHARLIE.URBAN@AURABIM.COM', 'charliePass123');
    expect(user.displayName).toBe('Charlie Urban');
    expect(user.email).toBe('charlie.urban@aurabim.com');
  });

  it('blocks cross-user duplication and preserves target user ownership', async () => {
    const userX = await authService.signUpWithEmail('userx@aurabim.com', 'passX123', 'User X');
    const userY = await authService.signUpWithEmail('usery@aurabim.com', 'passY123', 'User Y');

    const pX = createModernStudioTemplate();
    pX.id = 'proj_userx_unique';
    pX.name = 'User X Original Design';
    await projectRepository.saveProject(userX.uid, pX);

    // User Y attempts to duplicate User X's project
    const dupResult = await projectRepository.duplicateProject(userY.uid, 'proj_userx_unique');
    expect(dupResult).toBeNull(); // Should fail gracefully because Y does not own X's project

    // User X duplicates own project
    const xDup = await projectRepository.duplicateProject(userX.uid, 'proj_userx_unique');
    expect(xDup).not.toBeNull();
    expect(xDup!.name).toBe('User X Original Design (Copy)');
    expect(xDup!.userId).toBe(userX.uid);
  });
});
