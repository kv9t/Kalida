/**
 * GameSettingsPopup.js - Game Settings popup component
 * 
 * Handles the display and interaction of the game settings popup window.
 * Triggered when clicking on game mode selector (Frame 353) or rules selector (Frame 354).
 */

class GameSettingsPopup {
    /**
     * Create a new game settings popup
     * @param {Game} game - The game instance
     * @param {GameUI} gameUI - The game UI instance
     */
    constructor(game, gameUI) {
        this.game = game;
        this.gameUI = gameUI;
        this.popup = null;
        this.isOpen = false;
        
        // Bind methods to preserve 'this' context
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
    }
    
    /**
     * Initialize the popup by adding event listeners to triggers
     */
    initialize() {
        // Add click listeners to the frame elements that should trigger the popup
        const gameModeSelector = document.querySelector('.frame-353');
        const rulesSelector = document.querySelector('.frame-354-rules');
        
        if (gameModeSelector) {
            gameModeSelector.addEventListener('click', this.show);
            // Add visual feedback that it's clickable
            gameModeSelector.style.cursor = 'pointer';
        }
        
        if (rulesSelector) {
            rulesSelector.addEventListener('click', this.show);
            // Add visual feedback that it's clickable
            rulesSelector.style.cursor = 'pointer';
        }
        
        console.log('GameSettingsPopup initialized');
    }
    
    /**
     * Show the popup
     */
    show() {
        if (this.isOpen) return;
        
        console.log('Opening Game Settings popup');
        
        // Create the popup if it doesn't exist
        if (!this.popup) {
            this.createPopup();
        }
        
        // Update popup content with current game settings
        this.updatePopupContent();
        
        // Add to DOM and show
        document.body.appendChild(this.popup);
        this.isOpen = true;
        
        // Add event listeners for closing
        document.addEventListener('click', this.handleOutsideClick);
        document.addEventListener('keydown', this.handleEscapeKey);
        
        // Trigger show animation
        requestAnimationFrame(() => {
            this.popup.classList.add('show');
        });
    }
    
