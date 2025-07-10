/**
 * CookieConsent.js - Cookie consent modal for Kalida
 * 
 * Displays a modal asking for user consent to store cookies
 * for game preferences and progress.
 */
class CookieConsent {
    constructor(cookieManager) {
        this.cookieManager = cookieManager;
        this.modal = null;
        this.onConsentCallback = null;
    }
    
    /**
     * Show the cookie consent modal
     * @param {Function} onConsent - Callback function called with consent decision (true/false)
     */
    show(onConsent) {
        try {
            console.log('CookieConsent.show() called');
            
            // Store the callback
            this.onConsentCallback = onConsent;
            
            // Don't show if consent already given/declined
            const existingConsent = this.cookieManager.hasConsent();
            if (existingConsent !== null) {
                console.log('Existing consent found:', existingConsent);
                // Already have a decision, call callback with current consent status
                if (this.onConsentCallback) {
                    this.onConsentCallback(existingConsent);
                }
                return;
            }
            
            // Check if cookies are even enabled
            if (!this.cookieManager.areCookiesEnabled()) {
                console.warn('Cookies are disabled in this browser');
                if (this.onConsentCallback) {
                    this.onConsentCallback(false);
                }
                return;
            }
            
            console.log('Creating and showing cookie consent modal...');
            
            // Create and show modal
            this.createModal();
            this.showModal();
            
        } catch (error) {
            console.error('Error in CookieConsent.show():', error);
            
            // Fallback: assume no consent and continue
            if (this.onConsentCallback) {
                this.onConsentCallback(false);
            }
        }
    }
    
