/**
 * BounceUtils.js - Utility functions for bounce pattern detection
 * 
 * Contains reusable functions for finding and analyzing bounce patterns
 * in the Kalida game. Used by both Rules and AI components.
 */
class BounceUtils {
    /**
     * Find a bounce pattern starting from a position
     * @param {Array} board - 2D board array 
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {string} player - Player marker ('X' or 'O')
     * @param {number} boardSize - Size of the board
     * @param {number} requiredLength - Required length for a win (typically 5)
     * @returns {Object|null} - { path, bounceIndices } or null if no valid pattern
     */
    static findBouncePattern(board, startRow, startCol, player, boardSize, requiredLength) {
        // Only check diagonal directions for bounces
        const diagonalDirections = [
            [1, 1],   // diagonal down-right
            [1, -1],  // diagonal down-left
            [-1, 1],  // diagonal up-right
            [-1, -1]  // diagonal up-left
        ];
        
        // Try each diagonal direction
        for (const [dx, dy] of diagonalDirections) {
            // Try both ways along the direction
            for (const multiplier of [-1, 1]) {
                const result = this.traceBouncePath(
                    board, 
                    startRow, 
                    startCol, 
                    dx * multiplier, 
                    dy * multiplier,
                    player,
                    boardSize,
                    requiredLength
                );
                
                if (result && result.path.length >= requiredLength) {
                    return result;
                }
            }
        }
        
        return null; // No valid bounce pattern found
    }
    
    /**
     * Trace a path with potential bounces
     * @param {Array} board - 2D board array
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Row direction
     * @param {number} dy - Column direction
     * @param {string} player - Player marker
     * @param {number} boardSize - Size of the board
     * @param {number} requiredLength - Required length for a win
     * @returns {Object|null} - { path, bounceIndices } or null if no valid pattern
     */
    static traceBouncePath(board, startRow, startCol, dx, dy, player, boardSize, requiredLength) {
        // Initialize path with starting position
        const path = [[startRow, startCol]];
        const visited = new Set([`${startRow},${startCol}`]);
        const bounceIndices = [];
        
        let currentRow = startRow;
        let currentCol = startCol;
        let currentDx = dx;
        let currentDy = dy;
        
        // Continue until we have enough cells or can't continue
        while (path.length < requiredLength && bounceIndices.length <= 2) {
            // Calculate next position
            let nextRow = currentRow + currentDx;
            let nextCol = currentCol + currentDy;
            
            // Check if we'll go off the board
            const offBoard = (
                nextRow < 0 || nextRow >= boardSize ||
                nextCol < 0 || nextCol >= boardSize
            );
            
            if (offBoard) {
                // Record current cell as a bounce point (the cell BEFORE the direction change)
                bounceIndices.push(path.length - 1);
                
                // Calculate new direction after bounce
                if (nextRow < 0 || nextRow >= boardSize) {
                    currentDx = -currentDx;
                }
                if (nextCol < 0 || nextCol >= boardSize) {
                    currentDy = -currentDy;
                }
                
                // Calculate next position with new direction
                nextRow = currentRow + currentDx;
                nextCol = currentCol + currentDy;
                
                // Check if new position is valid
                if (nextRow < 0 || nextRow >= boardSize ||
                    nextCol < 0 || nextCol >= boardSize) {
                    break; // Can't continue, invalid bounce
                }
            }
            
            // Check if next position is already visited
            const posKey = `${nextRow},${nextCol}`;
            if (visited.has(posKey)) {
                break; // Avoid loops
            }
            
            // Check if next position has player's piece
            if (board[nextRow][nextCol] !== player) {
                break; // Path broken
            }
            
            // Add to path and continue
            path.push([nextRow, nextCol]);
            visited.add(posKey);
            currentRow = nextRow;
            currentCol = nextCol;
        }
        
        // Return the result if we found enough cells with at least one bounce
        if (path.length >= requiredLength && bounceIndices.length > 0) {
            return {
                path,
                bounceIndices
            };
        }
        
        return null; // No valid pattern found
    }
    
    /**
     * Check if a position has missing teeth in its pattern
     * @param {Array} path - Array of [row, col] positions
     * @returns {boolean} - Whether missing teeth are found
     */
    static hasMissingTeeth(path) {
        // Check for gaps between consecutive cells
        for (let i = 1; i < path.length; i++) {
            const prev = path[i-1];
            const curr = path[i];
            
            // If there's a gap larger than one step in any direction
            const rowDiff = Math.abs(curr[0] - prev[0]);
            const colDiff = Math.abs(curr[1] - prev[1]);
            
            if (rowDiff > 1 || colDiff > 1) {
                return true; // Missing teeth found
            }
        }
        
        return false; // No missing teeth
    }
}

export default BounceUtils;