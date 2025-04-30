/**
 * AIPlayer.js - Base class for AI players
 * 
 * This class serves as the base for all AI players,
 * delegating the actual move selection to a strategy.
 */
class AIPlayer {
    /**
     * Create a new AI player
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.strategy = null;
        this.thinkingTime = 0; // Milliseconds to simulate "thinking"
    }
    
    /**
     * Set the strategy for this AI player
     * @param {Object} strategy - Strategy object with getMove method
     */
    setStrategy(strategy) {
        this.strategy = strategy;
        
        // Set thinking time based on strategy complexity
        if (strategy instanceof RandomStrategy) {
            this.thinkingTime = 100; // Was 300ms
        } else if (strategy instanceof MediumStrategy) {
            this.thinkingTime = 200; // Was 500ms
        } else if (strategy instanceof HardStrategy) {
            this.thinkingTime = 300; // Was 800ms
        } else if (strategy instanceof MinimaxStrategy) {
            this.thinkingTime = 400; // Was 1000ms
        } else if (strategy instanceof ImpossibleStrategy) {
            this.thinkingTime = 500; // Was 1500ms
        } else {
            this.thinkingTime = 200; // Was 500ms
        }
    }
    
    /**
     * Get a move from this AI player
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player marker ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Promise<Object>} - Promise that resolves to the selected move { row, col }
     */
    async getMove(board, player, bounceRuleEnabled = true, missingTeethRuleEnabled = true) {
        if (!this.strategy) {
            throw new Error('AI player has no strategy set');
        }
        
        // Create a slight delay to simulate thinking
        // This is more user-friendly than an instant move
        return new Promise(resolve => {
            setTimeout(() => {
                const move = this.strategy.getMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
                resolve(move);
            }, this.thinkingTime);
        });
    }
}