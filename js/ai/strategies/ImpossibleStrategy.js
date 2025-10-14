/**
 * ImpossibleStrategy.js - Advanced AI strategy for Kalida
 *
 * This strategy combines minimax, pattern recognition, and advanced
 * heuristics to create an extremely challenging AI opponent.
 */

import BoardEvaluator from '../evaluation/BoardEvaluator.js';
import ThreatDetector from '../utils/ThreatDetector.js';
import WinTrackGenerator from '../utils/WinTrackGenerator.js';
import BouncePatternDetector from './modules/BouncePatternDetector.js';
import MinimaxSearch from './modules/MinimaxSearch.js';
import OpeningBook from './modules/OpeningBook.js';
import BounceUtils from '../../utils/BounceUtils.js';
import {
    THREAT_PRIORITIES,
    EVALUATION_WEIGHTS,
    SEARCH_CONFIG,
    PATTERN_CONFIG,
    STRATEGIC_VALUES
} from '../constants/AIConstants.js';
class ImpossibleStrategy {
    /**
     * Create a new impossible strategy
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        
        // Create components
        this.evaluator = new BoardEvaluator(boardSize, rules);
        this.minimaxSearch = new MinimaxSearch(boardSize, rules, this.evaluator);
        this.threatDetector = new ThreatDetector(boardSize, rules);
        this.patternDetector = new BouncePatternDetector(boardSize, rules);
        this.winTrackGenerator = new WinTrackGenerator(boardSize, rules);
        
        // Maximum search depth (will be adjusted dynamically)
        this.baseSearchDepth = SEARCH_CONFIG.BASE_DEPTH;

        // Initialize opening book
        this.openingBook = new OpeningBook(boardSize);

        // Track game state
        this.moveCount = 0;
        this.lastMove = null;
        this.playerHistory = { X: [], O: [] };

        // Pattern recognition cache
        this.patternCache = new Map();

        // Position evaluation cache (for faster re-evaluation)
        this.positionCache = new Map();
        this.cacheTTL = SEARCH_CONFIG.CACHE_TTL;
    }

    /**
     * Reset the strategy for a new game
     * Clears position cache and resets minimax transposition table
     */
    resetForNewGame() {
        this.moveCount = 0;
        this.lastMove = null;
        this.playerHistory = { X: [], O: [] };
        this.positionCache.clear();
        this.patternCache.clear();
        this.minimaxSearch.resetForNewGame();
        console.log('ImpossibleStrategy: Reset for new game');
    }
    
