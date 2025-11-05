/**
 * GameUI.js - UI components and events for Kalida
 * Updated with UIAssetManager integration for persistent preferences
 * 
 * Handles all UI components and user interactions, 
 * connecting DOM elements to game functionality
 * 
 */

import UIAssetManager from './UIAssetManager.js';
import BoardUI from './BoardUI.js';
import GameSettingsPopup from './GameSettingsPopup.js';
import AboutModal from './AboutModal.js'; // Import AboutModal
import TutorialModal from './TutorialModal.js'; // Import TutorialModal
import ScoreboardModal from './ScoreboardModal.js'; // Import ScoreboardModal


class GameUI {
    /**
     * Create a new game UI
     * @param {Game} game - The game instance to connect with
     * @param {RoomManager} roomManager - The room manager for turn checking (optional)
     */
    constructor(game, roomManager = null) {
        this.game = game;
        this.roomManager = roomManager;
        this.boardUI = null;
        
        // Initialize UI Asset Manager
        this.assetManager = new UIAssetManager();
        
        // Initialize Game Settings Popup
        this.settingsPopup = new GameSettingsPopup(this.game, this);

        // Initialize modal components
        this.aboutModal = new AboutModal(this.game, this);
        this.tutorialModal = new TutorialModal(this.game, this);
        this.scoreboardModal = new ScoreboardModal(this.game, this); 

        // Store references to DOM elements
        this.elements = {
            playerTurn: null,
            scoreX: null,
            scoreO: null,
            matchScoreX: null,
            matchScoreO: null,
            matchStatus: null,
            resetButton: null,
            declareDrawButton: null,
            clearScoresButton: null,
            gameModeSelect: null,
            bounceToggle: null,
            wrapToggle: null,
            missingTeethToggle: null,
            knightMoveToggle: null,
            aboutButton: null,
            tutorialButton: null
        };
        
        // Track rule toggle states when they're disabled for AI mode
        this.savedRuleStates = {
            bounce: true,
            wrap: true,
            missingTeeth: true,
            knightMove: true
        };
        
        // Track if we've applied saved preferences yet
        //this.hasAppliedSavedPreferences = false;
        
        // Initialize the UI
        this.initialize();
    }
    
