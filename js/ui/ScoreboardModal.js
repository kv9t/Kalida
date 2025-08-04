/**
 * ScoreboardModal.js - Scoreboard modal component for Kalida
 * 
 * Handles the display and interaction of the scoreboard modal window.
 * Triggered when clicking on either scoreboard (Round Wins or Matches Won).
 * Allows users to reset scores and view score explanations.
 */

class ScoreboardModal {
    /**
     * Create a new Scoreboard modal
     * @param {Game} game - The game instance
     * @param {GameUI} gameUI - The game UI instance
     */
    constructor(game, gameUI) {
        this.game = game;
        this.gameUI = gameUI;
        this.modal = null;
        this.isOpen = false;
        this.currentScoreboardType = null; // 'round' or 'match'
        
        // Bind methods to preserve 'this' context
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleCloseClick = this.handleCloseClick.bind(this);
        this.handleResetRoundScores = this.handleResetRoundScores.bind(this);
        this.handleResetMatchScores = this.handleResetMatchScores.bind(this);
        this.handleResetAllScores = this.handleResetAllScores.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
    }
    
    /**
     * Initialize the modal by adding event listeners
     */
    initialize() {
        // Cache modal element
        this.modal = document.getElementById('scoreboard-modal');
        
        if (!this.modal) {
            console.warn('ScoreboardModal: scoreboard-modal element not found');
            return;
        }
        
        // Add click listeners to both scoreboards
        const roundWinsScoreboard = document.querySelector('.round-wins-scoreboard');
        const matchesWonScoreboard = document.querySelector('.matches-won-scoreboard');
        
        if (roundWinsScoreboard) {
            roundWinsScoreboard.addEventListener('click', (e) => {
                // Prevent triggering when clicking on child elements that might have their own handlers
                e.stopPropagation();
                this.show('round');
            });
            // Add visual feedback that it's clickable
            roundWinsScoreboard.style.cursor = 'pointer';
            roundWinsScoreboard.title = 'Click to manage round scores';
            console.log('ScoreboardModal: Round wins scoreboard listener added');
        } else {
            console.warn('ScoreboardModal: round-wins-scoreboard element not found');
        }
        
        if (matchesWonScoreboard) {
            matchesWonScoreboard.addEventListener('click', (e) => {
                // Prevent triggering when clicking on child elements that might have their own handlers
                e.stopPropagation();
                this.show('match');
            });
            // Add visual feedback that it's clickable
            matchesWonScoreboard.style.cursor = 'pointer';
            matchesWonScoreboard.title = 'Click to manage match scores';
            console.log('ScoreboardModal: Matches won scoreboard listener added');
        } else {
            console.warn('ScoreboardModal: matches-won-scoreboard element not found');
        }
        
        // Add click listener to close button
        const closeButton = this.modal.querySelector('[data-modal="scoreboard"]');
        if (closeButton) {
            closeButton.addEventListener('click', this.handleCloseClick);
        }
        
        // Add click listeners to action buttons
        this.addActionListeners();
        
        console.log('ScoreboardModal initialized');
    }
    
    /**
     * Add event listeners to action buttons
     */
    addActionListeners() {
        // Reset round scores button
        const resetRoundBtn = this.modal.querySelector('[data-action="reset-round"]');
        if (resetRoundBtn) {
            resetRoundBtn.addEventListener('click', this.handleResetRoundScores);
        }
        
        // Reset match scores button
        const resetMatchBtn = this.modal.querySelector('[data-action="reset-match"]');
        if (resetMatchBtn) {
            resetMatchBtn.addEventListener('click', this.handleResetMatchScores);
        }
        
        // Reset all scores button
        const resetAllBtn = this.modal.querySelector('[data-action="reset-all"]');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', this.handleResetAllScores);
        }

