/**
 * OpeningBook.js - Strategic opening moves for the AI
 * This module handles the early game strategy
 */
class OpeningBook {
    /**
     * Create a new opening book
     * @param {number} boardSize - Size of the game board
     */
    constructor(boardSize) {
        this.boardSize = boardSize;
        
        // Strategies based on game state
        this.strategies = {
            'empty': this.emptyBoardStrategy.bind(this),
            'center': this.centerResponseStrategy.bind(this),
            'corner': this.cornerResponseStrategy.bind(this),
            'edge': this.edgeResponseStrategy.bind(this),
            'centerOwned': this.centerOwnedStrategy.bind(this)
        };
    }
    
    /**
     * Get a move from the opening book
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object|null} - Opening move { row, col } or null if none found
     */
    getMove(board, player, opponent) {
        // Count pieces to determine the game state
        const pieceCount = this.countPieces(board);
        
        // Get coordinates of the board center
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        // First move: Always take center if available
        if (pieceCount === 0) {
            return this.strategies.empty(board, player, opponent);
        }
        
        // If center is taken by opponent, respond to that
        if (pieceCount === 1 && board[centerRow][centerCol] === opponent) {
            return this.strategies.center(board, player, opponent);
        }
        
        // If center is taken by us, build from there
        if (board[centerRow][centerCol] === player) {
            return this.strategies.centerOwned(board, player, opponent);
        }
        
        // If opponent played in a corner, respond to that
        if (pieceCount === 1) {
            // Check if opponent's piece is in a corner
            const corners = [
                [0, 0], [0, this.boardSize - 1], 
                [this.boardSize - 1, 0], [this.boardSize - 1, this.boardSize - 1]
            ];
            
            for (const [row, col] of corners) {
                if (board[row][col] === opponent) {
                    return this.strategies.corner(board, player, opponent);
                }
            }
        }
        
        // If opponent played on an edge, respond to that
        if (pieceCount === 1) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (board[row][col] === opponent) {
                        const isEdge = row === 0 || row === this.boardSize - 1 || 
                                     col === 0 || col === this.boardSize - 1;
                        
                        if (isEdge && !this.isCorner(row, col)) {
                            return this.strategies.edge(board, player, opponent);
                        }
                    }
                }
            }
        }
        
        // If we have 2+ in a row, try to extend the sequence
        if (pieceCount >= 3) {
            return this.findExtendSequenceMove(board, player);
        }
        
        return null; // No opening book move found
    }
    
    /**
     * Strategy for an empty board
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    emptyBoardStrategy(board, player, opponent) {
        // Take the center
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        return { row: centerRow, col: centerCol };
    }
    
    /**
     * Strategy when opponent has taken the center
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    centerResponseStrategy(board, player, opponent) {
        // Take a corner (with a slight random element)
        const corners = [
            { row: 0, col: 0 },
            { row: 0, col: this.boardSize - 1 },
            { row: this.boardSize - 1, col: 0 },
            { row: this.boardSize - 1, col: this.boardSize - 1 }
        ];
        
        // Pick a random corner
        const randomIndex = Math.floor(Math.random() * corners.length);
        return corners[randomIndex];
    }
    
    /**
     * Strategy when opponent has taken a corner
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    cornerResponseStrategy(board, player, opponent) {
        // Take the center if available
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        if (board[centerRow][centerCol] === '') {
            return { row: centerRow, col: centerCol };
        }
        
        // Otherwise, take the opposite corner
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === opponent && this.isCorner(row, col)) {
                    // Calculate the opposite corner
                    const oppositeRow = this.boardSize - 1 - row;
                    const oppositeCol = this.boardSize - 1 - col;
                    
                    return { row: oppositeRow, col: oppositeCol };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Strategy when opponent has taken an edge (not corner)
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    edgeResponseStrategy(board, player, opponent) {
        // Take the center if available
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        if (board[centerRow][centerCol] === '') {
            return { row: centerRow, col: centerCol };
        }
        
        // Otherwise, take a corner adjacent to opponent's edge piece
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === opponent) {
                    if (row === 0) {
                        // Top edge - take a top corner
                        return { row: 0, col: col === 0 ? this.boardSize - 1 : 0 };
                    } else if (row === this.boardSize - 1) {
                        // Bottom edge - take a bottom corner
                        return { row: this.boardSize - 1, col: col === 0 ? this.boardSize - 1 : 0 };
                    } else if (col === 0) {
                        // Left edge - take a left corner
                        return { row: row === 0 ? this.boardSize - 1 : 0, col: 0 };
                    } else if (col === this.boardSize - 1) {
                        // Right edge - take a right corner
                        return { row: row === 0 ? this.boardSize - 1 : 0, col: this.boardSize - 1 };
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Strategy when AI already owns the center
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    centerOwnedStrategy(board, player, opponent) {
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        // Look for opponent's pieces
        let opponentRow = -1;
        let opponentCol = -1;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === opponent) {
                    opponentRow = row;
                    opponentCol = col;
                    break;
                }
            }
            if (opponentRow >= 0) break;
        }
        
        if (opponentRow >= 0) {
            // Try to play opposite from opponent's move for good board control
            const offsetRow = 2 * centerRow - opponentRow;
            const offsetCol = 2 * centerCol - opponentCol;
            
            // Make sure it's a valid position
            if (
                offsetRow >= 0 && offsetRow < this.boardSize &&
                offsetCol >= 0 && offsetCol < this.boardSize &&
                board[offsetRow][offsetCol] === ''
            ) {
                return { row: offsetRow, col: offsetCol };
            }
        }
        
        // If opponent hasn't moved or offset position is taken, create a line from center
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1], // Straight directions first
            [-1, -1], [-1, 1], [1, -1], [1, 1] // Diagonals second
        ];
        
        for (const [dx, dy] of directions) {
            const newRow = centerRow + dx;
            const newCol = centerCol + dy;
            
            if (newRow >= 0 && newRow < this.boardSize && 
                newCol >= 0 && newCol < this.boardSize &&
                board[newRow][newCol] === '') {
                return { row: newRow, col: newCol };
            }
        }
        
        return null;
    }
    
    /**
     * Find a move that extends an existing sequence
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @returns {Object|null} - Move to extend a sequence or null if none found
     */
    findExtendSequenceMove(board, player) {
        // Define directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        const sequences = [];
        
        // Find all sequences of 2+ pieces in a row
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Check each direction
                    for (const [dx, dy] of directions) {
                        // Count consecutive pieces
                        let count = 1;
                        let emptyPositions = [];
                        
                        // Look ahead in this direction
                        for (let i = 1; i < 4; i++) {
                            const newRow = row + i * dx;
                            const newCol = col + i * dy;
                            
                            if (newRow < 0 || newRow >= this.boardSize || 
                                newCol < 0 || newCol >= this.boardSize) {
                                break;
                            }
                            
                            if (board[newRow][newCol] === player) {
                                count++;
                            } else if (board[newRow][newCol] === '') {
                                emptyPositions.push({ row: newRow, col: newCol });
                                break;
                            } else {
                                break;
                            }
                        }
                        
                        // Look behind in this direction
                        for (let i = 1; i < 4; i++) {
                            const newRow = row - i * dx;
                            const newCol = col - i * dy;
                            
                            if (newRow < 0 || newRow >= this.boardSize || 
                                newCol < 0 || newCol >= this.boardSize) {
                                break;
                            }
                            
                            if (board[newRow][newCol] === player) {
                                count++;
                            } else if (board[newRow][newCol] === '') {
                                emptyPositions.push({ row: newRow, col: newCol });
                                break;
                            } else {
                                break;
                            }
                        }
                        
                        // If we found at least 2 in a row with an empty spot to extend
                        if (count >= 2 && emptyPositions.length > 0) {
                            sequences.push({
                                count,
                                emptyPositions,
                                // Prioritize edge positions for bounce potential
                                isNearEdge: emptyPositions.some(pos => 
                                    pos.row === 0 || pos.row === this.boardSize - 1 || 
                                    pos.col === 0 || pos.col === this.boardSize - 1
                                )
                            });
                        }
                    }
                }
            }
        }
        
        // Sort sequences by count (highest first) and edge proximity
        sequences.sort((a, b) => {
            if (a.count !== b.count) return b.count - a.count;
            return a.isNearEdge ? -1 : (b.isNearEdge ? 1 : 0);
        });
        
        // Take the first empty position from the best sequence
        if (sequences.length > 0) {
            return sequences[0].emptyPositions[0];
        }
        
        return null;
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
     * Check if a position is a corner
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean} - Whether the position is a corner
     */
    isCorner(row, col) {
        return (row === 0 || row === this.boardSize - 1) && 
               (col === 0 || col === this.boardSize - 1);
    }
}