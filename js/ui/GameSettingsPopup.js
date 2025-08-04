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
        
        // Track current selections vs saved selections
        this.currentSelections = {
            playingAgainst: 'human',
            gameMode: 'basic'
        };
        
        this.savedSelections = {
            playingAgainst: 'human', 
            gameMode: 'basic'
        };
        
        // Bind methods to preserve 'this' context
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.saveChanges = this.saveChanges.bind(this);
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
            // ← FIX: Reset the popup reference to null
            this.popup = null;
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
                                <span class="option-text">Human vs. Human</span>    
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
                    
                    <!-- Frame 374: Game Mode section -->
                    <div class="frame-374 game-mode-section">
                        <h3 class="section-title">Game Mode</h3>
                        
                        <div class="game-mode-options">
                            <!-- Frame 373: Basic Mode -->
                            <button class="frame-373 game-mode-option" data-mode="basic">
                                <img src="images/basic-board-example.svg" alt="Basic Mode" class="mode-icon">
                                <div class="frame-375 mode-details">
                                    <h4 class="mode-title">Basic</h4>
                                    <p class="mode-description">Get 5 pieces in a straight line to win.</p>
                                </div>
                            </button>
                            
                            <!-- Frame 373: Bounce Mode -->
                            <button class="frame-373 game-mode-option" data-mode="bounce">
                                <img src="images/bounce-board-example.svg" alt="Bounce Mode" class="mode-icon">
                                <div class="frame-375 mode-details">
                                    <h4 class="mode-title">Bounce</h4>
                                    <p class="mode-description">Basic rules + diagonal lines can bounce off board edges to win.</p>
                                </div>
                            </button>
                            
                            <!-- Frame 373: Diagonal Wrap Mode -->
                            <button class="frame-373 game-mode-option" data-mode="diagonal-wrap">
                                <img src="images/diagonal-wrap-board-example.svg" alt="Diagonal Wrap Mode" class="mode-icon">
                                <div class="frame-375 mode-details">
                                    <h4 class="mode-title">Diagonal Wrap</h4>
                                    <p class="mode-description">Basic rules + diagonal lines can continue from one side to the other.</p>
                                </div>
                            </button>
                            
                            <!-- Frame 373: All Rules Mode -->
                            <button class="frame-373 game-mode-option" data-mode="all">
                                <img src="images/all-board-example.svg" alt="All Rules Mode" class="mode-icon">
                                <div class="frame-375 mode-details">
                                    <h4 class="mode-title">All</h4>
                                    <p class="mode-description">All rules enabled: basic, bounce, and wrapping.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Frame 375: Save overlay (hidden by default) -->
                <div class="frame-375 save-overlay" style="display: none;">
                    <p class="save-explanation">This will start new game</p>
                    <button class="save-button">Save</button>
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
                this.handlePlayAgainstSelection(mode);
            });
        });
        
        // Game mode options
        const gameModeOptions = this.popup.querySelectorAll('.game-mode-option');
        gameModeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const mode = e.currentTarget.getAttribute('data-mode');
                this.handleGameModeSelection(mode);
            });
        });
        
        // Save button
        const saveButton = this.popup.querySelector('.save-button');
        if (saveButton) {
            saveButton.addEventListener('click', this.saveChanges);
        }
    }
    
    /**
     * Handle selection of "Playing Against" option (doesn't apply changes yet)
     * @param {string} mode - 'human' or 'computer'
     */
    handlePlayAgainstSelection(mode) {
        console.log('Play against selection:', mode);
        
        // Update visual selection
        const options = this.popup.querySelectorAll('.play-against-option');
        options.forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = this.popup.querySelector(`[data-mode="${mode}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Update current selections
        this.currentSelections.playingAgainst = mode;
        
        // If switching to computer, default to basic mode
        if (mode === 'computer' && this.currentSelections.gameMode === 'basic') {
            this.currentSelections.gameMode = 'basic';
            this.updateGameModeSelection('basic');
        }
        
        // Check if we need to show save overlay
        this.checkForChanges();
    }
    
    /**
     * Handle selection of game mode option (doesn't apply changes yet)
     * @param {string} mode - 'basic', 'bounce', 'diagonal-wrap', or 'all'
     */
    handleGameModeSelection(mode) {
        console.log('Game mode selection:', mode);
        
        // Update visual selection
        this.updateGameModeSelection(mode);
        
        // Update current selections
        this.currentSelections.gameMode = mode;
        
        // Check if we need to show save overlay
        this.checkForChanges();
    }
    
    /**
     * Update the visual selection for game mode
     * @param {string} mode - The selected game mode
     */
    updateGameModeSelection(mode) {
        const options = this.popup.querySelectorAll('.game-mode-option');
        options.forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = this.popup.querySelector(`.game-mode-option[data-mode="${mode}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }
    
    /**
     * Check if current selections differ from saved selections and show/hide save overlay
     */
    checkForChanges() {
        const hasChanges = this.currentSelections.playingAgainst !== this.savedSelections.playingAgainst ||
                          this.currentSelections.gameMode !== this.savedSelections.gameMode;
        
        const saveOverlay = this.popup.querySelector('.save-overlay');
        const explanationText = this.popup.querySelector('.save-explanation');
        
        if (hasChanges) {
            // Determine the appropriate message
            let message = 'This will start new game';
            if (this.currentSelections.playingAgainst !== this.savedSelections.playingAgainst) {
                message = 'This will start new game & reset scores';
            }
            
            explanationText.textContent = message;
            saveOverlay.style.display = 'flex';
        } else {
            saveOverlay.style.display = 'none';
        }
    }
    
    /**
     * Save the current selections and apply them to the game
     */
    saveChanges() {
        console.log('Saving changes:', this.currentSelections);
        
        const willResetScores = this.currentSelections.playingAgainst !== this.savedSelections.playingAgainst;
        
        // Apply the changes to the game
        if (this.currentSelections.playingAgainst === 'human') {
            // Set human vs human mode with selected rules
            this.game.setGameMode('human');
            this.applyGameModeRules(this.currentSelections.gameMode);
        } else {
            // Set computer mode with appropriate level
            const computerGameMode = this.mapGameModeToLevel(this.currentSelections.gameMode);
            this.game.setGameMode(computerGameMode);
        }
        
        // Reset scores if changing opponent type
        if (willResetScores) {
            this.game.clearScores();
            this.game.resetMatchScores();
        }
        
        // Update saved selections to match current
        this.savedSelections = { ...this.currentSelections };
        
        // Hide save overlay
        const saveOverlay = this.popup.querySelector('.save-overlay');
        saveOverlay.style.display = 'none';
        
        // Update the main UI
        if (this.gameUI && typeof this.gameUI.refreshAfterSettingsChange === 'function') {
            this.gameUI.refreshAfterSettingsChange();
        }
        
        // Close popup after a short delay
        setTimeout(() => {
            this.hide();
        }, 300);
    }
    
    /**
     * Apply game mode rules for human vs human play
     * @param {string} gameMode - The selected game mode
     */
    applyGameModeRules(gameMode) {
        // Map game modes to rule combinations
        switch(gameMode) {
            case 'basic':
                this.game.setBounceRule(false);
                this.game.setWrapRule(false);
                break;
            case 'bounce':
                this.game.setBounceRule(true);
                this.game.setWrapRule(false);
                break;
            case 'diagonal-wrap':
                this.game.setBounceRule(false);
                this.game.setWrapRule(true);
                break;
            case 'all':
                this.game.setBounceRule(true);
                this.game.setWrapRule(true);
                break;
        }
    }
    
    /**
     * Map game mode to computer difficulty level
     * @param {string} gameMode - The selected game mode
     * @returns {string} - The corresponding computer level
     */
    mapGameModeToLevel(gameMode) {
        // Map game modes to existing computer levels
        switch(gameMode) {
            case 'basic': return 'level1';
            case 'bounce': return 'level2';
            case 'diagonal-wrap': return 'level3';
            case 'all': return 'level4';
            default: return 'level1';
        }
    }
    
    /**
     * Update popup content to reflect current game settings
     */
    updatePopupContent() {
        if (!this.popup) return;
        
        // Determine current game settings from the game state
        const currentGameMode = this.game.gameMode;
        let playAgainstMode = 'human';
        let gameMode = 'basic';
        
        if (currentGameMode !== 'human') {
            playAgainstMode = 'computer';
            // Map computer levels back to game modes
            switch(currentGameMode) {
                case 'level1': gameMode = 'basic'; break;
                case 'level2': gameMode = 'bounce'; break;
                case 'level3': gameMode = 'diagonal-wrap'; break;
                case 'level4': gameMode = 'all'; break;
                default: gameMode = 'basic';
            }
        } else {
            // For human mode, determine game mode from rules
            if (this.game.bounceRuleEnabled && this.game.wrapRuleEnabled) {
                gameMode = 'all';
            } else if (this.game.bounceRuleEnabled) {
                gameMode = 'bounce';
            } else if (this.game.wrapRuleEnabled) {
                gameMode = 'diagonal-wrap';
            } else {
                gameMode = 'basic';
            }
        }
        
        // Update saved selections to match current game state
        this.savedSelections = {
            playingAgainst: playAgainstMode,
            gameMode: gameMode
        };
        
        // Set current selections to match saved (no changes initially)
        this.currentSelections = { ...this.savedSelections };
        
        // Update visual selections
        this.updatePlayAgainstSelection(playAgainstMode);
        this.updateGameModeSelection(gameMode);
        
        // Hide save overlay initially
        const saveOverlay = this.popup.querySelector('.save-overlay');
        if (saveOverlay) {
            saveOverlay.style.display = 'none';
        }
    }
    
    /**
     * Update the visual selection for playing against options
     * @param {string} mode - The selected playing against mode
     */
    updatePlayAgainstSelection(mode) {
        const options = this.popup.querySelectorAll('.play-against-option');
        options.forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = this.popup.querySelector(`.play-against-option[data-mode="${mode}"]`);
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