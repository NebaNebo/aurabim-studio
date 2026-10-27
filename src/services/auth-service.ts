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

export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

const LOCAL_USER_KEY = 'aurabim_auth_user';

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

function removeLocalItem(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

class AuthService {
  private currentUser: AuthUserProfile | null = null;
  private listeners: Set<(user: AuthUserProfile | null) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    // 1. Check local session storage first for instant dashboard rendering
    const cached = getLocalItem(LOCAL_USER_KEY);
    if (cached) {
      try {
        this.currentUser = JSON.parse(cached);
      } catch {
        // ignore
      }
    }

    // 2. If Firebase Auth is available, subscribe to state changes
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
        } else if (!this.currentUser?.isGuest) {
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
    if (auth && isCloudConnected) {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const user: AuthUserProfile = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || email.split('@')[0],
        photoURL: cred.user.photoURL,
        isGuest: false
      };
      this.currentUser = user;
      setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
      this.notify();
      return user;
    }

    // Hybrid Local Fallback
    const user: AuthUserProfile = {
      uid: `local_user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email,
      displayName: email.split('@')[0],
      photoURL: null,
      isGuest: false
    };
    this.currentUser = user;
    setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
    this.notify();
    return user;
  }

  public async signUpWithEmail(email: string, pass: string, name?: string): Promise<AuthUserProfile> {
    if (auth && isCloudConnected) {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && cred.user) {
        await updateProfile(cred.user, { displayName: name });
      }
      const user: AuthUserProfile = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: name || email.split('@')[0],
        photoURL: cred.user.photoURL,
        isGuest: false
      };
      this.currentUser = user;
      setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
      this.notify();
      return user;
    }

    // Hybrid Local Fallback
    const user: AuthUserProfile = {
      uid: `local_user_${Date.now()}`,
      email,
      displayName: name || email.split('@')[0],
      photoURL: null,
      isGuest: false
    };
    this.currentUser = user;
    setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
    this.notify();
    return user;
  }

  public async signInWithGoogle(): Promise<AuthUserProfile> {
    if (auth && isCloudConnected) {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user: AuthUserProfile = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || 'Google Designer',
        photoURL: cred.user.photoURL,
        isGuest: false
      };
      this.currentUser = user;
      setLocalItem(LOCAL_USER_KEY, JSON.stringify(user));
      this.notify();
      return user;
    }

    // Simulated Google Sign In for demo/offline
    return this.signInAsGuest('Google Designer (Demo)');
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