    /**
     * Hide the popup
     */
    hide() {
        if (!this.isOpen || !this.popup) return;
        
        console.log('Closing Game Settings popup');
        
        // Start hide animation
        this.popup.classList.add('hide');
        this.popup.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.popup && this.popup.parentNode) {
                this.popup.parentNode.removeChild(this.popup);
            }
            this.isOpen = false;
        }, 300);
        
        // Remove event listeners
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleEscapeKey);
    }
    
    /**
     * Create the popup HTML structure
     */
    createPopup() {
        // Create main popup container
        this.popup = document.createElement('div');
        this.popup.className = 'game-settings-popup';
        
        // Create popup content with the structure from Figma
        this.popup.innerHTML = `
            <!-- Popup backdrop -->
            <div class="popup-backdrop"></div>
            
            <!-- Main popup container -->
            <div class="popup-container">
                <!-- Frame 376: Header with title and close button -->
                <div class="frame-376 popup-header">
                    <h2 class="popup-title">Game Settings</h2>
                    
                    <!-- Frame 374: Close button -->
                    <button class="frame-374 close-icon" aria-label="Close settings">
                        <!-- Group 4: Close X icon SVG -->
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none">
                            <rect x="13.5" y="11.4932" width="2.13156" height="16.2531" transform="rotate(135 13.5 11.4932)" fill="#666666"/>
                            <rect x="2.00732" y="13" width="2.13156" height="16.2531" transform="rotate(-135 2.00732 13)" fill="#666666"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Scrollable content area -->
                <div class="popup-content">
                    <!-- Frame 373: Playing Against section -->
                    <div class="frame-373 playing-against-section">
                        <h3 class="section-title">Playing Against</h3>
                        
                        <div class="play-against-options">
                            <!-- Frame 372: Human vs Human option -->
                            <button class="frame-372 play-against-option" data-mode="human">
                                <div class="option-content">
                                    
                                    <span class="option-text">Human vs Human</span>
                                    <img src="images/human_icon_w_brain.svg" alt="Human vs Human" class="option-icon">
                                </div>
                            </button>
                            
                            <!-- Frame 372: Computer option -->
                            <button class="frame-372 play-against-option" data-mode="computer">
                                <div class="option-content">
                                    
                                    <span class="option-text">Computer</span>
                                    <img src="images/computer_player_icon.svg" alt="Computer" class="option-icon">
                                </div>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Frame 374: Game Mode section (placeholder for now) -->
                    <div class="frame-374 game-mode-section">
                        <h3 class="section-title">Game Mode</h3>
                        <p class="coming-soon">Game mode options will be added in the next update...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners to the popup elements
        this.addPopupEventListeners();
    }
    
    /**
     * Add event listeners to popup elements
     */
    addPopupEventListeners() {
        // Close button
        const closeButton = this.popup.querySelector('.close-icon');
        if (closeButton) {
            closeButton.addEventListener('click', this.hide);
        }
        
        // Playing against options
        const playAgainstOptions = this.popup.querySelectorAll('.play-against-option');
        playAgainstOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const mode = e.currentTarget.getAttribute('data-mode');
                this.handlePlayAgainstChange(mode);
            });
        });
    }
    
    /**
     * Handle changes to the "Playing Against" setting
     * @param {string} mode - 'human' or 'computer'
     */
    handlePlayAgainstChange(mode) {
        console.log('Play against mode changed to:', mode);
        
        // Update visual selection
        const options = this.popup.querySelectorAll('.play-against-option');
        options.forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = this.popup.querySelector(`[data-mode="${mode}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Update game mode based on selection
        if (mode === 'human') {
            // Set to human vs human mode
            this.game.setGameMode('human');
        } else if (mode === 'computer') {
            // For now, default to level 1 when computer is selected
            // Later, this could be determined by the game mode section
            this.game.setGameMode('level1');
        }
        
        // Update the main UI to reflect the change
        if (this.gameUI && typeof this.gameUI.applySavedPreferences === 'function') {
            this.gameUI.applySavedPreferences();
        }
        
        // Close popup after a short delay to show the selection
        setTimeout(() => {
            this.hide();
        }, 500);
    }
    
    /**
     * Update popup content to reflect current game settings
     */
    updatePopupContent() {
        if (!this.popup) return;
        
        // Update selected play against option
        const options = this.popup.querySelectorAll('.play-against-option');
        options.forEach(option => {
            option.classList.remove('selected');
        });
        
        // Determine current mode and select appropriate option
        const currentMode = this.game.gameMode;
        let playAgainstMode = 'human';
        
        if (currentMode !== 'human') {
            playAgainstMode = 'computer';
        }
        
        const selectedOption = this.popup.querySelector(`[data-mode="${playAgainstMode}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }
    
    /**
     * Handle clicks outside the popup to close it
     */
    handleOutsideClick(event) {
        // Check if click was on the backdrop (not the popup content)
        if (event.target.classList.contains('popup-backdrop')) {
            this.hide();
        }
    }
    
    /**
     * Handle escape key to close popup
     */
    handleEscapeKey(event) {
        if (event.key === 'Escape') {
            this.hide();
        }
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
        // Remove trigger event listeners
        const gameModeSelector = document.querySelector('.frame-353');
        const rulesSelector = document.querySelector('.frame-354-rules');
        
        if (gameModeSelector) {
            gameModeSelector.removeEventListener('click', this.show);
        }
        
        if (rulesSelector) {
            rulesSelector.removeEventListener('click', this.show);
        }
        
        // Remove popup from DOM if it exists
        if (this.popup && this.popup.parentNode) {
            this.popup.parentNode.removeChild(this.popup);
        }
        
        // Remove document event listeners
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        console.log('GameSettingsPopup destroyed');
    }
}

export default GameSettingsPopup;