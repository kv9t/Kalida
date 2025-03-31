/**
 * GameAI.js - Main AI controller for Kalida game
 * Delegates to appropriate strategy based on difficulty level
 */

class GameAI {
    constructor(boardSize, winChecker) {
        this.boardSize = boardSize;
        this.winChecker = winChecker;
    }
    
    /**
     * Get a move based on the difficulty level
     * @param {Array} board - 2D array representing the game board
     * @param {string} gameMode - Difficulty level ('easy', 'medium', 'hard', 'extrahard')
     * @param {string} player - Current player ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - The selected move with row and column coordinates
     */
    getMove(board, gameMode, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        const opponent = player === 'X' ? 'O' : 'X';
        
        switch (gameMode) {
            case 'easy':
                return getRandomMove(board, this.boardSize);
                
            case 'medium':
                // 50% chance to make a strategic move, 50% chance to make a random move
                return Math.random() < 0.5 
                    ? findBestMove(board, player, opponent, 1, this.boardSize, this.winChecker, bounceRuleEnabled, missingTeethRuleEnabled) 
                    : getRandomMove(board, this.boardSize);
                
            case 'hard':
                return findBestMove(board, player, opponent, 2, this.boardSize, this.winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                
            case 'extrahard':
                return findMinimaxMove(board, player, opponent, this.boardSize, this.winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                
            default:
                return getRandomMove(board, this.boardSize);
        }
    }
}