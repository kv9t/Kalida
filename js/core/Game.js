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
        
        // Rule settings
        this.bounceRuleEnabled = true;
        this.missingTeethRuleEnabled = true;
        this.wrapRuleEnabled = true; // Add wrap rule control
        
        // Game mode settings
        this.gameMode = 'human'; // 'human', 'level1', 'level2', 'level3', 'level4'
        this.computerPlayer = 'O'; // Computer plays as O by default
        this.aiDifficulty = 'impossible'; // Always use smart AI for levels
        
        // Knight move rule tracking
        this.moveCount = { 'X': 0, 'O': 0 };
        this.firstPlayerFirstMove = null;
        this.knightMoveRuleEnabled = true; // Add toggle for the rule
        
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
            'aiMoveComplete': [],
            'knightMoveRequired': [], // New event for when knight move is required
            'knightMoveRuleToggled': [] // New event for when knight move rule is toggled
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
     * Calculate valid knight moves from a position
     * @param {number} row - Starting row 
     * @param {number} col - Starting column
     * @returns {Array} - Array of valid positions { row, col }
     */
    getValidKnightMoves(row, col) {
        const knightMoves = [
            [-2, -1], [-2, 1], // Two up, one left/right
            [-1, -2], [-1, 2], // One up, two left/right
            [1, -2], [1, 2],   // One down, two left/right
            [2, -1], [2, 1]    // Two down, one left/right
        ];
        
        const validMoves = [];
        
        // Calculate all potential knight moves
        for (const [dx, dy] of knightMoves) {
            const newRow = row + dx;
            const newCol = col + dy;
            
            // Check if the position is valid and empty
            if (newRow >= 0 && newRow < this.boardSize && 
                newCol >= 0 && newCol < this.boardSize && 
                this.board.isEmptyAt(newRow, newCol)) {
                validMoves.push({ row: newRow, col: newCol });
            }
        }
        
        return validMoves;
    }
    
    /**
     * Check if a move is a valid knight move from the first player's first move
     * @param {number} row - Target row
     * @param {number} col - Target column
     * @returns {boolean} - Whether the move is valid
     */
    isValidKnightMove(row, col) {
        if (!this.firstPlayerFirstMove) return true;
        
        const validMoves = this.getValidKnightMoves(
            this.firstPlayerFirstMove.row, 
            this.firstPlayerFirstMove.col
        );
        
        return validMoves.some(move => move.row === row && move.col === col);
    }
    
    /**
     * Declare the current game as a draw
     * This method allows players to end the game early rather than filling the entire board
     */
    declareDraw() {
        // Only allow declaring a draw if the game is currently active
        if (!this.gameActive) {
            console.log('Cannot declare draw - game is not active');
            return false;
        }
        
        // Set the game as inactive
        this.gameActive = false;
        
        // Trigger the same game end event that would happen with a natural draw
        // This reuses all the existing draw handling logic
        this.triggerEvent('gameEnd', {
            type: 'draw',
            board: this.board.getState(),
            declaredDraw: true // Flag to indicate this was manually declared
        });
        
        console.log('Game declared as draw');
        return true;
    }
    
    /**
     * Make a move
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean} - Whether the move was successful
     */
    makeMove(row, col) {
        console.log('Attempting move:', {
            row, col,
            player: this.currentPlayer,
            moveCount: this.moveCount,
            knightEnabled: this.knightMoveRuleEnabled,
            firstMove: this.firstPlayerFirstMove
        });

        // If the game is not active or the cell is already taken, do nothing
        if (!this.gameActive || !this.board.isEmptyAt(row, col)) {
            return false;
        }
        
        // Check if this is the first player's second move and enforce knight move rule
        if (this.knightMoveRuleEnabled && 
            this.currentPlayer === 'X' && 
            this.moveCount['X'] === 1) {
            
            // First, make sure firstPlayerFirstMove is set (this is crucial)
            if (!this.firstPlayerFirstMove) {
                console.error('Error: firstPlayerFirstMove is not set but moveCount is 1');
                // We need to reconstruct where the first move must have been by looking at the board
                for (let r = 0; r < this.boardSize; r++) {
                    for (let c = 0; c < this.boardSize; c++) {
                        if (this.board.getValueAt(r, c) === 'X') {
                            this.firstPlayerFirstMove = { row: r, col: c };
                            console.log('Reconstructed first player first move:', this.firstPlayerFirstMove);
                            break;
                        }
                    }
                    if (this.firstPlayerFirstMove) break;
                }
                
                // If we still couldn't find it (shouldn't happen), reset the move count
                if (!this.firstPlayerFirstMove) {
                    console.error('Could not reconstruct first move, resetting move count');
                    this.moveCount['X'] = 0;
                    return this.makeMove(row, col);
                }
            }
            
            // Now check if this is a valid knight move
            if (!this.isValidKnightMove(row, col)) {
                console.log('Knight move required but invalid move attempted');
                
                // Notify about invalid move - knight move required
                this.triggerEvent('knightMoveRequired', {
                    validMoves: this.getValidKnightMoves(
                        this.firstPlayerFirstMove.row, 
                        this.firstPlayerFirstMove.col
                    ),
                    firstMove: { ...this.firstPlayerFirstMove }
                });
                
                return false;
            }
        }
        
        // Make the move
        const moveMade = this.board.makeMove(row, col, this.currentPlayer);
        if (!moveMade) return false;
        
        // Keep track of the last move
        this.lastMove = { row, col, player: this.currentPlayer };
        
        // Track move count and first player's first move
        this.moveCount[this.currentPlayer]++;
        
        console.log('Move made successfully, new moveCount:', this.moveCount);
        
        // If this is the first player's first move, store it
        if (this.currentPlayer === 'X' && this.moveCount['X'] === 1) {
            this.firstPlayerFirstMove = { row, col };
            console.log('First player first move set:', this.firstPlayerFirstMove);
            
            // Pre-calculate valid knight moves for the next turn
            const validKnightMoves = this.getValidKnightMoves(row, col);
            console.log('Pre-calculated valid knight moves:', validKnightMoves);
        }
        
        // Notify move made
        this.triggerEvent('move', {
            row,
            col,
            player: this.currentPlayer,
            board: this.board.getState()
        });
        
        // Check for a win or draw - FIXED: Pass all rule parameters
        const gameStatus = this.rules.checkGameStatus(
            this.board.getState(),
            this.bounceRuleEnabled,
            this.missingTeethRuleEnabled,
            this.wrapRuleEnabled  // IMPORTANT: Pass the wrap rule setting
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
        console.log('Switched to player', this.currentPlayer);
        
        // Check if we need to show knight move indicators for next turn
        const isKnightMoveRequired = this.knightMoveRuleEnabled && 
                                this.currentPlayer === 'X' && 
                                this.moveCount['X'] === 1;
        
        // Notify of turn change
        this.triggerEvent('turnChange', {
            currentPlayer: this.currentPlayer,
            board: this.board.getState(),
            moveCount: { ...this.moveCount },
            isKnightMoveRequired: isKnightMoveRequired
        });
        
        // If knight move will be required in next turn, trigger the event
        if (isKnightMoveRequired && this.firstPlayerFirstMove) {
            const validKnightMoves = this.getValidKnightMoves(
                this.firstPlayerFirstMove.row,
                this.firstPlayerFirstMove.col
            );
            
            console.log('Triggering knight move required for next turn', {
                validMoves: validKnightMoves,
                firstMove: this.firstPlayerFirstMove
            });
            
            // Notify UI to highlight valid knight moves
            this.triggerEvent('knightMoveRequired', {
                validMoves: validKnightMoves,
                firstMove: { ...this.firstPlayerFirstMove }
            });
        }
        
        // If it's the computer's turn and we're not in human vs human mode
        if (this.gameMode !== 'human' && this.currentPlayer === this.computerPlayer) {
            this.makeComputerMove();
        }
        
        return true;
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
        
        // Reset knight move tracking
        this.moveCount = { 'X': 0, 'O': 0 };
        this.firstPlayerFirstMove = null;
        
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
     * Enable or disable the knight move rule
     * @param {boolean} enabled - Whether the knight move rule is enabled
     */
    setKnightMoveRule(enabled) {
        this.knightMoveRuleEnabled = enabled;
        
        // Trigger event for UI update
        this.triggerEvent('knightMoveRuleToggled', {
            enabled: enabled
        });
        
        // Reset the game when changing rule
        this.resetGame();
    }
    
    /**
     * Check if a round win leads to a match win
     * @param {string} lastWinner - The winner of the last round
     */
    checkForMatchWin(lastWinner) {
        // Check if we've reached the threshold and margin for a match win
        if (this.scores[lastWinner] >= this.matchWinThreshold) {
            const opponent = lastWinner === 'X' ? 'O' : 'X';
            const margin = this.scores[lastWinner] - this.scores[opponent];
            
            // Need to have the minimum threshold AND be ahead by the required margin
            if (margin >= this.matchWinMargin) {
                // This player wins the match!
                this.matchWinner = lastWinner;
                this.matchJustWon = true;
                
                // Increment match score
                this.matchScores[lastWinner]++;
                
                // Trigger match won event
                this.triggerEvent('matchWon', {
                    winner: lastWinner,
                    roundScores: { ...this.scores },
                    matchScores: { ...this.matchScores }
                });
                
                // Trigger match score update event
                this.triggerEvent('matchScoreUpdate', {
                    matchScores: { ...this.matchScores },
                    roundScores: { ...this.scores },
                    matchWinner: lastWinner
                });
            }
        }
    }
    
    /**
     * Make a computer move
     */
    makeComputerMove() {
        if (!this.gameActive || this.currentPlayer !== this.computerPlayer) {
            return;
        }
        
        // Notify that AI is thinking
        this.triggerEvent('aiThinking', {});
        
        // Create AI if not already created
        if (!this.ai) {
            this.ai = this.createAI(this.aiDifficulty);
        }
        
        // Use setTimeout to give UI time to update
        setTimeout(async () => { // Add 'async' keyword here
            try {
                // Get AI move - use await since it returns a Promise
                // FIXED: Pass all rule parameters to AI
                const move = await this.ai.getMove(
                    this.board.getState(),
                    this.currentPlayer,
                    this.bounceRuleEnabled,
                    this.missingTeethRuleEnabled,
                    this.wrapRuleEnabled  // IMPORTANT: Pass wrap rule to AI
                );
                
                // Make the move
                if (move && typeof move.row === 'number' && typeof move.col === 'number') {
                    this.makeMove(move.row, move.col);
                } else {
                    console.error('AI returned invalid move:', move);
                    
                    // Fall back to a random valid move
                    const validMoves = this.board.getEmptyPositions();
                    if (validMoves.length > 0) {
                        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                        this.makeMove(randomMove.row, randomMove.col);
                    }
                }
            } catch (error) {
                console.error('Error during AI move:', error);
                // Fall back to random move in case of error
                const validMoves = this.board.getEmptyPositions();
                if (validMoves.length > 0) {
                    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                    this.makeMove(randomMove.row, randomMove.col);
                }
            } finally {
                // Notify that AI move is complete
                this.triggerEvent('aiMoveComplete', {});
            }
        }, 100); // Slight delay for better UX
    }
    
    /**
     * Set the AI factory for creating AI players
     * @param {AIFactory} aiFactory - The AI factory instance
     */
    setAIFactory(aiFactory) {
        this.aiFactory = aiFactory;
    }
    
    /**
     * Create an AI player with the specified difficulty
     * @param {string} difficulty - The difficulty level
     * @returns {AIPlayer} - The AI player instance
     */
    createAI(difficulty) {
        if (!this.aiFactory) {
            console.error('AI factory not set');
            return null;
        }
        
        return this.aiFactory.createAI(difficulty);
    }
    
    /**
     * Clear game scores
     */
    clearScores() {
        this.scores = { 'X': 0, 'O': 0 };
        this.matchWinner = null;
        
        // Trigger events
        this.triggerEvent('scoreUpdate', { scores: { ...this.scores } });
        this.triggerEvent('matchScoreUpdate', {
            matchScores: { ...this.matchScores },
            roundScores: { ...this.scores },
            matchWinner: null
        });
    }
    
    /**
     * Reset match scores
     */
    resetMatchScores() {
        this.matchScores = { 'X': 0, 'O': 0 };
        this.matchWinner = null;
        
        // Trigger event
        this.triggerEvent('matchScoreUpdate', {
            matchScores: { ...this.matchScores },
            roundScores: { ...this.scores },
            matchWinner: null
        });
    }
    
    /**
     * Set the game mode - FIXED for new level system
     * @param {string} mode - Game mode ('human', 'level1', 'level2', 'level3', 'level4')
     */
    setGameMode(mode) {
        console.log('Setting game mode to:', mode);
        
        const prevMode = this.gameMode;
        this.gameMode = mode;
        
        // Configure rules and AI based on mode
        if (mode === 'human') {
            // Human vs Human - no AI, rules are manually controlled
            this.ai = null;
            console.log('Human vs Human mode selected');
        } else {
            // Level-based mode - configure rules and use AI
            this.aiDifficulty = 'impossible'; // Always use smart AI
            
            // Set rules based on level
            switch(mode) {
                case 'level1':
                    // Basic rules only
                    this.bounceRuleEnabled = false;
                    this.wrapRuleEnabled = false;
                    console.log('Level 1: Basic rules only');
                    break;
                case 'level2':
                    // Basic + Bounce
                    this.bounceRuleEnabled = true;
                    this.wrapRuleEnabled = false;
                    console.log('Level 2: Basic + Bounce');
                    break;
                case 'level3':
                    // Basic + Wrap (no bounce)
                    this.bounceRuleEnabled = false;
                    this.wrapRuleEnabled = true;
                    console.log('Level 3: Basic + Wrap');
                    break;
                case 'level4':
                    // All rules
                    this.bounceRuleEnabled = true;
                    this.wrapRuleEnabled = true;
                    console.log('Level 4: All rules');
                    break;
                default:
                    console.warn('Unknown level mode:', mode);
                    // Default to level 1
                    this.bounceRuleEnabled = false;
                    this.wrapRuleEnabled = false;
                    break;
            }
            
            // Create AI with new settings
            if (this.aiFactory) {
                this.ai = this.createAI(this.aiDifficulty);
                console.log('AI created for level mode');
            }
        }
        
        console.log('Game mode set:', {
            mode: this.gameMode,
            bounce: this.bounceRuleEnabled,
            wrap: this.wrapRuleEnabled,
            missingTeeth: this.missingTeethRuleEnabled,
            hasAI: !!this.ai
        });
        
        // Reset game with new settings
        this.resetGame();
    }
    
    /**
     * Set which player the computer controls
     * @param {string} player - Player ('X' or 'O')
     */
    setComputerPlayer(player) {
        if (player !== 'X' && player !== 'O') {
            console.error('Invalid player:', player);
            return;
        }
        
        const prevPlayer = this.computerPlayer;
        this.computerPlayer = player;
        
        // If we're changing the computer player, reset the game
        if (prevPlayer !== player && this.gameMode !== 'human') {
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
     * Enable or disable the wrap rule
     * @param {boolean} enabled - Whether the wrap rule is enabled
     */
    setWrapRule(enabled) {
        this.wrapRuleEnabled = enabled;
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
     * Get the game scores
     * @returns {Object} - Scores object { X: number, O: number }
     */
    getScores() {
        return { ...this.scores };
    }
    
    /**
     * Get the match scores
     * @returns {Object} - Match scores object { X: number, O: number }
     */
    getMatchScores() {
        return { ...this.matchScores };
    }
    
    /**
     * Get the current game status
     * @returns {Object} - Game status object
     */
    getGameStatus() {
        return {
            active: this.gameActive,
            currentPlayer: this.currentPlayer,
            lastMove: this.lastMove ? { ...this.lastMove } : null,
            moveCount: { ...this.moveCount },
            isKnightMoveRequired: this.knightMoveRuleEnabled && 
                                this.currentPlayer === 'X' && 
                                this.moveCount['X'] === 1,
            firstPlayerFirstMove: this.firstPlayerFirstMove ? { ...this.firstPlayerFirstMove } : null
        };
    }
    
    /**
     * Get the last move made on the board
     * @returns {Object|null} - Last move { row, col, player } or null if no moves
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
        if (!this.eventListeners[event]) {
            console.warn(`Unknown event: ${event}`);
            this.eventListeners[event] = [];
        }
        
        this.eventListeners[event].push(callback);
    }
    
    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.eventListeners[event]) {
            return;
        }
        
        this.eventListeners[event] = this.eventListeners[event].filter(
            cb => cb !== callback
        );
    }
    
    /**
     * Trigger an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    triggerEvent(event, data) {
        if (!this.eventListeners[event]) {
            return;
        }
        
        for (const callback of this.eventListeners[event]) {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} event handler:`, error);
            }
        }
    }
}