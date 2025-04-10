/**
 * Game.js - Game flow and state management for Kalida
 */
class Game {
    /**
     * Create a new game
     * @param {number} boardSize - Size of the game board
     */
    constructor(boardSize) {
        this.boardSize = boardSize;
        this.board = new Board(boardSize);
        this.rules = new Rules(boardSize);
        this.currentPlayer = 'X';
        this.gameActive = true;
        
        // Round scores - single game wins
        this.scores = { 'X': 0, 'O': 0 };
        
        // Match scores - tracking of matches won (when a player reaches 8 round wins with 2+ margin)
        this.matchScores = { 'X': 0, 'O': 0 };
        this.matchWinThreshold = 8; // Need 8 round wins to potentially win a match
        this.matchWinMargin = 2;    // Must have 2 more round wins than opponent
        this.matchWinner = null;    // Tracks if current round sequence has a match winner
        this.matchJustWon = false;  // Flag to track if a match was just won (for resetting on next game)
        
        this.lastMove = null;
        this.bounceRuleEnabled = true;
        this.missingTeethRuleEnabled = true;
        this.gameMode = 'human'; // Default: human vs human
        this.computerPlayer = 'O'; // Computer plays as O by default
        this.aiDifficulty = 'medium'; // Default AI difficulty
        
        // Initialize AI based on the difficulty level
        this.ai = null; // Will be initialized when needed
        
        // Event system
        this.eventListeners = {
            'move': [],
            'gameEnd': [],
            'turnChange': [],
            'scoreUpdate': [],
            'matchScoreUpdate': [], // New event for match score updates
            'matchWon': [],         // New event for when a match is won
            'gameReset': [],
            'aiThinking': [],
            'aiMoveComplete': []
        };
    }
    
    /**
     * Initialize the game
     */
    initialize() {
        this.resetGame();
        this.triggerEvent('gameReset', {
            board: this.board.getState(),
            currentPlayer: this.currentPlayer,
            scores: { ...this.scores },
            matchScores: { ...this.matchScores },
            matchWinner: this.matchWinner
        });
    }
    
    /**
     * Make a move
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean} - Whether the move was successful
     */
    makeMove(row, col) {
        // If the game is not active or the cell is already taken, do nothing
        if (!this.gameActive || !this.board.isEmptyAt(row, col)) {
            return false;
        }
        
        // Make the move
        const moveMade = this.board.makeMove(row, col, this.currentPlayer);
        if (!moveMade) return false;
        
        // Keep track of the last move
        this.lastMove = { row, col, player: this.currentPlayer };
        
        // Notify move made
        this.triggerEvent('move', {
            row,
            col,
            player: this.currentPlayer,
            board: this.board.getState()
        });
        
        // Check for a win or draw
        const gameStatus = this.rules.checkGameStatus(
            this.board.getState(),
            this.bounceRuleEnabled,
            this.missingTeethRuleEnabled
        );
        
        if (gameStatus.isOver) {
            this.gameActive = false;
            
            if (gameStatus.winner) {
                // Update round score
                this.scores[gameStatus.winner]++;
                
                // Check if this round win leads to a match win
                this.checkForMatchWin(gameStatus.winner);
                
                this.triggerEvent('gameEnd', {
                    type: 'win',
                    winner: gameStatus.winner,
                    winningCells: gameStatus.winningCells,
                    bounceCellIndex: gameStatus.bounceCellIndex,
                    secondBounceCellIndex: gameStatus.secondBounceCellIndex,
                    board: this.board.getState(),
                    lastMove: this.lastMove  // Add the last move that caused the win
                });
                
                // Update scores
                this.triggerEvent('scoreUpdate', { scores: { ...this.scores } });
            } else if (gameStatus.isDraw) {
                // Handle draw
                this.triggerEvent('gameEnd', {
                    type: 'draw',
                    board: this.board.getState()
                });
            }
            
            return true;
        }
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        // Notify of turn change
        this.triggerEvent('turnChange', {
            currentPlayer: this.currentPlayer,
            board: this.board.getState()
        });
        
        // If it's the computer's turn and we're not in human vs human mode
        if (this.gameMode !== 'human' && this.currentPlayer === this.computerPlayer) {
            this.makeComputerMove();
        }
        
        return true;
    }
    
