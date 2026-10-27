import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../../src/services/auth-service';

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

describe('Auth Service & Authentication Flow', () => {
  beforeEach(async () => {
    localStorage.clear();
    await authService.signOut();
  });

  it('signs in as a guest with 1-click access', async () => {
    let notifiedUser: any = undefined;
    const unsub = authService.onAuthChange(user => {
      notifiedUser = user;
    });

    const user = await authService.signInAsGuest('Guest Architect');
    expect(user.isGuest).toBe(true);
    expect(user.displayName).toBe('Guest Architect');
    expect(user.uid).toMatch(/^guest_/);
    expect(authService.getCurrentUser()).toEqual(user);
    expect(notifiedUser).toEqual(user);

    unsub();
  });

  it('signs in with email and password fallback', async () => {
    const user = await authService.signInWithEmail('architect@aurabim.com', 'secret123');
    expect(user.email).toBe('architect@aurabim.com');
    expect(user.isGuest).toBe(false);
    expect(user.displayName).toBe('architect');
    expect(authService.getCurrentUser()?.uid).toBe(user.uid);
  });

  it('creates an account with email, password, and full name', async () => {
    const user = await authService.signUpWithEmail('lecorbusier@aurabim.com', 'pass12345', 'Le Corbusier');
    expect(user.email).toBe('lecorbusier@aurabim.com');
    expect(user.displayName).toBe('Le Corbusier');
    expect(user.isGuest).toBe(false);
    expect(authService.getCurrentUser()?.displayName).toBe('Le Corbusier');
  });

  it('signs in with Google simulation fallback when cloud is offline/demo', async () => {
    const user = await authService.signInWithGoogle();
    expect(user).toBeDefined();
    expect(user.displayName).toBe('Google Designer (Demo)');
    expect(authService.getCurrentUser()).not.toBeNull();
  });

  it('signs out and clears persisted session', async () => {
    await authService.signInAsGuest('Temporary Designer');
    expect(authService.getCurrentUser()).not.toBeNull();

    await authService.signOut();
    expect(authService.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('aurabim_auth_user')).toBeNull();
  });

  it('correctly registers multiple auth state listeners and unregisters cleanly', async () => {
    let callCount = 0;
    const unsub = authService.onAuthChange(() => {
      callCount++;
    });

    await authService.signInAsGuest('Test Listener');
    expect(callCount).toBeGreaterThan(0);

    const prevCount = callCount;
    unsub();
    await authService.signOut();
    expect(callCount).toBe(prevCount);
  });
});
