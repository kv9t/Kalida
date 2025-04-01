/**
 * AIUtils.js - Common utility functions for AI components
 * These utilities are shared across different AI strategies
 */
class AIUtils {
    /**
     * Count consecutive pieces in a direction from a position
     * @param {Array} board - 2D array representing the game board
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Row direction (-1, 0, 1)
     * @param {number} dy - Column direction (-1, 0, 1)
     * @param {string} player - Player marker to count
     * @param {number} boardSize - Size of the game board
     * @returns {Object} - Count data { count, openEnds, path }
     */
    static countInDirection(board, startRow, startCol, dx, dy, player, boardSize) {
        let count = 1; // Start with the current position
        let openEnds = 0;
        const path = [[startRow, startCol]];
        
        // Check forward direction
        let forwardOpen = false;
        for (let i = 1; i < 5; i++) {
            const newRow = startRow + i * dx;
            const newCol = startCol + i * dy;
            
            // Check if position is valid
            if (newRow < 0 || newRow >= boardSize || 
                newCol < 0 || newCol >= boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else if (board[newRow][newCol] === '') {
                forwardOpen = true;
                openEnds++;
                break;
            } else {
                break;
            }
        }
        
        // Check backward direction
        for (let i = 1; i < 5; i++) {
            const newRow = startRow - i * dx;
            const newCol = startCol - i * dy;
            
            // Check if position is valid
            if (newRow < 0 || newRow >= boardSize || 
                newCol < 0 || newCol >= boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else if (board[newRow][newCol] === '') {
                openEnds++;
                break;
            } else {
                break;
            }
        }
        
        return { count, openEnds, path };
    }
    
    /**
     * Get all empty positions on the board
     * @param {Array} board - 2D array representing the game board
     * @param {number} boardSize - Size of the game board
     * @returns {Array} - Array of positions { row, col }
     */
    static getEmptyPositions(board, boardSize) {
        const positions = [];
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (board[row][col] === '') {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }
    
    /**
     * Get positions adjacent to existing pieces
     * @param {Array} board - 2D array representing the game board
     * @param {number} boardSize - Size of the game board
     * @returns {Array} - Array of positions { row, col }
     */
    static getAdjacentEmptyPositions(board, boardSize) {
        const adjacentPositions = new Set();
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        // Find all filled positions
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (board[row][col] !== '') {
                    // Check all adjacent directions
                    for (const [dx, dy] of directions) {
                        const newRow = row + dx;
                        const newCol = col + dy;
                        
                        // Check if the position is valid and empty
                        if (
                            newRow >= 0 && newRow < boardSize &&
                            newCol >= 0 && newCol < boardSize &&
                            board[newRow][newCol] === ''
                        ) {
                            // Use a key to avoid duplicates
                            adjacentPositions.add(`${newRow},${newCol}`);
                        }
                    }
                }
            }
        }
        
        // Convert Set back to array of position objects
        return Array.from(adjacentPositions).map(pos => {
            const [row, col] = pos.split(',').map(Number);
            return { row, col };
        });
    }
    
    /**
     * Make a move on a copy of the board (without modifying the original)
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player marker ('X' or 'O')
     * @returns {Array} - New board state after the move
     */
    static makeMove(board, row, col, player) {
        // Create a deep copy of the board
        const newBoard = board.map(row => [...row]);
        
        // Make the move
        newBoard[row][col] = player;
        
        return newBoard;
    }
    
    /**
     * Count all pieces on the board
     * @param {Array} board - 2D array representing the game board
     * @param {number} boardSize - Size of the game board
     * @param {string} [player] - Optional player to count pieces for ('X', 'O', or null for all)
     * @returns {number} - Number of pieces
     */
    static countPieces(board, boardSize, player = null) {
        let count = 0;
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (player) {
                    if (board[row][col] === player) {
                        count++;
                    }
                } else if (board[row][col] !== '') {
                    count++;
                }
            }
        }
        return count;
    }
    
    /**
     * Check if the center position is available
     * @param {Array} board - 2D array representing the game board
     * @param {number} boardSize - Size of the game board
     * @returns {Object|null} - Center position { row, col } or null if occupied
     */
    static getCenterMove(board, boardSize) {
        const centerRow = Math.floor(boardSize / 2);
        const centerCol = Math.floor(boardSize / 2);
        
        if (board[centerRow][centerCol] === '') {
            return { row: centerRow, col: centerCol };
        }
        
        return null;
    }
    
    /**
     * Generate a random move from empty positions
     * @param {Array} board - 2D array representing the game board
     * @param {number} boardSize - Size of the game board
     * @returns {Object|null} - Random move { row, col } or null if board is full
     */
    static getRandomMove(board, boardSize) {
        const emptyPositions = this.getEmptyPositions(board, boardSize);
        
        if (emptyPositions.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * emptyPositions.length);
        return emptyPositions[randomIndex];
    }
    
    /**
     * Check if a pattern would form a great diagonal
     * @param {Array} path - Array of [row, col] coordinates
     * @param {number} boardSize - Size of the game board
     * @returns {boolean} - Whether the path would form a great diagonal
     */
    static isGreatDiagonal(path, boardSize) {
        if (path.length < 3) return false;
        
        // Main great diagonal (A1 to F6): cells where row == col
        const onMainGreatDiagonal = path.every(cell => cell[0] === cell[1]);
        
        // Anti great diagonal (A6 to F1): cells where row + col = boardSize - 1
        const onAntiGreatDiagonal = path.every(cell => cell[0] + cell[1] === boardSize - 1);
        
        return onMainGreatDiagonal || onAntiGreatDiagonal;
    }
    
    /**
     * Check if a path is on a major axis (horizontal, vertical, or great diagonal)
     * @param {Array} path - Array of [row, col] coordinates
     * @param {number} boardSize - Size of the game board
     * @returns {boolean} - Whether the path is on a major axis
     */
    static isOnMajorAxis(path, boardSize) {
        if (path.length < 3) return false;
        
        // Check if all cells are in the same row
        const allSameRow = path.every(cell => cell[0] === path[0][0]);
        
        // Check if all cells are in the same column
        const allSameCol = path.every(cell => cell[1] === path[0][1]);
        
        // Check if on a great diagonal
        const isGreatDiag = this.isGreatDiagonal(path, boardSize);
        
        return allSameRow || allSameCol || isGreatDiag;
    }
    
    /**
     * Calculate distance between two points
     * @param {number} row1 - Row of first point
     * @param {number} col1 - Column of first point
     * @param {number} row2 - Row of second point
     * @param {number} col2 - Column of second point
     * @returns {number} - Euclidean distance
     */
    static distance(row1, col1, row2, col2) {
        return Math.sqrt(Math.pow(row1 - row2, 2) + Math.pow(col1 - col2, 2));
    }
    
    /**
     * Calculate distance from a point to the center
     * @param {number} row - Row of the point
     * @param {number} col - Column of the point
     * @param {number} boardSize - Size of the game board
     * @returns {number} - Distance to center
     */
    static distanceToCenter(row, col, boardSize) {
        const centerRow = Math.floor(boardSize / 2);
        const centerCol = Math.floor(boardSize / 2);
        return this.distance(row, col, centerRow, centerCol);
    }
    
    /**
     * Create a hash key for a board state (for caching)
     * @param {Array} board - 2D array representing the game board
     * @returns {string} - Hash key
     */
    static getBoardHash(board) {
        return board.map(row => row.join('')).join('|');
    }
}