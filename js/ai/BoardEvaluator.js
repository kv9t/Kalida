/**
 * BoardEvaluator.js - Board position evaluation utilities for Kalida game
 */

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
 * Count how many potential wins a move would create
 * @param {Array} board - 2D array representing the game board
 * @param {number} row - Row of the move
 * @param {number} col - Column of the move
 * @param {string} player - Current player ('X' or 'O')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {number} - The number of potential wins
 */
function countPotentialWins(board, row, col, player, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    let potentialWins = 0;
    const tempBoard = board.map(row => [...row]);
    tempBoard[row][col] = player;
    
    // Define directions
    const directions = [
        [0, 1], // horizontal
        [1, 0], // vertical
        [1, 1], // diagonal
        [1, -1]  // anti-diagonal
    ];
    
    // Check each direction
    for (const [dx, dy] of directions) {
        // Start counting consecutive pieces and empty spaces
        let count = 1; // Current position
        let emptySpaces = 0;
        let blocked = false;
        let path = [[row, col]]; // Track the path for missing teeth check
        
        // Check in both directions
        for (let dir = -1; dir <= 1; dir += 2) {
            if (dir === 0) continue;
            
            // Look up to 4 positions away
            for (let i = 1; i <= 4; i++) {
                let newRow = (row + i * dx * dir + boardSize) % boardSize;
                let newCol = (col + i * dy * dir + boardSize) % boardSize;
                
                if (tempBoard[newRow][newCol] === player) {
                    count++;
                    path.push([newRow, newCol]);
                } else if (tempBoard[newRow][newCol] === '') {
                    emptySpaces++;
                } else {
                    blocked = true;
                    break;
                }
            }
        }
        
        // If we have 3 or 4 in a row with enough spaces to make 5, it's a potential win
        if (count >= 3 && count + emptySpaces >= 5 && !blocked) {
            // If missing teeth rule is enabled, check if this would create a valid win
            if (missingTeethRuleEnabled) {
                // Check if this is on a major axis (horizontal, vertical, or great diagonal)
                if (isOnMajorAxis(dx, dy, row, col, path, boardSize)) {
                    // Check if this is a great diagonal and exempt from missing teeth
                    const isGreatDiag = isGreatDiagonal(path, boardSize);
                    
                    // Check for missing teeth in the path (exempt great diagonals)
                    if (!checkForMissingTeeth(tempBoard, path, player, dx, dy, isGreatDiag, boardSize)) {
                        potentialWins++;
                    }
                } else {
                    // Not on a major axis, so missing teeth rule doesn't apply
                    potentialWins++;
                }
            } else {
                potentialWins++;
            }
        }
    }
    
    // Also check bounce patterns if enabled
    if (bounceRuleEnabled) {
        const diagonalDirections = [
            [1, 1],  // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        for (const [dx, dy] of diagonalDirections) {
            const bounceResults = winChecker.checkBounceFromPosition(tempBoard, row, col, dx, dy, player, 4, missingTeethRuleEnabled);
            if (bounceResults.length >= 3) {
                potentialWins++;
            }
        }
    }
    
    return potentialWins;
}

/**
 * Evaluate a sequence starting at a position and going in a direction
 * @param {Array} boardState - 2D array representing the game board
 * @param {number} row - Row of the starting position
 * @param {number} col - Column of the starting position
 * @param {number} dx - X direction of the sequence
 * @param {number} dy - Y direction of the sequence
 * @param {number} boardSize - Size of the game board
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {number} - Value of the sequence
 */
function evaluateSequence(boardState, row, col, dx, dy, boardSize, missingTeethRuleEnabled) {
    const player = boardState[row][col];
    let count = 1;
    let openEnds = 0;
    let path = [[row, col]]; // Track the path for missing teeth check
    
    // Check forward
    let forwardOpen = false;
    for (let i = 1; i < 5; i++) {
        const newRow = (row + i * dx + boardSize) % boardSize;
        const newCol = (col + i * dy + boardSize) % boardSize;
        
        if (boardState[newRow][newCol] === player) {
            count++;
            path.push([newRow, newCol]);
        } else if (boardState[newRow][newCol] === '') {
            forwardOpen = true;
            break;
        } else {
            break;
        }
    }
    
    // Check backward
    let backwardOpen = false;
    for (let i = 1; i < 5; i++) {
        const newRow = (row - i * dx + boardSize) % boardSize;
        const newCol = (col - i * dy + boardSize) % boardSize;
        
        if (boardState[newRow][newCol] === player) {
            count++;
            path.push([newRow, newCol]);
        } else if (boardState[newRow][newCol] === '') {
            backwardOpen = true;
            break;
        } else {
            break;
        }
    }
    
    // Count open ends
    if (forwardOpen) openEnds++;
    if (backwardOpen) openEnds++;
    
    // Calculate value based on sequence length and open ends
    let value = 0;
    
    if (count >= 5) {
        // If missing teeth rule is enabled and this is potentially on a major axis, check
        if (missingTeethRuleEnabled) {
            // Check if this is on a major axis
            if (isOnMajorAxis(dx, dy, row, col, path, boardSize)) {
                // Check if this is a great diagonal (exempt from missing teeth rule)
                const isGreatDiag = isGreatDiagonal(path, boardSize);
                
                // Check for missing teeth (exempt great diagonals)
                if (checkForMissingTeeth(boardState, path, player, dx, dy, isGreatDiag, boardSize)) {
                    value = 50; // Still valuable but not a win due to missing teeth
                } else {
                    value = 1000; // Winning sequence without missing teeth
                }
            } else {
                value = 1000; // Winning sequence (not on major axis, so missing teeth rule doesn't apply)
            }
        } else {
            value = 1000; // Winning sequence (missing teeth rule disabled)
        }
    } else if (count === 4 && openEnds >= 1) {
        value = 100; // Four in a row with an open end
        
        // Check for missing teeth in a potential 4-in-a-row
        if (missingTeethRuleEnabled && isOnMajorAxis(dx, dy, row, col, path, boardSize)) {
            // Check if this is a great diagonal (exempt from missing teeth rule)
            const isGreatDiag = isGreatDiagonal(path, boardSize);
            
            if (checkForMissingTeeth(boardState, path, player, dx, dy, isGreatDiag, boardSize)) {
                value = 40; // Reduced value due to missing teeth
            }
        }
    } else if (count === 3 && openEnds === 2) {
        value = 50; // Three in a row with two open ends
    } else if (count === 3 && openEnds === 1) {
        value = 10; // Three in a row with one open end
    } else if (count === 2 && openEnds === 2) {
        value = 5; // Two in a row with two open ends
    }
    
    return value;
}

