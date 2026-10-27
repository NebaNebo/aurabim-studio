import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import { auth, isCloudConnected } from './firebase-config';
import {
  LOCAL_USER_KEY,
  getLocalItem,
  setLocalItem,
  removeLocalItem,
  computePasswordHash,
  getRegisteredUsers,
  saveRegisteredUser,
  seedDefaultAccountIfEmpty,
  formatAuthError
} from './auth-helpers';

export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

export { computePasswordHash } from './auth-helpers';

class AuthService {
  private currentUser: AuthUserProfile | null = null;
  private listeners: Set<(user: AuthUserProfile | null) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    // 1. Restore local session storage for instant dashboard rendering
    const cached = getLocalItem(LOCAL_USER_KEY);
    if (cached) {
      try {
        this.currentUser = JSON.parse(cached);
      } catch {
        // ignore
      }
    }

    // 2. Pre-seed default architect account for instant testing if registry empty
    seedDefaultAccountIfEmpty().catch(() => {});

    // 3. If Firebase Auth is available and live, subscribe to state changes
    if (auth && isCloudConnected) {
      onAuthStateChanged(auth, (fbUser: User | null) => {
        if (fbUser) {
          this.currentUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Designer'),
            photoURL: fbUser.photoURL,
            isGuest: false
          };
          setLocalItem(LOCAL_USER_KEY, JSON.stringify(this.currentUser));
        } else if (this.currentUser && !this.currentUser.isGuest && !this.currentUser.uid.startsWith('local_') && !this.currentUser.uid.startsWith('guest_')) {
          this.currentUser = null;
          removeLocalItem(LOCAL_USER_KEY);
        }
        this.isInitialized = true;
        this.notify();
      });
    } else {
      this.isInitialized = true;
      this.notify();
    }
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
        this.notify();
        return user;
      } catch (err: any) {
        throw new Error(formatAuthError(err));
      }
    }

    // Secure Local Registry Verification
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
    this.notify();
    return user;
  }

  public async signUpWithEmail(email: string, pass: string, name?: string): Promise<AuthUserProfile> {
    const cleanEmail = email.trim().toLowerCase();

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
        this.notify();
        return user;
      } catch (err: any) {
        throw new Error(formatAuthError(err));
      }
    }

    // Secure Local Account Registration
    const users = getRegisteredUsers();
    if (users[cleanEmail]) {
      throw new Error(`An account with email "${cleanEmail}" already exists. Please sign in instead.`);
    }

    const passwordHash = await computePasswordHash(pass);
    const newUid = `local_user_${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const displayName = name?.trim() || cleanEmail.split('@')[0];

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
    this.notify();
    return user;
  }

  public async signInWithGoogle(customEmail?: string, customName?: string): Promise<AuthUserProfile> {
    if (auth && isCloudConnected) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await signInWithPopup(auth, provider);
        const user: AuthUserProfile = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || (cred.user.email ? cred.user.email.split('@')[0] : 'Google Designer'),
          photoURL: cred.user.photoURL,
          isGuest: false
        };
        this.currentUser = user;
        setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
        this.notify();
        return user;
      } catch (err: any) {
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          throw new Error('Google Sign-in was cancelled');
        }
        console.warn('Firebase popup note:', err?.message || err);
      }
    }

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
    if (auth && isCloudConnected) {
      try {
        await fbSignOut(auth);
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
