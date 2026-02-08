/**
 * Game.js - Game flow and state management for Kalida
 * Updated with cookie integration for persistent data
 */
import Board from './Board.js';
import Rules from './Rules.js';
import FinRules from './FinRules.js';
import CookieManager from '../utils/CookieManager.js';
import CookieConsent from '../utils/CookieConsent.js';
import GameStateLoader from '../utils/GameStateLoader.js';

class Game {
    /**
     * Create a new game
     * @param {number} boardSize - Size of the game board
     */
    constructor(boardSize) {
        this.boardSize = boardSize;
        this.board = new Board(boardSize);
        this.rules = new Rules(boardSize);
        this.finRules = new FinRules(boardSize);
        this.gameType = 'kalida'; // 'kalida' or 'fin'
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
        this.lastRoundWinner = null; // Track who won the last round (for "loser goes first" rule)

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
        this.firstPlayerOfGame = 'X'; // Track who goes first in current game (for knight move rule)
        this.knightMoveRuleEnabled = true; // Add toggle for the rule
        
        // Initialize AI based on the difficulty level
        this.ai = null; // Will be initialized when needed

        // NEW: Cookie management
        this.cookieManager = new CookieManager();
        this.cookiesEnabled = false; // Will be set after consent

        // NEW: State loader for debugging/testing
        this.stateLoader = new GameStateLoader(boardSize);
        
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
            'knightMoveRuleToggled': [], // New event for when knight move rule is toggled
            'cookieConsentChanged': [], // Event for when cookie consent changes
            'gameTypeChanged': [] // Event for when game type changes (kalida/fin)
        };
    }
    
    /**
     * Initialize the game with cookie consent handling
     * @param {Function} onReady - Callback when initialization is complete
     */
    initialize(onReady) {
        // Check cookie consent and show modal if needed
        this.handleCookieConsent(() => {
            // After consent is handled, reset the game
            this.resetGame();
            
            // Trigger events to update UI with loaded data
            this.triggerEvent('gameReset', {
                board: this.board.getState(),
                currentPlayer: this.currentPlayer,
                scores: { ...this.scores },
                matchScores: { ...this.matchScores },
                matchWinner: this.matchWinner
            });
            
            // Also trigger score update events specifically
            this.triggerEvent('scoreUpdate', { scores: { ...this.scores } });
            this.triggerEvent('matchScoreUpdate', {
                matchScores: { ...this.matchScores },
                roundScores: { ...this.scores },
                matchWinner: this.matchWinner
            });
            
            console.log('Game initialization complete with data:', {
                gameMode: this.gameMode,
                scores: this.scores,
                matchScores: this.matchScores,
                cookiesEnabled: this.cookiesEnabled
            });
            
            if (onReady) {
                onReady();
            }
        });
    }
    
    /**
     * Handle cookie consent process
     * @param {Function} callback - Called when consent is handled
     */
    handleCookieConsent(callback) {
        const consent = this.cookieManager.hasConsent();
        
        if (consent !== null) {
            // User has already made a decision
            this.cookiesEnabled = consent;
            console.log('Existing cookie consent found:', consent ? 'accepted' : 'declined');
            
            // IMPORTANT: Load saved data if cookies are enabled
            if (this.cookiesEnabled) {
                console.log('Loading saved data from existing consent...');
                this.loadSavedData();
            }
            
            this.triggerEvent('cookieConsentChanged', { enabled: this.cookiesEnabled });
            if (callback) callback();
            return;
        }
        
        // Automatically accept cookies without showing popup
        this.cookiesEnabled = true;
        this.cookieManager.setConsent(true);
        console.log('Cookies automatically accepted');
        this.loadSavedData();
        this.triggerEvent('cookieConsentChanged', { enabled: this.cookiesEnabled });
        if (callback) callback();
    }
    
    /**
     * Load saved data from cookies
     */
    loadSavedData() {
        if (!this.cookiesEnabled) {
            console.log('Cookies disabled, skipping data load');
            return;
        }
        
        try {
            console.log('Loading saved data from cookies...');
            
            // Load round scores first
            const savedRoundScores = this.cookieManager.getSavedRoundScores();
            if (savedRoundScores && typeof savedRoundScores === 'object') {
                console.log('Loading saved round scores:', savedRoundScores);
                this.scores = { 
                    X: savedRoundScores.X || 0, 
                    O: savedRoundScores.O || 0 
                };
            } else {
                console.log('No valid round scores found, using defaults');
            }
            
            // Load match scores
            const savedMatchScores = this.cookieManager.getSavedMatchScores();
            if (savedMatchScores && typeof savedMatchScores === 'object') {
                console.log('Loading saved match scores:', savedMatchScores);
                this.matchScores = { 
                    X: savedMatchScores.X || 0, 
                    O: savedMatchScores.O || 0 
                };
            } else {
                console.log('No valid match scores found, using defaults');
            }
            
            // Load game type preference
            const savedGameType = this.cookieManager.getSavedGameType();
            if (savedGameType && (savedGameType === 'kalida' || savedGameType === 'fin')) {
                console.log('Loading saved game type:', savedGameType);
                this.gameType = savedGameType;
            }

            // Load game mode preference and apply it
            const savedGameMode = this.cookieManager.getSavedGameMode();
            if (savedGameMode && typeof savedGameMode === 'string') {
                console.log('Loading saved game mode:', savedGameMode);
                
                // Temporarily disable cookie saving to prevent infinite loop
                const originalCookiesEnabled = this.cookiesEnabled;
                this.cookiesEnabled = false;
                
                // Apply the game mode (this will configure rules properly)
                this.setGameMode(savedGameMode);
                
                // Re-enable cookie saving
                this.cookiesEnabled = originalCookiesEnabled;
            } else {
                console.log('No valid game mode found, using default:', this.gameMode);
            }
            
            // Load rule preferences (only for human vs human mode)
            if (this.gameMode === 'human') {
                const savedRules = this.cookieManager.getSavedRulePreferences();
                if (savedRules && typeof savedRules === 'object') {
                    console.log('Loading saved rule preferences:', savedRules);
                    if (typeof savedRules.bounce === 'boolean') {
                        this.bounceRuleEnabled = savedRules.bounce;
                    }
                    if (typeof savedRules.wrap === 'boolean') {
                        this.wrapRuleEnabled = savedRules.wrap;
                    }
                    if (typeof savedRules.missingTeeth === 'boolean') {
                        this.missingTeethRuleEnabled = savedRules.missingTeeth;
                    }
                    if (typeof savedRules.knightMove === 'boolean') {
                        this.knightMoveRuleEnabled = savedRules.knightMove;
                    }
                } else {
                    console.log('No valid rule preferences found for human mode');
                }
            }
            
            console.log('Saved data loading complete:', {
                gameMode: this.gameMode,
                scores: this.scores,
                matchScores: this.matchScores,
                rules: {
                    bounce: this.bounceRuleEnabled,
                    wrap: this.wrapRuleEnabled,
                    missingTeeth: this.missingTeethRuleEnabled,
                    knightMove: this.knightMoveRuleEnabled
                }
            });
            
        } catch (error) {
            console.error('Error loading saved data from cookies:', error);
        }
    }
    
    /**
     * Save current game data to cookies
     * @returns {boolean} - Whether saving was successful
     */
    saveDataToCookies() {
        if (!this.cookiesEnabled) {
            console.log('Cookies disabled, not saving data');
            return false; // Not an error, just disabled
        }
        
        try {
            console.log('Saving game data to cookies:', {
                gameMode: this.gameMode,
                roundScores: this.scores,
                matchScores: this.matchScores
            });
            
            // Save current game mode and game type
            const gameModeResult = this.cookieManager.saveGameMode(this.gameMode);
            const gameTypeResult = this.cookieManager.saveGameType(this.gameType);
            console.log('Game mode save result:', gameModeResult, 'Game type save result:', gameTypeResult);
            
            // Save scores
            const roundScoreResult = this.cookieManager.saveRoundScores(this.scores);
            const matchScoreResult = this.cookieManager.saveMatchScores(this.matchScores);
            
            // Save rule preferences (only for human vs human mode)
            let ruleResult = true;
            if (this.gameMode === 'human') {
                const rulePreferences = {
                    bounce: this.bounceRuleEnabled,
                    wrap: this.wrapRuleEnabled,
                    missingTeeth: this.missingTeethRuleEnabled,
                    knightMove: this.knightMoveRuleEnabled
                };
                ruleResult = this.cookieManager.saveRulePreferences(rulePreferences);
                console.log('Rule preferences saved:', rulePreferences);
            }
            
            const allSuccess = gameModeResult && roundScoreResult && matchScoreResult && ruleResult;
            console.log('All data save operations successful:', allSuccess);
            return allSuccess;
            
        } catch (error) {
            console.error('Error saving data to cookies:', error);
            return false;
        }
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
        // Knight move rule only applies to Kalida, not Fin
        if (this.gameType === 'kalida' &&
            this.knightMoveRuleEnabled &&
            this.currentPlayer === this.firstPlayerOfGame &&
            this.moveCount[this.firstPlayerOfGame] === 1) {

            // First, make sure firstPlayerFirstMove is set (this is crucial)
            if (!this.firstPlayerFirstMove) {
                console.error('Error: firstPlayerFirstMove is not set but moveCount is 1');
                // We need to reconstruct where the first move must have been by looking at the board
                for (let r = 0; r < this.boardSize; r++) {
                    for (let c = 0; c < this.boardSize; c++) {
                        if (this.board.getValueAt(r, c) === this.firstPlayerOfGame) {
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
                    this.moveCount[this.firstPlayerOfGame] = 0;
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
        // BUG FIX: Use firstPlayerOfGame instead of hardcoded 'X' so Knight's Rule
        // correctly applies to whoever goes first in each round (not always 'X')
        if (this.currentPlayer === this.firstPlayerOfGame && this.moveCount[this.firstPlayerOfGame] === 1) {
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
        
        // Check for a win or draw
        let gameStatus;
        if (this.gameType === 'fin') {
            // Fin uses its own rules engine (no bounce/wrap/missingTeeth)
            gameStatus = this.finRules.checkGameStatus(this.board.getState());
        } else {
            // Kalida rules with all rule parameters
            gameStatus = this.rules.checkGameStatus(
                this.board.getState(),
                this.bounceRuleEnabled,
                this.missingTeethRuleEnabled,
                this.wrapRuleEnabled
            );
        }
        
        if (gameStatus.isOver) {
            this.gameActive = false;

            if (gameStatus.winner) {
                // Track winner for "loser goes first" rule
                this.lastRoundWinner = gameStatus.winner;

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
                
                // NEW: Save data to cookies after score update
                this.saveDataToCookies();
            } else if (gameStatus.isDraw) {
                // On draw, don't change lastRoundWinner (keep same starting player next game)
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
        // Knight move rule only applies to Kalida
        const isKnightMoveRequired = this.gameType === 'kalida' &&
                                this.knightMoveRuleEnabled &&
                                this.currentPlayer === this.firstPlayerOfGame &&
                                this.moveCount[this.firstPlayerOfGame] === 1;
        
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
            this.lastRoundWinner = null; // Reset for new match
        }

        this.board.reset();

        // NEW: "Loser goes first" rule
        // If there was a previous round winner, the loser starts
        if (this.lastRoundWinner) {
            this.currentPlayer = this.lastRoundWinner === 'X' ? 'O' : 'X';
            console.log(`Loser goes first: ${this.currentPlayer} starts (last winner was ${this.lastRoundWinner})`);
        } else {
            // First game - X goes first by default
            this.currentPlayer = 'X';
        }

        this.gameActive = true;
        this.lastMove = null;

        // Reset knight move tracking
        this.moveCount = { 'X': 0, 'O': 0 };
        this.firstPlayerFirstMove = null;
        this.firstPlayerOfGame = this.currentPlayer; // Track who starts for knight move rule
        
        this.triggerEvent('gameReset', {
            board: this.board.getState(),
            currentPlayer: this.currentPlayer,
            scores: { ...this.scores },
            matchScores: { ...this.matchScores },
            matchWinner: this.matchWinner
        });
        
        // If playing against computer and it's the computer's turn to start, make a move
        if (this.gameMode !== 'human' && this.currentPlayer === this.computerPlayer) {
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
        
        // NEW: Save rule preferences
        this.saveDataToCookies();
        
        // Reset the game when changing rule
        this.resetGame();
    }
    
    /**
     * Set the game type (Kalida or Fin)
     * @param {string} type - 'kalida' or 'fin'
     */
    setGameType(type) {
        if (type !== 'kalida' && type !== 'fin') {
            console.warn('Unknown game type:', type);
            return;
        }

        const prevType = this.gameType;
        this.gameType = type;
        console.log('Game type set to:', type);

        // When switching to Fin, force human mode (no AI for Fin yet)
        if (type === 'fin' && this.gameMode !== 'human') {
            this.gameMode = 'human';
        }

        // Reset scores when switching game types
        if (prevType !== type) {
            this.scores = { 'X': 0, 'O': 0 };
            this.matchScores = { 'X': 0, 'O': 0 };
            this.matchWinner = null;
            this.matchJustWon = false;
            this.lastRoundWinner = null;
        }

        // Save to cookies
        this.saveDataToCookies();

        // Reset the game
        this.resetGame();

        // Trigger events to update UI
        this.triggerEvent('scoreUpdate', { scores: { ...this.scores } });
        this.triggerEvent('matchScoreUpdate', {
            matchScores: { ...this.matchScores },
            roundScores: { ...this.scores },
            matchWinner: null
        });
        this.triggerEvent('gameTypeChanged', { gameType: type });
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
                
                // NEW: Save match scores
                this.saveDataToCookies();
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
                let move;

                // Check if knight move is required for AI
                const isKnightMoveRequired = this.knightMoveRuleEnabled &&
                                           this.currentPlayer === this.firstPlayerOfGame &&
                                           this.moveCount[this.firstPlayerOfGame] === 1;

                if (isKnightMoveRequired && this.firstPlayerFirstMove) {
                    // Get valid knight moves from AI's first move
                    const validKnightMoves = this.getValidKnightMoves(
                        this.firstPlayerFirstMove.row,
                        this.firstPlayerFirstMove.col
                    );

                    console.log('AI needs to make knight move. Valid options:', validKnightMoves);

                    // Prefer edge positions (better for bounce opportunities)
                    const edgePositions = validKnightMoves.filter(pos =>
                        pos.row === 0 || pos.row === this.boardSize - 1 ||
                        pos.col === 0 || pos.col === this.boardSize - 1
                    );

                    if (edgePositions.length > 0) {
                        // Select random edge position
                        move = edgePositions[Math.floor(Math.random() * edgePositions.length)];
                        console.log('AI selected edge knight move:', move);
                    } else if (validKnightMoves.length > 0) {
                        // Fall back to random knight move
                        move = validKnightMoves[Math.floor(Math.random() * validKnightMoves.length)];
                        console.log('AI selected random knight move:', move);
                    } else {
                        console.error('No valid knight moves available!');
                        move = null;
                    }
                } else {
                    // Normal AI logic - use AI algorithm
                    // Get AI move - use await since it returns a Promise
                    // FIXED: Pass all rule parameters to AI
                    move = await this.ai.getMove(
                        this.board.getState(),
                        this.currentPlayer,
                        this.bounceRuleEnabled,
                        this.missingTeethRuleEnabled,
                        this.wrapRuleEnabled  // IMPORTANT: Pass wrap rule to AI
                    );
                }

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
        
        // NEW: Save cleared scores to cookies
        this.saveDataToCookies();
        
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
        
        // NEW: Save cleared match scores to cookies
        this.saveDataToCookies();
        
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
        
        // NEW: Save game mode preference (with better debugging)
        const saveResult = this.saveDataToCookies();
        console.log('Game mode saved to cookies:', saveResult !== false ? 'success' : 'failed or disabled');
        
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
        // NEW: Save rule preferences
        this.saveDataToCookies();
    }
    
    /**
     * Enable or disable the missing teeth rule
     * @param {boolean} enabled - Whether the missing teeth rule is enabled
     */
    setMissingTeethRule(enabled) {
        this.missingTeethRuleEnabled = enabled;
        // NEW: Save rule preferences
        this.saveDataToCookies();
    }
    
    /**
     * Enable or disable the wrap rule
     * @param {boolean} enabled - Whether the wrap rule is enabled
     */
    setWrapRule(enabled) {
        this.wrapRuleEnabled = enabled;
        // NEW: Save rule preferences
        this.saveDataToCookies();
    }
    
    // NEW: Method to check if tutorial was completed
    wasTutorialCompleted() {
        return this.cookieManager.wasTutorialCompleted();
    }
    
    // NEW: Method to mark tutorial as completed
    markTutorialCompleted() {
        this.cookieManager.saveTutorialCompleted(true);
    }
    
    // NEW: Public method to reload saved data (for debugging)
    reloadSavedData() {
        if (this.cookiesEnabled) {
            console.log('Manually reloading saved data...');
            this.loadSavedData();
            
            // Trigger UI updates
            this.triggerEvent('scoreUpdate', { scores: { ...this.scores } });
            this.triggerEvent('matchScoreUpdate', {
                matchScores: { ...this.matchScores },
                roundScores: { ...this.scores },
                matchWinner: this.matchWinner
            });
            
            return true;
        }
        return false;
    }
    
    // NEW: Method to clear all saved data
    clearAllSavedData() {
        if (!this.cookieManager) return;
        
        // Show confirmation dialog
        const confirmed = confirm(
            'This will clear all saved data including:\n' +
            '• Game mode preferences\n' +
            '• All scores (rounds and matches)\n' +
            '• Rule preferences\n' +
            '• Tutorial completion status\n\n' +
            'Are you sure you want to continue?'
        );
        
        if (confirmed) {
            this.cookieManager.clearGameData();
            console.log('All saved game data cleared');
            
            // Reset to defaults
            this.scores = { 'X': 0, 'O': 0 };
            this.matchScores = { 'X': 0, 'O': 0 };
            this.gameMode = 'human';
            this.bounceRuleEnabled = true;
            this.wrapRuleEnabled = true;
            this.missingTeethRuleEnabled = true;
            this.knightMoveRuleEnabled = true;
            
            // Trigger update events
            this.triggerEvent('scoreUpdate', { scores: { ...this.scores } });
            this.triggerEvent('matchScoreUpdate', {
                matchScores: { ...this.matchScores },
                roundScores: { ...this.scores },
                matchWinner: null
            });
            
            this.resetGame();
        }
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
                                this.currentPlayer === this.firstPlayerOfGame &&
                                this.moveCount[this.firstPlayerOfGame] === 1,
            firstPlayerFirstMove: this.firstPlayerFirstMove ? { ...this.firstPlayerFirstMove } : null,
            gameMode: this.gameMode,
            cookiesEnabled: this.cookiesEnabled // NEW: Include cookie status
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

    // ====================================================================
    // STATE LOADING METHODS (for debugging and testing)
    // ====================================================================

    /**
     * Load a board state from various formats
     * @param {string|Array} stateInput - Board state (text, JSON, or compact format)
     * @param {Object} options - Optional configuration { currentPlayer, moveCount, rules }
     * @returns {boolean} - Whether the state was loaded successfully
     */
    loadBoardState(stateInput, options = {}) {
        try {
            console.log('Loading board state...');

            // Parse the state
            const boardState = this.stateLoader.parseState(stateInput);

            if (!boardState) {
                console.error('Failed to parse board state');
                return false;
            }

            // Validate the state
            const validation = this.stateLoader.validateBoardState(boardState);

            if (!validation.valid) {
                console.error('Invalid board state:', validation.errors);
                return false;
            }

            if (validation.warnings.length > 0) {
                console.warn('Board state warnings:', validation.warnings);
            }

            // Set the board state directly
            this.board.state = boardState.map(row => [...row]);

            // Set current player (default to inferred from board)
            this.currentPlayer = options.currentPlayer || this.stateLoader.inferCurrentPlayer(boardState);

            // Set move counts if provided
            if (options.moveCount) {
                this.moveCount = { ...options.moveCount };
            } else {
                // Infer move counts from piece counts
                const counts = this.stateLoader.countPieces(boardState);
                this.moveCount = { X: counts.X, O: counts.O };
            }

            // Reset other game state
            this.gameActive = true;
            this.lastMove = null;
            this.firstPlayerFirstMove = null;
            this.matchJustWon = false;

            // Apply rules if specified
            if (options.rules) {
                if (options.rules.bounce !== undefined) {
                    this.bounceRuleEnabled = options.rules.bounce;
                }
                if (options.rules.wrap !== undefined) {
                    this.wrapRuleEnabled = options.rules.wrap;
                }
                if (options.rules.missingTeeth !== undefined) {
                    this.missingTeethRuleEnabled = options.rules.missingTeeth;
                }
            }

            // Trigger game reset event to update UI
            this.triggerEvent('gameReset', {
                board: this.board.getState(),
                currentPlayer: this.currentPlayer,
                scores: { ...this.scores },
                matchScores: { ...this.matchScores },
                matchWinner: this.matchWinner
            });

            this.triggerEvent('turnChange', {
                currentPlayer: this.currentPlayer,
                board: this.board.getState(),
                moveCount: { ...this.moveCount },
                isKnightMoveRequired: false
            });

            console.log('Board state loaded successfully:', {
                currentPlayer: this.currentPlayer,
                moveCount: this.moveCount,
                pieceCount: this.stateLoader.countPieces(boardState)
            });

            // If it's the computer's turn after loading, make AI move
            if (this.gameMode !== 'human' && this.currentPlayer === this.computerPlayer && this.gameActive) {
                console.log('Computer\'s turn detected, making AI move...');
                // Use setTimeout to allow UI to update first
                setTimeout(() => {
                    this.makeComputerMove();
                }, 500);
            }

            return true;

        } catch (error) {
            console.error('Error loading board state:', error);
            return false;
        }
    }

    /**
     * Export the current board state in various formats
     * @param {string} format - Format to export ('text', 'json', 'compact')
     * @returns {string} - Exported board state
     */
    exportBoardState(format = 'text') {
        const board = this.board.getState();

        switch (format.toLowerCase()) {
            case 'json':
                return this.stateLoader.exportToJSON(board);
            case 'compact':
                return this.stateLoader.exportToCompact(board);
            case 'text':
            default:
                return this.stateLoader.exportToText(board);
        }
    }

    /**
     * Get complete game state for debugging
     * @returns {Object} - Complete game state
     */
    getCompleteState() {
        return {
            board: this.board.getState(),
            currentPlayer: this.currentPlayer,
            gameActive: this.gameActive,
            moveCount: { ...this.moveCount },
            scores: { ...this.scores },
            matchScores: { ...this.matchScores },
            rules: {
                bounce: this.bounceRuleEnabled,
                wrap: this.wrapRuleEnabled,
                missingTeeth: this.missingTeethRuleEnabled,
                knightMove: this.knightMoveRuleEnabled
            },
            gameMode: this.gameMode,
            lastMove: this.lastMove ? { ...this.lastMove } : null
        };
    }

    /**
     * Export complete game state as a shareable string
     * @returns {string} - JSON string of complete state
     */
    exportCompleteState() {
        return JSON.stringify(this.getCompleteState(), null, 2);
    }

    /**
     * Load complete game state from a JSON string
     * @param {string} stateJSON - JSON string of complete state
     * @returns {boolean} - Whether the state was loaded successfully
     */
    loadCompleteState(stateJSON) {
        try {
            const state = typeof stateJSON === 'string' ? JSON.parse(stateJSON) : stateJSON;

            const options = {
                currentPlayer: state.currentPlayer,
                moveCount: state.moveCount,
                rules: state.rules
            };

            const success = this.loadBoardState(state.board, options);

            if (success && state.scores) {
                this.scores = { ...state.scores };
                this.triggerEvent('scoreUpdate', { scores: { ...this.scores } });
            }

            if (success && state.gameMode) {
                this.setGameMode(state.gameMode);
            }

            return success;

        } catch (error) {
            console.error('Error loading complete state:', error);
            return false;
        }
    }
}

export default Game;