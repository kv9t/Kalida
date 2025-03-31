/**
 * GameAI.js - Main AI controller for Kalida game
 * Delegates to appropriate strategy based on difficulty level
 */

class GameAI {
    constructor(boardSize, winChecker) {
        this.boardSize = boardSize;
        this.winChecker = winChecker;
        this.moveHistory = []; // Track move history for adaptive analysis
    }
    
    /**
     * Get a move based on the difficulty level
     * @param {Array} board - 2D array representing the game board
     * @param {string} gameMode - Difficulty level ('easy', 'medium', 'hard', 'extrahard', 'impossible')
     * @param {string} player - Current player ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - The selected move with row and column coordinates
     */
    getMove(board, gameMode, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        const opponent = player === 'X' ? 'O' : 'X';
        
        // Record this state for analysis (useful for future adaptive AI)
        this.recordBoardState(board);
        
        let move;
        switch (gameMode) {
            case 'easy':
                move = getRandomMove(board, this.boardSize);
                break;
                
            case 'medium':
                // 50% chance to make a strategic move, 50% chance to make a random move
                move = Math.random() < 0.5 
                    ? findBestMove(board, player, opponent, 1, this.boardSize, this.winChecker, bounceRuleEnabled, missingTeethRuleEnabled) 
                    : getRandomMove(board, this.boardSize);
                break;
                
            case 'hard':
                move = findBestMove(board, player, opponent, 2, this.boardSize, this.winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                break;
                
            case 'extrahard':
                move = findMinimaxMove(board, player, opponent, this.boardSize, this.winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                break;
                
            case 'impossible':
                // Use the new impossible difficulty strategy
                move = findImpossibleMove(board, player, opponent, this.boardSize, this.winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                break;
                
            default:
                move = getRandomMove(board, this.boardSize);
                break;
        }
        
        // Record the move that was made
        if (move) {
            this.recordMove(board, move.row, move.col, player);
        }
        
        return move;
    }
    
    /**
     * Record the current board state for analysis
     * @param {Array} board - Current board state
     */
    recordBoardState(board) {
        // Make a deep copy to avoid reference issues
        const boardCopy = board.map(row => [...row]);
        this.lastBoardState = boardCopy;
    }
    
    /**
     * Record a move that was made
     * @param {Array} board - Board state before the move
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player who made the move
     */
    recordMove(board, row, col, player) {
        this.moveHistory.push({
            board: board.map(row => [...row]),
            move: {row, col},
            player
        });
        
        // Keep history limited to avoid memory issues
        if (this.moveHistory.length > 30) {
            this.moveHistory.shift();
        }
    }
}