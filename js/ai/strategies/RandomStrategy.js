/**
 * RandomStrategy.js - Simple random move selection
 * 
 * This strategy selects moves randomly, with minimal intelligence
 * to recognize immediate win or blocking opportunities.
 */
class RandomStrategy {
    /**
     * Create a new random strategy
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
    }
    
    /**
     * Get a move using this strategy
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Current player ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Object} - The selected move { row, col }
     */
    getMove(board, player, bounceRuleEnabled = true, missingTeethRuleEnabled = true, wrapRuleEnabled = true) {
        const opponent = player === 'X' ? 'O' : 'X';
        
        // 1. First, check if we can win immediately (50% chance to notice)
        if (Math.random() < 0.5) {
            const winningMove = this.rules.findWinningMove(
                board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
            );
            
            if (winningMove) {
                return winningMove;
            }
        }
        
        // 2. Check if opponent can win (30% chance to notice)
        if (Math.random() < 0.3) {
            const blockingMove = this.rules.findWinningMove(
                board, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
            );
            
            if (blockingMove) {
                return blockingMove;
            }
        }
        
        // 3. Get all empty cells
        const emptyCells = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        // 4. Select a random empty cell
        if (emptyCells.length > 0) {
            const randomIndex = Math.floor(Math.random() * emptyCells.length);
            console.log(`AI RANDOM MOVE: RandomStrategy choosing random move at position (${emptyCells[randomIndex].row}, ${emptyCells[randomIndex].col})`);
            return emptyCells[randomIndex];
        }
        
        // No valid move (should not happen in normal play)
        console.error('No valid move found in RandomStrategy');
        return null;
    }
}