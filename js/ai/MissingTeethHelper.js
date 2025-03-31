/**
 * MissingTeethHelper.js - Logic for the missing teeth rule in Kalida game
 */

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
 * Check if cells are part of a great diagonal
 * @param {Array} cells - Array of cell coordinates [row, col]
 * @param {number} boardSize - Size of the game board
 * @returns {boolean} - Whether the cells are part of a great diagonal
 */
function isGreatDiagonal(cells, boardSize) {
    if (cells.length < 3) return false;
    
    // Main great diagonal (A1 to F6): cells where row == col
    const onMainGreatDiagonal = cells.every(cell => cell[0] === cell[1]);
    
    // Anti great diagonal (A6 to F1): cells where row + col = boardSize - 1
    const onAntiGreatDiagonal = cells.every(cell => cell[0] + cell[1] === boardSize - 1);
    
    return onMainGreatDiagonal || onAntiGreatDiagonal;
}

/**
 * Check for missing teeth in a bounce pattern
 * @param {Array} board - 2D array representing the game board
 * @param {Array} path - Array of cell coordinates in the bounce path
 * @param {string} player - Current player ('X' or 'O')
 * @returns {boolean} - Whether missing teeth are found
 */
function checkForMissingTeethInBounce(board, path, player) {
    if (path.length < 3) return true;
    
    // Check for gaps in the path (missing teeth)
    for (let i = 1; i < path.length; i++) {
        const prev = path[i-1];
        const curr = path[i];
        
        // Calculate the difference (should be 1 step in some direction)
        const rowDiff = Math.abs(curr[0] - prev[0]);
        const colDiff = Math.abs(curr[1] - prev[1]);
        
        // If the step is greater than 1 in any direction, there's a gap
        if (rowDiff > 1 || colDiff > 1) {
            return true; // Found a missing tooth
        }
    }
    
    return false; // No missing teeth found
}