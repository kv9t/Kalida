/**
 * Firebase Configuration and Initialization
 *
 * This module initializes Firebase services for Kalida multiplayer functionality.
 * Services used:
 * - Authentication (Email/Password + Anonymous)
 * - Firestore Database (game state, rooms, matches)
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBcevhrsC2-fA0r9V5-VWPbfURkBzMQIsE",
  authDomain: "kalida-fe435.firebaseapp.com",
  projectId: "kalida-fe435",
  storageBucket: "kalida-fe435.firebasestorage.app",
  messagingSenderId: "123285288925",
  appId: "1:123285288925:web:f38e33b7179c2121a66834"
};

// Initialize Firebase
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('🔥 Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// Export Firebase services
export { app, auth, db };
export default { app, auth, db };