    /**
     * Create the modal HTML structure
     */
    createModal() {
        try {
            console.log('Creating cookie consent modal...');
            
            // Create modal backdrop
            this.modal = document.createElement('div');
            this.modal.className = 'cookie-consent-modal';
            this.modal.innerHTML = `
                <div class="cookie-consent-backdrop">
                    <div class="cookie-consent-content">
                        <div class="cookie-consent-header">
                            <h3>🍪 Cookie Preferences</h3>
                        </div>
                        
                        <div class="cookie-consent-body">
                            <p>
                                Kalida would like to store small data files (cookies) to remember your preferences and game progress.
                            </p>
                            
                            <div class="cookie-details">
                                <h4>What we'll remember:</h4>
                                <ul>
                                    <li>🎮 Your preferred game mode (Level 1, Level 2, etc.)</li>
                                    <li>🏆 Your scoreboard (rounds won and matches won)</li>
                                    <li>📚 Whether you've completed the tutorial</li>
                                    <li>⚙️ Your rule preferences for Human vs Human games</li>
                                </ul>
                            </div>
                            
                            <div class="cookie-privacy">
                                <p><strong>Privacy Note:</strong> This data stays on your device and is never sent to any servers. You can clear it anytime in your browser settings.</p>
                            </div>
                        </div>
                        
                        <div class="cookie-consent-footer">
                            <button class="cookie-btn cookie-btn-decline" data-action="decline">
                                No Thanks
                            </button>
                            <button class="cookie-btn cookie-btn-accept" data-action="accept">
                                Accept & Continue
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners
            this.modal.addEventListener('click', (e) => this.handleModalClick(e));
            
            // Add CSS if not already added
            this.addModalStyles();
            
            // Append to body
            document.body.appendChild(this.modal);
            
            console.log('Cookie consent modal created successfully');
            
        } catch (error) {
            console.error('Error creating cookie consent modal:', error);
            throw error; // Re-throw to be caught by show()
        }
    }
    
    /**
     * Handle clicks within the modal
     */
    handleModalClick(event) {
        const action = event.target.getAttribute('data-action');
        
        if (action === 'accept') {
            this.handleConsent(true);
        } else if (action === 'decline') {
            this.handleConsent(false);
        }
        
        // Prevent clicks on backdrop from closing modal
        // (user must make an explicit choice)
    }
    
    /**
     * Handle user's consent decision
     */
    handleConsent(consented) {
        console.log(`User ${consented ? 'accepted' : 'declined'} cookies`);
        
        // Store the consent decision
        this.cookieManager.setConsent(consented);
        
        // Hide the modal
        this.hideModal();
        
        // Call the callback
        if (this.onConsentCallback) {
            this.onConsentCallback(consented);
        }
        
        // If user declined, show a brief message about limited functionality
        if (!consented) {
            this.showDeclinedMessage();
        }
    }
    
    /**
     * Show the modal with animation
     */
    showModal() {
        if (!this.modal) return;
        
        // Show modal
        this.modal.style.display = 'block';
        
        // Trigger animation after a small delay to ensure CSS is applied
        setTimeout(() => {
            this.modal.classList.add('cookie-consent-show');
        }, 10);
        
        // Prevent page scrolling while modal is open
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Hide the modal with animation
     */
    hideModal() {
        if (!this.modal) return;
        
        // Start hide animation
        this.modal.classList.remove('cookie-consent-show');
        this.modal.classList.add('cookie-consent-hide');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            this.modal = null;
            
            // Restore page scrolling
            document.body.style.overflow = '';
        }, 300);
    }
    
    /**
     * Show a brief message when user declines cookies
     */
    showDeclinedMessage() {
        // Create a temporary message
        const message = document.createElement('div');
        message.className = 'cookie-declined-message';
        message.textContent = 'No problem! Your preferences won\'t be saved, but you can still enjoy playing Kalida.';
        
        // Add to page
        document.body.appendChild(message);
        
        // Show with animation
        setTimeout(() => message.classList.add('show'), 10);
        
        // Remove after a few seconds
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 300);
        }, 4000);
    }
    
    /**
     * Add CSS styles for the modal
     */
    addModalStyles() {
        // Check if styles already added
        if (document.getElementById('cookie-consent-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'cookie-consent-styles';
        style.textContent = `
            .cookie-consent-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .cookie-consent-modal.cookie-consent-show {
                opacity: 1;
            }
            
            .cookie-consent-modal.cookie-consent-hide {
                opacity: 0;
            }
            
            .cookie-consent-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                box-sizing: border-box;
            }
            
            .cookie-consent-content {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .cookie-consent-show .cookie-consent-content {
                transform: scale(1);
            }
            
            .cookie-consent-header {
                padding: 20px 20px 10px 20px;
                border-bottom: 1px solid #eee;
            }
            
            .cookie-consent-header h3 {
                margin: 0;
                font-size: 1.3em;
                color: #333;
                text-align: left;
            }
            
            .cookie-consent-body {
                padding: 20px;
                color: #555;
                line-height: 1.5;
                text-align: left;
            }
            
            .cookie-consent-body p {
                margin: 0 0 15px 0;
            }
            
            .cookie-details {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }
            
            .cookie-details h4 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 1em;
            }
            
            .cookie-details ul {
                margin: 0;
                padding-left: 20px;
            }
            
            .cookie-details li {
                margin: 5px 0;
            }
            
            .cookie-privacy {
                background: #e8f4fd;
                padding: 10px;
                border-radius: 6px;
                border-left: 4px solid #3498db;
                margin-top: 15px;
            }
            
            .cookie-privacy p {
                margin: 0;
                font-size: 0.9em;
            }
            
            .cookie-consent-footer {
                padding: 15px 20px 20px 20px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .cookie-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                font-weight: 500;
            }
            
            .cookie-btn-decline {
                background-color: #95a5a6;
                color: white;
            }
            
            .cookie-btn-decline:hover {
                background-color: #7f8c8d;
            }
            
            .cookie-btn-accept {
                background-color: #3498db;
                color: white;
            }
            
            .cookie-btn-accept:hover {
                background-color: #2980b9;
            }
            
            .cookie-declined-message {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: #2ecc71;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                z-index: 9999;
                opacity: 0;
                transition: all 0.3s ease;
                max-width: 90%;
                text-align: center;
            }
            
            .cookie-declined-message.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            
            /* Mobile responsiveness */
            @media (max-width: 600px) {
                .cookie-consent-backdrop {
                    padding: 10px;
                }
                
                .cookie-consent-content {
                    max-height: 95vh;
                }
                
                .cookie-consent-header {
                    padding: 15px 15px 10px 15px;
                }
                
                .cookie-consent-body {
                    padding: 15px;
                }
                
                .cookie-consent-footer {
                    flex-direction: column;
                    padding: 10px 15px 15px 15px;
                }
                
                .cookie-btn {
                    width: 100%;
                    margin: 2px 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}