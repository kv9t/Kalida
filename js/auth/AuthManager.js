/**
 * AuthManager - Handles Firebase Authentication
 *
 * Features:
 * - Email/Password authentication
 * - Anonymous authentication (for guests)
 * - Password reset
 * - User profile management
 * - Auth state persistence
 */

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    signInAnonymously,
    updateProfile,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class AuthManager {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
        this.currentUser = null;
        this.authStateCallbacks = [];

        // Set up auth state listener
        this.setupAuthStateListener();

        console.log('AuthManager initialized');
    }

    /**
     * Set up Firebase auth state listener
     */
    setupAuthStateListener() {
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            console.log('Auth state changed:', user ? `Logged in as ${user.email || 'Anonymous'}` : 'Logged out');

            // Notify all callbacks
            this.authStateCallbacks.forEach(callback => {
                try {
                    callback(user);
                } catch (error) {
                    console.error('Error in auth state callback:', error);
                }
            });
        });
    }

    /**
     * Register a callback for auth state changes
     * @param {Function} callback - Function to call when auth state changes
     * @returns {Function} Unsubscribe function
     */
    onAuthStateChange(callback) {
        this.authStateCallbacks.push(callback);

        // Call immediately with current state
        if (this.currentUser !== null) {
            callback(this.currentUser);
        }

        // Return unsubscribe function
        return () => {
            const index = this.authStateCallbacks.indexOf(callback);
            if (index > -1) {
                this.authStateCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Sign up with email and password
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @param {string} displayName - User's display name
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    async signUp(email, password, displayName) {
        try {
            // Create user
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Update display name
            if (displayName) {
                await updateProfile(user, { displayName });
            }

            // Create user document in Firestore
            await this.createUserDocument(user.uid, {
                email: user.email,
                displayName: displayName || 'Anonymous',
                isAnonymous: false,
                createdAt: serverTimestamp(),
                stats: {
                    totalMatchesPlayed: 0,
                    totalMatchesWon: 0,
                    totalRoundsWon: 0
                },
                activeRooms: []
            });

            console.log('User signed up successfully:', user.email);
            return { success: true, user };

        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    /**
     * Sign in with email and password
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            console.log('User signed in successfully:', user.email);
            return { success: true, user };

        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    /**
     * Sign in anonymously (guest mode)
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    async signInAsGuest() {
        try {
            const userCredential = await signInAnonymously(this.auth);
            const user = userCredential.user;

            // Create minimal user document
            await this.createUserDocument(user.uid, {
                email: null,
                displayName: 'Guest',
                isAnonymous: true,
                createdAt: serverTimestamp(),
                stats: {
                    totalMatchesPlayed: 0,
                    totalMatchesWon: 0,
                    totalRoundsWon: 0
                },
                activeRooms: []
            });

            console.log('Guest signed in successfully');
            return { success: true, user };

        } catch (error) {
            console.error('Guest sign in error:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    /**
     * Sign out current user
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async signOut() {
        try {
            await signOut(this.auth);
            console.log('User signed out successfully');
            return { success: true };

        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    /**
     * Send password reset email
     * @param {string} email - User's email
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(this.auth, email);
            console.log('Password reset email sent to:', email);
            return { success: true };

        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    /**
     * Create or update user document in Firestore
     * @param {string} userId - User ID
     * @param {object} userData - User data
     * @returns {Promise<void>}
     */
    async createUserDocument(userId, userData) {
        try {
            const userRef = doc(this.db, 'users', userId);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // Create new user document
                await setDoc(userRef, userData);
                console.log('User document created:', userId);
            } else {
                // User document already exists (e.g., from previous anonymous session)
                console.log('User document already exists:', userId);
            }
        } catch (error) {
            console.error('Error creating user document:', error);
            throw error;
        }
    }

    /**
     * Get current user
     * @returns {object|null} Current user or null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is logged in
     * @returns {boolean} True if user is logged in
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * Check if current user is anonymous (guest)
     * @returns {boolean} True if user is anonymous
     */
    isGuest() {
        return this.currentUser && this.currentUser.isAnonymous;
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Firebase error
     * @returns {string} User-friendly error message
     */
    getErrorMessage(error) {
        const errorMessages = {
            'auth/invalid-email': 'Invalid email address.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/too-many-requests': 'Too many attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/invalid-credential': 'Invalid email or password.'
        };

        return errorMessages[error.code] || error.message || 'An error occurred. Please try again.';
    }
}

export default AuthManager;
