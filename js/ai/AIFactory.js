/**
 * AIFactory.js - Factory for creating AI players
 * 
 * This factory creates different AI players with various 
 * strategies and difficulty levels.
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
        
        // Create shared components used by multiple AI strategies
        this.evaluator = new BoardEvaluator(boardSize, rules);
        this.threatDetector = new ThreatDetector(boardSize, rules);
        this.winTrackGenerator = new WinTrackGenerator(boardSize, rules);
    }
    
    /**
     * Create an AI player with the specified difficulty
     * @param {string} difficulty - Difficulty level ('easy', 'medium', 'hard', 'extrahard', 'impossible')
     * @returns {AIPlayer} - AI player instance
     */
    createAI(difficulty) {
        const ai = new AIPlayer(this.boardSize, this.rules);
        
        // Set strategy based on difficulty
        switch (difficulty.toLowerCase()) {
            case 'easy':
                ai.setStrategy(new RandomStrategy(this.boardSize, this.rules));
                break;
                
            case 'medium':
                ai.setStrategy(new MediumStrategy(this.boardSize, this.rules, this.threatDetector));
                break;
                
            case 'hard':
                ai.setStrategy(new HardStrategy(this.boardSize, this.rules, this.threatDetector, this.evaluator));
                break;
                
            case 'extrahard':
                ai.setStrategy(new MinimaxStrategy(this.boardSize, this.rules, 4)); // Higher depth
                break;
                
            case 'impossible':
                ai.setStrategy(new ImpossibleStrategy(this.boardSize, this.rules));
                break;
                
            default:
                // Default to medium difficulty
                ai.setStrategy(new MediumStrategy(this.boardSize, this.rules, this.threatDetector));
                break;
        }
        
        return ai;
    }
}