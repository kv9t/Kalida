/**
 * ImpossibleStrategy.js - Main class for Impossible difficulty AI
 * Coordinates the different components and manages the overall strategy
 */
class ImpossibleStrategy extends AIPlayer {
    /**
     * Create a new Impossible Strategy AI
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     * @param {BoardEvaluator} evaluator - Board evaluation utility
     * @param {ThreatDetector} threatDetector - Threat detection utility
     */
    constructor(boardSize, rules, evaluator, threatDetector) {
        super(boardSize, rules);
        this.name = "Impossible AI";
        this.difficultyLevel = 5;
        this.evaluator = evaluator;
        this.threatDetector = threatDetector;
        
        // Initialize strategy components
        this.patternDetector = new BouncePatternDetector(boardSize, rules);
        this.openingBook = new OpeningBook(boardSize);
        this.minimaxSearch = new MinimaxSearch(boardSize, rules, evaluator);
        
        // Configuration
        this.maxDepth = 4;
        this.useIterativeDeepening = true;
        this.adaptiveDepth = true;
        this.positionCache = new Map();
        this.maxCacheSize = 10000;
        this.debugMode = false;
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
        
        // Clear cache if it gets too big
        if (this.positionCache.size > this.maxCacheSize) {
            this.positionCache.clear();
        }
        
        // DEFENSIVE CHECK: First priority always - check for immediate wins and blocks
        
        // Check if we can win in one move
        const winningMove = this.findWinningMove(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (winningMove) {
            this.debugLog("Found winning move:", winningMove);
            this.recordMove(board, winningMove.row, winningMove.col, player);
            return winningMove;
        }
        
        // Check if we need to block opponent's immediate win
        const blockingMove = this.findWinningMove(
            board, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (blockingMove) {
            this.debugLog("Found blocking move:", blockingMove);
            this.recordMove(board, blockingMove.row, blockingMove.col, player);
            return blockingMove;
        }
        
        // DOUBLE-BOUNCE THREAT DETECTION: Check for advanced threats
        
        // Look for potential bounce pattern threats from the opponent
        if (bounceRuleEnabled) {
            // First check if opponent is setting up a bounce pattern win
            const opponentThreats = this.patternDetector.detectThreats(
                board, opponent, player, missingTeethRuleEnabled
            );
            
            // If opponent has bounce threats, block the most critical one
            if (opponentThreats.length > 0) {
                const criticalThreat = opponentThreats[0]; // Most critical threat first
                this.debugLog("Found critical bounce threat to block:", criticalThreat);
                this.recordMove(board, criticalThreat.blockingMove.row, criticalThreat.blockingMove.col, player);
                return criticalThreat.blockingMove;
            }
            
            // Now look for our own bounce pattern opportunities
            const ownThreats = this.patternDetector.detectThreats(
                board, player, opponent, missingTeethRuleEnabled
            );
            
            if (ownThreats.length > 0) {
                const bestThreat = ownThreats[0]; // Best opportunity first
                this.debugLog("Creating bounce threat:", bestThreat);
                this.recordMove(board, bestThreat.createMove.row, bestThreat.createMove.col, player);
                return bestThreat.createMove;
            }
        }
        
        // OPENING BOOK: Check for strategic opening moves
        
        // Use opening book for early game
        const pieceCount = this.countPieces(board);
        if (pieceCount < 5) {
            const openingMove = this.openingBook.getMove(board, player, opponent);
            if (openingMove) {
                this.debugLog("Using opening book move:", openingMove);
                this.recordMove(board, openingMove.row, openingMove.col, player);
                return openingMove;
            }
        }
        
        // THREAT SPACE: Check for advanced threat patterns
        
        // Look for forcing moves (creating multiple threats)
        if (this.threatDetector) {
            const forcingMove = this.threatDetector.findForcingMove(
                board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
            );
            if (forcingMove) {
                this.debugLog("Found forcing threat move:", forcingMove);
                this.recordMove(board, forcingMove.row, forcingMove.col, player);
                return forcingMove;
            }
            
            // Look for critical defensive moves
            const defensiveMove = this.threatDetector.findCriticalDefensiveMove(
                board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
            );
            if (defensiveMove) {
                this.debugLog("Found critical defensive move:", defensiveMove);
                this.recordMove(board, defensiveMove.row, defensiveMove.col, player);
                return defensiveMove;
            }
        }
        
        // MINIMAX SEARCH: Find the best move using lookahead
        
        // Adjust the search depth based on the game state
        if (this.adaptiveDepth) {
            this.adjustSearchDepth(board, bounceRuleEnabled, missingTeethRuleEnabled);
        }
        
        // Get candidate moves to consider
        const candidateMoves = this.getHighlyPrioritizedMoves(
            board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        // Configure the search parameters
        this.minimaxSearch.setMaxDepth(this.maxDepth);
        this.minimaxSearch.setCache(this.positionCache);
        
        // Find the best move using search
        const bestMove = this.minimaxSearch.findBestMove(
            board, player, opponent, candidateMoves, 
            bounceRuleEnabled, missingTeethRuleEnabled,
            this.useIterativeDeepening
        );
        
        // Record the move for analysis
        if (bestMove) {
            this.debugLog("Selected best move from search:", bestMove);
            this.recordMove(board, bestMove.row, bestMove.col, player);
        } else if (candidateMoves.length > 0) {
            // Fallback to highest priority move if search failed
            bestMove = {
                row: candidateMoves[0].row,
                col: candidateMoves[0].col
            };
            this.debugLog("Fallback to highest priority move:", bestMove);
            this.recordMove(board, bestMove.row, bestMove.col, player);
        }
        
        return bestMove;
    }
    
    /**
     * Record the current board state for analysis
     * @param {Array} board - Current board state
     */
    recordBoardState(board) {
        // Make a deep copy to avoid reference issues
        this.currentBoardState = board.map(row => [...row]);
    }
    
    /**
     * Count the number of pieces on the board
     * @param {Array} board - 2D array representing the game board
     * @returns {number} - Number of pieces
     */
    countPieces(board) {
        let count = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    count++;
                }
            }
        }
        return count;
    }
    
