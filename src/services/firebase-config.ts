import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase Client Configuration for project carvazon3d
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCarvazon3dDefaultKey',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'carvazon3d.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'carvazon3d',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'carvazon3d.appspot.com',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:117489713847:web:carvazon3d'
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let isLiveFirebase = false;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  authInstance = getAuth(app);
  firestoreInstance = getFirestore(app);

  // If apiKey is not placeholder, mark live
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('Placeholder') && !firebaseConfig.apiKey.includes('DefaultKey')) {
    isLiveFirebase = true;
  }
} catch (err) {
  console.warn('Firebase initialization note (using hybrid cloud/local fallback):', err);
}

export const firebaseApp = app;
export const auth = authInstance;
export const db = firestoreInstance;
export const isCloudConnected = isLiveFirebase;