    /**
     * Initialize the UI
     */
    initialize() {
        try {
            // Find DOM elements
            this.elements.playerTurn = document.querySelector('.player-turn');
            this.elements.scoreX = document.getElementById('score-x');
            this.elements.scoreO = document.getElementById('score-o');
            this.elements.matchScoreX = document.getElementById('match-score-x');
            this.elements.matchScoreO = document.getElementById('match-score-o');
            this.elements.matchStatus = document.getElementById('match-status');
            this.elements.resetButton = document.getElementById('reset-button');
            this.elements.declareDrawButton = document.getElementById('declare-draw-button');
            this.elements.clearScoresButton = document.getElementById('clear-scores-button');
            this.elements.gameModeSelect = document.getElementById('game-mode-select');
            this.elements.bounceToggle = document.getElementById('bounce-toggle');
            this.elements.wrapToggle = document.getElementById('wrap-toggle');
            this.elements.missingTeethToggle = document.getElementById('missing-teeth-toggle');
            this.elements.boardSizeSlider = document.getElementById('board-size-slider');
            this.elements.sizeValueDisplay = document.getElementById('size-value');
            this.elements.knightMoveToggle = document.getElementById('knight-move-toggle');
            this.elements.aboutButton = document.getElementById('about-btn');
            this.elements.tutorialButton = document.getElementById('tutorial-btn');
            


            // Create board UI if not already created
            if (!this.boardUI) {
                this.boardUI = new BoardUI(
                    'game-board',
                    this.game.boardSize,
                    (row, col) => this.handleCellClick(row, col)
                );
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Register game event handlers
            this.registerGameEvents();

            // Initialize the settings popup
            this.settingsPopup.initialize();

            // Initialize modal components
            this.aboutModal.initialize();
            this.tutorialModal.initialize();
            this.scoreboardModal.initialize();

            // Initialize the UI with current game state
            this.updateAll();
            
            console.log('GameUI initialization complete');
        } catch (error) {
            console.error('Error initializing GameUI:', error);
        }
    }
    
    /**
     * Show tutorial modal programmatically
     */
    showTutorial() {
        if (this.tutorialModal) {
            this.tutorialModal.show();
        }
    }

     /**
     * Method to show about modal programmatically
     */
    showAbout() {
        if (this.aboutModal) {
            this.aboutModal.show();
        }
    }

    // ===== SCOREBOARD MODAL =====
    /**
     * Show scoreboard modal programmatically
     * @param {string} scoreboardType - 'round' or 'match'
     */
    showScoreboardModal(scoreboardType = 'round') {
        if (this.scoreboardModal) {
            this.scoreboardModal.show(scoreboardType);
        }
    }

    /**
     * Method to show scoreboard modal for round wins
     */
    showRoundScoreboard() {
        this.showScoreboardModal('round');
    }

    /**
     * Method to show scoreboard modal for match wins  
     */
    showMatchScoreboard() {
        this.showScoreboardModal('match');
    }


    /**
     * Check if any modal is currently open
     * Useful for preventing certain game actions when modals are open
     */
    isModalOpen() {
        return (this.aboutModal && this.aboutModal.isOpen) || 
               (this.tutorialModal && this.tutorialModal.isOpen) ||
               (this.settingsPopup && this.settingsPopup.isOpen) ||
               (this.scoreboardModal && this.scoreboardModal.isOpen); // NEW: Include scoreboard modal
    }
    
    /**
     * Updated cleanup method to include new modals
     */
    cleanup() {
        if (this.aboutModal) {
            this.aboutModal.cleanup();
        }
        
        if (this.tutorialModal) {
            this.tutorialModal.cleanup();
        }
        
        if (this.scoreboardModal) { // NEW: Cleanup scoreboard modal
            this.scoreboardModal.cleanup();
        }
        
        console.log('GameUI cleanup complete (including modals)');
    }

    /**
     * Apply saved preferences from cookies to UI elements
     * FIXED: SVG updates moved OUTSIDE of gameModeSelect check
     */
    applySavedPreferences() {
        console.log('Applying current game state to UI elements');
        
        try {
            // ALWAYS sync UI with actual game state (whether from cookies or defaults)
            const gameStatus = this.game.getGameStatus();
            
            // ============================================================
            // CRITICAL FIX: Always update the game mode SVG
            // The SVG is part of the current UI and should ALWAYS update
            // ============================================================
            console.log('Setting UI game mode to:', this.game.gameMode);
            this.assetManager.updateGameModeSVG(this.game.gameMode);
            
            // ============================================================
            // CRITICAL FIX: Always update rules SVG
            // This is also part of the current UI
            // ============================================================
            if (this.game.gameMode !== 'human') {
                this.assetManager.updateRulesForGameMode(this.game.gameMode);
            } else {
                // For human mode, determine based on current rules
                this.assetManager.updateRulesForSettings({
                    bounceRuleEnabled: this.game.bounceRuleEnabled,
                    wrapRuleEnabled: this.game.wrapRuleEnabled,
                    missingTeethRuleEnabled: this.game.missingTeethRuleEnabled
                });
            }
            
            // ============================================================
            // Legacy support: Update old UI elements only if they exist
            // These were from the old dropdown-based system
            // ============================================================
            if (this.elements.gameModeSelect) {
                this.elements.gameModeSelect.value = this.game.gameMode;
                // Trigger the UI update for rule toggles based on the actual game mode
                this.handleGameModeChange(this.game.gameMode, this.game.gameMode !== 'human');
            }
            
            // Apply current rule preferences to toggles if they exist
            if (this.elements.bounceToggle) {
                this.elements.bounceToggle.checked = this.game.bounceRuleEnabled;
            }
            if (this.elements.wrapToggle) {
                this.elements.wrapToggle.checked = this.game.wrapRuleEnabled;
            }
            if (this.elements.missingTeethToggle) {
                this.elements.missingTeethToggle.checked = this.game.missingTeethRuleEnabled;
            }
            if (this.elements.knightMoveToggle) {
                this.elements.knightMoveToggle.checked = this.game.knightMoveRuleEnabled;
            }
            
            console.log('Applied current game state to UI:', {
                gameMode: this.game.gameMode,
                bounce: this.game.bounceRuleEnabled,
                wrap: this.game.wrapRuleEnabled,
                missingTeeth: this.game.missingTeethRuleEnabled,
                knightMove: this.game.knightMoveRuleEnabled,
                cookiesEnabled: this.game.cookiesEnabled
            });
            
        } catch (error) {
            console.error('Error applying current game state to UI:', error);
        }
    }

    /**
     * Handle cell click - with turn checking for remote rooms
     * @param {number} row - Row index
     * @param {number} col - Column index
     */
    handleCellClick(row, col) {
        // Check if it's player's turn in remote rooms
        if (this.roomManager) {
            const currentRoom = this.roomManager.getCurrentRoom();
            if (currentRoom && currentRoom.type === 'remote') {
                if (!this.roomManager.isMyTurn(currentRoom)) {
                    console.log('Not your turn! Waiting for opponent...');
                    // TODO: Show visual feedback (e.g., shake animation, message)
                    return;
                }
            }
        }

        // Allow the move
        this.game.makeMove(row, col);
    }

    /**
     * Set up UI event listeners
     */
    setupEventListeners() {
        // Reset button
        if (this.elements.resetButton) {
            this.elements.resetButton.addEventListener('click', () => {
                // Change button text back to normal if it was modified
                if (this.elements.resetButton.textContent !== 'New Game') {
                    this.elements.resetButton.textContent = 'New Game';
                    this.elements.resetButton.classList.remove('new-match-button');
                }
                
                this.game.resetGame();
            });
        }
        
        // Declare Draw button
        if (this.elements.declareDrawButton) {
            this.elements.declareDrawButton.addEventListener('click', () => {
                // Only allow declaring draw if game is active
                if (!this.game.gameActive) {
                    console.log('Cannot declare draw - game is not active');
                    return;
                }
                
                // Show confirmation dialog to prevent accidental draws
                const confirmation = confirm(
                    'Are you sure you want to declare this game as a draw?\n\n' +
                    'This will end the current game immediately.'
                );
                
                if (confirmation) {
                    console.log('Player confirmed draw declaration');
                    this.game.declareDraw();
                }
            });
        }
        
        // Clear scores button - ENHANCED with cookie data clearing option
        if (this.elements.clearScoresButton) {
            this.elements.clearScoresButton.addEventListener('click', () => {
                // Different behavior based on cookie consent
                if (this.game.cookiesEnabled) {
                    // Enhanced dialog for users with cookies enabled
                    const clearType = confirm(
                        'Choose how to clear scores:\n\n' +
                        'OK = Clear scores for this session only\n' +
                        'Cancel = Advanced options (will show another dialog)'
                    );
                    
                    if (clearType) {
                        // Just clear current session scores
                        if (confirm('Clear Round Wins and Matches Won for this session?')) {
                            if (typeof this.game.clearScores === 'function') {
                                this.game.clearScores();
                            }
                            if (typeof this.game.resetMatchScores === 'function') {
                                this.game.resetMatchScores();
                            }
                        }
                    } else {
                        // Show advanced options
                        this.showAdvancedClearOptions();
                    }
                } else {
                    // Simple dialog for users without cookies
                    if (confirm('Are you sure you want to clear all scores?\n\nThis will reset both Round Wins and Matches Won to 0.')) {
                        if (typeof this.game.clearScores === 'function') {
                            this.game.clearScores();
                        }
                        if (typeof this.game.resetMatchScores === 'function') {
                            this.game.resetMatchScores();
                        }
                    }
                }
            });
        }
        
        /* COMMENTED OUT - Game mode selected now handled by popup
        // Game mode select
        if (this.elements.gameModeSelect) {
            this.elements.gameModeSelect.addEventListener('change', (e) => {
                const selectedMode = e.target.value;
                const isAIMode = selectedMode !== 'human';
                
                // NEW: Update game mode SVG
                this.assetManager.updateGameModeSVG(selectedMode);
                
                // Handle rule toggle states based on mode
                this.handleGameModeChange(selectedMode, isAIMode);
                
                // Set the game mode
                if (typeof this.game.setGameMode === 'function') {
                    this.game.setGameMode(selectedMode);
                }
            });
        }
        */

        // Bounce rule toggle
        if (this.elements.bounceToggle) {
            this.elements.bounceToggle.addEventListener('change', () => {
                // Only allow manual changes in human vs human mode
                if (this.elements.gameModeSelect.value === 'human') {
                    if (typeof this.game.setBounceRule === 'function') {
                        this.game.setBounceRule(this.elements.bounceToggle.checked);
                        this.game.resetGame();
                        
                        // NEW: Update rules SVG for human mode
                        this.assetManager.updateRulesForSettings({
                            bounceRuleEnabled: this.elements.bounceToggle.checked,
                            wrapRuleEnabled: this.elements.wrapToggle.checked,
                            missingTeethRuleEnabled: this.elements.missingTeethToggle.checked
                        });
                    }
                } else {
                    // Save the state even if disabled
                    this.savedRuleStates.bounce = this.elements.bounceToggle.checked;
                }
            });
        }
        
        // Wrap rule toggle
        if (this.elements.wrapToggle) {
            this.elements.wrapToggle.addEventListener('change', () => {
                // Only allow manual changes in human vs human mode
                if (this.elements.gameModeSelect.value === 'human') {
                    if (typeof this.game.setWrapRule === 'function') {
                        this.game.setWrapRule(this.elements.wrapToggle.checked);
                        this.game.resetGame();
                        
                        // NEW: Update rules SVG for human mode
                        this.assetManager.updateRulesForSettings({
                            bounceRuleEnabled: this.elements.bounceToggle.checked,
                            wrapRuleEnabled: this.elements.wrapToggle.checked,
                            missingTeethRuleEnabled: this.elements.missingTeethToggle.checked
                        });
                    }
                } else {
                    // Save the state even if disabled
                    this.savedRuleStates.wrap = this.elements.wrapToggle.checked;
                }
            });
        }
        
        // Missing teeth rule toggle
        if (this.elements.missingTeethToggle) {
            this.elements.missingTeethToggle.addEventListener('change', () => {
                // Only allow manual changes in human vs human mode
                if (this.elements.gameModeSelect.value === 'human') {
                    if (typeof this.game.setMissingTeethRule === 'function') {
                        this.game.setMissingTeethRule(this.elements.missingTeethToggle.checked);
                        this.game.resetGame();
                        
                        // NEW: Update rules SVG for human mode
                        this.assetManager.updateRulesForSettings({
                            bounceRuleEnabled: this.elements.bounceToggle.checked,
                            wrapRuleEnabled: this.elements.wrapToggle.checked,
                            missingTeethRuleEnabled: this.elements.missingTeethToggle.checked
                        });
                    }
                } else {
                    // Save the state even if disabled
                    this.savedRuleStates.missingTeeth = this.elements.missingTeethToggle.checked;
                }
            });
        }
        
        // Knight move rule toggle
        if (this.elements.knightMoveToggle) {
            this.elements.knightMoveToggle.addEventListener('change', () => {
                if (typeof this.game.setKnightMoveRule === 'function') {
                    this.game.setKnightMoveRule(this.elements.knightMoveToggle.checked);
                }
                // Save the state
                this.savedRuleStates.knightMove = this.elements.knightMoveToggle.checked;
            });
        }

        // Board size slider
        if (this.elements.boardSizeSlider && this.elements.sizeValueDisplay && this.boardUI) {
            this.elements.boardSizeSlider.addEventListener('input', () => {
                const percentage = this.elements.boardSizeSlider.value;
                this.elements.sizeValueDisplay.textContent = `${percentage}%`;
                if (typeof this.boardUI.resize === 'function') {
                    this.boardUI.resize(percentage);
                }
            });
        }

    }

    /**
     * NEW: Method to refresh the UI after popup changes
     * This is called by the popup when settings are changed
     */
    refreshAfterSettingsChange() {
        console.log('Refreshing UI after settings change');
        
        // Update the asset manager
        this.assetManager.updateGameModeSVG(this.game.gameMode);
        
        // Update rule display based on current mode
        if (this.game.gameMode !== 'human') {
            this.assetManager.updateRulesForGameMode(this.game.gameMode);
        } else {
            this.assetManager.updateRulesForSettings({
                bounceRuleEnabled: this.game.bounceRuleEnabled,
                wrapRuleEnabled: this.game.wrapRuleEnabled,
                missingTeethRuleEnabled: this.game.missingTeethRuleEnabled
            });
        }
        
        // Update all UI elements
        this.updateAll();
        
        // Apply current game state to any existing controls
        this.applySavedPreferences();
    }
    
    /**
     * Clean up resources when the UI is destroyed
     */
    destroy() {
        // NEW: Clean up the settings popup
        if (this.settingsPopup) {
            this.settingsPopup.destroy();
        }
        
        // Clean up other resources...
        console.log('GameUI destroyed');
    }
    
    /**
     * Show advanced clear options for users with cookies enabled
     */
    showAdvancedClearOptions() {
        const choice = confirm(
            'Advanced Clear Options:\n\n' +
            'OK = Clear ALL saved data (scores, preferences, tutorial status)\n' +
            'Cancel = Go back to simple score clearing'
        );
        
        if (choice) {
            // Clear all saved data
            if (typeof this.game.clearAllSavedData === 'function') {
                this.game.clearAllSavedData();
            }
        } else {
            // Go back to simple clearing
            if (confirm('Clear Round Wins and Matches Won for this session?')) {
                if (typeof this.game.clearScores === 'function') {
                    this.game.clearScores();
                }
                if (typeof this.game.resetMatchScores === 'function') {
                    this.game.resetMatchScores();
                }
            }
        }
    }
    


    /**
     * Handle game mode changes and rule toggle states
     * @param {string} selectedMode - The selected game mode
     * @param {boolean} isAIMode - Whether an AI mode is selected
     */
    handleGameModeChange(selectedMode, isAIMode) {
        // Enable/disable rule toggles based on mode
        if (isAIMode) {
            // Save current states before disabling
            if (this.elements.bounceToggle) {
                this.savedRuleStates.bounce = this.elements.bounceToggle.checked;
                this.elements.bounceToggle.disabled = true;
            }
            if (this.elements.wrapToggle) {
                this.savedRuleStates.wrap = this.elements.wrapToggle.checked;
                this.elements.wrapToggle.disabled = true;
            }
            if (this.elements.missingTeethToggle) {
                this.savedRuleStates.missingTeeth = this.elements.missingTeethToggle.checked;
                this.elements.missingTeethToggle.disabled = true;
            }
            
            // Set rule toggles based on difficulty level
            this.setRuleTogglesForLevel(selectedMode);
            
            // NEW: Update rules SVG for AI mode
            this.assetManager.updateRulesForGameMode(selectedMode);
            
            // Add visual indication that these are controlled by level
            this.addLevelControlIndicator();
            
        } else {
            // Human vs Human mode - restore manual control
            if (this.elements.bounceToggle) {
                this.elements.bounceToggle.disabled = false;
                this.elements.bounceToggle.checked = this.savedRuleStates.bounce;
            }
            if (this.elements.wrapToggle) {
                this.elements.wrapToggle.disabled = false;
                this.elements.wrapToggle.checked = this.savedRuleStates.wrap;
            }
            if (this.elements.missingTeethToggle) {
                this.elements.missingTeethToggle.disabled = false;
                this.elements.missingTeethToggle.checked = this.savedRuleStates.missingTeeth;
            }
            
            // NEW: Update rules SVG for human mode
            this.assetManager.updateRulesForSettings({
                bounceRuleEnabled: this.savedRuleStates.bounce,
                wrapRuleEnabled: this.savedRuleStates.wrap,
                missingTeethRuleEnabled: this.savedRuleStates.missingTeeth
            });
            
            // Remove level control indicator
            this.removeLevelControlIndicator();
        }
        
        // Knight Move Rule remains always controllable
        if (this.elements.knightMoveToggle) {
            this.elements.knightMoveToggle.disabled = false;
            this.elements.knightMoveToggle.checked = this.savedRuleStates.knightMove;
        }
    }
    
    /**
     * Set rule toggles based on difficulty level
     * @param {string} level - The difficulty level (level1, level2, level3, level4)
     */
    setRuleTogglesForLevel(level) {
        let bounceEnabled = false;
        let wrapEnabled = false;
        
        switch(level) {
            case 'level1':
                // Basic rules only
                bounceEnabled = false;
                wrapEnabled = false;
                break;
            case 'level2':
                // Basic + Bounce
                bounceEnabled = true;
                wrapEnabled = false;
                break;
            case 'level3':
                // Basic + Wrap (no bounce)
                bounceEnabled = false;
                wrapEnabled = true;
                break;
            case 'level4':
                // All rules
                bounceEnabled = true;
                wrapEnabled = true;
                break;
        }
        
        // Update the UI toggles to reflect the level settings
        if (this.elements.bounceToggle) {
            this.elements.bounceToggle.checked = bounceEnabled;
        }
        
        if (this.elements.wrapToggle) {
            this.elements.wrapToggle.checked = wrapEnabled;
        }
    }
    
    /**
     * Add visual indicator that rules are controlled by level
     */
    addLevelControlIndicator() {
        // Add a subtle visual indication that these controls are level-managed
        if (this.elements.bounceToggle && this.elements.bounceToggle.parentElement) {
            this.elements.bounceToggle.parentElement.classList.add('level-controlled');
            
            // Update tooltip or add explanation
            const tooltip = this.elements.bounceToggle.parentElement.querySelector('.tooltip');
            if (tooltip) {
                tooltip.textContent = 'This rule is controlled by the selected difficulty level.';
            }
        }
        
        if (this.elements.wrapToggle && this.elements.wrapToggle.parentElement) {
            this.elements.wrapToggle.parentElement.classList.add('level-controlled');
            
            const tooltip = this.elements.wrapToggle.parentElement.querySelector('.tooltip');
            if (tooltip) {
                tooltip.textContent = 'This rule is controlled by the selected difficulty level.';
            }
        }
        
        if (this.elements.missingTeethToggle && this.elements.missingTeethToggle.parentElement) {
            this.elements.missingTeethToggle.parentElement.classList.add('level-controlled');
            
            const tooltip = this.elements.missingTeethToggle.parentElement.querySelector('.tooltip');
            if (tooltip) {
                tooltip.textContent = 'This rule is controlled by the selected difficulty level.';
            }
        }
    }
    
    /**
     * Remove visual indicator for level control
     */
    removeLevelControlIndicator() {
        if (this.elements.bounceToggle && this.elements.bounceToggle.parentElement) {
            this.elements.bounceToggle.parentElement.classList.remove('level-controlled');
            
            // Restore original tooltip
            const tooltip = this.elements.bounceToggle.parentElement.querySelector('.tooltip');
            if (tooltip) {
                tooltip.textContent = 'When enabled, diagonals can also "bounce" off edges to form a winning line.';
            }
        }
        
        if (this.elements.wrapToggle && this.elements.wrapToggle.parentElement) {
            this.elements.wrapToggle.parentElement.classList.remove('level-controlled');
            
            const tooltip = this.elements.wrapToggle.parentElement.querySelector('.tooltip');
            if (tooltip) {
                tooltip.textContent = 'When enabled, the board "wraps around" - left connects to right, top connects to bottom.';
            }
        }
        
        if (this.elements.missingTeethToggle && this.elements.missingTeethToggle.parentElement) {
            this.elements.missingTeethToggle.parentElement.classList.remove('level-controlled');
            
            const tooltip = this.elements.missingTeethToggle.parentElement.querySelector('.tooltip');
            if (tooltip) {
                tooltip.textContent = 'When enabled, players can\'t win with gaps in rows, columns, or main diagonals';
            }
        }
    }
    
    /**
     * Register game event handlers
     */
    registerGameEvents() {
        if (typeof this.game.on !== 'function') {
            console.error('Game does not have an "on" method for event registration');
            return;
        }
        
        // NEW: Listen for cookie consent changes
        this.game.on('cookieConsentChanged', (data) => {
            console.log('Cookie consent changed:', data.enabled);
            
            // ALWAYS apply current game state to UI, regardless of cookie status
            // This fixes the visual disconnect issue
            this.applySavedPreferences();
            
            // Update clear scores button behavior
            this.updateClearScoresButtonText();
        });
        
        // Game reset event - important to handle this first
        this.game.on('gameReset', (data) => {
            console.log('Game reset event received', data);
            
            if (this.boardUI) {
                // IMPORTANT: Remove the game-over class to re-enable hover effects
                if (this.boardUI.gameBoard) {
                    this.boardUI.gameBoard.classList.remove('game-over');
                }
                
                // Make sure to clear all highlighting on reset
                if (typeof this.boardUI.clearHighlights === 'function') {
                    this.boardUI.clearHighlights();
                }
                
                if (typeof this.boardUI.updateBoard === 'function') {
                    this.boardUI.updateBoard(data.board);
                }
            }
            
            // NEW: Update turn indicator using asset manager
            this.assetManager.updateTurnIndicator(data.currentPlayer, 'playing');
            
            // Keep existing legacy support
            if (this.elements.playerTurn) {
                this.elements.playerTurn.textContent = `Player ${data.currentPlayer}'s Turn`;
            }
            
            this.updateScores(data.scores);
            
            if (data.matchScores) {
                this.updateMatchScores({
                    matchScores: data.matchScores,
                    matchWinner: data.matchWinner
                });
            }
        });
        
        // Move event
        this.game.on('move', (data) => {
            console.log('Move event received', data);
            
            if (this.boardUI && typeof this.boardUI.updateBoard === 'function') {
                this.boardUI.updateBoard(data.board);
                
                if (typeof this.boardUI.highlightLastMove === 'function') {
                    this.boardUI.highlightLastMove({
                        row: data.row,
                        col: data.col,
                        player: data.player
                    });
                }
            }
        });
        
        // Knight move required event
        this.game.on('knightMoveRequired', (data) => {
            console.log('Knight move required event received', data);
            
            if (this.boardUI && typeof this.boardUI.setKnightMoveRequired === 'function') {
                this.boardUI.setKnightMoveRequired(true, data.validMoves);
                
                // Highlight the first move as a reference
                if (typeof this.boardUI.highlightFirstMove === 'function') {
                    this.boardUI.highlightFirstMove(data.firstMove);
                }
                
                // Update player turn display to indicate knight move is required
                const playerTurnElement = document.querySelector('.player-turn-indicator');
                if (playerTurnElement) {
                    playerTurnElement.textContent = 'Player X\'s Turn';
                }
                
                // Add the knight move message to the special message area
                const specialMessageElement = document.getElementById('special-message');
                if (specialMessageElement) {
                    specialMessageElement.innerHTML = '<span class="knight-move-indicator">♘</span> Knight Move Required';
                }
            }
        });
        
        // Knight move rule toggled event
        this.game.on('knightMoveRuleToggled', (data) => {
            if (this.elements.knightMoveToggle) {
                this.elements.knightMoveToggle.checked = data.enabled;
            }
        });
        
        // Game end event
        this.game.on('gameEnd', (data) => {
            // Disable hover effects on the game board
            if (this.boardUI && this.boardUI.gameBoard) {
                this.boardUI.gameBoard.classList.add('game-over');
            }
            
            // NEW: Update turn indicator using asset manager
            if (data.type === 'win') {
                this.assetManager.updateTurnIndicator(data.winner, 'win');
            } else if (data.type === 'draw') {
                this.assetManager.updateTurnIndicator(null, 'draw');
                // Show browser alert for draw
                setTimeout(() => {
                    if (data.declaredDraw) {
                        alert("Draw declared by player!");
                    } else {
                        alert("It's a draw! The board is full.");
                    }
                }, 500); 
            
            }
            
            // Keep existing legacy support
            const playerTurnElement = document.querySelector('.player-turn-indicator');
            if (playerTurnElement) {
                if (data.type === 'win') {
                    playerTurnElement.textContent = `Player ${data.winner} wins!`;
                } else if (data.type === 'draw') {
                    // Handle declared draws with different messaging
                    if (data.declaredDraw) {
                        playerTurnElement.textContent = "Draw declared!";
                    } else {
                        playerTurnElement.textContent = "It's a draw!";
                    }
                }
            }
            
            if (data.type === 'win' && this.boardUI && typeof this.boardUI.highlightWinningCells === 'function') {
                this.boardUI.highlightWinningCells(
                    data.winningCells,
                    data.bounceCellIndex,
                    data.secondBounceCellIndex,
                    data.lastMove
                );
            }
        });
        
        // Turn change event
        this.game.on('turnChange', (data) => {
            console.log('Turn change event received', data);
            
            // NEW: Update turn indicator using asset manager
            this.assetManager.updateTurnIndicator(data.currentPlayer, 'playing');
            
            // Keep existing legacy support
            const playerTurnElement = document.querySelector('.player-turn-indicator');
            const specialMessageElement = document.getElementById('special-message');
            
            if (playerTurnElement) {
                // Update player turn text
                playerTurnElement.textContent = `Player ${data.currentPlayer}'s Turn`;
            }
            
            // Clear any knight move indicators if not required
            if (!data.isKnightMoveRequired && specialMessageElement) {
                specialMessageElement.innerHTML = '';
                
                // Clear knight move highlighting if not required
                if (this.boardUI && typeof this.boardUI.setKnightMoveRequired === 'function') {
                    this.boardUI.setKnightMoveRequired(false);
                }
            }
            
            if (this.boardUI && typeof this.boardUI.setCurrentPlayer === 'function') {
                this.boardUI.setCurrentPlayer(data.currentPlayer);
            }
        });
        
        // Score update event
        this.game.on('scoreUpdate', (data) => {
            this.updateScores(data.scores);
        });
        
        // Match score update event
        this.game.on('matchScoreUpdate', (data) => {
            this.updateMatchScores(data);
        });
        
        // Match won event
        this.game.on('matchWon', (data) => {
            // NEW: Update turn indicator for match completion
            this.assetManager.updateTurnIndicator(data.winner, 'match_complete');
            
            // Show prominent victory message
            this.showMatchVictory(data.winner);
            
            // Update UI
            this.updateMatchScores({
                matchScores: data.matchScores,
                matchWinner: data.winner
            });
            
            // Change the reset button to indicate starting a new match
            if (this.elements.resetButton) {
                this.elements.resetButton.textContent = 'Start New Match';
                this.elements.resetButton.classList.add('new-match-button');
            }
        });
        
        // AI thinking event
        this.game.on('aiThinking', () => {
            if (this.boardUI && typeof this.boardUI.setAiThinking === 'function') {
                this.boardUI.setAiThinking(true);
            }
            
            // Add a text message to indicate AI is thinking
            const specialMessageElement = document.getElementById('special-message');
            if (specialMessageElement) {
                specialMessageElement.innerHTML = '<span class="thinking-indicator">Computer is thinking...</span>';
            }
        });

        // AI move complete event
        this.game.on('aiMoveComplete', () => {
            if (this.boardUI && typeof this.boardUI.setAiThinking === 'function') {
                this.boardUI.setAiThinking(false);
            }
            
            // Clear the message when AI is done thinking
            const specialMessageElement = document.getElementById('special-message');
            if (specialMessageElement) {
                specialMessageElement.innerHTML = '';
            }
        });
    }
    
    /**
     * Update the clear scores button text based on cookie status
     */
    updateClearScoresButtonText() {
        if (this.elements.clearScoresButton) {
            if (this.game.cookiesEnabled) {
                this.elements.clearScoresButton.textContent = 'Reset';
                this.elements.clearScoresButton.title = 'Clear scores and access advanced options';
            } else {
                this.elements.clearScoresButton.textContent = 'Reset';
                this.elements.clearScoresButton.title = 'Clear scores for this session';
            }
        }
    }
    
    /**
     * Handle cell click
     * @param {number} row - Row index
     * @param {number} col - Column index
     */
    handleCellClick(row, col) {
        if (typeof this.game.makeMove === 'function') {
            this.game.makeMove(row, col);
        }
    }
    
    /**
     * Update scores display
     * @param {Object} scores - Scores object { X: number, O: number }
     */
    updateScores(scores) {
        if (this.elements.scoreX) {
            this.elements.scoreX.textContent = scores.X;
        }
        
        if (this.elements.scoreO) {
            this.elements.scoreO.textContent = scores.O;
        }
    }
    
    /**
     * Display a match victory celebration
     * @param {string} winner - The winner of the match
     */
    showMatchVictory(winner) {
        // Use the special-message div
        const specialMessageElement = document.getElementById('special-message');
        if (specialMessageElement) {
            specialMessageElement.innerHTML = `<span class="victory-indicator">🏆 Player ${winner} has won the match! 🏆</span>`;
            
            // Clear the message after a delay
            setTimeout(() => {
                specialMessageElement.innerHTML = '';
            }, 60000);
        }
        
        // Change the player turn indicator to show match completion instead of turns
        const playerTurnElement = document.querySelector('.player-turn-indicator');
        if (playerTurnElement) {
            playerTurnElement.innerHTML = `<span class="match-champion">Match Complete</span>`;
        }
        
        // Change the reset button to indicate starting a new match
        if (this.elements.resetButton) {
            this.elements.resetButton.textContent = 'Start New Match';
            this.elements.resetButton.classList.add('new-match-button');
        }
        
        // Disable hover effects on the game board by adding a game-over class
        if (this.boardUI && this.boardUI.gameBoard) {
            this.boardUI.gameBoard.classList.add('game-over');
        }
    }
    
    /**
     * Update match scores display
     * @param {Object} data - Match data { matchScores, matchWinner, roundScores }
     */
    updateMatchScores(data) {
        // Update match scores - these are matches won (not rounds won)
        if (this.elements.matchScoreX) {
            this.elements.matchScoreX.textContent = data.matchScores?.X || 0;
        }
        
        if (this.elements.matchScoreO) {
            this.elements.matchScoreO.textContent = data.matchScores?.O || 0;
        }
        
        // Update match status message only for specific events, not for the generic text
        const matchStatusElement = document.getElementById('match-status');
        const specialMessageElement = document.getElementById('special-message');

        if (matchStatusElement && specialMessageElement) {
            if (data.matchWinner) {
                // There's a winner for the current match sequence
                matchStatusElement.classList.add('match-winner');
                
                // Change the reset button text to indicate starting a new match
                if (this.elements.resetButton) {
                    this.elements.resetButton.textContent = 'Start New Match';
                    this.elements.resetButton.classList.add('new-match-button');
                }
            } else {
                // Calculate progress toward match win
                const roundScores = data.roundScores || { X: 0, O: 0 };
                const xScore = roundScores.X || 0;
                const oScore = roundScores.O || 0;
                const threshold = this.game.matchWinThreshold || 8;
                const margin = this.game.matchWinMargin || 2;
                
                // Only show specific progress messages, and put them in special-message instead
                if (xScore >= threshold && xScore - oScore === margin - 1) {
                    specialMessageElement.innerHTML = "<span class='match-progress'>Player X needs 1 more win for match!</span>";
                } else if (oScore >= threshold && oScore - xScore === margin - 1) {
                    specialMessageElement.innerHTML = "<span class='match-progress'>Player O needs 1 more win for match!</span>";
                } else if (xScore >= threshold - 1 && oScore <= xScore - margin + 1) {
                    specialMessageElement.innerHTML = "<span class='match-progress'>Player X nearing match win!</span>";
                } else if (oScore >= threshold - 1 && xScore <= oScore - margin + 1) {
                    specialMessageElement.innerHTML = "<span class='match-progress'>Player O nearing match win!</span>";
                } else {
                    // Clear any existing messages
                    specialMessageElement.innerHTML = "";
                }
                
                // Always keep match-status empty as we're using the static text in match-rules
                matchStatusElement.textContent = "";
                matchStatusElement.classList.remove('match-winner');
                
                // Reset the button text if it was changed
                if (this.elements.resetButton && this.elements.resetButton.textContent !== 'New Game') {
                    this.elements.resetButton.textContent = 'New Game';
                    this.elements.resetButton.classList.remove('new-match-button');
                }
            }
        }
    }
    
    /**
     * Update all UI elements based on current game state
     */
    updateAll() {
        try {
            console.log('Updating all UI elements');
            
            // Get game status first
            let gameStatus = null;
            if (typeof this.game.getGameStatus === 'function') {
                gameStatus = this.game.getGameStatus();
                console.log('Game status:', gameStatus);
            }
            
            // Update board if we have access to the board state
            if (this.boardUI && typeof this.game.getBoardState === 'function') {
                this.boardUI.updateBoard(this.game.getBoardState());
            }
            
            // Default values
            let currentPlayer = 'X';
            let gameActive = true;
            let isKnightMoveRequired = false;
            
            // Use game status if available
            if (gameStatus) {
                gameActive = gameStatus.active;
                currentPlayer = gameStatus.currentPlayer;
                isKnightMoveRequired = gameStatus.isKnightMoveRequired;
                
                // If knight move is required, update the UI
                if (isKnightMoveRequired && gameStatus.firstPlayerFirstMove) {
                    console.log('Knight move required according to game status');
                    
                    // Get valid knight moves
                    const validMoves = this.game.getValidKnightMoves(
                        gameStatus.firstPlayerFirstMove.row,
                        gameStatus.firstPlayerFirstMove.col
                    );
                    
                    if (this.boardUI && typeof this.boardUI.setKnightMoveRequired === 'function') {
                        this.boardUI.setKnightMoveRequired(true, validMoves);
                        this.boardUI.highlightFirstMove(gameStatus.firstPlayerFirstMove);
                    }
                    
                    // Update player turn text
                    if (this.elements.playerTurn) {
                        this.elements.playerTurn.innerHTML = 
                            `Player X's Turn <span class="knight-move-indicator">♘ Knight Move Required</span>`;
                    }
                } else {
                    // Ensure knight move requirements are cleared if not needed
                    if (this.boardUI && typeof this.boardUI.setKnightMoveRequired === 'function') {
                        this.boardUI.setKnightMoveRequired(false);
                    }
                }
            } else if (typeof this.game.getCurrentPlayer === 'function') {
                currentPlayer = this.game.getCurrentPlayer();
            }
            
            // NEW: Update turn indicator using asset manager if not knight move required
            if (!isKnightMoveRequired) {
                this.assetManager.updateTurnIndicator(currentPlayer, gameActive ? 'playing' : 'game_over');
            }
            
            // Update player turn display if knight move not required
            if (this.elements.playerTurn && !isKnightMoveRequired) {
                if (gameActive) {
                    this.elements.playerTurn.textContent = `Player ${currentPlayer}'s Turn`;
                }
            }
            
            // Update clear scores button text
            this.updateClearScoresButtonText();
            
        } catch (error) {
            console.error('Error in updateAll:', error);
        }
    }
    
    /**
     * Display a game message to the user
     * @param {string} message - Message to display
     * @param {string} type - Message type ('info', 'success', 'error', 'victory')
     */
    showMessage(message, type = 'info') {
        try {
            // Check if a message container exists, or create one
            let messageContainer = document.querySelector('.game-messages');
            
            if (!messageContainer) {
                messageContainer = document.createElement('div');
                messageContainer.className = 'game-messages';
                
                // Insert after the player turn display
                if (this.elements.playerTurn) {
                    this.elements.playerTurn.parentNode.insertBefore(
                        messageContainer,
                        this.elements.playerTurn.nextSibling
                    );
                } else {
                    // Fall back to inserting before the game board
                    const gameBoard = document.getElementById('game-board');
                    if (gameBoard) {
                        gameBoard.parentNode.insertBefore(messageContainer, gameBoard);
                    }
                }
            }
            
            // Create message element
            const messageElement = document.createElement('div');
            messageElement.className = `game-message message-${type}`;
            messageElement.textContent = message;
            
            // Add to container
            messageContainer.appendChild(messageElement);
            
            // For victory messages, keep them visible longer
            const displayTime = type === 'victory' ? 8000 : 3000;
            
            // Remove after delay
            setTimeout(() => {
                messageElement.classList.add('message-fade');
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 500);
            }, displayTime);
        } catch (error) {
            console.error('Error showing message:', error);
        }
    }
}
export default GameUI;