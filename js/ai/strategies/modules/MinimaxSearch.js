/**
 * MinimaxSearch.js - Minimax search algorithm with alpha-beta pruning
 * This module handles the lookahead search for the AI
 */
class MinimaxSearch {
    /**
     * Create a new minimax search
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     * @param {BoardEvaluator} evaluator - Board evaluation utility
     */
    constructor(boardSize, rules, evaluator) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.evaluator = evaluator;
        this.maxDepth = 4;
        this.positionCache = new Map();
        this.maxCacheSize = 10000;
        this.useDefensiveBias = true; // For better blocking of opponent threats
        this.debugMode = false;
    }
    
    /**
     * Set the maximum search depth
     * @param {number} depth - Maximum search depth
     */
    setMaxDepth(depth) {
        this.maxDepth = depth;
    }
    
    /**
     * Set the position cache
     * @param {Map} cache - Position cache
     */
    setCache(cache) {
        this.positionCache = cache;
    }
    
    /**
     * Find the best move using minimax search
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {Array} candidateMoves - Prioritized candidate moves
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @param {boolean} useIterativeDeepening - Whether to use iterative deepening
     * @returns {Object} - Best move { row, col }
     */
    findBestMove(board, player, opponent, candidateMoves, bounceRuleEnabled, missingTeethRuleEnabled, useIterativeDeepening) {
        if (useIterativeDeepening) {
            return this.iterativeDeepeningSearch(
                board, player, opponent, candidateMoves, 
                bounceRuleEnabled, missingTeethRuleEnabled
            );
        } else {
            return this.standardMinimaxSearch(
                board, player, opponent, candidateMoves, 
                bounceRuleEnabled, missingTeethRuleEnabled
            );
        }
    }
    
    /**
     * Perform iterative deepening search to find the best move
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {Array} candidateMoves - Prioritized candidate moves
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - Best move { row, col }
     */
    iterativeDeepeningSearch(board, player, opponent, candidateMoves, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Start with a simple 1-ply search
        let currentDepth = 1;
        let bestMove = null;
        let lastCompletedDepth = 0;
        
        // Use a time limit of ~300ms for the search (increased from 250ms)
        const startTime = Date.now();
        const timeLimit = 2000; // milliseconds
        
        while (currentDepth <= this.maxDepth) {
            // Get the best move at the current depth
            const result = this.depthLimitedSearch(
                board, player, opponent, candidateMoves, currentDepth, 
                bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            // Update best move if we completed this depth
            if (result.completed) {
                bestMove = result.move;
                lastCompletedDepth = currentDepth;
                this.debugLog(`Completed search at depth ${currentDepth}, best move:`, bestMove);
            }
            
            // Check if we've used up our time budget
            if (Date.now() - startTime > timeLimit) {
                this.debugLog(`Time limit reached after depth ${currentDepth}`);
                break;
            }
            
            // Increment depth for next iteration
            currentDepth++;
        }
        
        // If we didn't complete any depth, use the highest priority move
        if (lastCompletedDepth === 0 && candidateMoves.length > 0) {
            bestMove = {
                row: candidateMoves[0].row,
                col: candidateMoves[0].col
            };
            this.debugLog("Using highest priority move due to search timeout:", bestMove);
        }
        
        return bestMove;
    }
    
    /**
     * Perform a depth-limited minimax search
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {Array} candidateMoves - Prioritized candidate moves
     * @param {number} depth - Maximum search depth
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - Search result { move, score, completed }
     */
    depthLimitedSearch(board, player, opponent, candidateMoves, depth, bounceRuleEnabled, missingTeethRuleEnabled) {
        let bestScore = -Infinity;
        let bestMove = null;
        let completed = true;
        
        // Alpha-beta pruning parameters
        let alpha = -Infinity;
        let beta = Infinity;
        
        // Use time limit to ensure we don't run too long
        const startTime = Date.now();
        const moveTimeLimit = 250; // milliseconds (increased from 200ms)
        
        // Try each candidate move
        for (let i = 0; i < candidateMoves.length; i++) {
            const { row, col } = candidateMoves[i];
            
            // Make the move on a temporary board
            const tempBoard = this.makeMove(board, row, col, player);
            
            // Check if this is a winning move (optimization)
            const result = this.rules.checkWin(
                tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            if (result.winner === player) {
                // Immediate win - no need to search deeper
                return { 
                    move: { row, col }, 
                    score: 1000, 
                    completed: true 
                };
            }
            
            // Use minimax to evaluate this move
            const score = this.minimax(
                tempBoard,
                depth,
                alpha,
                beta,
                false, // Minimizing player's turn next
                player,
                opponent,
                bounceRuleEnabled,
                missingTeethRuleEnabled,
                { row, col }
            );
            
            // Update best move if this one is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = { row, col };
            }
            
            // Update alpha for pruning
            alpha = Math.max(alpha, bestScore);
            
            // Check if we've used up our time budget
            if (Date.now() - startTime > moveTimeLimit) {
                // Mark as incomplete if we couldn't evaluate all moves
                if (i < candidateMoves.length - 1) {
                    completed = false;
                    this.debugLog(`Search timeout at depth ${depth} after ${i+1}/${candidateMoves.length} moves`);
                }
                break;
            }
        }
        
        return { 
            move: bestMove, 
            score: bestScore, 
            completed 
        };
    }
    
    /**
     * Perform a standard minimax search (without iterative deepening)
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {Array} candidateMoves - Prioritized candidate moves
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - Best move { row, col }
     */
    standardMinimaxSearch(board, player, opponent, candidateMoves, bounceRuleEnabled, missingTeethRuleEnabled) {
        let bestScore = -Infinity;
        let bestMove = null;
        
        // Alpha-beta pruning parameters
        let alpha = -Infinity;
        let beta = Infinity;
        
        // Limit the number of candidate moves for performance
        const movesToConsider = Math.min(15, candidateMoves.length);
        
        // Try each candidate move
        for (let i = 0; i < movesToConsider; i++) {
            const { row, col } = candidateMoves[i];
            
            // Make the move on a temporary board
            const tempBoard = this.makeMove(board, row, col, player);
            
            // Check if this is a winning move (optimization)
            const result = this.rules.checkWin(
                tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            if (result.winner === player) {
                // Immediate win - no need to search deeper
                return { row, col };
            }
            
            // Use minimax to evaluate this move
            const score = this.minimax(
                tempBoard,
                this.maxDepth,
                alpha,
                beta,
                false, // Minimizing player's turn next
                player,
                opponent,
                bounceRuleEnabled,
                missingTeethRuleEnabled,
                { row, col }
            );
            
            // Update best move if this one is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = { row, col };
            }
            
            // Update alpha for pruning
            alpha = Math.max(alpha, bestScore);
        }
        
        // If we couldn't find a move, pick the highest priority one
        if (!bestMove && candidateMoves.length > 0) {
            bestMove = {
                row: candidateMoves[0].row,
                col: candidateMoves[0].col
            };
        }
        
        return bestMove;
    }
    
    /**
     * Minimax algorithm with alpha-beta pruning
     * @param {Array} board - Current board state
     * @param {number} depth - Remaining depth
     * @param {number} alpha - Alpha value for pruning
     * @param {number} beta - Beta value for pruning
     * @param {boolean} isMaximizing - Whether this is a maximizing node
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @param {Object} lastMove - Last move made { row, col }
     * @returns {number} - Evaluation score
     */
    minimax(board, depth, alpha, beta, isMaximizing, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, lastMove) {
        // Generate a key for caching
        const boardKey = this.getBoardKey(board, isMaximizing, depth);
        
        // Check cache
        if (this.positionCache.has(boardKey)) {
            return this.positionCache.get(boardKey);
        }
        
        // Terminal conditions
        if (depth === 0) {
            const score = this.evaluator.evaluateBoard(
                board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, lastMove
            );
            this.positionCache.set(boardKey, score);
            return score;
        }
        
        // Check for game-ending states
        if (lastMove) {
            const { row, col } = lastMove;
            const currentPlayer = isMaximizing ? opponent : player;
            
            // Check if the last move resulted in a win
            const result = this.rules.checkWin(
                board, row, col, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            if (result.winner) {
                // Add depth to the score to prefer quicker wins/slower losses
                const score = result.winner === player ? 1000 + depth : -1000 - depth;
                this.positionCache.set(boardKey, score);
                return score;
            }
        }
        
        // Check if the board is full (draw)
        let hasEmptyCell = false;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    hasEmptyCell = true;
                    break;
                }
            }
            if (hasEmptyCell) break;
        }
        
        if (!hasEmptyCell) {
            this.positionCache.set(boardKey, 0);
            return 0;
        }
        
        // Get moves for this node
        const moves = this.getMovesForMinimaxNode(
            board, 
            isMaximizing ? player : opponent, 
            isMaximizing ? opponent : player,
            bounceRuleEnabled,
            missingTeethRuleEnabled,
            depth
        );
        
        if (isMaximizing) {
            // Maximizing player (AI)
            let maxEval = -Infinity;
            
            for (const { row, col } of moves) {
                // Make the move
                const tempBoard = this.makeMove(board, row, col, player);
                
                // Recursively evaluate
                const evalScore = this.minimax(
                    tempBoard, depth - 1, alpha, beta, false, player, opponent, 
                    bounceRuleEnabled, missingTeethRuleEnabled, { row, col }
                );
                
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            
            // Cache the result
            this.positionCache.set(boardKey, maxEval);
            return maxEval;
        } else {
            // Minimizing player (opponent)
            let minEval = Infinity;
            
            for (const { row, col } of moves) {
                // Make the move
                const tempBoard = this.makeMove(board, row, col, opponent);
                
                // Recursively evaluate
                const evalScore = this.minimax(
                    tempBoard, depth - 1, alpha, beta, true, player, opponent,
                    bounceRuleEnabled, missingTeethRuleEnabled, { row, col }
                );
                
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            
            // Cache the result
            this.positionCache.set(boardKey, minEval);
            return minEval;
        }
    }
    
    /**
     * Get moves for a minimax node
     * @param {Array} board - Current board state
     * @param {string} currentPlayer - Current player
     * @param {string} nextPlayer - Next player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @param {number} depth - Current search depth
     * @returns {Array} - Array of moves
     */
    getMovesForMinimaxNode(board, currentPlayer, nextPlayer, bounceRuleEnabled, missingTeethRuleEnabled, depth) {
        const moves = [];
        
        // For opponent's moves, prioritize blocks of our threats first
        if (currentPlayer !== this.player && this.useDefensiveBias) {
            // Check for wins and blocks first
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (board[row][col] === '') {
                        // Check if this is a winning move for opponent
                        const tempBoard = this.makeMove(board, row, col, currentPlayer);
                        const result = this.rules.checkWin(
                            tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
                        );
                        
                        if (result.winner === currentPlayer) {
                            // Opponent can win here - high priority
                            moves.push({ row, col, priority: 1000 });
                        }
                    }
                }
            }
        }
        
        // First try adjacent to existing pieces
        const adjacentPositions = new Set();
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    // Check all adjacent directions
                    const directions = [
                        [-1, -1], [-1, 0], [-1, 1],
                        [0, -1],           [0, 1],
                        [1, -1],  [1, 0],  [1, 1]
                    ];
                    
                    for (const [dx, dy] of directions) {
                        const adjRow = row + dx;
                        const adjCol = col + dy;
                        
                        if (adjRow >= 0 && adjRow < this.boardSize && 
                            adjCol >= 0 && adjCol < this.boardSize && 
                            board[adjRow][adjCol] === '') {
                            
                            // Calculate priority based on position
                            let priority = 0;
                            
                            // Check if this position is near an edge (for bounce potential)
                            if (bounceRuleEnabled) {
                                const isNearEdge = adjRow <= 1 || adjRow >= this.boardSize - 2 || 
                                                 adjCol <= 1 || adjCol >= this.boardSize - 2;
                                
                                // Higher priority for edge positions with bounce rule
                                if (isNearEdge) {
                                    priority += 10;
                                }
                            }
                            
                            // Add to the set of positions
                            adjacentPositions.add(JSON.stringify({ 
                                row: adjRow, 
                                col: adjCol,
                                priority
                            }));
                        }
                    }
                }
            }
        }
        
        // Convert to array and sort
        const adjacentMoves = Array.from(adjacentPositions)
            .map(pos => JSON.parse(pos))
            .sort((a, b) => b.priority - a.priority);
        
        // Add these to our moves list
        moves.push(...adjacentMoves);
        
        // Limit the number of moves for deeper levels in the search
        const maxMoves = depth >= 3 ? 12 : 18;
        return moves.slice(0, maxMoves);
    }
    
    /**
     * Make a move on a copy of the board (without modifying the original)
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player marker ('X' or 'O')
     * @returns {Array} - New board state after the move
     */
    makeMove(board, row, col, player) {
        // Create a deep copy of the board
        const newBoard = board.map(row => [...row]);
        
        // Make the move
        newBoard[row][col] = player;
        
        return newBoard;
    }
    
    /**
     * Generate a unique key for a board state (for caching)
     * @param {Array} board - 2D array representing the game board
     * @param {boolean} isMaximizing - Whether this is a maximizing node
     * @param {number} depth - Current search depth
     * @returns {string} - Unique key
     */
    getBoardKey(board, isMaximizing, depth) {
        // Generate a string representation of the board
        const boardString = board.map(row => row.join('')).join('|');
        return `${boardString}:${isMaximizing ? 'max' : 'min'}:${depth}`;
    }
    
    /**
     * Debug logging helper
     * @param {string} message - Message to log
     * @param {any} data - Optional data to log
     */
    debugLog(message, data = null) {
        if (this.debugMode) {
            if (data) {
                console.log(`[MinimaxSearch] ${message}`, data);
            } else {
                console.log(`[MinimaxSearch] ${message}`);
            }
        }
    }
}