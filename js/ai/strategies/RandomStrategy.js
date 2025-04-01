/**
 * RandomStrategy.js - Implementation of the Easy AI difficulty
 * This strategy makes random moves with minimal intelligence
 */
class RandomStrategy extends AIPlayer {
    /**
     * Create a new Random Strategy AI
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     */
    constructor(boardSize, rules) {
        super(boardSize, rules);
        this.name = "Easy AI";
        this.difficultyLevel = 1;
    }

    /**
     * Get the next move for the AI player
     * @param {Array} board - Current board state (2D array)
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - The move to make { row, col }
     */
    getMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Record the current board state for analysis
        this.recordBoardState(board);
        
        // 20% of the time, check for an immediate win
        if (Math.random() < 0.2) {
            const winningMove = this.findWinningMove(
                board, player, bounceRuleEnabled, missingTeethRuleEnabled
            );
            if (winningMove) {
                this.recordMove(board, winningMove.row, winningMove.col, player);
                return winningMove;
            }
        }
        
        // 10% of the time, check for a center move if available
        if (Math.random() < 0.1) {
            const centerMove = this.getCenterMove(board);
            if (centerMove) {
                this.recordMove(board, centerMove.row, centerMove.col, player);
                return centerMove;
            }
        }
        
        // Get all empty cells and pick a random one
        const move = this.getRandomMove(board);
        
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
        this.currentBoardState = board.map(row => [...row]);
    }
}