/**
 * BoardUtils.js - Utility functions for board analysis in Kalida
 * Provides common board utility functions used by the impossible difficulty AI
 */

/**
 * Count the total number of pieces on the board
 * @param {Array} board - 2D array representing the game board
 * @param {number} boardSize - Size of the game board
 * @returns {number} - The count of pieces
 */
function countPieces(board, boardSize) {
    let count = 0;
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] !== '') {
                count++;
            }
        }
    }
    return count;
}

/**
 * Count the total number of empty cells on the board
 * @param {Array} board - 2D array representing the game board
 * @param {number} boardSize - Size of the game board
 * @returns {number} - The count of empty cells
 */
function countEmptyCells(board, boardSize) {
    let count = 0;
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                count++;
            }
        }
    }
    return count;
}

/**
 * Count the number of pieces for a specific player
 * @param {Array} board - 2D array representing the game board
 * @param {string} player - The player to count pieces for
 * @param {number} boardSize - Size of the game board
 * @returns {number} - The count of pieces for the player
 */
function countPlayerPieces(board, player, boardSize) {
    let count = 0;
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === player) {
                count++;
            }
        }
    }
    return count;
}

/**
 * Check if the board is full
 * @param {Array} boardState - 2D array representing the game board
 * @param {number} boardSize - Size of the game board
 * @returns {boolean} - Whether the board is full
 */
function isBoardFull(boardState, boardSize) {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (boardState[row][col] === '') {
                return false;
            }
        }
    }
    return true;
}

/**
 * Check if a path is on a major axis (horizontal, vertical, or great diagonal)
 * @param {number} dx - X direction of the line
 * @param {number} dy - Y direction of the line
 * @param {number} row - Row of the starting position
 * @param {number} col - Column of the starting position
 * @param {Array} path - Array of cell coordinates in the path
 * @param {number} boardSize - Size of the game board
 * @returns {boolean} - Whether the path is on a major axis
 */
function isOnMajorAxis(dx, dy, row, col, path, boardSize) {
    if (path.length < 3) return false;
    
    // Check if it's horizontal (all cells have the same row)
    const allSameRow = path.every(cell => cell[0] === path[0][0]);
    
    // Check if it's vertical (all cells have the same column)
    const allSameCol = path.every(cell => cell[1] === path[0][1]);
    
    // Check if it's a great diagonal
    const isGreatDiag = isGreatDiagonal(path, boardSize);
    
    return allSameRow || allSameCol || isGreatDiag;
}

/**
 * Check for missing teeth in a line of cells
 * @param {Array} board - 2D array representing the game board
 * @param {Array} cells - Array of cell coordinates in the path
 * @param {string} player - Current player ('X' or 'O')
 * @param {number} dx - X direction of the line
 * @param {number} dy - Y direction of the line
 * @param {boolean} exemptGreatDiagonal - Whether great diagonals are exempt from missing teeth check
 * @param {number} boardSize - Size of the game board
 * @returns {boolean} - Whether missing teeth are found
 */
function checkForMissingTeeth(board, cells, player, dx, dy, exemptGreatDiagonal = false, boardSize) {
    // If we're exempting great diagonals and this is a great diagonal, skip the check
    if (exemptGreatDiagonal && isGreatDiagonal(cells, boardSize)) {
        return false; // Return false = no missing teeth found
    }
    
    // Sort cells to find boundaries
    const sortedByRow = [...cells].sort((a, b) => a[0] - b[0]);
    const sortedByCol = [...cells].sort((a, b) => a[1] - b[1]);
    const minRow = sortedByRow[0][0];
    const maxRow = sortedByRow[sortedByRow.length - 1][0];
    const minCol = sortedByCol[0][1];
    const maxCol = sortedByCol[sortedByCol.length - 1][1];
    
    // Create a set of occupied positions for quick lookup
    const occupiedPositions = new Set(cells.map(cell => `${cell[0]},${cell[1]}`));
    
    // Handle different types of lines
    if (dx === 0) { // Horizontal line
        // Check if all positions in the range are occupied
        for (let col = minCol; col <= maxCol; col++) {
            if (!occupiedPositions.has(`${minRow},${col}`)) {
                return true; // Found a missing tooth
            }
        }
    } else if (dy === 0) { // Vertical line
        // Check if all positions in the range are occupied
        for (let row = minRow; row <= maxRow; row++) {
            if (!occupiedPositions.has(`${row},${minCol}`)) {
                return true; // Found a missing tooth
            }
        }
    } else if (dx === dy) { // Main diagonal (top-left to bottom-right)
        // Check all positions in this diagonal segment
        for (let i = 0; i <= maxRow - minRow; i++) {
            if (!occupiedPositions.has(`${minRow + i},${minCol + i}`)) {
                return true; // Found a missing tooth
            }
        }
    } else { // Anti-diagonal (top-right to bottom-left)
        // Check all positions in this anti-diagonal segment
        for (let i = 0; i <= maxRow - minRow; i++) {
            if (!occupiedPositions.has(`${minRow + i},${maxCol - i}`)) {
                return true; // Found a missing tooth
            }
        }
    }
    
    return false; // No missing teeth found
}

/**
 * Check if a position has potential for a bounce sequence
 * @param {Array} board - 2D array representing the game board
 * @param {number} row - Row of the move
 * @param {number} col - Column of the move
 * @param {number} dx - X direction
 * @param {number} dy - Y direction
 * @param {string} player - Current player ('X' or 'O')
 * @param {number} boardSize - Size of the game board
 * @returns {boolean} - Whether there's potential for a bounce sequence
 */
function hasPotentialBounceSequence(board, row, col, dx, dy, player, boardSize) {
    // Check if we're near an edge (where bounce could happen)
    const isNearEdge = row < 2 || row >= boardSize - 2 || col < 2 || col >= boardSize - 2;
    
    if (!isNearEdge) return false;
    
    // Count pieces in the diagonal direction
    let count = 1;
    
    // Check in both directions
    for (let dir = -1; dir <= 1; dir += 2) {
        if (dir === 0) continue;
        
        for (let i = 1; i <= 3; i++) {
            const newRow = (row + i * dx * dir);
            const newCol = (col + i * dy * dir);
            
            if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
                // We hit an edge - bounce potential
                break;
            }
            
            if (board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
    }
    
    // If we have at least 3 in a row near an edge, there's bounce potential
    return count >= 3;
}