    /**
     * Adjust search depth based on game state
     * @param {Array} board - Current board state
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     */
    adjustSearchDepth(board, bounceRuleEnabled, missingTeethRuleEnabled) {
        const pieceCount = this.countPieces(board);
        const totalCells = this.boardSize * this.boardSize;
        const emptyCount = totalCells - pieceCount;
        
        // Calculate complexity based on game state
        let complexity = 0;
        
        // Check for threatened patterns
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    const player = board[row][col];
                    
                    // Check for patterns in each direction
                    const directions = [
                        [0, 1], [1, 0], [1, 1], [1, -1]
                    ];
                    
                    for (const [dx, dy] of directions) {
                        const result = this.countInDirection(board, row, col, dx, dy, player);
                        if (result.count >= 3 && result.openEnds >= 1) {
                            complexity += 2;
                        }
                    }
                }
            }
        }
        
        // Set depth based on game state
        if (emptyCount >= 30 || complexity < 3) {
            this.maxDepth = 3; // Early game
        } else if (emptyCount >= 20 || complexity < 6) {
            this.maxDepth = 4; // Mid game
        } else if (emptyCount >= 10) {
            this.maxDepth = 5; // Late mid-game
        } else {
            this.maxDepth = 6; // End game
        }
        
        // Ensure minimum depth for bounce rule
        if (bounceRuleEnabled) {
            this.maxDepth = Math.max(4, this.maxDepth);
        }
    }
    
    /**
     * Get highly prioritized candidate moves
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Array} - Array of prioritized moves
     */
    getHighlyPrioritizedMoves(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        const moves = [];
        const seenMoves = new Set();
        
        // First get moves adjacent to existing pieces
        const adjacentMoves = this.getAdjacentEmptyPositions(board);
        
        for (const { row, col } of adjacentMoves) {
            const moveKey = `${row},${col}`;
            if (!seenMoves.has(moveKey)) {
                seenMoves.add(moveKey);
                
                // Calculate priority
                let priority = 100; // Base priority
                
                // Check tactical value
                if (this.threatDetector) {
                    const threatInfo = this.threatDetector.evaluatePosition(
                        board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    
                    priority += threatInfo.offensiveScore;
                    priority += threatInfo.defensiveScore;
                }
                
                // Check bounce potential
                if (bounceRuleEnabled) {
                    const isNearEdge = row <= 1 || row >= this.boardSize - 2 || 
                                     col <= 1 || col >= this.boardSize - 2;
                    
                    if (isNearEdge) {
                        // Evaluate bounce potential
                        const bouncePotential = this.patternDetector.evaluateBouncePotential(
                            board, row, col, player, opponent, missingTeethRuleEnabled
                        );
                        
                        priority += bouncePotential;
                    }
                }
                
                // Consider position on board
                const centerRow = Math.floor(this.boardSize / 2);
                const centerCol = Math.floor(this.boardSize / 2);
                const distanceFromCenter = Math.sqrt(
                    Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
                );
                
                // Balance center control with edge play for bounces
                if (!bounceRuleEnabled) {
                    priority += Math.max(0, 20 - distanceFromCenter * 5);
                }
                
                moves.push({ row, col, priority });
            }
        }
        
        // If we don't have enough moves, add non-adjacent positions
        if (moves.length < 10) {
            const emptyPositions = this.getEmptyPositions(board);
            
            for (const { row, col } of emptyPositions) {
                const moveKey = `${row},${col}`;
                if (!seenMoves.has(moveKey)) {
                    seenMoves.add(moveKey);
                    
                    // Use a lower base priority for non-adjacent moves
                    let priority = 50;
                    
                    // Add other evaluations similar to adjacent moves
                    // (simplified for brevity)
                    
                    moves.push({ row, col, priority });
                }
            }
        }
        
        // Sort by priority (highest first)
        return moves.sort((a, b) => b.priority - a.priority);
    }
    
    /**
     * Debug logging helper
     * @param {string} message - Message to log
     * @param {any} data - Optional data to log
     */
    debugLog(message, data = null) {
        if (this.debugMode) {
            if (data) {
                console.log(`[ImpossibleAI] ${message}`, data);
            } else {
                console.log(`[ImpossibleAI] ${message}`);
            }
        }
    }
}