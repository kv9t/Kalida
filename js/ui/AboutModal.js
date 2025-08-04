/**
 * AboutModal.js - About modal component for Kalida
 * 
 * Handles the display and interaction of the About modal window.
 * Triggered when clicking the ABOUT button in Frame 378.
 */

class AboutModal {
    /**
     * Create a new About modal
     * @param {Game} game - The game instance
     * @param {GameUI} gameUI - The game UI instance
     */
    constructor(game, gameUI) {
        this.game = game;
        this.gameUI = gameUI;
        this.modal = null;
        this.isOpen = false;
        
        // Bind methods to preserve 'this' context
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleCloseClick = this.handleCloseClick.bind(this);
    }
    
    /**
     * Initialize the modal by adding event listeners
     */
    initialize() {
        // Cache modal element
        this.modal = document.getElementById('about-modal');
        
        if (!this.modal) {
            console.warn('AboutModal: about-modal element not found');
            return;
        }
        
        // Add click listener to the ABOUT button
        const aboutButton = document.getElementById('about-btn');
        if (aboutButton) {
            aboutButton.addEventListener('click', this.show);
            console.log('AboutModal: ABOUT button listener added');
        } else {
            console.warn('AboutModal: about-btn element not found');
        }
        
        // Add click listener to close button
        const closeButton = this.modal.querySelector('[data-modal="about"]');
        if (closeButton) {
            closeButton.addEventListener('click', this.handleCloseClick);
        }
        
        console.log('AboutModal initialized');
    }
    
    /**
     * Show the modal
     */
    show() {
        if (this.isOpen || !this.modal) return;
        
        console.log('Opening About modal');
        
        // Show modal
        this.modal.style.display = 'block';
        this.isOpen = true;
        
        // Add event listeners for closing
        this.modal.addEventListener('click', this.handleOutsideClick);
        document.addEventListener('keydown', this.handleEscapeKey);
        
        // Trigger show animation after DOM update
        requestAnimationFrame(() => {
            this.modal.classList.add('show');
            const container = this.modal.querySelector('.modal-container');
            if (container) {
                container.classList.add('show');
            }
        });
        
        // Focus management for accessibility
        const closeButton = this.modal.querySelector('.modal-close-btn');
        if (closeButton) {
            closeButton.focus();
        }
    }
    
    /**
     * Hide the modal
     */
    hide() {
        if (!this.isOpen || !this.modal) return;
        
        console.log('Closing About modal');
        
        // Start hide animation
        this.modal.classList.remove('show');
        const container = this.modal.querySelector('.modal-container');
        if (container) {
            container.classList.remove('show');
        }
        
        // Hide modal after animation completes
        setTimeout(() => {
            if (this.modal) {
                this.modal.style.display = 'none';
            }
            this.isOpen = false;
        }, 300);
        
        // Remove event listeners
        this.modal.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        // Return focus to the ABOUT button
        const aboutButton = document.getElementById('about-btn');
        if (aboutButton) {
            aboutButton.focus();
        }
    }
    
    /**
     * Handle clicks outside the modal content
     * @param {Event} event - Click event
     */
    handleOutsideClick(event) {
        if (event.target === this.modal) {
            this.hide();
        }
    }
    
    /**
     * Handle escape key press
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleEscapeKey(event) {
        if (event.key === 'Escape' && this.isOpen) {
            this.hide();
        }
    }
    
    /**
     * Handle close button click
     * @param {Event} event - Click event
     */
    handleCloseClick(event) {
        event.preventDefault();
        this.hide();
    }
    
    /**
     * Update modal content (for future use)
     * @param {Object} content - Content object with title and body
     */
    updateContent(content) {
        if (!this.modal) return;
        
        const title = this.modal.querySelector('.modal-title');
        const body = this.modal.querySelector('.modal-content');
        
        if (title && content.title) {
            title.textContent = content.title;
        }
        
        if (body && content.body) {
            body.innerHTML = content.body;
        }
    }
    
    /**
     * Cleanup method (call when destroying the component)
     */
    cleanup() {
        if (this.modal) {
            this.modal.removeEventListener('click', this.handleOutsideClick);
        }
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        const aboutButton = document.getElementById('about-btn');
        if (aboutButton) {
            aboutButton.removeEventListener('click', this.show);
        }
        
        const closeButton = this.modal?.querySelector('[data-modal="about"]');
        if (closeButton) {
            closeButton.removeEventListener('click', this.handleCloseClick);
        }
        
        console.log('AboutModal cleaned up');
    }
}

export default AboutModal;