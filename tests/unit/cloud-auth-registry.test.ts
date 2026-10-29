import { describe, it, expect, beforeEach } from 'vitest';
import { mergeRegistries, fetchCloudUserRegistry } from '../../src/services/cloud-auth-registry';
import { authService } from '../../src/services/auth-service';
import { computePasswordHash, saveRegisteredUser, RegisteredUserRecord } from '../../src/services/auth-helpers';

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

describe('Cloud Authentication Registry & Cross-Device Account Sync', () => {
  beforeEach(async () => {
    localStorage.clear();
    await authService.signOut();
  });

  it('merges registries from multiple devices without dropping any users', () => {
    const deviceAUsers: Record<string, RegisteredUserRecord> = {
      'alice@aurabim.com': {
        uid: 'user_alice',
        email: 'alice@aurabim.com',
        displayName: 'Alice Architect',
        passwordHash: 'hash_alice',
        createdAt: 1000
      }
    };

    const deviceBUsers: Record<string, RegisteredUserRecord> = {
      'bob@aurabim.com': {
        uid: 'user_bob',
        email: 'bob@aurabim.com',
        displayName: 'Bob Designer',
        passwordHash: 'hash_bob',
        createdAt: 1050
      }
    };

    const { merged, hasNewLocal } = mergeRegistries(deviceAUsers, deviceBUsers);

    expect(hasNewLocal).toBe(true);
    expect(merged['alice@aurabim.com']).toBeDefined();
    expect(merged['bob@aurabim.com']).toBeDefined();
    expect(merged['alice@aurabim.com'].displayName).toBe('Alice Architect');
    expect(merged['bob@aurabim.com'].displayName).toBe('Bob Designer');
  });

  it('allows an account created on one device to be signed into on another device', async () => {
    // 1. Simulate Device 1: User signs up
    const email = `crossdevice_${Date.now()}@aurabim.com`;
    const pass = 'SuperSecret123!';
    const hash = await computePasswordHash(pass);

    saveRegisteredUser({
      uid: `user_${Date.now()}`,
      email,
      displayName: 'Remote Colleague',
      passwordHash: hash,
      createdAt: Date.now()
    });

    const userRecord = JSON.parse(localStorage.getItem('aurabim_registered_users') || '{}')[email];
    expect(userRecord).toBeDefined();

    // 2. Simulate Device 2: Fresh browser session (empty localStorage)
    localStorage.clear();
    expect(localStorage.getItem('aurabim_registered_users')).toBeNull();

    // Simulate Device 2 having received the cloud registry
    const cloudSyncPayload: Record<string, RegisteredUserRecord> = {
      [email]: userRecord
    };
    localStorage.setItem('aurabim_registered_users', JSON.stringify(cloudSyncPayload));

    // 3. User logs in on Device 2
    const loggedIn = await authService.signInWithEmail(email, pass);
    expect(loggedIn).toBeDefined();
    expect(loggedIn.email).toBe(email);
    expect(loggedIn.displayName).toBe('Remote Colleague');
    expect(authService.getCurrentUser()?.email).toBe(email);
  });
});
