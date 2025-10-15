/**
 * BoardEvaluator.js - Evaluates board positions for Kalida
 *
 * Performs heuristic evaluation of board positions for minimax algorithm,
 * considering win potential, threat development, and strategic positions.
 */

import ThreatDetector from '../utils/ThreatDetector.js';
import WinTrackGenerator from '../utils/WinTrackGenerator.js';
import { EVALUATION_WEIGHTS } from '../constants/AIConstants.js';

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

        // Use centralized evaluation weights
        this.weights = EVALUATION_WEIGHTS;

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
     * @param {boolean} wrapRuleEnabled - Whether wrap rule is enabled
     * @returns {number} - Score for the position (higher is better for the player)
     */
    evaluateBoard(board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled) {
        const opponent = player === 'X' ? 'O' : 'X';

        // REMOVED: Win checks here were causing false positives with buggy bounce detection
        // We rely on immediate win detection at the root level instead
        // Evaluation should only score position strength, not declare wins

        // Initialize score
        let score = 0;
        
        // 1. Evaluate all win tracks
        score += this.evaluateWinTracks(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled);
        
        // 2. Evaluate center control
        score += this.evaluateCenterControl(board, player, opponent);
        
        // 3. Evaluate threats
        score += this.evaluateThreats(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled);
        
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
     * @param {boolean} wrapRuleEnabled - Whether wrap rule is enabled
     * @returns {boolean} - Whether the player has won
     */
    checkForWin(board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled) {
        // Use the Rules class to check for a win
        // We can check any cell that has the player's mark
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    const result = this.rules.checkWin(
                        board, row, col, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
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
     * @param {boolean} wrapRuleEnabled - Whether wrap rule is enabled
     * @returns {number} - Score for win track evaluation
     */
    evaluateWinTracks(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled) {
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
                ) * this.weights.OPPONENT_DISCOUNT;
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
     * @param {boolean} wrapRuleEnabled - Whether wrap rule is enabled
     * @returns {number} - Score for threats
     */
    evaluateThreats(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled) {
        // Use threat detector to find all threats
        const playerThreats = this.threatDetector.detectThreats(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
        );
        
        const opponentThreats = this.threatDetector.detectThreats(
            board, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
        );
        
        // Calculate threat scores
        const playerThreatScore = playerThreats.reduce((sum, threat) => sum + threat.priority, 0);
        const opponentThreatScore = opponentThreats.reduce((sum, threat) => sum + threat.priority, 0);
        
        // Return difference (our threats minus opponent threats)
        return playerThreatScore - (opponentThreatScore * this.weights.OPPONENT_DISCOUNT);
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

export default BoardEvaluator;