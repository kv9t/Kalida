/**
 * AIFactory.js - Factory for creating AI players
 * 
 * Simplified factory that creates the single AI strategy used by Kalida.
 * The difficulty comes from rule complexity rather than AI intelligence levels.
 */
class AIFactory {
    /**
     * Create a new AI factory
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        
        // Create shared components used by the AI strategy
        this.evaluator = new BoardEvaluator(boardSize, rules);
        this.threatDetector = new ThreatDetector(boardSize, rules);
        this.winTrackGenerator = new WinTrackGenerator(boardSize, rules);
    }
    
    /**
     * Create an AI player 
     * @param {string} difficulty - Difficulty level (currently ignored - kept for compatibility)
     * @returns {AIPlayer} - AI player instance with ImpossibleStrategy
     */
    createAI(difficulty = 'impossible') {
        const ai = new AIPlayer(this.boardSize, this.rules);
        
        // Always use the sophisticated strategy
        // The "difficulty" comes from rule complexity (bounce, wrap, etc.) not AI intelligence
        ai.setStrategy(new ImpossibleStrategy(this.boardSize, this.rules));
        
        return ai;
    }
}