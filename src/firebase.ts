import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isConfigValid = Object.values(firebaseConfig).every((value) => Boolean(value));

export const firebaseEnabled = isConfigValid;

const app =
  isConfigValid && getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

export const db = isConfigValid ? getFirestore(app) : null;
