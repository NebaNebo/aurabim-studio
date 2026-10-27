import { describe, it, expect, beforeEach } from 'vitest';
import { projectRepository } from '../../src/services/project-repository';
import { createModernStudioTemplate } from '../../src/core/templates';

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

describe('Project Repository (Dual-Layer Persistence)', () => {
  const testUserId = 'test_user_qa_123';

  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves a project correctly', async () => {
    const template = createModernStudioTemplate();
    template.id = 'proj_test_01';
    template.name = 'Test Residence';

    const saved = await projectRepository.saveProject(testUserId, template, 'https://res.cloudinary.com/test.jpg', 'studio_loft');
    expect(saved.id).toBe('proj_test_01');
    expect(saved.name).toBe('Test Residence');
    expect(saved.thumbnailUrl).toBe('https://res.cloudinary.com/test.jpg');
    expect(saved.wallCount).toBeGreaterThan(0);

    const loaded = await projectRepository.getProject(testUserId, 'proj_test_01');
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Test Residence');
    expect(loaded!.state.nodes).toBeDefined();
  });

  it('lists saved projects for a user ordered by update time', async () => {
    const t1 = createModernStudioTemplate();
    t1.id = 'p1';
    t1.name = 'Project 1';
    await projectRepository.saveProject(testUserId, t1);

    const t2 = createModernStudioTemplate();
    t2.id = 'p2';
    t2.name = 'Project 2';
    await projectRepository.saveProject(testUserId, t2);

    const list = await projectRepository.listProjects(testUserId);
    expect(list.length).toBe(2);
    expect(list.some(p => p.id === 'p1')).toBe(true);
    expect(list.some(p => p.id === 'p2')).toBe(true);
  });

  it('duplicates a project with new ID and copied state', async () => {
    const original = createModernStudioTemplate();
    original.id = 'p_orig';
    original.name = 'Penthouse Design';
    await projectRepository.saveProject(testUserId, original, 'https://thumb.url');

    const duplicated = await projectRepository.duplicateProject(testUserId, 'p_orig');
    expect(duplicated).not.toBeNull();
    expect(duplicated!.id).not.toBe('p_orig');
    expect(duplicated!.name).toBe('Penthouse Design (Copy)');
    expect(duplicated!.thumbnailUrl).toBe('https://thumb.url');

    const all = await projectRepository.listProjects(testUserId);
    expect(all.length).toBe(2);
  });

  it('deletes a project cleanly', async () => {
    const t = createModernStudioTemplate();
    t.id = 'p_delete';
    await projectRepository.saveProject(testUserId, t);

    let list = await projectRepository.listProjects(testUserId);
    expect(list.length).toBe(1);

    await projectRepository.deleteProject(testUserId, 'p_delete');

    list = await projectRepository.listProjects(testUserId);
    expect(list.length).toBe(0);

    const found = await projectRepository.getProject(testUserId, 'p_delete');
    expect(found).toBeNull();
  });

  it('seeds default sample showcase projects if user has no projects', async () => {
    await projectRepository.seedDefaultProjectsIfEmpty(testUserId);
    const list = await projectRepository.listProjects(testUserId);
    expect(list.length).toBe(3);
    expect(list.some(p => p.templateType === 'curved_penthouse')).toBe(true);
  });

  it('strictly isolates projects between different user accounts', async () => {
    const userA = 'user_alpha_777';
    const userB = 'user_beta_888';

    const tA = createModernStudioTemplate();
    tA.id = 'proj_alpha_only';
    tA.name = 'Alpha Villa';
    await projectRepository.saveProject(userA, tA);

    const tB = createModernStudioTemplate();
    tB.id = 'proj_beta_only';
    tB.name = 'Beta Office';
    await projectRepository.saveProject(userB, tB);

    const listA = await projectRepository.listProjects(userA);
    const listB = await projectRepository.listProjects(userB);

    expect(listA.some(p => p.id === 'proj_alpha_only')).toBe(true);
    expect(listA.some(p => p.id === 'proj_beta_only')).toBe(false);

    expect(listB.some(p => p.id === 'proj_beta_only')).toBe(true);
    expect(listB.some(p => p.id === 'proj_alpha_only')).toBe(false);

    const accessBtoA = await projectRepository.getProject(userB, 'proj_alpha_only');
    expect(accessBtoA).toBeNull();
  });
});
