/**
 * GameUI.js - UI components and events for Kalida
 * 
 * Handles all UI components and user interactions, 
 * connecting DOM elements to game functionality
 * 
 */

class GameUI {
    /**
     * Create a new game UI
     * @param {Game} game - The game instance to connect with
     */
    constructor(game) {
        this.game = game;
        this.boardUI = null;
        
        // Store references to DOM elements
        this.elements = {
            playerTurn: null,
            scoreX: null,
            scoreO: null,
            matchScoreX: null,
            matchScoreO: null,
            matchStatus: null,
            resetButton: null,
            clearScoresButton: null,
            gameModeSelect: null,
            bounceToggle: null,
            wrapToggle: null,
            missingTeethToggle: null,
            boardSizeSlider: null,
            sizeValueDisplay: null,
            knightMoveToggle: null
        };
        
        // Track rule toggle states when they're disabled for AI mode
        this.savedRuleStates = {
            bounce: true,
            wrap: true,
            missingTeeth: true,
            knightMove: true
        };
        
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
            this.elements.clearScoresButton = document.getElementById('clear-scores-button');
            this.elements.gameModeSelect = document.getElementById('game-mode-select');
            this.elements.bounceToggle = document.getElementById('bounce-toggle');
            this.elements.wrapToggle = document.getElementById('wrap-toggle');
            this.elements.missingTeethToggle = document.getElementById('missing-teeth-toggle');
            this.elements.boardSizeSlider = document.getElementById('board-size-slider');
            this.elements.sizeValueDisplay = document.getElementById('size-value');
            this.elements.knightMoveToggle = document.getElementById('knight-move-toggle');
            
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
            
            // Initialize the UI with current game state
            this.updateAll();
            
            console.log('GameUI initialization complete');
        } catch (error) {
            console.error('Error initializing GameUI:', error);
        }
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
        
        // Clear scores button - FIXED: Single confirmation for both round and match scores
        if (this.elements.clearScoresButton) {
            this.elements.clearScoresButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all scores?\n\nThis will reset both Round Wins and Matches Won to 0.')) {
                    if (typeof this.game.clearScores === 'function') {
                        this.game.clearScores();
                    }
                    if (typeof this.game.resetMatchScores === 'function') {
                        this.game.resetMatchScores();
                    }
                }
            });
        }
        
        // Game mode select - UPDATED for new level system
        if (this.elements.gameModeSelect) {
            this.elements.gameModeSelect.addEventListener('change', (e) => {
                const selectedMode = e.target.value;
                const isAIMode = selectedMode !== 'human';
                
                // Handle rule toggle states based on mode
                this.handleGameModeChange(selectedMode, isAIMode);
                
                // Set the game mode
                if (typeof this.game.setGameMode === 'function') {
                    this.game.setGameMode(selectedMode);
                }
            });
        }
        
        // Bounce rule toggle
        if (this.elements.bounceToggle) {
            this.elements.bounceToggle.addEventListener('change', () => {
                // Only allow manual changes in human vs human mode
                if (this.elements.gameModeSelect.value === 'human') {
                    if (typeof this.game.setBounceRule === 'function') {
                        this.game.setBounceRule(this.elements.bounceToggle.checked);
                        this.game.resetGame();
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
        
        // Game reset event - important to handle this first
        this.game.on('gameReset', (data) => {
            console.log('Game reset event received', data);
            
            if (this.boardUI) {
                // Make sure to clear all highlighting on reset
                if (typeof this.boardUI.clearHighlights === 'function') {
                    this.boardUI.clearHighlights();
                }
                
                if (typeof this.boardUI.updateBoard === 'function') {
                    this.boardUI.updateBoard(data.board);
                }
            }
            
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
                // Instead of modifying player-turn, use our new message container
                const playerTurnElement = document.querySelector('.player-turn-indicator');
                if (playerTurnElement) {
                    playerTurnElement.textContent = 'Player X\'s Turn';
                }
                
                // Add the knight move message to the special message area
                const specialMessageElement = document.getElementById('special-message');
                if (specialMessageElement) {
                    specialMessageElement.innerHTML = '<span class="knight-move-indicator">♘</span> Knight Move Required';
                }
                
                // No need for the temporary message - removing this line
                // this.showMessage('Player X must make a knight move (like in chess)', 'info');
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
            
            // Update player turn display to show game result instead of whose turn it is
            const playerTurnElement = document.querySelector('.player-turn-indicator');
            if (playerTurnElement) {
                if (data.type === 'win') {
                    playerTurnElement.textContent = `Player ${data.winner} wins!`;
                } else {
                    playerTurnElement.textContent = "It's a draw!";
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
        
        // Game reset event
        this.game.on('gameReset', (data) => {
            if (this.boardUI) {
                // Clear highlighting
                if (typeof this.boardUI.clearHighlights === 'function') {
                    this.boardUI.clearHighlights();
                }
                
                // Update the board
                if (typeof this.boardUI.updateBoard === 'function') {
                    this.boardUI.updateBoard(data.board);
                }
                
                // Re-enable hover effects by removing the game-over class
                if (this.boardUI.gameBoard) {
                    this.boardUI.gameBoard.classList.remove('game-over');
                }
            }
            
            // Restore the player turn indicator
            const playerTurnElement = document.querySelector('.player-turn-indicator');
            if (playerTurnElement) {
                playerTurnElement.textContent = `Player ${data.currentPlayer}'s Turn`;
            }
            
            // Clear any special messages
            const specialMessageElement = document.getElementById('special-message');
            if (specialMessageElement) {
                specialMessageElement.innerHTML = '';
            }
            
            this.updateScores(data.scores);
            
            if (data.matchScores) {
                this.updateMatchScores({
                    matchScores: data.matchScores,
                    matchWinner: data.matchWinner
                });
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
        // Instead of calling this.showMessage, use the special-message div
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
            
            // Update player turn display if knight move not required
            if (this.elements.playerTurn && !isKnightMoveRequired) {
                if (gameActive) {
                    this.elements.playerTurn.textContent = `Player ${currentPlayer}'s Turn`;
                }
            }
            
            // Update all other UI elements...
            // [rest of the method stays the same]
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