        const cancelBtn = this.modal.querySelector('[data-action="cancel"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancel);
        }

    }
    
    /**
     * Show the modal
     * @param {string} scoreboardType - 'round' or 'match' to indicate which scoreboard was clicked
     */
    show(scoreboardType = 'round') {
        if (this.isOpen || !this.modal) return;
        
        console.log(`Opening Scoreboard modal for ${scoreboardType} scores`);
        
        // Store which scoreboard was clicked
        this.currentScoreboardType = scoreboardType;
        
        // Update modal content based on which scoreboard was clicked
        this.updateModalContent(scoreboardType);
        
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
     * Update modal content based on which scoreboard was clicked
     * @param {string} scoreboardType - 'round' or 'match'
     */
    updateModalContent(scoreboardType) {
        const titleElement = this.modal.querySelector('.scoreboard-modal-title');
        const descriptionElement = this.modal.querySelector('.scoreboard-description');
        const currentScoresElement = this.modal.querySelector('.current-scores');
        
        // Get current scores
        const roundScores = this.game.getScores();
        const matchScores = this.game.getMatchScores();
        
        if (scoreboardType === 'round') {
            if (titleElement) titleElement.textContent = 'Round Wins';
            if (descriptionElement) {
                descriptionElement.textContent = 'Each time a player gets 5 in a row, they win a round. Track your wins here!';
            }
            if (currentScoresElement) {
                currentScoresElement.innerHTML = `
                    <div class="score-display">
                        <span class="player-label">Player X:</span> 
                        <span class="score-value player-x-score">${roundScores.X}</span>
                    </div>
                    <div class="score-display">
                        <span class="player-label">Player O:</span> 
                        <span class="score-value player-o-score">${roundScores.O}</span>
                    </div>
                `;
            }
        } else {
            if (titleElement) titleElement.textContent = 'Match Wins';
            if (descriptionElement) {
                descriptionElement.textContent = 'To win a match, be the first to reach 8 round wins with at least a 2-win lead over your opponent.';
            }
            if (currentScoresElement) {
                currentScoresElement.innerHTML = `
                    <div class="score-display">
                        <span class="player-label">Player X:</span> 
                        <span class="score-value player-x-score">${matchScores.X}</span>
                    </div>
                    <div class="score-display">
                        <span class="player-label">Player O:</span> 
                        <span class="score-value player-o-score">${matchScores.O}</span>
                    </div>
                `;
            }
        }
    }
    
    /**
     * Hide the modal
     */
    hide() {
        if (!this.isOpen || !this.modal) return;
        
        console.log('Closing Scoreboard modal');
        
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
            this.currentScoreboardType = null;
        }, 300);
        
        // Remove event listeners
        this.modal.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleEscapeKey);
    }
    
    /**
     * Handle reset round scores button click
     */
    handleResetRoundScores() {
        const confirmed = confirm('Are you sure you want to reset round wins to 0 for both players?');
        if (confirmed) {
            console.log('Resetting round scores');
            this.game.clearScores();
            this.updateModalContent(this.currentScoreboardType); // Refresh displayed scores
            this.hide(); // Close modal after action
        }
    }
    
    /**
     * Handle reset match scores button click
     */
    handleResetMatchScores() {
        const confirmed = confirm('Are you sure you want to reset match wins to 0 for both players?');
        if (confirmed) {
            console.log('Resetting match scores');
            this.game.resetMatchScores();
            this.updateModalContent(this.currentScoreboardType); // Refresh displayed scores
            this.hide(); // Close modal after action
        }
    }
    
    /**
     * Handle reset all scores button click
     */
    handleResetAllScores() {
        const confirmed = confirm('Are you sure you want to reset ALL scores (both round wins and match wins) to 0?');
        if (confirmed) {
            console.log('Resetting all scores');
            this.game.clearScores();
            this.game.resetMatchScores();
            this.updateModalContent(this.currentScoreboardType); // Refresh displayed scores
            this.hide(); // Close modal after action
        }
    }

    handleCancel() {
        console.log('User cancelled score reset');
        this.hide(); // Simply close the modal without any changes
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
     * Get current modal state (for debugging)
     * @returns {Object} Current modal state
     */
    getModalState() {
        return {
            isOpen: this.isOpen,
            currentScoreboardType: this.currentScoreboardType,
            roundScores: this.game.getScores(),
            matchScores: this.game.getMatchScores()
        };
    }
    
    /**
     * Cleanup method (call when destroying the component)
     */
    cleanup() {
        if (this.modal) {
            this.modal.removeEventListener('click', this.handleOutsideClick);
        }
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        // Remove scoreboard click listeners
        const roundWinsScoreboard = document.querySelector('.round-wins-scoreboard');
        const matchesWonScoreboard = document.querySelector('.matches-won-scoreboard');
        
        if (roundWinsScoreboard) {
            roundWinsScoreboard.removeEventListener('click', this.show);
            roundWinsScoreboard.style.cursor = '';
            roundWinsScoreboard.title = '';
        }
        
        if (matchesWonScoreboard) {
            matchesWonScoreboard.removeEventListener('click', this.show);
            matchesWonScoreboard.style.cursor = '';
            matchesWonScoreboard.title = '';
        }
        
        // Remove action button listeners
        const resetRoundBtn = this.modal?.querySelector('[data-action="reset-round"]');
        const resetMatchBtn = this.modal?.querySelector('[data-action="reset-match"]');
        const resetAllBtn = this.modal?.querySelector('[data-action="reset-all"]');
        const closeButton = this.modal?.querySelector('[data-modal="scoreboard"]');
        
        if (resetRoundBtn) {
            resetRoundBtn.removeEventListener('click', this.handleResetRoundScores);
        }
        if (resetMatchBtn) {
            resetMatchBtn.removeEventListener('click', this.handleResetMatchScores);
        }
        if (resetAllBtn) {
            resetAllBtn.removeEventListener('click', this.handleResetAllScores);
        }
        if (closeButton) {
            closeButton.removeEventListener('click', this.handleCloseClick);
        }
        
        console.log('ScoreboardModal cleaned up');
    }
}

export default ScoreboardModal;