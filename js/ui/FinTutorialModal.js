/**
 * FinTutorialModal.js - Tutorial modal component for Fin
 *
 * Handles the display and interaction of the 4-slide Fin tutorial modal.
 * Same class pattern as TutorialModal.js with navigation, progress dots,
 * and keyboard support.
 */

class FinTutorialModal {
    /**
     * Create a new Fin Tutorial modal
     * @param {Game} game - The game instance
     * @param {GameUI} gameUI - The game UI instance
     */
    constructor(game, gameUI) {
        this.game = game;
        this.gameUI = gameUI;
        this.modal = null;
        this.isOpen = false;
        this.onCloseCallback = null;

        // Tutorial state
        this.currentSlide = 0;
        this.totalSlides = 4;
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
        this.modal = document.getElementById('fin-tutorial-modal');

        if (!this.modal) {
            console.warn('FinTutorialModal: fin-tutorial-modal element not found');
            return;
        }

        this.slides = this.modal.querySelectorAll('.tutorial-slide');

        if (this.slides.length !== this.totalSlides) {
            console.warn(`FinTutorialModal: Expected ${this.totalSlides} slides, found ${this.slides.length}`);
        }

        // Add click listener to the FIN TUTORIAL button
        const finTutorialButton = document.getElementById('fin-tutorial-btn');
        if (finTutorialButton) {
            finTutorialButton.addEventListener('click', this.show);
            console.log('FinTutorialModal: FIN TUTORIAL button listener added');
        }

        // Add click listener to close button
        const closeButton = this.modal.querySelector('[data-modal="fin-tutorial"]');
        if (closeButton) {
            closeButton.addEventListener('click', this.handleCloseClick);
        }

        // Add navigation event listeners using event delegation
        this.modal.addEventListener('click', this.handleNavigation);

        console.log('FinTutorialModal initialized');
    }

    /**
     * Show the modal
     */
    show() {
        if (this.isOpen || !this.modal) return;

        console.log('Opening Fin Tutorial modal');

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

        // Focus management
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

        console.log('Closing Fin Tutorial modal');

        this.modal.classList.remove('show');
        const container = this.modal.querySelector('.modal-container');
        if (container) {
            container.classList.remove('show');
        }

        setTimeout(() => {
            if (this.modal) {
                this.modal.style.display = 'none';
            }
            this.isOpen = false;

            if (this.onCloseCallback) {
                this.onCloseCallback();
                this.onCloseCallback = null;
            }
        }, 300);

        // Remove event listeners
        this.modal.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleEscapeKey);

        // Return focus
        const finTutorialButton = document.getElementById('fin-tutorial-btn');
        if (finTutorialButton) {
            finTutorialButton.focus();
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

        this.slides.forEach(slide => {
            slide.classList.remove('active');
        });

        this.slides[slideIndex].classList.add('active');

        // Update progress indicators (skip for cover slide)
        if (slideIndex > 0) {
            this.updateProgressIndicator(slideIndex - 1);
        }
    }

    /**
     * Update progress indicator dots
     * @param {number} progressIndex - Index of progress dot to highlight (0-2 for slides 2-4)
     */
    updateProgressIndicator(progressIndex) {
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
        }
    }

    startTutorial() {
        this.currentSlide = 1;
        this.showSlide(this.currentSlide);
    }

    nextSlide() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.currentSlide++;
            this.showSlide(this.currentSlide);
        }
    }

    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.showSlide(this.currentSlide);
        }
    }

    finishTutorial() {
        console.log('Fin Tutorial completed');
        this.hide();
    }

    handleOutsideClick(event) {
        if (event.target === this.modal) {
            this.hide();
        }
    }

    handleEscapeKey(event) {
        if (event.key === 'Escape' && this.isOpen) {
            this.hide();
        }

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

    handleCloseClick(event) {
        event.preventDefault();
        this.hide();
    }

    setOnCloseCallback(callback) {
        this.onCloseCallback = callback;
    }

    cleanup() {
        if (this.modal) {
            this.modal.removeEventListener('click', this.handleOutsideClick);
            this.modal.removeEventListener('click', this.handleNavigation);
        }
        document.removeEventListener('keydown', this.handleEscapeKey);

        const finTutorialButton = document.getElementById('fin-tutorial-btn');
        if (finTutorialButton) {
            finTutorialButton.removeEventListener('click', this.show);
        }

        const closeButton = this.modal?.querySelector('[data-modal="fin-tutorial"]');
        if (closeButton) {
            closeButton.removeEventListener('click', this.handleCloseClick);
        }

        console.log('FinTutorialModal cleaned up');
    }
}

export default FinTutorialModal;
