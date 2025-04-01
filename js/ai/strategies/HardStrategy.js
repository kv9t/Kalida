/**
 * HardStrategy.js - Implementation of the Hard AI difficulty
 * This strategy uses more advanced heuristics and basic lookahead
 */
class HardStrategy extends AIPlayer {
    /**
     * Create a new Hard Strategy AI
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     * @param {BoardEvaluator} evaluator - Board evaluation utility
     */
    constructor(boardSize, rules, evaluator) {
        super(boardSize, rules);
        this.name = "Hard AI";
        this.difficultyLevel = 3;
        this.evaluator = evaluator;
        this.lookAheadDepth = 2; // Look 2 moves ahead
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
        
        // First priority: Win if possible
        const winningMove = this.findWinningMove(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (winningMove) {
            this.recordMove(board, winningMove.row, winningMove.col, player);
            return winningMove;
        }
        
        // Second priority: Block opponent from winning
        const blockingMove = this.findWinningMove(
            board, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (blockingMove) {
            this.recordMove(board, blockingMove.row, blockingMove.col, player);
            return blockingMove;
        }
        
        // Third priority: Find a forking move (creates two threats)
        const forkingMove = this.findForkingMove(
            board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (forkingMove) {
            this.recordMove(board, forkingMove.row, forkingMove.col, player);
            return forkingMove;
        }
        
        // Fourth priority: Block opponent's forking move
        const blockForkMove = this.findForkingMove(
            board, opponent, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (blockForkMove) {
            this.recordMove(board, blockForkMove.row, blockForkMove.col, player);
            return blockForkMove;
        }
        
        // Fifth priority: Center if available
        const centerMove = this.getCenterMove(board);
        if (centerMove) {
            this.recordMove(board, centerMove.row, centerMove.col, player);
            return centerMove;
        }
        
        // Sixth priority: Look for the best move using evaluation
        const bestMove = this.findBestMove(
            board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (bestMove) {
            this.recordMove(board, bestMove.row, bestMove.col, player);
            return bestMove;
        }
        
        // Last resort: choose a random adjacent move
        const adjacentMove = this.getAdjacentMove(board);
        if (adjacentMove) {
            this.recordMove(board, adjacentMove.row, adjacentMove.col, player);
            return adjacentMove;
        }
        
        // If all else fails, choose a random position
        const randomMove = this.getRandomMove(board);
        if (randomMove) {
            this.recordMove(board, randomMove.row, randomMove.col, player);
            return randomMove;
        }
        
        return null; // No valid moves (should never happen unless board is full)
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
     * Find a move that creates multiple winning threats (a "fork")
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - Player to find forking move for
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object|null} - Forking move { row, col } or null if none exists
     */
    findForkingMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Try each empty cell
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    // Check if this move creates multiple threats
                    const threatCount = this.countPotentialWins(
                        board, row, col, player, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    
                    // If it creates multiple threats, this is a forking move
                    if (threatCount >= 2) {
                        return { row, col };
                    }
                }
            }
        }
        
        return null; // No forking move found
    }
    
    /**
     * Count how many potential wins a move would create
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player to check for ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Number of potential wins
     */
    countPotentialWins(board, row, col, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Make a copy of the board to simulate the move
        const tempBoard = board.map(row => [...row]);
        tempBoard[row][col] = player;
        
        // Define directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        let potentialWins = 0;
        
        // Check each direction
        for (const [dx, dy] of directions) {
            // Count consecutive pieces and empty spaces
            let count = 1; // Start with the position itself
            let emptySpaces = 0;
            let openEnds = 0;
            
            // Check both directions
            for (let dir = -1; dir <= 1; dir += 2) {
                if (dir === 0) continue;
                
                let foundEmpty = false;
                
                // Look up to 4 positions away
                for (let i = 1; i <= 4; i++) {
                    const newRow = row + i * dx * dir;
                    const newCol = col + i * dy * dir;
                    
                    // Check if the position is valid
                    if (
                        newRow >= 0 && newRow < this.boardSize &&
                        newCol >= 0 && newCol < this.boardSize
                    ) {
                        if (tempBoard[newRow][newCol] === player) {
                            count++;
                        } else if (tempBoard[newRow][newCol] === '') {
                            emptySpaces++;
                            if (!foundEmpty) {
                                openEnds++;
                                foundEmpty = true;
                            }
                            break;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            
            // If we have 3 or 4 in a row with enough spaces to make 5, it's a potential win
            if ((count === 4 && openEnds >= 1) || (count === 3 && openEnds === 2)) {
                potentialWins++;
            }
        }
        
        // Check for bounce patterns if enabled
        if (bounceRuleEnabled) {
            // This would require implementing bounce pattern detection
            // For now, we'll use a simplified version
            const diagonalDirections = [
                [1, 1],  // diagonal
                [1, -1]  // anti-diagonal
            ];
            
            for (const [dx, dy] of diagonalDirections) {
                // Check if this position is near an edge (where bounce is possible)
                const isNearEdge = 
                    row <= 1 || row >= this.boardSize - 2 || 
                    col <= 1 || col >= this.boardSize - 2;
                
                if (isNearEdge) {
                    // Simple check: if we have 3+ pieces in a row near an edge,
                    // consider it a potential bounce pattern
                    const result = this.countInDirection(tempBoard, row, col, dx, dy, player);
                    if (result.count >= 3) {
                        potentialWins++;
                    }
                }
            }
        }
        
        return potentialWins;
    }
    
    /**
     * Find the best move using board evaluation
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object|null} - Best move { row, col } or null if no moves available
     */
    findBestMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        let bestScore = -Infinity;
        let bestMove = null;
        
        // Get all adjacent empty positions for efficiency
        const positions = this.getAdjacentEmptyPositions(board);
        
        // If no adjacent positions, consider all empty positions
        const candidates = positions.length > 0 ? positions : this.getEmptyPositions(board);
        
        // Evaluate each candidate position
        for (const position of candidates) {
            const { row, col } = position;
            
            // Make the move on a temporary board
            const tempBoard = this.makeMove(board, row, col, player);
            
            // Calculate score for this move
            let score = 0;
            
            // Use minimax if evaluator is available
            if (this.evaluator) {
                score = this.minimax(
                    tempBoard, 
                    this.lookAheadDepth, 
                    false, 
                    player, 
                    opponent, 
                    bounceRuleEnabled, 
                    missingTeethRuleEnabled
                );
            } else {
                // Fallback to simple evaluation
                score = this.evaluatePosition(
                    tempBoard, row, col, player, opponent, 
                    bounceRuleEnabled, missingTeethRuleEnabled
                );
            }
            
            // Update best move if this is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = { row, col };
            }
        }
        
        return bestMove;
    }
    
    /**
     * Simple minimax implementation for lookahead
     * @param {Array} board - Current board state
     * @param {number} depth - Depth to look ahead
     * @param {boolean} isMaximizing - Whether this is a maximizing node
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Score of the position
     */
    minimax(board, depth, isMaximizing, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // If we have an evaluator, use it to evaluate terminal nodes
        if (depth === 0) {
            return this.evaluator ? 
                this.evaluator.evaluateBoard(
                    board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
                ) : 
                0;
        }
        
        // Get all empty positions
        const positions = this.getEmptyPositions(board);
        
        // If no moves left or terminal state
        if (positions.length === 0) {
            return 0; // Draw
        }
        
        if (isMaximizing) {
            // Maximizing player (AI)
            let bestScore = -Infinity;
            
            for (const position of positions) {
                const { row, col } = position;
                
                // Make the move
                const tempBoard = this.makeMove(board, row, col, player);
                
                // Check if this is a winning move
                const result = this.rules.checkWin(
                    tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                if (result.winner === player) {
                    return 100 + depth; // Win is better the sooner it happens
                }
                
                // Recursively evaluate
                const score = this.minimax(
                    tempBoard, depth - 1, false, player, opponent, 
                    bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                bestScore = Math.max(bestScore, score);
            }
            
            return bestScore;
        } else {
            // Minimizing player (opponent)
            let bestScore = Infinity;
            
            for (const position of positions) {
                const { row, col } = position;
                
                // Make the move
                const tempBoard = this.makeMove(board, row, col, opponent);
                
                // Check if this is a winning move for opponent
                const result = this.rules.checkWin(
                    tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                if (result.winner === opponent) {
                    return -100 - depth; // Loss is worse the sooner it happens
                }
                
                // Recursively evaluate
                const score = this.minimax(
                    tempBoard, depth - 1, true, player, opponent, 
                    bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                bestScore = Math.min(bestScore, score);
            }
            
            return bestScore;
        }
    }
    
    /**
     * Simple evaluation function for a position
     * @param {Array} board - Current board state
     * @param {number} row - Row of the last move
     * @param {number} col - Column of the last move
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Score of the position
     */
    evaluatePosition(board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Define directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        let score = 0;
        
        // Check each direction
        for (const [dx, dy] of directions) {
            // Evaluate player's potential
            const playerResult = this.countInDirection(board, row, col, dx, dy, player);
            
            // Score based on count and open ends
            if (playerResult.count >= 4 && playerResult.openEnds >= 1) {
                score += 100; // Nearly winning
            } else if (playerResult.count === 3 && playerResult.openEnds === 2) {
                score += 50; // Strong threat
            } else if (playerResult.count === 3 && playerResult.openEnds === 1) {
                score += 10; // Moderate threat
            } else if (playerResult.count === 2 && playerResult.openEnds === 2) {
                score += 5; // Developing
            }
            
            // Evaluate opponent's threats
            const opponentResult = this.countInDirection(board, row, col, dx, dy, opponent);
            
            // Score based on count and open ends (negatively)
            if (opponentResult.count >= 4 && opponentResult.openEnds >= 1) {
                score -= 90; // Opponent nearly winning
            } else if (opponentResult.count === 3 && opponentResult.openEnds === 2) {
                score -= 40; // Strong opponent threat
            } else if (opponentResult.count === 3 && opponentResult.openEnds === 1) {
                score -= 8; // Moderate opponent threat
            } else if (opponentResult.count === 2 && opponentResult.openEnds === 2) {
                score -= 4; // Opponent developing
            }
        }
        
        // Position-based scoring
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        // Bonus for center control
        if (row === centerRow && col === centerCol) {
            score += 5;
        }
        
        // Bonus for positions near the center
        const distFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
        score += Math.max(0, 5 - distFromCenter);
        
        return score;
    }
    
    /**
     * Get a move adjacent to existing pieces
     * @param {Array} board - 2D array representing the game board
     * @returns {Object|null} - Adjacent move { row, col } or null if none exists
     */
    getAdjacentMove(board) {
        const adjacentPositions = this.getAdjacentEmptyPositions(board);
        
        if (adjacentPositions.length === 0) {
            return null;
        }
        
        // Select the most strategic adjacent position
        const strategicPositions = adjacentPositions.map(pos => {
            const centerRow = Math.floor(this.boardSize / 2);
            const centerCol = Math.floor(this.boardSize / 2);
            const distFromCenter = Math.abs(pos.row - centerRow) + Math.abs(pos.col - centerCol);
            
            return {
                ...pos,
                score: 5 - distFromCenter // Prefer positions closer to center
            };
        });
        
        // Sort by score (highest first)
        strategicPositions.sort((a, b) => b.score - a.score);
        
        // Return the highest-scored position
        return {
            row: strategicPositions[0].row,
            col: strategicPositions[0].col
        };
    }
}