/**
 * MinimaxStrategy.js - Implementation of the Extra Hard AI difficulty
 * This strategy uses full minimax algorithm with alpha-beta pruning
 */
class MinimaxStrategy extends AIPlayer {
    /**
     * Create a new Minimax Strategy AI
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     * @param {BoardEvaluator} evaluator - Board evaluation utility
     */
    constructor(boardSize, rules, evaluator) {
        super(boardSize, rules);
        this.name = "Extra Hard AI";
        this.difficultyLevel = 4;
        this.evaluator = evaluator;
        this.maxDepth = 3; // Default max depth
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
        
        // First priority: Win if possible (optimization)
        const winningMove = this.findWinningMove(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (winningMove) {
            this.recordMove(board, winningMove.row, winningMove.col, player);
            return winningMove;
        }
        
        // Second priority: Block opponent from winning (optimization)
        const blockingMove = this.findWinningMove(
            board, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (blockingMove) {
            this.recordMove(board, blockingMove.row, blockingMove.col, player);
            return blockingMove;
        }
        
        // Third priority: Try center if available (optimization)
        const centerMove = this.getCenterMove(board);
        if (centerMove && this.countPieces(board) < 3) {
            this.recordMove(board, centerMove.row, centerMove.col, player);
            return centerMove;
        }
        
        // Adjust depth based on game progression
        this.adjustMaxDepth(board);
        
        // Get all valid moves, prioritized for faster pruning
        const candidateMoves = this.getPrioritizedMoves(
            board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        let bestScore = -Infinity;
        let bestMove = null;
        
        // Alpha-beta pruning parameters
        let alpha = -Infinity;
        let beta = Infinity;
        
        // Try each candidate move
        for (const move of candidateMoves) {
            const { row, col } = move;
            
            // Make the move on a temporary board
            const tempBoard = this.makeMove(board, row, col, player);
            
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
                missingTeethRuleEnabled
            );
            
            // Update best move if this one is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = { row, col };
            }
            
            // Update alpha
            alpha = Math.max(alpha, bestScore);
        }
        
        // If we couldn't find a move (shouldn't happen if the board isn't full)
        if (!bestMove) {
            // Fall back to any empty cell
            const randomMove = this.getRandomMove(board);
            
            if (randomMove) {
                this.recordMove(board, randomMove.row, randomMove.col, player);
                return randomMove;
            }
        }
        
        if (bestMove) {
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
     * Adjust max depth based on game progression
     * @param {Array} board - 2D array representing the game board
     */
    adjustMaxDepth(board) {
        const pieceCount = this.countPieces(board);
        const totalCells = this.boardSize * this.boardSize;
        
        // Early game - lower depth
        if (pieceCount < 5) {
            this.maxDepth = 3;
        }
        // Mid game - standard depth
        else if (pieceCount < totalCells * 0.5) {
            this.maxDepth = 3;
        }
        // End game - higher depth when fewer moves are left
        else if (pieceCount < totalCells * 0.7) {
            this.maxDepth = 4;
        }
        // Very end game - highest depth
        else {
            this.maxDepth = 5;
        }
    }
    
    /**
     * Get prioritized moves for faster alpha-beta pruning
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Array} - Array of moves { row, col, priority }
     */
    getPrioritizedMoves(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        const moves = [];
        
        // Get all empty positions
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    // Calculate priority for this move
                    let priority = 0;
                    
                    // Evaluate threats and opportunities
                    const tempBoard = this.makeMove(board, row, col, player);
                    
                    // Check for winning threat
                    const result = this.rules.checkWin(
                        tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    if (result.winner === player) {
                        priority += 1000; // Winning move gets highest priority
                    }
                    
                    // Count potential threats this move creates
                    const threatCount = this.countPotentialThreats(
                        tempBoard, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    priority += threatCount * 50;
                    
                    // Priority based on position
                    const centerRow = Math.floor(this.boardSize / 2);
                    const centerCol = Math.floor(this.boardSize / 2);
                    
                    // Center control is valuable
                    if (row === centerRow && col === centerCol) {
                        priority += 10;
                    }
                    
                    // Positions near the center are good
                    const distFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
                    priority += Math.max(0, 8 - distFromCenter);
                    
                    // Add to moves list
                    moves.push({ row, col, priority });
                }
            }
        }
        
        // Sort by priority (highest first)
        moves.sort((a, b) => b.priority - a.priority);
        
        return moves;
    }
    
    /**
     * Count potential threats a move creates
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player who made the move
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Threat count score
     */
    countPotentialThreats(board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Define directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        let threatScore = 0;
        
        // Check each direction
        for (const [dx, dy] of directions) {
            // Evaluate player's sequence
            const playerResult = this.countInDirection(board, row, col, dx, dy, player);
            
            // Score based on count and open ends
            if (playerResult.count >= 4 && playerResult.openEnds >= 1) {
                threatScore += 10; // Near win
            } else if (playerResult.count === 3 && playerResult.openEnds === 2) {
                threatScore += 5; // Double-sided threat
            } else if (playerResult.count === 3 && playerResult.openEnds === 1) {
                threatScore += 2; // Single-sided threat
            }
            
            // Block opponent's threats
            const opponentResult = this.countInDirection(board, row, col, dx, dy, opponent);
            
            if (opponentResult.count >= 3 && opponentResult.openEnds >= 1) {
                threatScore += 3; // Blocking opponent's potential win
            }
        }
        
        return threatScore;
    }
    
    /**
     * Minimax algorithm with alpha-beta pruning
     * @param {Array} board - Current board state
     * @param {number} depth - Depth to look ahead
     * @param {number} alpha - Alpha value for pruning
     * @param {number} beta - Beta value for pruning
     * @param {boolean} isMaximizing - Whether this is a maximizing node
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Score of the position
     */
    minimax(board, depth, alpha, beta, isMaximizing, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Terminal conditions
        if (depth === 0) {
            return this.evaluator.evaluateBoard(
                board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
            );
        }
        
        // Get all empty positions
        const emptyPositions = this.getEmptyPositions(board);
        
        // If no moves left or terminal state
        if (emptyPositions.length === 0) {
            return 0; // Draw
        }
        
        if (isMaximizing) {
            // Maximizing player (AI)
            let maxEval = -Infinity;
            
            for (const position of emptyPositions) {
                const { row, col } = position;
                
                // Make the move
                const tempBoard = this.makeMove(board, row, col, player);
                
                // Check if this is a winning move
                const result = this.rules.checkWin(
                    tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                if (result.winner === player) {
                    return 1000 + depth; // Win is better the sooner it happens
                }
                
                // Recursively evaluate
                const evalScore = this.minimax(
                    tempBoard, depth - 1, alpha, beta, false, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            
            return maxEval;
        } else {
            // Minimizing player (opponent)
            let minEval = Infinity;
            
            for (const position of emptyPositions) {
                const { row, col } = position;
                
                // Make the move
                const tempBoard = this.makeMove(board, row, col, opponent);
                
                // Check if this is a winning move for opponent
                const result = this.rules.checkWin(
                    tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                if (result.winner === opponent) {
                    return -1000 - depth; // Loss is worse the sooner it happens
                }
                
                // Recursively evaluate
                const evalScore = this.minimax(
                    tempBoard, depth - 1, alpha, beta, true, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            
            return minEval;
        }
    }
}