    /**
     * Check if a player has won a match based on round wins
     * @param {string} lastWinner - The player who just won a round ('X' or 'O')
     */
    checkForMatchWin(lastWinner) {
        // Only check if no one has won the match yet
        if (this.matchWinner === null) {
            const opponent = lastWinner === 'X' ? 'O' : 'X';
            const playerRoundWins = this.scores[lastWinner];
            const opponentRoundWins = this.scores[opponent];
            
            // Check if player has reached win threshold and has required margin
            if (playerRoundWins >= this.matchWinThreshold && 
                (playerRoundWins - opponentRoundWins) >= this.matchWinMargin) {
                
                // This player has won the match!
                this.matchWinner = lastWinner;
                
                // Increment their match score
                this.matchScores[lastWinner]++;
                
                // Set flag that match was just won - scores will be reset on next game start
                this.matchJustWon = true;
                
                // Trigger match won event
                this.triggerEvent('matchWon', {
                    winner: lastWinner,
                    matchScores: { ...this.matchScores }
                });
                
                // Trigger match score update
                this.triggerEvent('matchScoreUpdate', {
                    matchScores: { ...this.matchScores },
                    matchWinner: this.matchWinner,
                    roundScores: { ...this.scores }
                });
            } else {
                // Just update the UI to show how close we are to a match win
                this.triggerEvent('matchScoreUpdate', {
                    matchScores: { ...this.matchScores },
                    matchWinner: null,
                    roundScores: { ...this.scores }
                });
            }
        }
    }
    
    /**
     * Reset the game
     */
    resetGame() {
        // If a match was just won, reset round scores before starting new game
        if (this.matchJustWon) {
            this.scores = { 'X': 0, 'O': 0 };
            this.matchWinner = null;
            this.matchJustWon = false;
        }
        
        this.board.reset();
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.lastMove = null;
        
        this.triggerEvent('gameReset', {
            board: this.board.getState(),
            currentPlayer: this.currentPlayer,
            scores: { ...this.scores },
            matchScores: { ...this.matchScores },
            matchWinner: this.matchWinner
        });
        
        // If playing against computer and computer goes first, make a move
        if (this.gameMode !== 'human' && this.computerPlayer === 'X') {
            this.makeComputerMove();
        }
    }
    
    /**
     * Make a computer move
     */
    makeComputerMove() {
        if (!this.gameActive) return;
        
        // Notify that AI is thinking
        this.triggerEvent('aiThinking', {
            difficulty: this.aiDifficulty,
            player: this.computerPlayer
        });
        
        // Use setTimeout to prevent UI freezing during AI calculation
        setTimeout(() => {
            // Lazy initialize the AI when needed
            if (!this.ai) {
                // This would be replaced with the actual AI factory that creates
                // the appropriate AI strategy based on the difficulty level
                this.ai = this.createAI(this.aiDifficulty);
            }
            
            const opponent = this.computerPlayer === 'X' ? 'O' : 'X';
            
            // Get the AI move
            const move = this.ai.getMove(
                this.board.getState(),
                this.computerPlayer,
                opponent,
                this.bounceRuleEnabled,
                this.missingTeethRuleEnabled
            );
            
            if (move) {
                // Notify that AI move is complete
                this.triggerEvent('aiMoveComplete', {
                    row: move.row,
                    col: move.col,
                    player: this.computerPlayer
                });
                
                // Make the move
                this.makeMove(move.row, move.col);
            }
        }, 50); // Small delay to allow UI to update
    }
    
    setAIFactory(aiFactory) {
        this.aiFactory = aiFactory;
        console.log('AI Factory registered with game');
    }