/**
 * Evaluate a bounce sequence starting at a position and going in a diagonal direction
 * @param {Array} boardState - 2D array representing the game board
 * @param {number} row - Row of the starting position
 * @param {number} col - Column of the starting position
 * @param {number} dx - X direction of the sequence
 * @param {number} dy - Y direction of the sequence
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {number} - Value of the bounce sequence
 */
function evaluateBounceSequence(boardState, row, col, dx, dy, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // Only evaluate if we're using diagonal directions and bounce rule is enabled
    if (!bounceRuleEnabled || (dx === 0 || dy === 0)) return 0;
    
    const player = boardState[row][col];
    
    // Try bounces from this position
    const bounceResults = winChecker.checkBounceFromPosition(boardState, row, col, dx, dy, player, 5, missingTeethRuleEnabled);
    
    // Calculate value based on the longest sequence with a bounce
    if (bounceResults.length >= 5) return 1000; // Winning sequence with bounce
    if (bounceResults.length === 4) return 80; // Four in a row with a bounce
    if (bounceResults.length === 3) return 30; // Three in a row with a bounce
    
    return 0; // No significant pattern with bounce
}

/**
 * Evaluate the board position (heuristic function)
 * @param {Array} boardState - 2D array representing the game board
 * @param {string} aiPlayer - AI player marker ('X' or 'O')
 * @param {string} humanPlayer - Human player marker ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {number} - Score of the board position
 */
function evaluateBoard(boardState, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    let score = 0;
    
    // Define directions
    const directions = [
        [0, 1], // horizontal
        [1, 0], // vertical
        [1, 1], // diagonal
        [1, -1]  // anti-diagonal
    ];
    
    // Performance optimization: Only check a subset of positions
    const positionsToCheck = [];
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (boardState[row][col] !== '') {
                positionsToCheck.push({row, col});
            }
        }
    }
    
    // If we have too many positions, sample a subset
    const maxPositions = 10; // Limit to improve performance
    let checkPositions = positionsToCheck;
    if (positionsToCheck.length > maxPositions) {
        // Take a random sample
        checkPositions = [];
        const shuffled = [...positionsToCheck].sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(maxPositions, shuffled.length); i++) {
            checkPositions.push(shuffled[i]);
        }
    }
    
    // Check the selected positions
    for (const {row, col} of checkPositions) {
        // For each position that has a marker, check all directions
        for (const [dx, dy] of directions) {
            // Check this direction for sequences
            const sequenceValue = evaluateSequence(
                boardState, 
                row, 
                col, 
                dx, 
                dy, 
                boardSize, 
                missingTeethRuleEnabled
            );
            
            // Add to score (positive for AI, negative for human)
            if (boardState[row][col] === aiPlayer) {
                score += sequenceValue;
            } else {
                score -= sequenceValue;
            }
        }
        
        // Check for bounce sequences if enabled (but limit for performance)
        if (bounceRuleEnabled && Math.random() < 0.5) { // Only check 50% of the time for performance
            // Only check diagonal directions for bounces
            const diagonalDirections = [
                [1, 1],  // diagonal
                [1, -1]  // anti-diagonal
            ];
            
            // Only check one random diagonal direction for performance
            const randomDirIndex = Math.floor(Math.random() * diagonalDirections.length);
            const [dx, dy] = diagonalDirections[randomDirIndex];
            
            const bounceValue = evaluateBounceSequence(
                boardState, 
                row, 
                col, 
                dx, 
                dy, 
                boardSize,
                winChecker, 
                bounceRuleEnabled, 
                missingTeethRuleEnabled
            );
            
            // Add to score (positive for AI, negative for human)
            if (boardState[row][col] === aiPlayer) {
                score += bounceValue;
            } else {
                score -= bounceValue;
            }
        }
    }
    
    return score;
}