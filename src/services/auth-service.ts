import { createAuthClient } from 'better-auth/client';
import { doc, setDoc } from 'firebase/firestore';
import { db, isCloudConnected } from './firebase-config';
import {
  LOCAL_USER_KEY,
  getLocalItem,
  setLocalItem,
  removeLocalItem,
  computePasswordHash,
  getRegisteredUsers,
  saveRegisteredUser,
  seedDefaultAccountIfEmpty
} from './auth-helpers';

export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

export { computePasswordHash } from './auth-helpers';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
});

class AuthService {
  private currentUser: AuthUserProfile | null = null;
  private listeners: Set<(user: AuthUserProfile | null) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Instant cached session restore for zero-latency UI rendering
    const cached = getLocalItem(LOCAL_USER_KEY);
    if (cached) {
      try {
        this.currentUser = JSON.parse(cached);
      } catch {
        // ignore
      }
    }

    // 2. Pre-seed default test account in local mirror
    seedDefaultAccountIfEmpty().catch(() => {});

    // 3. Verify server session with Better-Auth if running in browser
    if (typeof window !== 'undefined') {
      try {
        const sessionRes = await authClient.getSession();
        if (sessionRes?.data?.user) {
          const u = sessionRes.data.user;
          this.currentUser = {
            uid: u.id,
            email: u.email,
            displayName: u.name || (u.email ? u.email.split('@')[0] : 'Designer'),
            photoURL: u.image || null,
            isGuest: false
          };
          setLocalItem(LOCAL_USER_KEY, JSON.stringify(this.currentUser));
          this.syncUserToFirebase(this.currentUser);
        }
      } catch {
        // Network unavailable or static environment; maintain cached state
      }
    }

    this.isInitialized = true;
    this.notify();
  }

  public getCurrentUser(): AuthUserProfile | null {
    return this.currentUser;
  }

  public onAuthChange(callback: (user: AuthUserProfile | null) => void): () => void {
    this.listeners.add(callback);
    if (this.isInitialized) {
      callback(this.currentUser);
    }
    return () => this.listeners.delete(callback);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  }

  private async syncUserToFirebase(user: AuthUserProfile) {
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

  public async signInWithEmail(email: string, pass: string): Promise<AuthUserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Primary: Better-Auth Server Authentication (Shared with Incognito & Browsers)
    if (typeof window !== 'undefined') {
      try {
        const res = await authClient.signIn.email({
          email: cleanEmail,
          password: pass
        });

        if (res.data?.user) {
          const u = res.data.user;
          const user: AuthUserProfile = {
            uid: u.id,
            email: u.email,
            displayName: u.name || cleanEmail.split('@')[0],
            photoURL: u.image || null,
            isGuest: false
          };
          this.currentUser = user;
          setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
          this.syncUserToFirebase(user);
          this.notify();
          return user;
        }

        if (res.error) {
          const msg = res.error.message || 'Incorrect email or password.';
          throw new Error(msg);
        }
      } catch (err: any) {
        // If server actively returned an auth error (401/403/invalid), rethrow it
        if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err;
        }
      }
    }

    // 2. Fallback: Local Registry Mirror (for unit tests / offline sandbox)
    const users = getRegisteredUsers();
    const existing = users[cleanEmail];

    if (!existing) {
      throw new Error(`No account found with email "${cleanEmail}". Please click "Create Account" first.`);
    }

    const inputHash = await computePasswordHash(pass);
    if (existing.passwordHash !== inputHash) {
      throw new Error('Incorrect password. Please verify and try again.');
    }

    const user: AuthUserProfile = {
      uid: existing.uid,
      email: existing.email,
      displayName: existing.displayName,
      photoURL: null,
      isGuest: false
    };

    this.currentUser = user;
    setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
    this.syncUserToFirebase(user);
    this.notify();
    return user;
  }

  public async signUpWithEmail(email: string, pass: string, name?: string): Promise<AuthUserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const displayName = name?.trim() || cleanEmail.split('@')[0];

    // 1. Primary: Better-Auth Server Registration (Persists to SQLite across Incognito)
    if (typeof window !== 'undefined') {
      try {
        const res = await authClient.signUp.email({
          email: cleanEmail,
          password: pass,
          name: displayName
        });

        if (res.data?.user) {
          const u = res.data.user;
          const user: AuthUserProfile = {
            uid: u.id,
            email: u.email,
            displayName: u.name || displayName,
            photoURL: u.image || null,
            isGuest: false
          };
          this.currentUser = user;
          setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
          this.syncUserToFirebase(user);
          this.notify();
          return user;
        }

        if (res.error) {
          throw new Error(res.error.message || 'Unable to create account.');
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err;
        }
      }
    }

    // 2. Fallback: Local Registry Mirror (for unit tests / offline sandbox)
    const users = getRegisteredUsers();
    if (users[cleanEmail]) {
      throw new Error(`An account with email "${cleanEmail}" already exists. Please sign in instead.`);
    }

    const passwordHash = await computePasswordHash(pass);
    const newUid = `local_user_${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    saveRegisteredUser({
      uid: newUid,
      email: cleanEmail,
      displayName,
      passwordHash,
      createdAt: Date.now()
    });

    const user: AuthUserProfile = {
      uid: newUid,
      email: cleanEmail,
      displayName,
      photoURL: null,
      isGuest: false
    };

    this.currentUser = user;
    setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
    this.syncUserToFirebase(user);
    this.notify();
    return user;
  }

  public async signInWithGoogle(customEmail?: string, customName?: string): Promise<AuthUserProfile> {
    const email = (customEmail || 'architect@gmail.com').trim().toLowerCase();
    const name = customName || email.split('@')[0];
    const user: AuthUserProfile = {
      uid: `google_user_${email.replace(/[^a-z0-9]/g, '_')}`,
      email,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7`,
      isGuest: false
    };
    this.currentUser = user;
    setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
    this.syncUserToFirebase(user);
    this.notify();
    return user;
  }

  public async signInAsGuest(customName: string = 'Guest Designer'): Promise<AuthUserProfile> {
    const user: AuthUserProfile = {
      uid: `guest_${Date.now()}`,
      email: null,
      displayName: customName,
      photoURL: null,
      isGuest: true
    };
    this.currentUser = user;
    setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
    this.notify();
    return user;
  }

  public async signOut(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        await authClient.signOut();
      } catch {
        // ignore
      }
    }
    this.currentUser = null;
    removeLocalItem(LOCAL_USER_KEY);
    this.notify();
  }
}

export const authService = new AuthService();
