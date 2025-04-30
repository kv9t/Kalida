/**
 * BoardEvaluator.js - Evaluates board positions for Kalida
 * 
 * Performs heuristic evaluation of board positions for minimax algorithm,
 * considering win potential, threat development, and strategic positions.
 */
class BoardEvaluator {
    /**
     * Create a new board evaluator
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.winTrackGenerator = new WinTrackGenerator(boardSize, rules);
        this.threatDetector = new ThreatDetector(boardSize, rules);
        
        // Pattern weights for evaluation
        this.weights = {
            WIN: 10000,             // Win
            FOUR_IN_LINE: 1000,     // Four in a row
            THREE_OPEN: 500,        // Three in a row with both ends open
            THREE_HALF_OPEN: 100,   // Three in a row with one end open
            TWO_OPEN: 50,           // Two in a row with both ends open
            TWO_HALF_OPEN: 10,      // Two in a row with one end open
            CENTER_CONTROL: 5,      // Having pieces in the central region
            ISOLATED: 1             // Isolated piece
        };
        
        // Center region definition
        this.centerRegion = this.defineCenterRegion();
    }
    
    /**
     * Define the center region of the board (2x2 area in the middle)
     * @returns {Array} - Array of center positions
     */
    defineCenterRegion() {
        const centerPositions = [];
        const start = Math.floor(this.boardSize / 3);
        const end = Math.ceil(this.boardSize * 2 / 3) - 1;
        
        for (let row = start; row <= end; row++) {
            for (let col = start; col <= end; col++) {
                centerPositions.push([row, col]);
            }
        }
        
        return centerPositions;
    }
    
    /**
     * Evaluate a board position
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to evaluate for ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {number} - Score for the position (higher is better for the player)
     */
    evaluateBoard(board, player, bounceRuleEnabled = true, missingTeethRuleEnabled = true) {
        const opponent = player === 'X' ? 'O' : 'X';
        
        // Check for win/loss first
        const playerWin = this.checkForWin(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
        const opponentWin = this.checkForWin(board, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
        
        if (playerWin) return this.weights.WIN;
        if (opponentWin) return -this.weights.WIN;
        
        // Initialize score
        let score = 0;
        
        // 1. Evaluate all win tracks
        score += this.evaluateWinTracks(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
        
        // 2. Evaluate center control
        score += this.evaluateCenterControl(board, player, opponent);
        
        // 3. Evaluate threats
        score += this.evaluateThreats(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
        
        // 4. Evaluate mobility (available moves)
        score += this.evaluateMobility(board, player);
        
        return score;
    }
    
    /**
     * Check if a player has won
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to check for
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {boolean} - Whether the player has won
     */
    checkForWin(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Use the Rules class to check for a win
        // We can check any cell that has the player's mark
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    const result = this.rules.checkWin(
                        board, row, col, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    if (result.winner === player) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Evaluate all win tracks on the board
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to evaluate for
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {number} - Score for win track evaluation
     */
    evaluateWinTracks(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        let score = 0;
        const allTracks = this.winTrackGenerator.generateAllWinTracks(bounceRuleEnabled);
        
        for (const track of allTracks) {
            // Analyze the track for both player and opponent
            const trackAnalysis = this.threatDetector.analyzeTrack(board, track, player);
            
            // Skip tracks that have both player and opponent marks (can't win here)
            if (trackAnalysis.player > 0 && trackAnalysis.opponent > 0) {
                continue;
            }
            
            // Score based on player's marks
            if (trackAnalysis.player > 0) {
                score += this.scorePattern(
                    trackAnalysis.player, 
                    trackAnalysis.empty, 
                    track,
                    board,
                    player,
                    missingTeethRuleEnabled
                );
            }
            
            // Subtract based on opponent's marks (but less weight)
            if (trackAnalysis.opponent > 0) {
                score -= this.scorePattern(
                    trackAnalysis.opponent, 
                    trackAnalysis.empty,
                    track,
                    board,
                    opponent,
                    missingTeethRuleEnabled
                ) * 0.8; // Slightly less weight for opponent
            }
        }
        
        return score;
    }
    
    /**
     * Score a pattern in a win track
     * @param {number} marks - Number of player marks
     * @param {number} empty - Number of empty spaces
     * @param {Array} track - The track being evaluated
     * @param {Array} board - Current board state
     * @param {string} player - Player being evaluated
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {number} - Score for the pattern
     */
    scorePattern(marks, empty, track, board, player, missingTeethRuleEnabled) {
        // If empty + marks < 5, this track can't create a win
        if (marks + empty < 5) return 0;
        
        // Check if the marks are consecutive (no gaps)
        const playerPositions = track.filter(([row, col]) => board[row][col] === player);
        const consecutive = this.threatDetector.arePositionsConsecutive(track, playerPositions);
        
        // If missing teeth rule is enabled and not consecutive, penalize
        if (missingTeethRuleEnabled && !consecutive && marks >= 3) {
            return this.weights.ISOLATED * marks; // Just basic value for having pieces
        }
        
        // Score based on pattern
        switch (marks) {
            case 4:
                return this.weights.FOUR_IN_LINE;
            case 3:
                return empty >= 2 ? this.weights.THREE_OPEN : this.weights.THREE_HALF_OPEN;
            case 2:
                return empty >= 3 ? this.weights.TWO_OPEN : this.weights.TWO_HALF_OPEN;
            case 1:
                return this.weights.ISOLATED;
            default:
                return 0;
        }
    }
    
    /**
     * Evaluate center control
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to evaluate for
     * @param {string} opponent - Opponent player
     * @returns {number} - Score for center control
     */
    evaluateCenterControl(board, player, opponent) {
        let score = 0;
        
        // Count pieces in center region
        for (const [row, col] of this.centerRegion) {
            if (board[row][col] === player) {
                score += this.weights.CENTER_CONTROL;
            } else if (board[row][col] === opponent) {
                score -= this.weights.CENTER_CONTROL;
            }
        }
        
        return score;
    }
    
    /**
     * Evaluate threats on the board
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to evaluate for
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {number} - Score for threats
     */
    evaluateThreats(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Use threat detector to find all threats
        const playerThreats = this.threatDetector.detectThreats(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        const opponentThreats = this.threatDetector.detectThreats(
            board, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        // Calculate threat scores
        const playerThreatScore = playerThreats.reduce((sum, threat) => sum + threat.priority, 0);
        const opponentThreatScore = opponentThreats.reduce((sum, threat) => sum + threat.priority, 0);
        
        // Return difference (our threats minus opponent threats)
        return playerThreatScore - (opponentThreatScore * 0.8); // Slightly less weight for opponent
    }
    
    /**
     * Evaluate mobility (available moves)
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to evaluate for
     * @returns {number} - Score for mobility
     */
    evaluateMobility(board, player) {
        // Count empty cells
        let emptyCells = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    emptyCells++;
                }
            }
        }
        
        // In early game, more empty cells is better (more options)
        // In late game, fewer empty cells may be better (force opponent into bad moves)
        const filledCells = this.boardSize * this.boardSize - emptyCells;
        const gameProgressFactor = filledCells / (this.boardSize * this.boardSize);
        
        // Small factor that adjusts based on game progress
        return emptyCells * (gameProgressFactor < 0.5 ? 1 : -1);
    }
}