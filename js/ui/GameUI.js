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
            resetButton: null,
            gameModeSelect: null,
            bounceToggle: null,
            missingTeethToggle: null,
            boardSizeSlider: null,
            sizeValueDisplay: null
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
            this.elements.resetButton = document.getElementById('reset-button');
            this.elements.gameModeSelect = document.getElementById('game-mode-select');
            this.elements.bounceToggle = document.getElementById('bounce-toggle');
            this.elements.missingTeethToggle = document.getElementById('missing-teeth-toggle');
            this.elements.boardSizeSlider = document.getElementById('board-size-slider');
            this.elements.sizeValueDisplay = document.getElementById('size-value');
            
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
                this.game.resetGame();
            });
        }
        
        // Game mode select
        if (this.elements.gameModeSelect) {
            this.elements.gameModeSelect.addEventListener('change', (e) => {
                if (typeof this.game.setGameMode === 'function') {
                    this.game.setGameMode(e.target.value);
                }
            });
        }
        
        // Bounce rule toggle
        if (this.elements.bounceToggle) {
            this.elements.bounceToggle.addEventListener('change', () => {
                if (typeof this.game.setBounceRule === 'function') {
                    this.game.setBounceRule(this.elements.bounceToggle.checked);
                    this.game.resetGame();
                }
            });
        }
        
        // Missing teeth rule toggle
        if (this.elements.missingTeethToggle) {
            this.elements.missingTeethToggle.addEventListener('change', () => {
                if (typeof this.game.setMissingTeethRule === 'function') {
                    this.game.setMissingTeethRule(this.elements.missingTeethToggle.checked);
                    this.game.resetGame();
                }
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
     * Register game event handlers
     */
    registerGameEvents() {
        if (typeof this.game.on !== 'function') {
            console.error('Game does not have an "on" method for event registration');
            return;
        }
        
        // Move event
        this.game.on('move', (data) => {
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
        
        // Game end event
        this.game.on('gameEnd', (data) => {
            if (data.type === 'win') {
                if (this.elements.playerTurn) {
                    this.elements.playerTurn.textContent = `Player ${data.winner} wins!`;
                }
                
                if (this.boardUI && typeof this.boardUI.highlightWinningCells === 'function') {
                    this.boardUI.highlightWinningCells(
                        data.winningCells,
                        data.bounceCellIndex,
                        data.secondBounceCellIndex
                    );
                }
            } else {
                if (this.elements.playerTurn) {
                    this.elements.playerTurn.textContent = "It's a draw!";
                }
            }
        });
        
        // Turn change event
        this.game.on('turnChange', (data) => {
            if (this.elements.playerTurn) {
                this.elements.playerTurn.textContent = `Player ${data.currentPlayer}'s Turn`;
            }
            
            if (this.boardUI && typeof this.boardUI.setCurrentPlayer === 'function') {
                this.boardUI.setCurrentPlayer(data.currentPlayer);
            }
        });
        
        // Score update event
        this.game.on('scoreUpdate', (data) => {
            this.updateScores(data.scores);
        });
        
        // Game reset event
        this.game.on('gameReset', (data) => {
            if (this.boardUI) {
                if (typeof this.boardUI.updateBoard === 'function') {
                    this.boardUI.updateBoard(data.board);
                }
                
                if (typeof this.boardUI.clearHighlights === 'function') {
                    this.boardUI.clearHighlights();
                }
            }
            
            if (this.elements.playerTurn) {
                this.elements.playerTurn.textContent = `Player ${data.currentPlayer}'s Turn`;
            }
            
            this.updateScores(data.scores);
        });
        
        // AI thinking event
        this.game.on('aiThinking', () => {
            if (this.boardUI && typeof this.boardUI.setAiThinking === 'function') {
                this.boardUI.setAiThinking(true);
            }
        });
        
        // AI move complete event
        this.game.on('aiMoveComplete', () => {
            if (this.boardUI && typeof this.boardUI.setAiThinking === 'function') {
                this.boardUI.setAiThinking(false);
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
     * Update all UI elements based on current game state
     */
    updateAll() {
        try {
            // Update board if we have access to the board state
            if (this.boardUI && typeof this.game.getBoardState === 'function') {
                this.boardUI.updateBoard(this.game.getBoardState());
            }
            
            // Update player turn
            let currentPlayer = 'X';
            let gameActive = true;
            
            // Try to get game status if the method exists
            if (typeof this.game.getGameStatus === 'function') {
                const gameStatus = this.game.getGameStatus();
                gameActive = gameStatus.active;
                currentPlayer = gameStatus.currentPlayer;
            } else if (typeof this.game.getCurrentPlayer === 'function') {
                currentPlayer = this.game.getCurrentPlayer();
            }
            
            if (this.elements.playerTurn) {
                if (gameActive) {
                    this.elements.playerTurn.textContent = `Player ${currentPlayer}'s Turn`;
                }
            }
            
            // Update scores
            if (typeof this.game.getScores === 'function') {
                this.updateScores(this.game.getScores());
            }
            
            // Update controls based on current settings
            if (this.elements.gameModeSelect && typeof this.game.gameMode !== 'undefined') {
                this.elements.gameModeSelect.value = this.game.gameMode;
            }
            
            if (this.elements.bounceToggle && typeof this.game.bounceRuleEnabled !== 'undefined') {
                this.elements.bounceToggle.checked = this.game.bounceRuleEnabled;
            }
            
            if (this.elements.missingTeethToggle && typeof this.game.missingTeethRuleEnabled !== 'undefined') {
                this.elements.missingTeethToggle.checked = this.game.missingTeethRuleEnabled;
            }
            
            // Update last move highlight
            if (this.boardUI && typeof this.boardUI.highlightLastMove === 'function') {
                let lastMove = null;
                
                // Try both possible methods to get the last move
                if (typeof this.game.getLastMove === 'function') {
                    lastMove = this.game.getLastMove();
                } else if (this.game.lastMove) {
                    lastMove = { ...this.game.lastMove };
                }
                
                if (lastMove) {
                    this.boardUI.highlightLastMove(lastMove);
                }
            }
        } catch (error) {
            console.error('Error in updateAll:', error);
        }
    }
    
    /**
     * Display a game message to the user
     * @param {string} message - Message to display
     * @param {string} type - Message type ('info', 'success', 'error')
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
            
            // Remove after delay
            setTimeout(() => {
                messageElement.classList.add('message-fade');
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 500);
            }, 3000);
        } catch (error) {
            console.error('Error showing message:', error);
        }
    }
}