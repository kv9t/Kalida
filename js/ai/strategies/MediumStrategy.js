/**
 * MediumStrategy.js - Implementation of the Medium AI difficulty
 * This strategy uses basic heuristics but is not too smart
 */
class MediumStrategy extends AIPlayer {
    /**
     * Create a new Medium Strategy AI
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     */
    constructor(boardSize, rules) {
        super(boardSize, rules);
        this.name = "Medium AI";
        this.difficultyLevel = 2;
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
        
        // First priority: Win if possible (80% of the time)
        if (Math.random() < 0.8) {
            const winningMove = this.findWinningMove(
                board, player, bounceRuleEnabled, missingTeethRuleEnabled
            );
            if (winningMove) {
                this.recordMove(board, winningMove.row, winningMove.col, player);
                return winningMove;
            }
        }
        
        // Second priority: Block opponent from winning (70% of the time)
        if (Math.random() < 0.7) {
            const blockingMove = this.findWinningMove(
                board, opponent, bounceRuleEnabled, missingTeethRuleEnabled
            );
            if (blockingMove) {
                this.recordMove(board, blockingMove.row, blockingMove.col, player);
                return blockingMove;
            }
        }
        
        // Third priority: Take center if available (90% of the time)
        if (Math.random() < 0.9) {
            const centerMove = this.getCenterMove(board);
            if (centerMove) {
                this.recordMove(board, centerMove.row, centerMove.col, player);
                return centerMove;
            }
        }
        
        // Fourth priority: Look for advantageous positions (50% of the time)
        if (Math.random() < 0.5) {
            const strategicMove = this.findStrategicMove(board, player, opponent);
            if (strategicMove) {
                this.recordMove(board, strategicMove.row, strategicMove.col, player);
                return strategicMove;
            }
        }
        
        // Fifth priority: Choose a position adjacent to existing pieces
        const adjacentMove = this.getAdjacentMove(board);
        if (adjacentMove) {
            this.recordMove(board, adjacentMove.row, adjacentMove.col, player);
            return adjacentMove;
        }
        
        // Last resort: choose a random position
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
     * Find a strategic move (two in a row, etc.)
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object|null} - Strategic move { row, col } or null if none exists
     */
    findStrategicMove(board, player, opponent) {
        // Define directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        // Store potential moves with their scores
        const potentialMoves = [];
        
        // Try each empty cell
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    let score = 0;
                    
                    // Check each direction
                    for (const [dx, dy] of directions) {
                        // Count player's pieces in this direction
                        const playerCount = this.countInDirection(board, row, col, dx, dy, player);
                        
                        // Score based on number of pieces and open ends
                        if (playerCount.count >= 3 && playerCount.openEnds >= 1) {
                            score += 10; // Good potential for a win
                        } else if (playerCount.count === 2 && playerCount.openEnds === 2) {
                            score += 5; // Building a sequence
                        }
                        
                        // Count opponent's pieces in this direction
                        const opponentCount = this.countInDirection(board, row, col, dx, dy, opponent);
                        
                        // Defensive scoring
                        if (opponentCount.count >= 3 && opponentCount.openEnds >= 1) {
                            score += 8; // Block opponent's potential win
                        } else if (opponentCount.count === 2 && opponentCount.openEnds === 2) {
                            score += 3; // Block opponent's building sequence
                        }
                    }
                    
                    // Center proximity bonus
                    const centerRow = Math.floor(this.boardSize / 2);
                    const centerCol = Math.floor(this.boardSize / 2);
                    const distFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
                    score += Math.max(0, 5 - distFromCenter);
                    
                    // Add to potential moves if score is positive
                    if (score > 0) {
                        potentialMoves.push({
                            row,
                            col,
                            score
                        });
                    }
                }
            }
        }
        
        // Sort potential moves by score (highest first)
        potentialMoves.sort((a, b) => b.score - a.score);
        
        // Return the best move if any found
        if (potentialMoves.length > 0) {
            return {
                row: potentialMoves[0].row,
                col: potentialMoves[0].col
            };
        }
        
        return null;
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
        
        // Randomly select one of the adjacent positions
        const randomIndex = Math.floor(Math.random() * adjacentPositions.length);
        return adjacentPositions[randomIndex];
    }
}