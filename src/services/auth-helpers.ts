import { doc, setDoc } from 'firebase/firestore';
import { db, isCloudConnected } from './firebase-config';
import type { AuthUserProfile } from './auth-types';
import {
  fetchCloudUserRegistry,
  uploadCloudUserRegistry,
  mergeRegistries
} from './cloud-auth-registry';

export interface RegisteredUserRecord {
  uid: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
}

export const LOCAL_USER_KEY = 'aurabim_auth_user';
export const REGISTERED_USERS_KEY = 'aurabim_registered_users';

export function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

export function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export function removeLocalItem(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

export async function computePasswordHash(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) + hash) + password.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function getRegisteredUsers(): Record<string, RegisteredUserRecord> {
  const raw = getLocalItem(REGISTERED_USERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveRegisteredUser(record: RegisteredUserRecord): void {
  const users = getRegisteredUsers();
  users[record.email.toLowerCase()] = record;
  setLocalItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  // Cross-device sync: upload registry to Cloudinary so any device can sign in
  uploadCloudUserRegistry(users).catch(() => {});
}

/**
 * Synchronizes local user registry with the global cloud registry
 */
export async function syncUsersWithCloudRegistry(): Promise<Record<string, RegisteredUserRecord>> {
  const localUsers = getRegisteredUsers();
  const cloudUsers = await fetchCloudUserRegistry();
  const { merged, hasNewLocal } = mergeRegistries(localUsers, cloudUsers);
  setLocalItem(REGISTERED_USERS_KEY, JSON.stringify(merged));
  if (hasNewLocal) {
    uploadCloudUserRegistry(merged).catch(() => {});
  }
  return merged;
}

export async function seedDefaultAccountIfEmpty(): Promise<void> {
  const users = getRegisteredUsers();
  const defaultEmail = 'architect@aurabim.com';
  if (!users[defaultEmail]) {
    const hash = await computePasswordHash('architect123');
    saveRegisteredUser({
      uid: 'local_user_architect_default',
      email: defaultEmail,
      displayName: 'AuraBIM Architect',
      passwordHash: hash,
      createdAt: 1700000000000
    });
  }
}

export async function syncUserToFirebase(user: AuthUserProfile): Promise<void> {
  if (!db || !isCloudConnected || !user.uid) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn('Firebase user sync note:', err);
  }
}

/**
 * Returns true when the app is running on a deployed host (Vercel, GitHub Pages,
 * Netlify, etc.) where the Better-Auth Vite dev-server plugin is NOT available.
 * Better-Auth's Node server only runs on localhost via the Vite plugin.
 */
export function isStaticHostingEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  // An explicit auth server URL means we have a dedicated backend
  const hasCustomServer = Boolean((import.meta as any).env?.VITE_AUTH_SERVER_URL);
  if (hasCustomServer) return false;
  const host = window.location.hostname;
  // Better-Auth only runs on localhost/127.0.0.1 via Vite plugin
  return host !== 'localhost' && host !== '127.0.0.1';
}

export function buildGuestUser(customName: string = 'Guest Designer'): AuthUserProfile {
  return {
    uid: `guest_${Date.now()}`,
    email: null,
    displayName: customName,
    photoURL: null,
    isGuest: true
  };
}

export function buildGoogleUser(customEmail?: string, customName?: string): AuthUserProfile {
  const email = (customEmail || 'architect@gmail.com').trim().toLowerCase();
  const name = customName || email.split('@')[0];
  return {
    uid: `google_user_${email.replace(/[^a-z0-9]/g, '_')}`,
    email,
    displayName: name,
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7`,
    isGuest: false
  };
}

export function formatAuthError(err: any): string {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Incorrect email or password. Please verify your credentials.';
  }
  if (code === 'auth/user-not-found') {
    return 'No account found with this email. Please create an account first.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Invalid email address format.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed attempts. Please try again in a few moments.';
  }
  return err?.message || 'Authentication error';
}

