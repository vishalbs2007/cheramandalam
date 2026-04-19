import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseEnabled = String(import.meta.env.VITE_FIREBASE_AUTH_ENABLED || 'false').toLowerCase() === 'true';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const hasRequiredFirebaseConfig = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

let firebaseAuth = null;

if (firebaseEnabled) {
  if (!hasRequiredFirebaseConfig()) {
    // eslint-disable-next-line no-console
    console.warn('Firebase auth is enabled but required Firebase config is incomplete.');
  } else {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
  }
}

export { firebaseAuth, firebaseEnabled };