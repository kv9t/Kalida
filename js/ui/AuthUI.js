/**
 * AuthUI - Manages authentication UI interactions
 *
 * Handles:
 * - Welcome screen display
 * - Form switching (login, signup, reset password)
 * - Form validation and submission
 * - Error/success message display
 * - Invite modal handling
 */

export class AuthUI {
    constructor(authManager) {
        this.authManager = authManager;

        // DOM elements
        this.welcomeModal = document.getElementById('welcome-modal');
        this.inviteModal = document.getElementById('invite-modal');

        // Forms
        this.loginForm = document.getElementById('login-form');
        this.signupForm = document.getElementById('signup-form');
        this.resetForm = document.getElementById('reset-password-form');

        // Initialize event listeners
        this.setupEventListeners();

        console.log('AuthUI initialized');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Play as Guest button
        const guestBtn = document.getElementById('play-as-guest-btn');
        if (guestBtn) {
            guestBtn.addEventListener('click', () => this.handleGuestLogin());
        }

        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }

        // Login form - Enter key
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        if (loginEmail && loginPassword) {
            [loginEmail, loginPassword].forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handleLogin();
                });
            });
        }

        // Show signup link
        const showSignupLink = document.getElementById('show-signup-link');
        if (showSignupLink) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignupForm();
            });
        }

        // Signup button
        const signupBtn = document.getElementById('signup-btn');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.handleSignup());
        }

        // Signup form - Enter key
        const signupName = document.getElementById('signup-name');
        const signupEmail = document.getElementById('signup-email');
        const signupPassword = document.getElementById('signup-password');
        const signupPasswordConfirm = document.getElementById('signup-password-confirm');
        if (signupName && signupEmail && signupPassword && signupPasswordConfirm) {
            [signupName, signupEmail, signupPassword, signupPasswordConfirm].forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handleSignup();
                });
            });
        }

        // Back to login from signup
        const backToLoginLink = document.getElementById('back-to-login-link');
        if (backToLoginLink) {
            backToLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Forgot password link
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showResetPasswordForm();
            });
        }

        // Reset password button
        const resetBtn = document.getElementById('reset-password-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleResetPassword());
        }

        // Reset password form - Enter key
        const resetEmail = document.getElementById('reset-email');
        if (resetEmail) {
            resetEmail.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleResetPassword();
            });
        }

        // Back to login from reset password
        const backToLoginFromResetLink = document.getElementById('back-to-login-from-reset-link');
        if (backToLoginFromResetLink) {
            backToLoginFromResetLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Invite modal - Login button
        const inviteLoginBtn = document.getElementById('invite-login-btn');
        if (inviteLoginBtn) {
            inviteLoginBtn.addEventListener('click', () => this.handleInviteLogin());
        }

        // Invite modal - Show signup link
        const inviteShowSignupLink = document.getElementById('invite-show-signup-link');
        if (inviteShowSignupLink) {
            inviteShowSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideInviteModal();
                this.showWelcomeModal();
                this.showSignupForm();
            });
        }

        // Accept invite button
        const acceptInviteBtn = document.getElementById('accept-invite-btn');
        if (acceptInviteBtn) {
            acceptInviteBtn.addEventListener('click', () => this.handleAcceptInvite());
        }
    }

    /**
     * Show welcome modal
     */
    showWelcomeModal() {
        if (this.welcomeModal) {
            this.welcomeModal.style.display = 'flex';
            this.showLoginForm();
        }
    }

    /**
     * Hide welcome modal
     */
    hideWelcomeModal() {
        if (this.welcomeModal) {
            this.welcomeModal.style.display = 'none';
        }
    }

    /**
     * Show login form (hide others)
     */
    showLoginForm() {
        if (this.loginForm) this.loginForm.style.display = 'flex';
        if (this.signupForm) this.signupForm.style.display = 'none';
        if (this.resetForm) this.resetForm.style.display = 'none';

        // Show/hide related elements
        const signupPrompt = document.querySelector('.signup-prompt');
        const guestSection = document.querySelector('.welcome-guest-section');
        const divider = document.querySelector('.welcome-divider');

        if (signupPrompt) signupPrompt.style.display = 'block';
        if (guestSection) guestSection.style.display = 'block';
        if (divider) divider.style.display = 'block';

        // Clear messages
        this.clearMessage('login-message');
    }

    /**
     * Show signup form (hide others)
     */
    showSignupForm() {
        if (this.loginForm) this.loginForm.style.display = 'none';
        if (this.signupForm) this.signupForm.style.display = 'flex';
        if (this.resetForm) this.resetForm.style.display = 'none';

        // Hide guest and divider for signup
        const signupPrompt = document.querySelector('.signup-prompt');
        const guestSection = document.querySelector('.welcome-guest-section');
        const divider = document.querySelector('.welcome-divider');

        if (signupPrompt) signupPrompt.style.display = 'none';
        if (guestSection) guestSection.style.display = 'none';
        if (divider) divider.style.display = 'none';

        // Clear messages
        this.clearMessage('signup-message');
    }

    /**
     * Show reset password form (hide others)
     */
    showResetPasswordForm() {
        if (this.loginForm) this.loginForm.style.display = 'none';
        if (this.signupForm) this.signupForm.style.display = 'none';
        if (this.resetForm) this.resetForm.style.display = 'flex';

        // Hide guest and divider
        const signupPrompt = document.querySelector('.signup-prompt');
        const guestSection = document.querySelector('.welcome-guest-section');
        const divider = document.querySelector('.welcome-divider');

        if (signupPrompt) signupPrompt.style.display = 'none';
        if (guestSection) guestSection.style.display = 'none';
        if (divider) divider.style.display = 'none';

        // Clear messages
        this.clearMessage('reset-message');
    }

    /**
     * Handle guest login
     */
    async handleGuestLogin() {
        console.log('Guest login initiated');
        const result = await this.authManager.signInAsGuest();

        if (result.success) {
            console.log('Guest login successful');
            this.hideWelcomeModal();
        } else {
            this.showMessage('login-message', result.error, 'error');
        }
    }

    /**
     * Handle login
     */
    async handleLogin() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        // Validate
        if (!email || !password) {
            this.showMessage('login-message', 'Please enter email and password.', 'error');
            return;
        }

        // Disable button
        const loginBtn = document.getElementById('login-btn');
        loginBtn.disabled = true;
        loginBtn.textContent = 'LOGGING IN...';

        const result = await this.authManager.signIn(email, password);

        // Re-enable button
        loginBtn.disabled = false;
        loginBtn.textContent = 'LOGIN';

        if (result.success) {
            console.log('Login successful');
            this.hideWelcomeModal();
        } else {
            this.showMessage('login-message', result.error, 'error');
        }
    }

    /**
     * Handle signup
     */
    async handleSignup() {
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const passwordConfirm = document.getElementById('signup-password-confirm').value;

        // Validate
        if (!name) {
            this.showMessage('signup-message', 'Please enter your display name.', 'error');
            return;
        }
        if (!email) {
            this.showMessage('signup-message', 'Please enter your email.', 'error');
            return;
        }
        if (!password) {
            this.showMessage('signup-message', 'Please enter a password.', 'error');
            return;
        }
        if (password.length < 6) {
            this.showMessage('signup-message', 'Password must be at least 6 characters.', 'error');
            return;
        }
        if (password !== passwordConfirm) {
            this.showMessage('signup-message', 'Passwords do not match.', 'error');
            return;
        }

        // Disable button
        const signupBtn = document.getElementById('signup-btn');
        signupBtn.disabled = true;
        signupBtn.textContent = 'CREATING ACCOUNT...';

        const result = await this.authManager.signUp(email, password, name);

        // Re-enable button
        signupBtn.disabled = false;
        signupBtn.textContent = 'CREATE ACCOUNT';

        if (result.success) {
            console.log('Signup successful');
            this.hideWelcomeModal();
            // TODO: Show tutorial for new users
        } else {
            this.showMessage('signup-message', result.error, 'error');
        }
    }

    /**
     * Handle password reset
     */
    async handleResetPassword() {
        const email = document.getElementById('reset-email').value.trim();

        // Validate
        if (!email) {
            this.showMessage('reset-message', 'Please enter your email.', 'error');
            return;
        }

        // Disable button
        const resetBtn = document.getElementById('reset-password-btn');
        resetBtn.disabled = true;
        resetBtn.textContent = 'SENDING...';

        const result = await this.authManager.resetPassword(email);

        // Re-enable button
        resetBtn.disabled = false;
        resetBtn.textContent = 'SEND RESET LINK';

        if (result.success) {
            this.showMessage('reset-message', `Password reset email sent to ${email}. Check your inbox!`, 'success');
            // Clear input
            document.getElementById('reset-email').value = '';
        } else {
            this.showMessage('reset-message', result.error, 'error');
        }
    }

    /**
     * Show invite modal
     * @param {string} inviterName - Name of person who sent invite
     * @param {boolean} isLoggedIn - Whether user is logged in
     */
    showInviteModal(inviterName, isLoggedIn) {
        if (!this.inviteModal) return;

        // Set inviter name
        const inviterNameEl = document.getElementById('inviter-name');
        if (inviterNameEl) {
            inviterNameEl.textContent = inviterName.toUpperCase();
        }

        // Show appropriate section
        const acceptSection = document.getElementById('invite-accept-section');
        const loginSection = document.getElementById('invite-login-section');

        if (isLoggedIn) {
            if (acceptSection) acceptSection.style.display = 'block';
            if (loginSection) loginSection.style.display = 'none';
        } else {
            if (acceptSection) acceptSection.style.display = 'none';
            if (loginSection) loginSection.style.display = 'block';
        }

        this.inviteModal.style.display = 'flex';
    }

    /**
     * Hide invite modal
     */
    hideInviteModal() {
        if (this.inviteModal) {
            this.inviteModal.style.display = 'none';
        }
    }

    /**
     * Handle login from invite modal
     */
    async handleInviteLogin() {
        const email = document.getElementById('invite-login-email').value.trim();
        const password = document.getElementById('invite-login-password').value;

        // Validate
        if (!email || !password) {
            this.showMessage('invite-login-message', 'Please enter email and password.', 'error');
            return;
        }

        // Disable button
        const loginBtn = document.getElementById('invite-login-btn');
        loginBtn.disabled = true;
        loginBtn.textContent = 'LOGGING IN...';

        const result = await this.authManager.signIn(email, password);

        // Re-enable button
        loginBtn.disabled = false;
        loginBtn.textContent = 'LOGIN';

        if (result.success) {
            console.log('Invite login successful');
            // Switch to accept section
            const acceptSection = document.getElementById('invite-accept-section');
            const loginSection = document.getElementById('invite-login-section');
            if (acceptSection) acceptSection.style.display = 'block';
            if (loginSection) loginSection.style.display = 'none';
        } else {
            this.showMessage('invite-login-message', result.error, 'error');
        }
    }

    /**
     * Handle accept invite
     */
    handleAcceptInvite() {
        console.log('Accept invite clicked');
        // TODO: This will be handled by RoomManager in Phase 4
        this.hideInviteModal();
    }

    /**
     * Show message in a message div
     * @param {string} messageId - ID of message div
     * @param {string} text - Message text
     * @param {string} type - 'success' or 'error'
     */
    showMessage(messageId, text, type) {
        const messageEl = document.getElementById(messageId);
        if (messageEl) {
            messageEl.textContent = text;
            messageEl.className = `auth-message ${type}`;
        }
    }

    /**
     * Clear message
     * @param {string} messageId - ID of message div
     */
    clearMessage(messageId) {
        const messageEl = document.getElementById(messageId);
        if (messageEl) {
            messageEl.textContent = '';
            messageEl.className = 'auth-message';
        }
    }

    /**
     * Check if user is authenticated, show welcome modal if not
     * @returns {boolean} True if authenticated
     */
    checkAuthentication() {
        const isLoggedIn = this.authManager.isLoggedIn();

        if (!isLoggedIn) {
            this.showWelcomeModal();
        }

        return isLoggedIn;
    }
}

export default AuthUI;
