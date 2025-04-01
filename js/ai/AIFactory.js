/**
 * AIFactory.js - Factory for creating AI players based on difficulty level
 */
class AIFactory {
    /**
     * Create a new AI factory
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        
        // Initialize shared components
        this.boardEvaluator = new BoardEvaluator(boardSize, rules);
        this.threatDetector = new ThreatDetector(boardSize, rules);
        
        // Cache created AIs by difficulty
        this.aiCache = {};
    }

    /**
     * Create an AI player with the specified difficulty
     * @param {string} difficulty - Difficulty level ('easy', 'medium', 'hard', 'extrahard', 'impossible')
     * @returns {AIPlayer} - AI player instance
     */
    createAI(difficulty) {
        // Return from cache if already created
        if (this.aiCache[difficulty]) {
            return this.aiCache[difficulty];
        }
        
        let ai;
        
        switch (difficulty.toLowerCase()) {
            case 'easy':
                ai = new RandomStrategy(this.boardSize, this.rules);
                break;
                
            case 'medium':
                ai = new MediumStrategy(this.boardSize, this.rules);
                break;
                
            case 'hard':
                ai = new HardStrategy(this.boardSize, this.rules, this.boardEvaluator);
                break;
                
            case 'extrahard':
                ai = new MinimaxStrategy(this.boardSize, this.rules, this.boardEvaluator);
                break;
                
            case 'impossible':
                ai = new ImpossibleStrategy(
                    this.boardSize, 
                    this.rules, 
                    this.boardEvaluator, 
                    this.threatDetector
                );
                break;
                
            default:
                // Default to medium difficulty
                console.warn(`Unknown difficulty "${difficulty}". Using medium difficulty instead.`);
                ai = new MediumStrategy(this.boardSize, this.rules);
                break;
        }
        
        // Cache the AI for future use
        this.aiCache[difficulty] = ai;
        
        return ai;
    }
    
    /**
     * Get a move from the AI with the specified difficulty
     * @param {Array} board - Current board state
     * @param {string} difficulty - Difficulty level
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - The selected move { row, col }
     */
    getMove(board, difficulty, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        const ai = this.createAI(difficulty);
        const opponent = player === 'X' ? 'O' : 'X';
        
        return ai.getMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
    }
    
    /**
     * Clear the AI cache
     * Useful when changing game parameters that would affect AI behavior
     */
    clearCache() {
        this.aiCache = {};
    }
}