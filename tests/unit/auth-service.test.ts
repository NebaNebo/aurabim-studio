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

  it('creates an account with email, password, and full name', async () => {
    const user = await authService.signUpWithEmail('lecorbusier@aurabim.com', 'pass12345', 'Le Corbusier');
    expect(user.email).toBe('lecorbusier@aurabim.com');
    expect(user.displayName).toBe('Le Corbusier');
    expect(user.isGuest).toBe(false);
    expect(authService.getCurrentUser()?.displayName).toBe('Le Corbusier');
  });

  it('rejects duplicate sign-up with an existing email', async () => {
    await authService.signUpWithEmail('unique@aurabim.com', 'securepass', 'Original User');
    await expect(
      authService.signUpWithEmail('unique@aurabim.com', 'anotherpass', 'Duplicate User')
    ).rejects.toThrow(/already exists/i);
  });

  it('rejects sign-in for unregistered email addresses', async () => {
    await expect(
      authService.signInWithEmail('nonexistent@randomdomain.com', 'anyPassword123')
    ).rejects.toThrow(/No account found with email/i);
  });

  it('rejects sign-in when an incorrect password is provided', async () => {
    await authService.signUpWithEmail('client@aurabim.com', 'correctPassword123', 'Client');
    await authService.signOut();

    await expect(
      authService.signInWithEmail('client@aurabim.com', 'wrongPasswordXYZ')
    ).rejects.toThrow(/Incorrect password/i);
  });

  it('signs in successfully with matching email and password', async () => {
    await authService.signUpWithEmail('designer@aurabim.com', 'validPass999', 'Elena Vance');
    await authService.signOut();

    const signedIn = await authService.signInWithEmail('designer@aurabim.com', 'validPass999');
    expect(signedIn.email).toBe('designer@aurabim.com');
    expect(signedIn.displayName).toBe('Elena Vance');
    expect(signedIn.isGuest).toBe(false);
    expect(authService.getCurrentUser()?.uid).toBe(signedIn.uid);
  });

  it('signs in with Google account identity and persists user profile', async () => {
    const user = await authService.signInWithGoogle('architect.frank@gmail.com', 'Frank Gehry');
    expect(user).toBeDefined();
    expect(user.displayName).toBe('Frank Gehry');
    expect(user.email).toBe('architect.frank@gmail.com');
    expect(user.isGuest).toBe(false);
    expect(user.uid).toContain('google_user_');
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