    /**
     * Get a move using this strategy
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Current player ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @param {boolean} wrapRuleEnabled - Whether wrap rule is enabled
     * @returns {Object} - The selected move { row, col }
     */
    getMove(board, player, bounceRuleEnabled = true, missingTeethRuleEnabled = true, wrapRuleEnabled = true) {
        try {
            this.moveCount++;
            const opponent = player === 'X' ? 'O' : 'X';

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`AI Decision for ${player} - Move ${this.moveCount}`);
            console.log(`Rules: bounce=${bounceRuleEnabled}, wrap=${wrapRuleEnabled}, missingTeeth=${missingTeethRuleEnabled}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            // Clean up expired cache entries
            this.cleanupCache();

            // 1. First priority: Find immediate winning move or block opponent's win
            const immediateMove = this.checkImmediateWinOrBlock(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled);
            if (immediateMove) {
                this.updatePlayerHistory(immediateMove.row, immediateMove.col, player);
                return immediateMove;
            }

            // 2. Detect all threats once (for both players) to avoid duplication
            console.log('Detecting threats for both players...');
            const opponentThreats = this.threatDetector.detectThreats(
                board, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
            );

            // 3. Check for critical opponent threats
            const criticalThreatMove = this.checkCriticalThreats(opponentThreats, player);
            if (criticalThreatMove) {
                this.updatePlayerHistory(criticalThreatMove.row, criticalThreatMove.col, player);
                return criticalThreatMove;
            }
            
            // 3. Check opening book for early game
            if (this.moveCount <= PATTERN_CONFIG.OPENING_BOOK_MOVES) {
                const openingMove = this.openingBook.getMove(board, player, opponent);
                if (openingMove && board[openingMove.row][openingMove.col] === '') {
                    console.log("Using opening book move");
                    this.updatePlayerHistory(openingMove.row, openingMove.col, player);
                    return openingMove;
                }
            }
            
            // 4. Special pattern detection using win tracks for 4-in-a-row and double bounces
            const specialPatternMove = this.findSpecialPatternMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
            if (specialPatternMove) {
                console.log("Found special pattern move");
                this.updatePlayerHistory(specialPatternMove.row, specialPatternMove.col, player);
                return specialPatternMove;
            }
            
            // 5. For bounce-enabled games, use pattern detector to find advanced bounce threats
            if (bounceRuleEnabled) {
                const bounceThreats = this.patternDetector.detectThreats(
                    board, player, opponent, missingTeethRuleEnabled
                );
                
                // Take the highest priority bounce threat if available
                if (bounceThreats.length > 0) {
                    bounceThreats.sort((a, b) => b.priority - a.priority);
                    if (bounceThreats[0].priority >= PATTERN_CONFIG.MIN_BOUNCE_PRIORITY) {
                        const move = { 
                            row: bounceThreats[0].blockingMove?.row || bounceThreats[0].createMove?.row, 
                            col: bounceThreats[0].blockingMove?.col || bounceThreats[0].createMove?.col 
                        };
                        
                        if (typeof move.row === 'number' && typeof move.col === 'number') {
                            console.log("Using bounce pattern threat move");
                            this.updatePlayerHistory(move.row, move.col, player);
                            return move;
                        }
                    }
                }
            }
            
            // Store medium priority opponent threats as candidates
            // Don't return immediately - let minimax verify this is the best move
            let mediumThreatCandidate = null;
            if (opponentThreats.length > 0) {
                const mediumThreats = opponentThreats.filter(threat =>
                    threat.priority >= THREAT_PRIORITIES.MEDIUM_THREAT_THRESHOLD && threat.type !== 'block'
                );

                if (mediumThreats.length > 0) {
                    mediumThreats.sort((a, b) => b.priority - a.priority);
                    const blockMove = {
                        row: mediumThreats[0].row,
                        col: mediumThreats[0].col
                    };

                    // Check if this is likely a multiple-threat position that needs blocking
                    const threatCount = this.countPotentialWinTracks(board, blockMove.row, blockMove.col, opponent);
                    if (threatCount >= PATTERN_CONFIG.MULTIPLE_THREAT_COUNT) {
                        console.log("Found medium opponent threat with multiple win tracks:", threatCount, "- storing as candidate");
                        mediumThreatCandidate = blockMove;
                        // Don't return yet - continue to minimax to verify
                    }
                }
            }
            
            // 6. Determine appropriate search depth based on game phase
            const searchDepth = this.determineSearchDepth(board);
            
            // 7. Run optimized minimax search with iterative deepening
            const timeLimit = SEARCH_CONFIG.TIME_LIMIT_MS;
            const startTime = Date.now();

            // Try iterative deepening to find the best move within time constraints
            let bestMove = null;
            let currentDepth = SEARCH_CONFIG.ITERATIVE_DEEPENING_START;
            
            while (currentDepth <= searchDepth) {
                console.log(`Running minimax at depth ${currentDepth}...`);
                // FIXED: Pass wrapRuleEnabled parameter
                const move = this.minimaxSearch.findBestMove(
                    board, player, currentDepth, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
                );
                
                if (move && typeof move.row === 'number' && typeof move.col === 'number') {
                    bestMove = move;
                    console.log(`Depth ${currentDepth} found move: (${move.row}, ${move.col}) with score: ${move.score}`);
                    
                    // Cache this position evaluation
                    const boardKey = this.getBoardKey(board);
                    this.positionCache.set(boardKey, {
                        move: bestMove,
                        depth: currentDepth,
                        expireAt: this.moveCount + this.cacheTTL
                    });
                    
                    // If we found a winning move, no need to search deeper
                    if (Math.abs(move.score) > EVALUATION_WEIGHTS.WIN_THRESHOLD) {
                        break;
                    }
                }
                
                // Check if time limit exceeded
                if (Date.now() - startTime > timeLimit) {
                    console.log(`Time limit reached after depth ${currentDepth}`);
                    break;
                }
                
                currentDepth++;
            }
            
            if (bestMove && typeof bestMove.row === 'number' && typeof bestMove.col === 'number') {
                console.log(`Using minimax move: (${bestMove.row}, ${bestMove.col}) with score: ${bestMove.score}`);
                this.updatePlayerHistory(bestMove.row, bestMove.col, player);
                return bestMove;
            }

            // 8. If minimax failed but we have a medium threat candidate, use it
            if (mediumThreatCandidate) {
                console.log(`Minimax failed - using medium threat candidate at (${mediumThreatCandidate.row}, ${mediumThreatCandidate.col})`);
                this.updatePlayerHistory(mediumThreatCandidate.row, mediumThreatCandidate.col, player);
                return mediumThreatCandidate;
            }

            // 9. Fallback: Use strategic position selection or any valid move
            const fallbackMove = this.getFallbackMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled);
            if (fallbackMove) {
                this.updatePlayerHistory(fallbackMove.row, fallbackMove.col, player);
                return fallbackMove;
            }

            // Should never reach here if board has empty cells
            throw new Error('No valid moves available');
        } catch (error) {
            console.error("Error in ImpossibleStrategy:", error);
            // Emergency fallback: find any valid move
            const emergencyMove = this.findAnyValidMove(board);
            if (emergencyMove) {
                console.log(`AI ERROR RECOVERY: Using emergency move at (${emergencyMove.row}, ${emergencyMove.col})`);
                return emergencyMove;
            }
            // This should never happen (board full)
            throw new Error('No valid moves available - board may be full');
        }
    }

    /**
     * Get a fallback move when minimax and other strategies fail
     * @param {Array} board - Current board state
     * @param {string} player - Current player
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @param {boolean} wrapRuleEnabled - Whether wrap rule is enabled
     * @returns {Object|null} - Fallback move or null
     */
    getFallbackMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled) {
        console.log("Using fallback move selection...");

        // Try threat-based moves
        const threats = this.threatDetector.detectThreats(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
        );

        if (threats.length > 0) {
            threats.sort((a, b) => b.priority - a.priority);
            const move = { row: threats[0].row, col: threats[0].col };
            if (this.isValidMove(board, move.row, move.col)) {
                console.log("Using threat-based fallback move");
                return move;
            }
        }

        // Try strategic position selection
        const strategicMove = this.selectStrategicPosition(board, player);
        if (strategicMove && this.isValidMove(board, strategicMove.row, strategicMove.col)) {
            console.log("Using strategic position fallback move");
            return strategicMove;
        }

        // Last resort: any valid move
        return this.findAnyValidMove(board);
    }

    /**
     * Find any valid move on the board
     * @param {Array} board - Current board state
     * @returns {Object|null} - Any valid move or null
     */
    findAnyValidMove(board) {
        // Prefer center if available
        const center = Math.floor(this.boardSize / 2);
        if (board[center][center] === '') {
            return { row: center, col: center };
        }

        // Otherwise find any empty cell
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    return { row, col };
                }
            }
        }

        return null;
    }

    /**
     * Check if a move is valid
     * @param {Array} board - Current board state
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @returns {boolean} - Whether the move is valid
     */
    isValidMove(board, row, col) {
        return typeof row === 'number' &&
               typeof col === 'number' &&
               row >= 0 && row < this.boardSize &&
               col >= 0 && col < this.boardSize &&
               board[row][col] === '';
    }
    
    /**
     * Check for critical opponent threats that must be blocked
     * @param {Array} opponentThreats - Array of opponent threats
     * @param {string} player - Current player
     * @returns {Object|null} - Move to block critical threat or null
     */
    checkCriticalThreats(opponentThreats, player) {
        console.log(`Found ${opponentThreats.length} opponent threats`);
        if (opponentThreats.length > 0) {
            console.log('Top 3 opponent threats:', opponentThreats.slice(0, 3).map(t =>
                `[${t.row},${t.col}] priority=${t.priority} type=${t.type}`
            ));
        }

        // Filter for critical threats - ONLY immediate wins and forced wins (not developing threats)
        // Developing threats (3 in a row with one open end) are not critical - they give us time to find better moves
        const criticalThreats = opponentThreats.filter(threat =>
            threat.priority >= THREAT_PRIORITIES.CRITICAL_THREAT_THRESHOLD ||
            (threat.type === 'block' && threat.priority >= THREAT_PRIORITIES.CRITICAL_BLOCK_THRESHOLD)
        );

        if (criticalThreats.length > 0) {
            // Sort by priority DESC, but prioritize non-edge positions when priorities are equal
            // This prevents blocking random edge threats when diagonal patterns exist
            criticalThreats.sort((a, b) => {
                if (b.priority !== a.priority) {
                    return b.priority - a.priority;
                }
                // If priorities equal, prefer moves that create more threats
                // (interior positions typically have more win tracks)
                const aEdge = (a.row === 0 || a.row === 5 || a.col === 0 || a.col === 5) ? 1 : 0;
                const bEdge = (b.row === 0 || b.row === 5 || b.col === 0 || b.col === 5) ? 1 : 0;
                return aEdge - bEdge; // Prefer non-edge when equal priority
            });

            const blockMove = {
                row: criticalThreats[0].row,
                col: criticalThreats[0].col
            };

            console.log(`✓ Blocking critical opponent threat at [${blockMove.row},${blockMove.col}] priority=${criticalThreats[0].priority} type=${criticalThreats[0].type}`);
            return blockMove;
        }
        console.log('✗ No critical opponent threats to block');
        return null;
    }

    /**
     * Check for immediate win or need to block opponent's win
     * This consolidates the duplicate win checking logic
     * @param {Array} board - Current board state
     * @param {string} player - Current player
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @param {boolean} wrapRuleEnabled - Whether wrap rule is enabled
     * @returns {Object|null} - Move to make or null if none found
     */
    checkImmediateWinOrBlock(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled) {
        // 1. First priority: Find immediate winning move
        console.log('Step 1: Checking for immediate winning move...');
        const winningMove = this.findImmediateWin(board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled);
        if (winningMove) {
            console.log(`✓ Found immediate winning move at [${winningMove.row},${winningMove.col}]`);
            return winningMove;
        }
        console.log('✗ No immediate winning move found');

        // 2. Second priority: Block opponent's immediate win
        console.log(`Step 2: Checking if opponent (${opponent}) has immediate win...`);
        const blockingMove = this.findImmediateWin(board, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled);
        if (blockingMove) {
            console.log(`✓ Found blocking move at [${blockingMove.row},${blockingMove.col}]`);
            return blockingMove;
        }
        console.log('✗ Opponent has no immediate win to block');

        return null;
    }

    /**
     * Count potential win tracks for a position (helper method for threat analysis)
     * @param {Array} board - Current board state
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @param {string} player - Player to analyze
     * @returns {number} - Number of potential win tracks
     */
    countPotentialWinTracks(board, row, col, player) {
        // Make a temporary board with this position filled
        const tempBoard = this.copyBoard(board);
        tempBoard[row][col] = player;
        
        // Get all win tracks containing this position
        const tracks = this.winTrackGenerator.getWinTracksContainingPosition(row, col, true);
        let count = 0;
        
        // For each track, check if it's viable
        for (const track of tracks) {
            let playerCount = 0;
            let opponentCount = 0;
            let emptyCount = 0;
            
            for (const [r, c] of track) {
                if (tempBoard[r][c] === player) {
                    playerCount++;
                } else if (tempBoard[r][c] === '') {
                    emptyCount++;
                } else {
                    opponentCount++;
                }
            }
            
            // If the track has no opponent pieces and could form a win
            if (opponentCount === 0 && playerCount + emptyCount >= 5) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Find an immediate winning move or a move to block opponent's win
     * @param {Array} board - Current board state
     * @param {string} player - Player to find winning move for
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @param {boolean} wrapRuleEnabled - Whether wrap rule is enabled
     * @returns {Object|null} - Winning move or null if none found
     */
    findImmediateWin(board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled = true) {
        // First check using the rules' built-in function
        const winningMove = this.rules.findWinningMove(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
        );
        
        if (winningMove) {
            return winningMove;
        }
        
        // Check all possible win tracks for 4-in-a-row patterns
        const allTracks = this.winTrackGenerator.generateAllWinTracks(bounceRuleEnabled);
        
        for (const track of allTracks) {
            // Count player markers and empty spots in this track
            let playerCount = 0;
            let emptyCount = 0;
            let emptyPos = null;
            
            for (const [row, col] of track) {
                if (board[row][col] === player) {
                    playerCount++;
                } else if (board[row][col] === '') {
                    emptyCount++;
                    emptyPos = { row, col };
                }
                // If opponent's marker is found, this track can't be a win
                else {
                    emptyPos = null;
                    break;
                }
            }
            
            // If 4 player markers and exactly 1 empty spot, this is a winning move
            if (playerCount === 4 && emptyCount === 1 && emptyPos) {
                // Check for missing teeth if enabled
                if (missingTeethRuleEnabled) {
                    // Create a test board with the potential winning move
                    const testBoard = this.copyBoard(board);
                    testBoard[emptyPos.row][emptyPos.col] = player;
                    
                    // Verify this would actually be a win
                    const result = this.rules.checkWin(
                        testBoard, emptyPos.row, emptyPos.col, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
                    );
                    
                    if (result.winner === player) {
                        return emptyPos;
                    }
                } else {
                    return emptyPos;
                }
            }
        }
        
        // NEW: Check for potential bounce patterns with one empty cell
        if (bounceRuleEnabled) {
            console.log('Checking for potential bounce patterns...');
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    // Start from player's pieces
                    if (board[row][col] === player) {
                        const potentialPattern = BounceUtils.findPotentialBouncePattern(
                            board, row, col, player, this.boardSize, 5
                        );

                        if (potentialPattern && potentialPattern.emptyCell) {
                            console.log(`Found potential bounce pattern starting at [${row},${col}], winning move at [${potentialPattern.emptyCell.row},${potentialPattern.emptyCell.col}]`);

                            // Verify no missing teeth
                            if (!missingTeethRuleEnabled || !BounceUtils.hasMissingTeeth(potentialPattern.path)) {
                                return potentialPattern.emptyCell;
                            }
                        }
                    }
                }
            }
            console.log('No potential bounce patterns found');
        }

        // As a backup, check through threat detector
        const threats = this.threatDetector.detectThreats(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
        );

        const winningThreats = threats.filter(t => t.type === 'win');
        if (winningThreats.length > 0) {
            return { row: winningThreats[0].row, col: winningThreats[0].col };
        }

        return null;
    }
    
    /**
     * Find special pattern moves that might be missed by regular minimax
     * @param {Array} board - Current board state
     * @param {string} player - Current player
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Object|null} - Special move or null if none found
     */
    findSpecialPatternMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        if (!bounceRuleEnabled) return null;
        
        // Look for player pieces near edges (where bounce patterns start)
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Check if this piece is near an edge
                    const isNearEdge = row <= 1 || row >= this.boardSize - 2 || 
                                     col <= 1 || col >= this.boardSize - 2;
                    
                    if (isNearEdge) {
                        // Check each diagonal direction for bounce patterns
                        for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                            // Look for three in a row with a potential bounce
                            let pattern = [];
                            let bounceFound = false;
                            let emptySpot = null;
                            
                            // Start with current piece
                            pattern.push([row, col]);
                            
                            // Try to follow the pattern in this direction
                            let currentRow = row;
                            let currentCol = col;
                            let currentDx = dx;
                            let currentDy = dy;
                            
                            // Check up to 5 steps (max pattern length)
                            for (let step = 1; step < 5; step++) {
                                let nextRow = currentRow + currentDx;
                                let nextCol = currentCol + currentDy;
                                
                                // Check if we hit a boundary (need to bounce)
                                if (nextRow < 0 || nextRow >= this.boardSize || 
                                    nextCol < 0 || nextCol >= this.boardSize) {
                                    bounceFound = true;
                                    
                                    // Calculate bounce direction
                                    if (nextRow < 0 || nextRow >= this.boardSize) {
                                        currentDx = -currentDx;
                                    }
                                    if (nextCol < 0 || nextCol >= this.boardSize) {
                                        currentDy = -currentDy;
                                    }
                                    
                                    // Calculate next position with bounced direction
                                    nextRow = currentRow + currentDx;
                                    nextCol = currentCol + currentDy;
                                }
                                
                                // Check if position is valid
                                if (nextRow >= 0 && nextRow < this.boardSize && 
                                    nextCol >= 0 && nextCol < this.boardSize) {
                                    
                                    if (board[nextRow][nextCol] === player) {
                                        // Add to pattern
                                        pattern.push([nextRow, nextCol]);
                                        currentRow = nextRow;
                                        currentCol = nextCol;
                                    } else if (board[nextRow][nextCol] === '') {
                                        // Found an empty spot - potential move
                                        emptySpot = { row: nextRow, col: nextCol };
                                        break;
                                    } else {
                                        // Opponent's piece blocks the pattern
                                        break;
                                    }
                                } else {
                                    // Hit boundary again (double bounce needed)
                                    break;
                                }
                            }
                            
                            // If we found a good pattern (3+ pieces with bounce and empty spot)
                            if (pattern.length >= 3 && bounceFound && emptySpot) {
                                // Check if this move would create a win
                                const testBoard = this.copyBoard(board);
                                testBoard[emptySpot.row][emptySpot.col] = player;
                                
                                const result = this.rules.checkWin(
                                    testBoard, emptySpot.row, emptySpot.col, 
                                    bounceRuleEnabled, missingTeethRuleEnabled
                                );
                                
                                if (result.winner === player) {
                                    return emptySpot;
                                }
                                
                                // Even if not an immediate win, if pattern has 3+ pieces and a bounce,
                                // it's a strong move to consider
                                if (pattern.length >= 3) {
                                    return emptySpot;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Determine appropriate search depth based on game phase
     * @param {Array} board - Current board state
     * @returns {number} - Appropriate search depth
     */
    determineSearchDepth(board) {
        // Count filled cells to determine game phase
        let filledCells = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    filledCells++;
                }
            }
        }
        
        const totalCells = this.boardSize * this.boardSize;
        const gameProgress = filledCells / totalCells;
        
        // Adjust depth based on game phase - OPTIMIZED for speed
        if (gameProgress < SEARCH_CONFIG.EARLY_GAME_THRESHOLD) {
            // Early game: lower depth for speed
            return SEARCH_CONFIG.EARLY_GAME_DEPTH;
        } else if (gameProgress > SEARCH_CONFIG.LATE_GAME_THRESHOLD) {
            // Late game: higher depth but not too high
            return SEARCH_CONFIG.LATE_GAME_DEPTH;
        } else {
            // Mid game: standard depth
            return SEARCH_CONFIG.MID_GAME_DEPTH;
        }
    }
    
    /**
     * Select a strategic position when no clear best move is found
     * @param {Array} board - Current board state
     * @param {string} player - Current player
     * @returns {Object} - Strategic move { row, col }
     */
    selectStrategicPosition(board, player) {
        // Rate each empty cell
        const emptyCells = [];
        const centerRegion = [
            [1, 1], [1, 2], [1, 3], [1, 4],
            [2, 1], [2, 2], [2, 3], [2, 4],
            [3, 1], [3, 2], [3, 3], [3, 4],
            [4, 1], [4, 2], [4, 3], [4, 4]
        ];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    let score = 0;
                    
                    // Check if in center region
                    if (centerRegion.some(([r, c]) => r === row && c === col)) {
                        score += STRATEGIC_VALUES.CENTER_REGION_BONUS;
                    }
                    
                    // Check connectivity to friendly pieces
                    score += this.calculateConnectivity(board, row, col, player);
                    
                    // Calculate board control potential
                    score += this.calculateControlPotential(board, row, col, player);
                    
                    emptyCells.push({ row, col, score });
                }
            }
        }
        
        // Sort by score and take the best
        emptyCells.sort((a, b) => b.score - a.score);
        
        // Return best move, or random if no empty cells (shouldn't happen)
        return emptyCells.length > 0 
            ? { row: emptyCells[0].row, col: emptyCells[0].col }
            : { row: 0, col: 0 };
    }
    
    /**
     * Calculate connectivity score for a position
     * @param {Array} board - Current board state
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @param {string} player - Current player
     * @returns {number} - Connectivity score
     */
    calculateConnectivity(board, row, col, player) {
        let score = 0;
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        // Check surrounding cells
        for (const [dx, dy] of directions) {
            const newRow = (row + dx + this.boardSize) % this.boardSize;
            const newCol = (col + dy + this.boardSize) % this.boardSize;
            
            if (board[newRow][newCol] === player) {
                score += STRATEGIC_VALUES.ADJACENT_FRIENDLY;
            } else if (board[newRow][newCol] === '') {
                score += STRATEGIC_VALUES.ADJACENT_EMPTY;
            }
        }
        
        return score;
    }
    
    /**
     * Calculate control potential for a position
     * @param {Array} board - Current board state
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @param {string} player - Current player
     * @returns {number} - Control potential score
     */
    calculateControlPotential(board, row, col, player) {
        // Count how many potential win tracks go through this position
        const tracks = this.winTrackGenerator.getWinTracksContainingPosition(row, col, true);
        
        // Score based on how many tracks are still viable
        let viableTracks = 0;
        const opponent = player === 'X' ? 'O' : 'X';
        
        for (const track of tracks) {
            // Check if track has opponent pieces
            const hasOpponent = track.some(([r, c]) => board[r][c] === opponent);
            
            if (!hasOpponent) {
                viableTracks++;
                
                // Bonus for tracks with our pieces already
                const ownPieces = track.filter(([r, c]) => board[r][c] === player).length;
                viableTracks += ownPieces;
            }
        }
        
        return viableTracks * STRATEGIC_VALUES.VIABLE_TRACK_MULTIPLIER;
    }
    
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        // Remove expired entries from position cache
        for (const [key, value] of this.positionCache.entries()) {
            if (value.expireAt < this.moveCount) {
                this.positionCache.delete(key);
            }
        }
    }
    
    /**
     * Generate a unique key for board state
     * @param {Array} board - 2D array representing the board
     * @returns {string} - Unique key
     */
    getBoardKey(board) {
        return board.map(row => row.join('')).join('|');
    }
    
    /**
     * Create a copy of the board
     * @param {Array} board - 2D array representing the board
     * @returns {Array} - Copy of the board
     */
    copyBoard(board) {
        return board.map(row => [...row]);
    }
    
    /**
     * Update player move history
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player making the move
     */
    updatePlayerHistory(row, col, player) {
        // Safety check for undefined values
        if (typeof row === 'undefined' || typeof col === 'undefined') {
            console.error('Attempted to update history with undefined coordinates');
            return;
        }
        
        this.lastMove = { row, col, player };
        this.playerHistory[player].push({ row, col, move: this.moveCount });
    }
}

export default ImpossibleStrategy;