    /**
     * Create an AI based on the difficulty level
     * @param {string} difficulty - AI difficulty level
     * @returns {Object} - AI instance
     */
    createAI(difficulty) {
        // If we have an AI factory, use it
        if (this.aiFactory && typeof this.aiFactory.createAI === 'function') {
            console.log(`Creating AI with difficulty ${difficulty} using AI factory`);
            return this.aiFactory.createAI(difficulty);
        }
        
        // Otherwise, use fallback implementation
        console.log(`Creating fallback AI with difficulty: ${difficulty}`);
        
        // Return a simple AI implementation that makes semi-random moves
        return {
            getMove: (board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) => {
                // Try to make a smart move
                
                // First priority: Win if possible
                if (this.rules && typeof this.rules.findWinningMove === 'function') {
                    const winningMove = this.rules.findWinningMove(
                        board, player, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    
                    if (winningMove) return winningMove;
                    
                    // Second priority: Block opponent from winning
                    const blockingMove = this.rules.findWinningMove(
                        board, opponent, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    
                    if (blockingMove) return blockingMove;
                }
                
                // Third priority: Try to take the center
                const centerRow = Math.floor(this.boardSize / 2);
                const centerCol = Math.floor(this.boardSize / 2);
                if (board[centerRow][centerCol] === '') {
                    return { row: centerRow, col: centerCol };
                }
                
                // If no winning or blocking move, find an empty spot - prefer adjacent to existing pieces
                const emptyCells = [];
                const adjacentCells = [];
                
                const adjacentDirections = [
                    [-1, -1], [-1, 0], [-1, 1],
                    [0, -1],           [0, 1],
                    [1, -1],  [1, 0],  [1, 1]
                ];
                
                // Find all empty cells and adjacent cells
                for (let row = 0; row < this.boardSize; row++) {
                    for (let col = 0; col < this.boardSize; col++) {
                        if (board[row][col] === '') {
                            emptyCells.push({row, col});
                            
                            // Check if this cell is adjacent to an occupied cell
                            let isAdjacent = false;
                            for (const [dx, dy] of adjacentDirections) {
                                const adjRow = row + dx;
                                const adjCol = col + dy;
                                
                                if (adjRow >= 0 && adjRow < this.boardSize && 
                                    adjCol >= 0 && adjCol < this.boardSize && 
                                    board[adjRow][adjCol] !== '') {
                                    isAdjacent = true;
                                    break;
                                }
                            }
                            
                            if (isAdjacent) {
                                adjacentCells.push({row, col});
                            }
                        }
                    }
                }
                
                // Prefer adjacent cells if available
                if (adjacentCells.length > 0) {
                    const randomIndex = Math.floor(Math.random() * adjacentCells.length);
                    return adjacentCells[randomIndex];
                }
                
                // Otherwise choose any empty cell
                if (emptyCells.length > 0) {
                    const randomIndex = Math.floor(Math.random() * emptyCells.length);
                    return emptyCells[randomIndex];
                }
                
                return null; // No valid moves (board is full)
            }
        };
    }
    
    /**
     * Clear the round scores and reset match state
     */
    clearScores() {
        this.scores = { 'X': 0, 'O': 0 };
        this.matchWinner = null; // Reset match winner when scores are cleared
        this.matchJustWon = false;
        
        this.triggerEvent('scoreUpdate', { scores: { ...this.scores } });
        this.triggerEvent('matchScoreUpdate', {
            matchScores: { ...this.matchScores },
            matchWinner: this.matchWinner,
            roundScores: { ...this.scores }
        });
    }
    
    /**
     * Reset match scores (used when starting a new match series)
     */
    resetMatchScores() {
        this.matchScores = { 'X': 0, 'O': 0 };
        this.matchWinner = null;
        this.matchJustWon = false;
        
        this.triggerEvent('matchScoreUpdate', {
            matchScores: { ...this.matchScores },
            matchWinner: this.matchWinner,
            roundScores: { ...this.scores }
        });
    }
    
    /**
     * Set the game mode
     * @param {string} mode - Game mode ('human', 'easy', 'medium', 'hard', 'extrahard', 'impossible')
     */
    setGameMode(mode) {
        this.gameMode = mode;
        
        // Reset AI instance to recreate with new difficulty
        this.ai = null;
        
        // Update difficulty based on mode
        if (mode !== 'human') {
            this.aiDifficulty = mode;
        }
        
        // Reset the game
        this.resetGame();
    }
    
    /**
     * Set the computer player
     * @param {string} player - Computer player ('X' or 'O')
     */
    setComputerPlayer(player) {
        if (player === 'X' || player === 'O') {
            this.computerPlayer = player;
            // Reset the game when changing computer player
            this.resetGame();
        }
    }
    
    /**
     * Enable or disable the bounce rule
     * @param {boolean} enabled - Whether the bounce rule is enabled
     */
    setBounceRule(enabled) {
        this.bounceRuleEnabled = enabled;
    }
    
    /**
     * Enable or disable the missing teeth rule
     * @param {boolean} enabled - Whether the missing teeth rule is enabled
     */
    setMissingTeethRule(enabled) {
        this.missingTeethRuleEnabled = enabled;
    }
    
    /**
     * Get the current board state
     * @returns {Array} - 2D array representing the current board state
     */
    getBoardState() {
        return this.board.getState();
    }
    
    /**
     * Get the current player
     * @returns {string} - Current player ('X' or 'O')
     */
    getCurrentPlayer() {
        return this.currentPlayer;
    }
    
    /**
     * Get the scores
     * @returns {Object} - Scores object { X: number, O: number }
     */
    getScores() {
        return { ...this.scores };
    }
    
    /**
     * Get the match scores
     * @returns {Object} - Match scores object { scores: { X, O }, matchWinner, roundScores: { X, O } }
     */
    getMatchScores() {
        return {
            scores: { ...this.matchScores },
            matchWinner: this.matchWinner,
            roundScores: { ...this.scores },
            matchJustWon: this.matchJustWon
        };
    }
    
    /**
     * Get the game status
     * @returns {Object} - Game status { active, currentPlayer, lastMove }
     */
    getGameStatus() {
        return {
            active: this.gameActive,
            currentPlayer: this.currentPlayer,
            lastMove: this.lastMove ? { ...this.lastMove } : null
        };
    }

    /**
     * Get the last move made
     * @returns {Object|null} - Last move { row, col, player } or null if no move made
     */
    getLastMove() {
        return this.lastMove ? { ...this.lastMove } : null;
    }
    
    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(
                cb => cb !== callback
            );
        }
    }
    
    /**
     * Trigger an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    triggerEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
}