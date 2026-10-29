import { createAuthClient } from 'better-auth/client';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, isCloudConnected } from './firebase-config';
import type { AuthUserProfile } from './auth-types';
import {
  LOCAL_USER_KEY,
  getLocalItem,
  setLocalItem,
  removeLocalItem,
  computePasswordHash,
  getRegisteredUsers,
  saveRegisteredUser,
  seedDefaultAccountIfEmpty,
  syncUsersWithCloudRegistry,
  syncUserToFirebase,
  isStaticHostingEnvironment,
  buildGuestUser,
  buildGoogleUser,
  formatAuthError
} from './auth-helpers';

export type { AuthUserProfile } from './auth-types';
export { computePasswordHash } from './auth-helpers';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? (import.meta.env.VITE_AUTH_SERVER_URL || window.location.origin) : 'http://localhost:5173'
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

    // 2. Pre-seed default test account & sync cloud registry for cross-device access
    seedDefaultAccountIfEmpty().catch(() => {});
    syncUsersWithCloudRegistry().catch(() => {});

    // 3. Verify server session with Better-Auth if running in browser with a live server
    if (typeof window !== 'undefined' && !isStaticHostingEnvironment()) {
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
          syncUserToFirebase(this.currentUser);
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

  public async signInWithEmail(email: string, pass: string): Promise<AuthUserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Better-Auth Server Authentication (when server endpoint is live, e.g. local dev)
    if (typeof window !== 'undefined' && !isStaticHostingEnvironment()) {
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
          syncUserToFirebase(user);
          this.notify();
          return user;
        }

        const status = (res.error as any)?.status;
        const isNotFound = status === 404 || status === 405 || status === 502 || status === 503;

        if (res.error && !isNotFound) {
          throw new Error(res.error.message || 'Incorrect email or password.');
        }
      } catch (err: any) {
        if (
          err.message &&
          !err.message.includes('404') &&
          !err.message.includes('Not Found') &&
          !err.message.includes('Failed to fetch') &&
          !err.message.includes('NetworkError')
        ) {
          throw err;
        }
      }
    }

    // 2. Firebase Cloud Authentication (if cloud is connected)
    if (auth && isCloudConnected) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        const user: AuthUserProfile = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || cleanEmail.split('@')[0],
          photoURL: cred.user.photoURL,
          isGuest: false
        };
        this.currentUser = user;
        setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
        syncUserToFirebase(user);
        this.notify();
        return user;
      } catch (err: any) {
        throw new Error(formatAuthError(err));
      }
    }

    // 3. Fallback: Cloud & Local Registry Mirror (cross-device persistent accounts)
    await seedDefaultAccountIfEmpty();
    let users = getRegisteredUsers();
    let existing = users[cleanEmail];

    if (!existing) {
      try {
        const cloudUsers = await syncUsersWithCloudRegistry();
        existing = cloudUsers[cleanEmail];
      } catch {
        // offline fallback
      }
    }

    if (!existing) {
      if (isStaticHostingEnvironment()) {
        throw new Error(`Account "${cleanEmail}" was not found on this deployment. Accounts created on localhost stay on your local PC. Click "Create Account" to sign up here.`);
      }
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
    syncUserToFirebase(user);
    this.notify();
    return user;
  }

  public async signUpWithEmail(email: string, pass: string, name?: string): Promise<AuthUserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const displayName = name?.trim() || cleanEmail.split('@')[0];

    // 1. Better-Auth Server Registration (when server endpoint is live, e.g. local dev)
    if (typeof window !== 'undefined' && !isStaticHostingEnvironment()) {
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
          syncUserToFirebase(user);
          this.notify();
          return user;
        }

        const status = (res.error as any)?.status;
        const isNotFound = status === 404 || status === 405 || status === 502 || status === 503;

        if (res.error && !isNotFound) {
          throw new Error(res.error.message || 'Unable to create account.');
        }
      } catch (err: any) {
        if (
          err.message &&
          !err.message.includes('404') &&
          !err.message.includes('Not Found') &&
          !err.message.includes('Failed to fetch') &&
          !err.message.includes('NetworkError')
        ) {
          throw err;
        }
      }
    }

    // 2. Firebase Cloud Registration (if cloud is connected)
    if (auth && isCloudConnected) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        if (name && cred.user) {
          await updateProfile(cred.user, { displayName: name });
        }
        const user: AuthUserProfile = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: name || cleanEmail.split('@')[0],
          photoURL: cred.user.photoURL,
          isGuest: false
        };
        this.currentUser = user;
        setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
        syncUserToFirebase(user);
        this.notify();
        return user;
      } catch (err: any) {
        throw new Error(formatAuthError(err));
      }
    }

    // 3. Cloud & Local Registry Mirror (cross-device persistence)
    try {
      await syncUsersWithCloudRegistry();
    } catch {
      // offline fallback
    }
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
    syncUserToFirebase(user);
    this.notify();
    return user;
  }

  public async signInWithGoogle(customEmail?: string, customName?: string): Promise<AuthUserProfile> {
    const user = buildGoogleUser(customEmail, customName);
    this.currentUser = user;
    setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
    syncUserToFirebase(user);
    this.notify();
    return user;
  }

  public async signInAsGuest(customName: string = 'Guest Designer'): Promise<AuthUserProfile> {
    const user = buildGuestUser(customName);
    this.currentUser = user;
    setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
    this.notify();
    return user;
  }

  public async signOut(): Promise<void> {
    if (typeof window !== 'undefined' && !isStaticHostingEnvironment()) {
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
