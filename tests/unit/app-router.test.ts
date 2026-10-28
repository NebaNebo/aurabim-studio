import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseRouteFromHash,
  formatRouteHash,
  AppRouter,
  ROUTE_STORAGE_VIEW_KEY,
  ROUTE_STORAGE_PROJECT_KEY
} from '../../src/ui/app-router';

// Setup environment mocks for Node test runner
const storageMap = new Map<string, string>();
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => storageMap.set(k, String(v)),
    removeItem: (k: string) => storageMap.delete(k),
    clear: () => storageMap.clear(),
    get length() { return storageMap.size; },
    key: (i: number) => Array.from(storageMap.keys())[i] ?? null
  };
}

let mockHash = '';
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: {
      get hash() { return mockHash; },
      set hash(val: string) { mockHash = val; }
    },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
} else {
  // If window already exists, ensure location.hash is writable
  try {
    window.location.hash = '';
  } catch {
    (window as any).location = {
      get hash() { return mockHash; },
      set hash(val: string) { mockHash = val; }
    };
  }
}

function createMockElement(): HTMLElement {
  return {
    style: { display: '' }
  } as any;
}

describe('AppRouter & Route Persistence', () => {
  beforeEach(() => {
    storageMap.clear();
    mockHash = '';
    if (typeof window !== 'undefined' && window.location) {
      window.location.hash = '';
    }
  });

  describe('parseRouteFromHash', () => {
    it('correctly parses dashboard route', () => {
      expect(parseRouteFromHash('#/dashboard')).toEqual({ view: 'dashboard', projectId: null });
      expect(parseRouteFromHash('#dashboard')).toEqual({ view: 'dashboard', projectId: null });
    });

    it('correctly parses editor route with project query param', () => {
      expect(parseRouteFromHash('#/editor?project=proj_123')).toEqual({
        view: 'editor',
        projectId: 'proj_123'
      });
      expect(parseRouteFromHash('#editor?id=proj_456')).toEqual({
        view: 'editor',
        projectId: 'proj_456'
      });
    });

    it('correctly parses editor route without query param', () => {
      expect(parseRouteFromHash('#/editor')).toEqual({
        view: 'editor',
        projectId: null
      });
    });

    it('correctly parses auth route', () => {
      expect(parseRouteFromHash('#/auth')).toEqual({ view: 'auth', projectId: null });
    });

    it('returns null for empty or invalid hash', () => {
      expect(parseRouteFromHash('')).toBeNull();
      expect(parseRouteFromHash('#')).toBeNull();
      expect(parseRouteFromHash('#/nonexistent')).toBeNull();
    });
  });

  describe('formatRouteHash', () => {
    it('formats hash strings correctly', () => {
      expect(formatRouteHash('dashboard')).toBe('#/dashboard');
      expect(formatRouteHash('auth')).toBe('#/auth');
      expect(formatRouteHash('editor')).toBe('#/editor');
      expect(formatRouteHash('editor', 'proj_999')).toBe('#/editor?project=proj_999');
    });
  });

  describe('AppRouter state and refresh resolution', () => {
    let authEl: HTMLElement;
    let dashEl: HTMLElement;
    let editorEl: HTMLElement;
    let router: AppRouter;

    beforeEach(() => {
      authEl = createMockElement();
      dashEl = createMockElement();
      editorEl = createMockElement();
      router = new AppRouter(authEl, dashEl, editorEl);
    });

    it('defaults to dashboard when no hash and no storage are present', () => {
      const initial = router.getInitialRoute();
      expect(initial.view).toBe('dashboard');
      expect(initial.projectId).toBeNull();
    });

    it('resolves editor view and projectId from URL hash on page refresh', () => {
      window.location.hash = '#/editor?project=proj_refresh_test';
      const initial = router.getInitialRoute();
      expect(initial.view).toBe('editor');
      expect(initial.projectId).toBe('proj_refresh_test');
    });

    it('resolves editor view from localStorage if hash has no project id', () => {
      window.location.hash = '#/editor';
      localStorage.setItem(ROUTE_STORAGE_PROJECT_KEY, 'proj_from_storage');
      const initial = router.getInitialRoute();
      expect(initial.view).toBe('editor');
      expect(initial.projectId).toBe('proj_from_storage');
    });

    it('resolves view from localStorage mirror when URL hash is clean/empty', () => {
      localStorage.setItem(ROUTE_STORAGE_VIEW_KEY, 'editor');
      localStorage.setItem(ROUTE_STORAGE_PROJECT_KEY, 'proj_persisted');
      const initial = router.getInitialRoute();
      expect(initial.view).toBe('editor');
      expect(initial.projectId).toBe('proj_persisted');
    });

    it('updates DOM containers and persists state on navigateTo', () => {
      router.navigateTo('editor', 'proj_edit_1');
      expect(editorEl.style.display).toBe('flex');
      expect(dashEl.style.display).toBe('none');
      expect(authEl.style.display).toBe('none');
      expect(router.getCurrentView()).toBe('editor');
      expect(router.getCurrentProjectId()).toBe('proj_edit_1');
      expect(localStorage.getItem(ROUTE_STORAGE_VIEW_KEY)).toBe('editor');
      expect(localStorage.getItem(ROUTE_STORAGE_PROJECT_KEY)).toBe('proj_edit_1');
      expect(window.location.hash).toBe('#/editor?project=proj_edit_1');

      router.navigateTo('dashboard');
      expect(dashEl.style.display).toBe('block');
      expect(editorEl.style.display).toBe('none');
      expect(router.getCurrentView()).toBe('dashboard');
      expect(router.getCurrentProjectId()).toBeNull();
      expect(localStorage.getItem(ROUTE_STORAGE_VIEW_KEY)).toBe('dashboard');
      expect(window.location.hash).toBe('#/dashboard');
    });

    it('updates project ID and hash via setEditorProject', () => {
      router.navigateTo('editor', 'initial_proj');
      router.setEditorProject('updated_proj');
      expect(router.getCurrentProjectId()).toBe('updated_proj');
      expect(localStorage.getItem(ROUTE_STORAGE_PROJECT_KEY)).toBe('updated_proj');
      expect(window.location.hash).toBe('#/editor?project=updated_proj');
    });
  });
});
