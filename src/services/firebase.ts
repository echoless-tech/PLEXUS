import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

// Firebase web config — public client identifiers (not secrets).
// Data access is protected by Firestore Security Rules + Firebase Auth.
const firebaseConfig = {
  apiKey: 'AIzaSyApefPLi6dHE1oehkMIvYe-XBbK7TIWvPo',
  authDomain: 'nodal-e316d.firebaseapp.com',
  projectId: 'nodal-e316d',
  storageBucket: 'nodal-e316d.firebasestorage.app',
  messagingSenderId: '927726874449',
  appId: '1:927726874449:web:3325880bcf3891110bad70',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistent local cache = offline resilience (spotty connections, demos).
// Falls back to in-memory cache if IndexedDB is unavailable.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, { localCache: persistentLocalCache() });
} catch {
  firestore = getFirestore(app);
}
export const db = firestore;
