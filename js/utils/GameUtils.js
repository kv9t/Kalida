/**
 * GameUtils.js - Common utilities for Kalida game
 * 
 * Contains reusable utility functions for board analysis
 * distance calculations, and various helper methods
 * 
 */
class GameUtils {
    /**
     * Count pieces on the board
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
     * Count empty cells on the board
     * @param {Array} board - 2D array representing the game board
     * @param {number} boardSize - Size of the game board
     * @returns {number} - Number of empty cells
     */
    static countEmptyCells(board, boardSize) {
        return boardSize * boardSize - this.countPieces(board, boardSize);
    }
    
    /**
     * Check if a path is on a major axis (horizontal, vertical, or great diagonal)
     * @param {Array} cells - Array of cell coordinates [row, col]
     * @param {number} boardSize - Size of the game board
     * @returns {boolean} - Whether the path is on a major axis
     */
    static isOnMajorAxis(cells, boardSize) {
        if (cells.length < 3) return false;
        
        // Check if it's horizontal (all cells have the same row)
        const allSameRow = cells.every(cell => cell[0] === cells[0][0]);
        
        // Check if it's vertical (all cells have the same column)
        const allSameCol = cells.every(cell => cell[1] === cells[0][1]);
        
        // Check if it's a great diagonal
        const isGreatDiag = this.isGreatDiagonal(cells, boardSize);
        
        return allSameRow || allSameCol || isGreatDiag;
    }
    
    /**
     * Check if cells are part of a great diagonal
     * @param {Array} cells - Array of cell coordinates [row, col]
     * @param {number} boardSize - Size of the game board
     * @returns {boolean} - Whether the cells are part of a great diagonal
     */
    static isGreatDiagonal(cells, boardSize) {
        if (cells.length < 3) return false;
        
        // Main great diagonal (A1 to F6): cells where row == col
        const onMainGreatDiagonal = cells.every(cell => cell[0] === cell[1]);
        
        // Anti great diagonal (A6 to F1): cells where row + col = boardSize - 1
        const onAntiGreatDiagonal = cells.every(cell => cell[0] + cell[1] === boardSize - 1);
        
        return onMainGreatDiagonal || onAntiGreatDiagonal;
    }
    
    /**
     * Create a deep copy of a board
     * @param {Array} board - 2D array representing the game board
     * @returns {Array} - Deep copy of the board
     */
    static copyBoard(board) {
        return board.map(row => [...row]);
    }
    
