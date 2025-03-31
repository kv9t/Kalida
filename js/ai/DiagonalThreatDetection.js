/**
 * DiagonalThreatDetection.js - Specialized functions for detecting and handling diagonal threats
 * This file provides enhanced diagonal threat detection for the impossible difficulty level
 */

/**
 * Specifically find and block diagonal threats
 * @param {Array} board - 2D array representing the game board
 * @param {string} aiPlayer - AI player marker ('X' or 'O')
 * @param {string} humanPlayer - Human player marker ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @returns {Object|null} - The blocking move, or null if no threat found
 */
function findDiagonalThreatMove(board, aiPlayer, humanPlayer, boardSize) {
    // Check main diagonal (top-left to bottom-right)
    let mainDiagonalCount = 0;
    let mainDiagonalEmpty = [];
    
    for (let i = 0; i < boardSize; i++) {
        if (board[i][i] === humanPlayer) {
            mainDiagonalCount++;
        } else if (board[i][i] === '') {
            mainDiagonalEmpty.push({row: i, col: i});
        }
    }
    
    // If there are 2 or more human pieces in the main diagonal, block the next open spot
    if (mainDiagonalCount >= 2 && mainDiagonalEmpty.length > 0) {
        return mainDiagonalEmpty[0];
    }
    
    // Check anti-diagonal (top-right to bottom-left)
    let antiDiagonalCount = 0;
    let antiDiagonalEmpty = [];
    
    for (let i = 0; i < boardSize; i++) {
        if (board[i][boardSize - 1 - i] === humanPlayer) {
            antiDiagonalCount++;
        } else if (board[i][boardSize - 1 - i] === '') {
            antiDiagonalEmpty.push({row: i, col: boardSize - 1 - i});
        }
    }
    
    // If there are 2 or more human pieces in the anti-diagonal, block the next open spot
    if (antiDiagonalCount >= 2 && antiDiagonalEmpty.length > 0) {
        return antiDiagonalEmpty[0];
    }
    
    // Check all possible diagonal sequences - handles cases where the diagonal isn't on the main axes
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] !== humanPlayer) continue;
            
            // Check diagonal line (bottom-left to top-right)
            let diagonalCount = 1; // Start with the current position
            let emptyPositions = [];
            
            // Check forward (up-right)
            for (let i = 1; i < 5; i++) {
                const newRow = row - i;
                const newCol = col + i;
                
                if (newRow >= 0 && newCol < boardSize) {
                    if (board[newRow][newCol] === humanPlayer) {
                        diagonalCount++;
                    } else if (board[newRow][newCol] === '') {
                        emptyPositions.push({row: newRow, col: newCol});
                        break;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            
            // Check backward (down-left)
            for (let i = 1; i < 5; i++) {
                const newRow = row + i;
                const newCol = col - i;
                
                if (newRow < boardSize && newCol >= 0) {
                    if (board[newRow][newCol] === humanPlayer) {
                        diagonalCount++;
                    } else if (board[newRow][newCol] === '') {
                        emptyPositions.push({row: newRow, col: newCol});
                        break;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            
            // If we have 2 or more in a row with an empty position, block it
            if (diagonalCount >= 2 && emptyPositions.length > 0) {
                return emptyPositions[0];
            }
            
            // Check diagonal line (top-left to bottom-right)
            diagonalCount = 1; // Reset count for the other direction
            emptyPositions = [];
            
            // Check forward (down-right)
            for (let i = 1; i < 5; i++) {
                const newRow = row + i;
                const newCol = col + i;
                
                if (newRow < boardSize && newCol < boardSize) {
                    if (board[newRow][newCol] === humanPlayer) {
                        diagonalCount++;
                    } else if (board[newRow][newCol] === '') {
                        emptyPositions.push({row: newRow, col: newCol});
                        break;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            
            // Check backward (up-left)
            for (let i = 1; i < 5; i++) {
                const newRow = row - i;
                const newCol = col - i;
                
                if (newRow >= 0 && newCol >= 0) {
                    if (board[newRow][newCol] === humanPlayer) {
                        diagonalCount++;
                    } else if (board[newRow][newCol] === '') {
                        emptyPositions.push({row: newRow, col: newCol});
                        break;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            
            // If we have 2 or more in a row with an empty position, block it
            if (diagonalCount >= 2 && emptyPositions.length > 0) {
                return emptyPositions[0];
            }
        }
    }
    
    return null;
}

/**
 * Check for potential diagonal threats
 * @param {Array} board - 2D array representing the game board
 * @param {number} row - Row of the move
 * @param {number} col - Column of the move
 * @param {string} humanPlayer - Human player marker
 * @param {number} boardSize - Size of the game board
 * @returns {number} - Threat bonus (higher for more significant diagonal threats)
 */
function checkForDiagonalThreatPotential(board, row, col, humanPlayer, boardSize) {
    let threatBonus = 0;
    
    // Define the two diagonal directions
    const diagonalDirections = [
        [1, 1],   // top-left to bottom-right
        [1, -1]   // top-right to bottom-left
    ];
    
    for (const [dx, dy] of diagonalDirections) {
        let count = 0;
        let gaps = 0;
        
        // Check 4 positions in both directions
        for (let dir = -1; dir <= 1; dir += 2) {
            for (let i = 1; i <= 4; i++) {
                const newRow = row + i * dx * dir;
                const newCol = col + i * dy * dir;
                
                if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                    if (board[newRow][newCol] === humanPlayer) {
                        count++;
                    } else if (board[newRow][newCol] === '') {
                        gaps++;
                    } else {
                        break;
                    }
                }
            }
        }
        
        // Calculate threat bonus based on pieces and gaps
        if (count >= 2) {
            threatBonus += count * 5; // Base bonus for each opponent piece
            
            // If there are multiple empty spaces where the opponent could extend their line
            if (gaps >= 2) {
                threatBonus += 10; // Additional bonus for development potential
            }
        }
        
        // Extra bonus if this is part of the main diagonal or anti-diagonal
        const isMainDiagonal = (dx === 1 && dy === 1);
        const isAntiDiagonal = (dx === 1 && dy === -1);
        
        if ((isMainDiagonal && row === col) || 
            (isAntiDiagonal && row + col === boardSize - 1)) {
            threatBonus += 15; // Extra bonus for the great diagonals
        }
    }
    
    return threatBonus;
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
    const onAntiDiagonal = cells.every(cell => cell[0] + cell[1] === boardSize - 1);
    
    return onMainGreatDiagonal || onAntiDiagonal;
}