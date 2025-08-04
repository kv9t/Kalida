/**
 * CookieConsent.js - Cookie consent modal for Kalida
 * 
 * Displays a modal asking for user consent to store cookies
 * for game preferences and progress.
 * UPDATED: Match Figma design system used in Tutorial Modal
 */
import CookieManager from './CookieManager.js';

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
     * Create the modal HTML structure - UPDATED to match Figma design
     */
    createModal() {
        try {
            console.log('Creating cookie consent modal...');
            
            // Create modal backdrop
            this.modal = document.createElement('div');
            this.modal.className = 'modal-backdrop cookie-consent-modal';
            this.modal.innerHTML = `
                <div class="modal-container cookie-consent-container">
                    <!-- Close button positioned absolutely within container -->
                    <button class="modal-close-btn cookie-close-btn" data-action="decline">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none">
                            <rect x="13.5" y="11.4932" width="2.13156" height="16.2531" transform="rotate(135 13.5 11.4932)" fill="#666666"/>
                            <rect x="2.00732" y="13" width="2.13156" height="16.2531" transform="rotate(-135 2.00732 13)" fill="#666666"/>
                        </svg>
                    </button>
                    
                    <div class="modal-content cookie-consent-content">
                        <!-- Header Section -->
                        <div class="cookie-header-section">
                            <!-- Frame 367 - Spacer -->
                            <div class="cookie-frame-367"></div>
                            
                            <!-- Frame 373 - Main content container -->
                            <div class="cookie-frame-373">
                                <!-- Title -->
                                <div class="cookie-consent-title">Cookies</div>
                                
                                <!-- Subtitle -->
                                <div class="cookie-consent-subtitle">Help us improve your experience</div>
                                
                                <!-- Cookie Icon -->
                                
                            </div>
                        </div>
                        
                        <!-- Content Section -->
                        <div class="cookie-content-section">
                            <!-- Main description -->
                            <div class="cookie-description">
                                Kalida would like to store small data files to </br> remember your preferences and game progress.
                            </div>
                            
                            <!-- What we remember section -->
                            <div class="cookie-details-section">
                                <div class="cookie-details-title">What we'll remember:</div>
                                <div class="cookie-details-list">
                                    <div class="cookie-detail-item">- Your preferred game mode</div>
                                    <div class="cookie-detail-item">- Your scoreboard progress</div>
                                    <div class="cookie-detail-item">- Tutorial completion status</div>
                                </div>
                            </div>
                            
                            <!-- Privacy note -->
                            <div class="cookie-privacy-note">
                                <strong>Privacy:</strong> This data stays on your device and is never sent to servers. You can clear it anytime in your browser settings.
                            </div>
                        </div>
                        
                        <!-- Navigation Section - Fixed at bottom -->
                        <div class="cookie-nav-section">
                            <!-- Navigation buttons -->
                            <div class="cookie-nav-buttons">
                                <button class="cookie-nav-btn cookie-decline-btn" data-action="decline">No Thanks</button>
                                <button class="cookie-nav-btn cookie-accept-btn" data-action="accept">Accept & Continue</button>
                            </div>
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
        const action = event.target.closest('[data-action]')?.getAttribute('data-action');
        
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
            this.modal.classList.add('show');
            const container = this.modal.querySelector('.modal-container');
            if (container) {
                container.classList.add('show');
            }
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
        this.modal.classList.remove('show');
        const container = this.modal.querySelector('.modal-container');
        if (container) {
            container.classList.remove('show');
        }
        
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
        // Create a temporary message using the same styling as game messages
        const message = document.createElement('div');
        message.className = 'cookie-declined-message';
        message.textContent = 'No problem! Your preferences won\'t be saved, but you can still enjoy Kalida.';
        
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
     * Add CSS styles for the modal - UPDATED to match Figma design system
     */
    addModalStyles() {
        // Check if styles already added
        if (document.getElementById('cookie-consent-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'cookie-consent-styles';
        style.textContent = `
            /* ===== COOKIE CONSENT MODAL - FIGMA DESIGN SYSTEM ===== */
            
            /* Use existing modal backdrop from modals.css */
            .cookie-consent-modal {
                z-index: 10001; /* Higher than tutorial modal */
            }
            
            /* Cookie consent container - COMPACT dimensions */
            .cookie-consent-container {
                /* Override default modal container with compact specs */
                width: 369px !important;
                height: auto !important; /* Auto height instead of fixed 480px */
                max-height: 80vh !important; /*  Reasonable max height */
                min-height: 300px !important; /*  Reasonable minimum */
                max-width: 369px !important;
                min-width: 369px !important;
                
                /* Figma container styles - match tutorial modal */
                padding: 24px 0px !important;
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
                border-radius: 8px;
                border: 1.4px solid #999;
                background: #FFF;
                box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
                
                /* Layout */
                display: flex;
                box-sizing: border-box;
                overflow: hidden;
                position: relative;
            }
            
            /* Cookie consent modal content - remove default padding */
            .cookie-consent-modal .modal-content {
                padding: 0 !important;
                overflow-y: auto;
                height: 100%;
                width: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
                max-height: calc(80vh - 48px); 
            }
            
            /* ===== HEADER SECTION ===== */
            
            .cookie-header-section {
                justify-content: flex-start;
                align-items: stretch;
                display: flex;
                flex-direction: column;
            }
            
            /* Frame 367 - Spacer (Figma specs) */
            .cookie-frame-367 {
                display: flex;
                height: 19px;
                padding: 0px 12px;
                align-items: flex-start;
                gap: 12px;
                flex-shrink: 0;
                align-self: stretch;
            }
            
            /* Frame 373 - Main content container (Figma specs) - REDUCED TOP PADDING */
            .cookie-frame-373 {
                display: flex;
                padding: 10px 12px 0px 12px;
                flex-direction: column;
                align-items: center;
                gap: 16px;
                align-self: stretch;
                flex: 0 0 auto; /* Don't flex grow for header */
                box-sizing: border-box;
            }
            
            /* Cookie consent title - EXACT Figma typography like tutorial */
            .cookie-consent-title {
                color: #000 !important;
                text-align: center !important;
                font-family: "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                font-size: 32px !important;
                font-style: normal !important;
                font-weight: 1000 !important;
                line-height: normal !important;
                text-transform: uppercase !important;
                word-wrap: break-word;
                margin: 0 !important;
                padding: 0 !important;
                display: block;
            }
            
            /* Cookie consent subtitle - EXACT Figma typography like tutorial */
            .cookie-consent-subtitle {
                color: #000 !important;
                font-family: "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                font-size: 16px !important;
                font-style: normal !important;
                font-weight: 510 !important;
                line-height: normal !important;
                font-variant: all-small-caps !important;
                word-wrap: break-word;
                margin: 0 !important;
                padding: 0 !important;
                text-align: center !important;
                display: block;
            }
            
            /* Cookie icon container - like tutorial board image */
            .cookie-icon-container {
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                background: #FAFAFA;
                border-radius: 50%;
                border: 1px solid #E6E6E6;
            }
            
            /* Cookie icon */
            .cookie-icon {
                font-size: 48px;
                line-height: 1;
            }
            
            /* ===== CONTENT SECTION ===== */
            
            .cookie-content-section {
                min-height: 300px;
                padding: 16px 12px 50px 12px; /* Reduced bottom padding for compact nav */
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 12px; /* Reduced gap for more compact layout */
                align-items: center;
            }
            
            /* Main description */
            .cookie-description {
                width: 100%;
                max-width: 300px;
                color: #000 !important;
                text-align: center !important;
                font-family: "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                font-size: 12px !important;
                font-style: normal !important;
                font-weight: 510 !important;
                line-height: 16px !important;
                margin: 0 !important;
                padding: 0 !important;
                display: block;
            }
            
            /* Details section */
            .cookie-details-section {
                width: 100%;
                max-width: 300px;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #E6E6E6;
                background: #FAFAFA;
                display: flex;
                flex-direction: column;
                gap: 8px;
                align-items: flex-start;
            }
            
            /* Details title */
            .cookie-details-title {
                color: #000 !important;
                font-family: "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                font-size: 12px !important;
                font-style: normal !important;
                font-weight: 510 !important;
                line-height: normal !important;
                font-variant: all-small-caps !important;
                margin: 0 !important;
                text-align: left !important;
            }
            
            /* Details list */
            .cookie-details-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
                width: 100%;
            }
            
            /* Individual detail item */
            .cookie-detail-item {
                color: #000 !important;
                font-family: "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                font-size: 12px !important;
                font-style: normal !important;
                font-weight: 400 !important;
                line-height: 1.3 !important;
                margin: 0 !important;
                text-align: left !important;
            }
            
            /* Privacy note */
            .cookie-privacy-note {
                width: 100%;
                max-width: 300px;
                padding: 8px;
                border-radius: 4px;
                background: #E8F4FD;
                border-left: 3px solid #3498DB;
                color: #000 !important;
                font-family: "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                font-size: 11px !important;
                font-style: normal !important;
                font-weight: 400 !important;
                line-height: 1.3 !important;
                margin: 0 !important;
                text-align: left !important;
            }
            
            /* ===== NAVIGATION SECTION - FIXED AT BOTTOM ===== */
            
            .cookie-nav-section {
                position: absolute !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                display: flex !important;
                padding: 12px 12px !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 12px !important;
                background: #FFF !important;
                border-top: 1px solid #E6E6E6 !important;
                box-sizing: border-box !important;
            }
            
            /* Navigation buttons container */
            .cookie-nav-buttons {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                width: 100%;
                max-width: 100%;
            }
            
            /* Cookie navigation buttons - EXACT Figma specifications like tutorial */
            .cookie-nav-btn {
                display: flex !important;
                height: 40px !important;
                padding: 8px !important;
                justify-content: center !important;
                align-items: center !important;
                gap: 10px !important;
                flex: 1 0 0 !important;
                border-radius: 26px !important;
                border: 1px solid #E6E6E6 !important;
                
                /* EXACT Figma button typography */
                color: #000 !important;
                font-family: "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                font-size: 14px !important;
                font-style: normal !important;
                font-weight: 700 !important;
                line-height: normal !important;
                text-transform: uppercase !important;
                
                cursor: pointer;
                outline: none !important;
                transition: background-color 0.2s ease, border-color 0.2s ease;
                box-sizing: border-box;
                white-space: nowrap;
            }
            
            /* Decline button gets white background */
            .cookie-decline-btn {
                background: #FFF !important;
            }
            
            /* Accept button gets light gray background */
            .cookie-accept-btn {
                background: #FAFAFA !important;
            }
            
            /* Button hover states */
            .cookie-nav-btn:hover {
                background: #F0F0F0 !important;
                border-color: #D0D0D0 !important;
            }
            
            /* Remove all focus outlines */
            .cookie-nav-btn:focus {
                outline: none !important;
                box-shadow: none !important;
            }
            
            /* Button active state */
            .cookie-nav-btn:active {
                background: #E8E8E8 !important;
                border-color: #C0C0C0 !important;
            }
            
            /* ===== CLOSE BUTTON - FIGMA SPECS ===== */
            
            .cookie-close-btn {
                width: 30px !important;
                height: 30px !important;
                padding: 8px !important;
                border-radius: 26px !important;
                position: absolute !important;
                right: 12px !important;
                top: 18.5px !important;
                border: none !important;
                background: none !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                transition: background-color 0.2s ease !important;
                z-index: 10 !important;
                outline: none !important;
            }
            
            .cookie-close-btn:hover {
                background: #f0f0f0 !important;
            }
            
            .cookie-close-btn:focus {
                outline: none !important;
                box-shadow: none !important;
            }
            
            .cookie-close-btn svg {
                width: 13px !important;
                height: 13px !important;
                flex-shrink: 0 !important;
            }
            
            /* ===== DECLINED MESSAGE - MATCH GAME MESSAGE STYLING ===== */
            
            .cookie-declined-message {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: #2ecc71;
                color: white;
                padding: 8px 15px;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                z-index: 9999;
                opacity: 0;
                transition: all 0.3s ease;
                max-width: 90%;
                text-align: center;
                font-family: "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
                font-size: 14px;
                font-weight: 500;
            }
            
            .cookie-declined-message.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            
            /* ===== RESPONSIVE DESIGN ===== */
            
            @media (max-width: 400px) {
                .cookie-consent-container {
                width: 95% !important;
                height: auto !important; 
                min-width: auto !important;
                min-height: 250px !important; /*  Smaller minimum for mobile */
                max-width: 95% !important;
                max-height: 75vh !important; /*  Better mobile max height */
            }
                
                .cookie-frame-373 {
                    padding: 20px 12px 0px 12px;
                }
                
                .cookie-consent-title {
                    font-size: 28px !important;
                }
                
                .cookie-consent-subtitle {
                    font-size: 14px !important;
                }
                
                .cookie-icon-container {
                    width: 60px;
                    height: 60px;
                }
                
                .cookie-icon {
                    font-size: 36px;
                }

                /* Ensure nav section stays at bottom */
                .cookie-nav-section {
                    position: relative !important; /* Allow it to flow naturally on mobile */
                    margin-top: auto !important; /* Push to bottom */
                }

            }
            
            /* Ensure exact dimensions on larger screens */
            @media (min-width: 401px) {
                .cookie-consent-container {
                    width: 369px !important;
                    height: auto !important; /*  Auto height instead of fixed */
                    max-height: 80vh !important; /* Reasonable max height */
                    min-height: 300px !important; /* Reasonable minimum */
                    max-width: 369px !important;
                    min-width: 369px !important;
                }
            }
            
            /* ===== ACCESSIBILITY ===== */
            
            @media (prefers-reduced-motion: reduce) {
                .cookie-consent-modal,
                .cookie-consent-container,
                .cookie-nav-btn,
                .cookie-declined-message {
                    transition: none !important;
                }
            }
            
            @media (prefers-contrast: high) {
                .cookie-consent-container {
                    border: 2px solid #000 !important;
                }
                
                .cookie-nav-btn {
                    border-color: #000 !important;
                    border-width: 2px !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

export default CookieConsent;