    /**
     * Get all empty cells on the board
     * @param {Array} board - 2D array representing the game board
     * @param {number} boardSize - Size of the game board
     * @returns {Array} - Array of { row, col } objects
     */
    static getEmptyCells(board, boardSize) {
        const emptyCells = [];
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (board[row][col] === '') {
                    emptyCells.push({ row, col });
                }
            }
        }
        return emptyCells;
    }
    
    /**
     * Get all cells adjacent to filled positions
     * @param {Array} board - 2D array representing the game board
     * @param {number} boardSize - Size of the game board
     * @returns {Array} - Array of { row, col } objects
     */
    static getAdjacentEmptyCells(board, boardSize) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        const adjacentCells = new Set();
        
        // Find all cells adjacent to filled positions
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (board[row][col] !== '') {
                    // Check all adjacent directions
                    for (const [dx, dy] of directions) {
                        const newRow = row + dx;
                        const newCol = col + dy;
                        
                        // Check if the position is valid and empty
                        if (newRow >= 0 && newRow < boardSize && 
                            newCol >= 0 && newCol < boardSize && 
                            board[newRow][newCol] === '') {
                            
                            // Use a set to avoid duplicates, with string key
                            adjacentCells.add(`${newRow},${newCol}`);
                        }
                    }
                }
            }
        }
        
        // Convert back to array of objects
        return Array.from(adjacentCells).map(key => {
            const [row, col] = key.split(',').map(Number);
            return { row, col };
        });
    }
    
    /**
     * Calculate manhattan distance between two cells
     * @param {number} row1 - Row of first cell
     * @param {number} col1 - Column of first cell
     * @param {number} row2 - Row of second cell
     * @param {number} col2 - Column of second cell
     * @returns {number} - Manhattan distance
     */
    static manhattanDistance(row1, col1, row2, col2) {
        return Math.abs(row1 - row2) + Math.abs(col1 - col2);
    }
    
    /**
     * Calculate euclidean distance between two cells
     * @param {number} row1 - Row of first cell
     * @param {number} col1 - Column of first cell
     * @param {number} row2 - Row of second cell
     * @param {number} col2 - Column of second cell
     * @returns {number} - Euclidean distance
     */
    static euclideanDistance(row1, col1, row2, col2) {
        return Math.sqrt(Math.pow(row1 - row2, 2) + Math.pow(col1 - col2, 2));
    }
    
    /**
     * Get the center position of the board
     * @param {number} boardSize - Size of the game board
     * @returns {Object} - { row, col } of the center
     */
    static getBoardCenter(boardSize) {
        const centerRow = Math.floor(boardSize / 2);
        const centerCol = Math.floor(boardSize / 2);
        return { row: centerRow, col: centerCol };
    }
    
    /**
     * Check if a position is on the edge of the board
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} boardSize - Size of the game board
     * @returns {boolean} - Whether the position is on the edge
     */
    static isOnEdge(row, col, boardSize) {
        return row === 0 || row === boardSize - 1 || col === 0 || col === boardSize - 1;
    }
    
    /**
     * Check if a position is in a corner of the board
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} boardSize - Size of the game board
     * @returns {boolean} - Whether the position is in a corner
     */
    static isInCorner(row, col, boardSize) {
        return (row === 0 || row === boardSize - 1) && (col === 0 || col === boardSize - 1);
    }
    
    /**
     * Calculate the distance from a position to the nearest edge
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} boardSize - Size of the game board
     * @returns {number} - Distance to the nearest edge
     */
    static distanceToEdge(row, col, boardSize) {
        return Math.min(
            row,
            col,
            boardSize - 1 - row,
            boardSize - 1 - col
        );
    }
    
    /**
     * Get all positions in a direction from a starting position
     * @param {Array} board - 2D array representing the game board
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Row direction (-1, 0, 1)
     * @param {number} dy - Column direction (-1, 0, 1)
     * @param {number} maxSteps - Maximum number of steps
     * @param {number} boardSize - Size of the game board
     * @returns {Array} - Array of positions { row, col, value }
     */
    static getPositionsInDirection(board, startRow, startCol, dx, dy, maxSteps, boardSize) {
        const positions = [];
        
        for (let i = 1; i <= maxSteps; i++) {
            const row = startRow + dx * i;
            const col = startCol + dy * i;
            
            // Check if the position is valid
            if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
                positions.push({
                    row,
                    col,
                    value: board[row][col]
                });
            } else {
                break; // Stop when we go out of bounds
            }
        }
        
        return positions;
    }
    
    /**
     * Generate a unique string representation of a board state (for caching)
     * @param {Array} board - 2D array representing the game board
     * @returns {string} - String representation of the board
     */
    static boardToString(board) {
        return board.map(row => row.map(cell => cell === '' ? '-' : cell).join('')).join('|');
    }
    
    /**
     * Create an empty board
     * @param {number} boardSize - Size of the game board
     * @returns {Array} - 2D array representing an empty board
     */
    static createEmptyBoard(boardSize) {
        return Array(boardSize).fill().map(() => Array(boardSize).fill(''));
    }
    
    /**
     * Delay execution using a promise
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after the delay
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Calculate the strength of a position for both players
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {string} player1 - First player marker ('X' or 'O')
     * @param {string} player2 - Second player marker ('X' or 'O')
     * @param {number} boardSize - Size of the game board
     * @returns {Object} - Strength values for both players { player1: number, player2: number }
     */
    static calculatePositionStrength(board, row, col, player1, player2, boardSize) {
        if (board[row][col] !== '') {
            return { [player1]: 0, [player2]: 0 };
        }
        
        // All directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        const strength = {
            [player1]: 0,
            [player2]: 0
        };
        
        // Check each direction for both players
        for (const player of [player1, player2]) {
            // Create a temporary board with the player's marker
            const tempBoard = this.copyBoard(board);
            tempBoard[row][col] = player;
            
            for (const [dx, dy] of directions) {
                let count = 1; // Start with 1 for the position we're checking
                let openEnds = 0;
                
                // Check both directions
                for (let dir = -1; dir <= 1; dir += 2) {
                    if (dir === 0) continue;
                    
                    let ended = false;
                    
                    for (let step = 1; step <= 4 && !ended; step++) {
                        const newRow = row + step * dx * dir;
                        const newCol = col + step * dy * dir;
                        
                        // Check if position is valid
                        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                            if (tempBoard[newRow][newCol] === player) {
                                count++;
                            } else if (tempBoard[newRow][newCol] === '') {
                                openEnds++;
                                ended = true;
                            } else {
                                ended = true;
                            }
                        } else {
                            ended = true;
                        }
                    }
                }
                
                // Calculate strength based on count and open ends
                if (count >= 4 && openEnds >= 1) {
                    // Almost a win
                    strength[player] += 100;
                } else if (count === 3 && openEnds === 2) {
                    // Strong potential
                    strength[player] += 50;
                } else if (count === 3 && openEnds === 1) {
                    // Moderate potential
                    strength[player] += 10;
                } else if (count === 2 && openEnds === 2) {
                    // Weak potential
                    strength[player] += 5;
                }
            }
        }
        
        return strength;
    }
}