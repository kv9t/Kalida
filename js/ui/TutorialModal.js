/**
 * TutorialModal.js - Tutorial modal component for Kalida
 * 
 * Handles the display and interaction of the 5-slide tutorial modal.
 * Includes navigation controls and progress indicators.
 * Triggered when clicking the TUTORIAL button in Frame 378.
 */

class TutorialModal {
    /**
     * Create a new Tutorial modal
     * @param {Game} game - The game instance
     * @param {GameUI} gameUI - The game UI instance
     */
    constructor(game, gameUI) {
        this.game = game;
        this.gameUI = gameUI;
        this.modal = null;
        this.isOpen = false;
        
        // Tutorial state
        this.currentSlide = 0;
        this.totalSlides = 5;
        this.slides = [];
        
        // Bind methods to preserve 'this' context
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleCloseClick = this.handleCloseClick.bind(this);
        this.handleNavigation = this.handleNavigation.bind(this);
        this.nextSlide = this.nextSlide.bind(this);
        this.prevSlide = this.prevSlide.bind(this);
        this.startTutorial = this.startTutorial.bind(this);
        this.finishTutorial = this.finishTutorial.bind(this);
    }
    
    /**
     * Initialize the modal by adding event listeners and caching elements
     */
    initialize() {
        // Cache modal element and slides
        this.modal = document.getElementById('tutorial-modal');
        
        if (!this.modal) {
            console.warn('TutorialModal: tutorial-modal element not found');
            return;
        }
        
        this.slides = this.modal.querySelectorAll('.tutorial-slide');
        
        if (this.slides.length !== this.totalSlides) {
            console.warn(`TutorialModal: Expected ${this.totalSlides} slides, found ${this.slides.length}`);
        }
        
        // Add click listener to the TUTORIAL button
        const tutorialButton = document.getElementById('tutorial-btn');
        if (tutorialButton) {
            tutorialButton.addEventListener('click', this.show);
            console.log('TutorialModal: TUTORIAL button listener added');
        } else {
            console.warn('TutorialModal: tutorial-btn element not found');
        }
        
        // Add click listener to close button
        const closeButton = this.modal.querySelector('[data-modal="tutorial"]');
        if (closeButton) {
            closeButton.addEventListener('click', this.handleCloseClick);
        }
        
        // Add navigation event listeners using event delegation
        this.modal.addEventListener('click', this.handleNavigation);
        
        console.log('TutorialModal initialized');
    }
    
    /**
     * Show the modal
     */
    show() {
        if (this.isOpen || !this.modal) return;
        
        console.log('Opening Tutorial modal');
        
        // Reset to cover slide
        this.currentSlide = 0;
        this.showSlide(this.currentSlide);
        
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
        const firstButton = this.modal.querySelector('.tutorial-nav-btn');
        if (firstButton) {
            firstButton.focus();
        }
    }
    
    /**
     * Hide the modal
     */
    hide() {
        if (!this.isOpen || !this.modal) return;
        
        console.log('Closing Tutorial modal');
        
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
        
        // Return focus to the TUTORIAL button
        const tutorialButton = document.getElementById('tutorial-btn');
        if (tutorialButton) {
            tutorialButton.focus();
        }
    }
    
    /**
     * Show specific slide
     * @param {number} slideIndex - Index of slide to show
     */
    showSlide(slideIndex) {
        if (slideIndex < 0 || slideIndex >= this.totalSlides || !this.slides.length) {
            return;
        }
        
        // Hide all slides
        this.slides.forEach(slide => {
            slide.classList.remove('active');
        });
        
        // Show current slide
        this.slides[slideIndex].classList.add('active');
        
        // Update progress indicators (skip for cover slide)
        if (slideIndex > 0) {
            this.updateProgressIndicator(slideIndex - 1); // Subtract 1 because cover slide doesn't count
        }
        
        console.log(`TutorialModal: Showing slide ${slideIndex + 1} of ${this.totalSlides}`);
    }
    
    /**
     * Update progress indicator dots
     * @param {number} progressIndex - Index of progress dot to highlight (0-3 for slides 2-5)
     */
    updateProgressIndicator(progressIndex) {
        // Update progress indicators in all non-cover slides
        const nonCoverSlides = Array.from(this.slides).filter(slide => !slide.classList.contains('cover'));
        
        nonCoverSlides.forEach(slide => {
            const dots = slide.querySelectorAll('.progress-dot');
            dots.forEach((dot, dotIndex) => {
                if (dotIndex === progressIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        });
    }
    
    /**
     * Handle navigation button clicks using event delegation
     * @param {Event} event - Click event
     */
    handleNavigation(event) {
        const button = event.target.closest('.tutorial-nav-btn');
        if (!button) return;
        
        const action = button.getAttribute('data-action');
        
        switch (action) {
            case 'start':
                this.startTutorial();
                break;
            case 'next':
                this.nextSlide();
                break;
            case 'prev':
                this.prevSlide();
                break;
            case 'finish':
                this.finishTutorial();
                break;
            default:
                console.warn('TutorialModal: Unknown navigation action:', action);
        }
    }
    
    /**
     * Start the tutorial (go from cover slide to first content slide)
     */
    startTutorial() {
        this.currentSlide = 1;
        this.showSlide(this.currentSlide);
    }
    
    /**
     * Go to next slide
     */
    nextSlide() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.currentSlide++;
            this.showSlide(this.currentSlide);
        }
    }
    
    /**
     * Go to previous slide
     */
    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.showSlide(this.currentSlide);
        }
    }
    
    /**
     * Finish tutorial and close modal
     */
    finishTutorial() {
    console.log('Tutorial completed');
    
    // Mark tutorial as completed in the game
    if (this.game && typeof this.game.markTutorialCompleted === 'function') {
        this.game.markTutorialCompleted();
        console.log('Tutorial marked as completed');
    }
    
    this.hide();
    

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
        
        // Also handle arrow keys for navigation
        if (this.isOpen) {
            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    this.prevSlide();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.nextSlide();
                    break;
            }
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
     * Update slide content (for future use)
     * @param {number} slideIndex - Index of slide to update
     * @param {Object} content - Content object with title and body
     */
    updateSlideContent(slideIndex, content) {
        if (slideIndex < 0 || slideIndex >= this.totalSlides || !this.slides[slideIndex]) {
            return;
        }
        
        const slide = this.slides[slideIndex];
        const title = slide.querySelector('h3');
        const body = slide.querySelector('p');
        
        if (title && content.title) {
            title.textContent = content.title;
        }
        
        if (body && content.body) {
            body.textContent = content.body;
        }
    }
    
    /**
     * Get current slide information
     * @returns {Object} Current slide info
     */
    getCurrentSlideInfo() {
        return {
            current: this.currentSlide + 1,
            total: this.totalSlides,
            isFirstSlide: this.currentSlide === 0,
            isLastSlide: this.currentSlide === this.totalSlides - 1,
            isCoverSlide: this.currentSlide === 0
        };
    }
    
    /**
     * Cleanup method (call when destroying the component)
     */
    cleanup() {
        if (this.modal) {
            this.modal.removeEventListener('click', this.handleOutsideClick);
            this.modal.removeEventListener('click', this.handleNavigation);
        }
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        const tutorialButton = document.getElementById('tutorial-btn');
        if (tutorialButton) {
            tutorialButton.removeEventListener('click', this.show);
        }
        
        const closeButton = this.modal?.querySelector('[data-modal="tutorial"]');
        if (closeButton) {
            closeButton.removeEventListener('click', this.handleCloseClick);
        }
        
        console.log('TutorialModal cleaned up');
    }
}

export default TutorialModal;