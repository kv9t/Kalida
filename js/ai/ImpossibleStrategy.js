/**
 * ImpossibleStrategy.js - Advanced AI strategy for Kalida game's "Impossible" difficulty level
 * This implements a more sophisticated AI approach beyond the minimax implementation
 */

/**
 * Find the best move using enhanced minimax with advanced evaluation
 * @param {Array} board - 2D array representing the game board
 * @param {string} aiPlayer - Current AI player ('X' or 'O')
 * @param {string} humanPlayer - Opponent player ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {Object} - The selected move with row and column coordinates
 */
function findImpossibleMove(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // Early game handling - critical first few moves
    const pieceCount = countPieces(board, boardSize);
    if (pieceCount < 3) {
        return getStrategicOpeningMove(board, aiPlayer, humanPlayer, boardSize);
    }
    
    // Try winning move first (optimization)
    const winningMove = findWinningMove(board, aiPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (winningMove) return winningMove;
    
    // Try blocking move next (optimization)
    const blockingMove = findWinningMove(board, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (blockingMove) return blockingMove;
    
    // Check for threat creation or advanced blocking
    const advancedThreatMove = findAdvancedThreatMove(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (advancedThreatMove) return advancedThreatMove;
    
    // Calculate appropriate depth based on game state
    const emptyCells = countEmptyCells(board, boardSize);
    let maxDepth = 3; // Base depth
    
    // Adaptive depth based on game state
    if (emptyCells < 20) {
        maxDepth = 4;
    }
    if (emptyCells < 12) {
        maxDepth = 5;
    }
    if (emptyCells < 8) {
        maxDepth = 6; // Deeper search for endgame
    }
    
    // Reduce depth slightly if complex rules are enabled for performance
    if (bounceRuleEnabled && missingTeethRuleEnabled && boardSize >= 8) {
        maxDepth = Math.max(3, maxDepth - 1);
    }
    
    console.log(`Using minimax with depth ${maxDepth}`);
    
    // Get all possible candidate moves, prioritized by potential
    const candidateMoves = getPrioritizedMovesFull(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    
    // For very early moves, we can limit candidates to save time
    // but for midgame, we need to consider all reasonable options
    const limitedCandidates = pieceCount < 8 ? 
        candidateMoves.slice(0, 15) : 
        candidateMoves;
    
    let bestScore = -Infinity;
    let bestMove = null;
    let alpha = -Infinity;
    let beta = Infinity;
    
    // Try each candidate move
    for (const {row, col, priority} of limitedCandidates) {
        // Make the move on a temporary board
        const tempBoard = board.map(row => [...row]);
        tempBoard[row][col] = aiPlayer;
        
        // Use improved minimax to evaluate this move
        const score = improvedMinimax(
            tempBoard, 
            maxDepth, 
            alpha, 
            beta, 
            false, 
            aiPlayer, 
            humanPlayer,
            boardSize, 
            winChecker, 
            bounceRuleEnabled, 
            missingTeethRuleEnabled,
            -Infinity,
            Infinity,
            {row, col}
        );
        
        // Update the best move if this one is better
        if (score > bestScore) {
            bestScore = score;
            bestMove = {row, col};
        }
        
        // Alpha-beta pruning
        alpha = Math.max(alpha, bestScore);
    }
    
    // If we couldn't find a move (shouldn't happen if the board isn't full)
    if (!bestMove) {
        // Fall back to any empty cell
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (board[row][col] === '') {
                    return {row, col};
                }
            }
        }
    }
    
    return bestMove;
}

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
 * Get an optimal opening move (first 2-3 moves)
 * @param {Array} board - 2D array representing the game board
 * @param {string} aiPlayer - Current AI player ('X' or 'O')
 * @param {string} humanPlayer - Opponent player ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @returns {Object} - The selected move with row and column coordinates
 */
function getStrategicOpeningMove(board, aiPlayer, humanPlayer, boardSize) {
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    
    // First move: Always take center if available
    if (board[centerRow][centerCol] === '') {
        return {row: centerRow, col: centerCol};
    }
    
    // Second move: If opponent took center, take a position 2 steps away
    // This creates better strategic opportunities than just taking an adjacent cell
    const optimalDistance = 2;
    const optimalPositions = [];
    
    // Check for strategically strong positions
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                const rowDist = Math.abs(row - centerRow);
                const colDist = Math.abs(col - centerCol);
                const distance = Math.max(rowDist, colDist);
                
                // Prioritize positions at optimal distance from center
                if (distance === optimalDistance) {
                    optimalPositions.push({row, col});
                }
            }
        }
    }
    
    // If we found optimal positions, randomly select one
    if (optimalPositions.length > 0) {
        const randomIndex = Math.floor(Math.random() * optimalPositions.length);
        return optimalPositions[randomIndex];
    }
    
    // Fall back to any position near the center
    for (let d = 1; d < boardSize; d++) {
        for (let row = Math.max(0, centerRow - d); row <= Math.min(boardSize - 1, centerRow + d); row++) {
            for (let col = Math.max(0, centerCol - d); col <= Math.min(boardSize - 1, centerCol + d); col++) {
                if (board[row][col] === '') {
                    return {row, col};
                }
            }
        }
    }
    
    // Should never reach here, but just in case
    return getRandomMove(board, boardSize);
}

/**
 * Find moves that create advanced threats or block opponent's threats
 * @param {Array} board - 2D array representing the game board
 * @param {string} aiPlayer - Current AI player ('X' or 'O')
 * @param {string} humanPlayer - Opponent player ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {Object|null} - The threat move, or null if no threat move is found
 */
function findAdvancedThreatMove(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // Look for double threat opportunities (creating two winning threats in one move)
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                // Check if this move creates multiple threats
                const threatCount = countThreats(board, row, col, aiPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                
                // If it creates multiple threats, this is a powerful move
                if (threatCount >= 2) {
                    return {row, col};
                }
            }
        }
    }
    
    // Look for moves that create "open fours" (four in a row with both ends open)
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                if (createsOpenFour(board, row, col, aiPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled)) {
                    return {row, col};
                }
            }
        }
    }
    
    // Look for moves that block opponent's potential threats
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                const opponentThreatCount = countThreats(board, row, col, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                
                // If it blocks multiple threats, this is a necessary defensive move
                if (opponentThreatCount >= 2) {
                    return {row, col};
                }
            }
        }
    }
    
    return null;
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
 * Evaluate a sequence with improved heuristics
 * @param {Array} boardState - 2D array representing the game board
 * @param {number} row - Row of the starting position
 * @param {number} col - Column of the starting position
 * @param {number} dx - X direction of the sequence
 * @param {number} dy - Y direction of the sequence
 * @param {number} boardSize - Size of the game board
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {number} - Value of the sequence
 */
function evaluateImprovedSequence(boardState, row, col, dx, dy, boardSize, missingTeethRuleEnabled) {
    const player = boardState[row][col];
    let count = 1;
    let openEnds = 0;
    let path = [[row, col]]; // Track the path for missing teeth check
    
    // Check forward
    let forwardOpen = false;
    let forwardSpace = -1; // Position of the open end (if any)
    for (let i = 1; i < 5; i++) {
        const newRow = (row + i * dx + boardSize) % boardSize;
        const newCol = (col + i * dy + boardSize) % boardSize;
        
        // Stop if we go out of bounds (using wrap in this case for calculation only)
        if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
            break;
        }
        
        if (boardState[newRow][newCol] === player) {
            count++;
            path.push([newRow, newCol]);
        } else if (boardState[newRow][newCol] === '') {
            forwardOpen = true;
            forwardSpace = i;
            break;
        } else {
            break;
        }
    }
    
    // Check backward
    let backwardOpen = false;
    let backwardSpace = -1; // Position of the open end (if any)
    for (let i = 1; i < 5; i++) {
        const newRow = (row - i * dx + boardSize) % boardSize;
        const newCol = (col - i * dy + boardSize) % boardSize;
        
        // Stop if we go out of bounds (using wrap in this case for calculation only)
        if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
            break;
        }
        
        if (boardState[newRow][newCol] === player) {
            count++;
            path.push([newRow, newCol]);
        } else if (boardState[newRow][newCol] === '') {
            backwardOpen = true;
            backwardSpace = i;
            break;
        } else {
            break;
        }
    }
    
    // Count open ends
    if (forwardOpen) openEnds++;
    if (backwardOpen) openEnds++;
    
    // Calculate value based on sequence length, open ends, and position of openings
    let value = 0;
    
    if (count >= 5) {
        // If missing teeth rule is enabled, check for gaps
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
    } else if (count === 4) {
        // Four in a row
        if (openEnds === 2) {
            value = 150; // Four with both ends open - very strong
        } else if (openEnds === 1) {
            value = 100; // Four with one end open - strong
        }
        
        // Adjust for gaps (missing teeth) if enabled
        if (missingTeethRuleEnabled && isOnMajorAxis(dx, dy, row, col, path, boardSize)) {
            const isGreatDiag = isGreatDiagonal(path, boardSize);
            if (checkForMissingTeeth(boardState, path, player, dx, dy, isGreatDiag, boardSize)) {
                value = Math.max(20, value / 3); // Reduced value due to missing teeth
            }
        }
    } else if (count === 3) {
        // Three in a row
        if (openEnds === 2) {
            // Check if both open ends have additional open spaces
            let extraOpenSpaces = 0;
            
            if (forwardOpen && forwardSpace >= 0) {
                // Check one more space forward
                const checkRow = (row + (forwardSpace + 1) * dx + boardSize) % boardSize;
                const checkCol = (col + (forwardSpace + 1) * dy + boardSize) % boardSize;
                
                if (checkRow >= 0 && checkRow < boardSize && 
                    checkCol >= 0 && checkCol < boardSize && 
                    boardState[checkRow][checkCol] === '') {
                    extraOpenSpaces++;
                }
            }
            
            if (backwardOpen && backwardSpace >= 0) {
                // Check one more space backward
                const checkRow = (row - (backwardSpace + 1) * dx + boardSize) % boardSize;
                const checkCol = (col - (backwardSpace + 1) * dy + boardSize) % boardSize;
                
                if (checkRow >= 0 && checkRow < boardSize && 
                    checkCol >= 0 && checkCol < boardSize && 
                    boardState[checkRow][checkCol] === '') {
                    extraOpenSpaces++;
                }
            }
            
            if (extraOpenSpaces === 2) {
                value = 80; // Three with both ends having extended open space - very strong
            } else if (extraOpenSpaces === 1) {
                value = 60; // Three with one end having extended open space - strong
            } else {
                value = 40; // Three with both ends open - decent
            }
        } else if (openEnds === 1) {
            value = 10; // Three with one open end - moderate
        }
    } else if (count === 2) {
        // Two in a row
        if (openEnds === 2) {
            value = 5; // Two with both ends open - minor
        } else if (openEnds === 1) {
            value = 2; // Two with one open end - very minor
        }
    }
    
    return value;
}

/**
 * Check if a path is on a major axis (horizontal, vertical, or great diagonal)
 * Utility function for missing teeth rule
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
 * Utility function for missing teeth rule
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
 * Check for missing teeth in a line of cells
 * Utility function for missing teeth rule
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
 * Count how many threats (potential wins) a move would create
 * @param {Array} board - 2D array representing the game board
 * @param {number} row - Row of the move
 * @param {number} col - Column of the move
 * @param {string} player - Current player ('X' or 'O')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {number} - The number of threats
 */
function countThreats(board, row, col, player, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    let threats = 0;
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
        let openEnds = 0;
        
        // Check in both directions
        for (let dir = -1; dir <= 1; dir += 2) {
            if (dir === 0) continue;
            let foundEmpty = false;
            
            // Look up to 4 positions away
            for (let i = 1; i <= 4; i++) {
                let newRow = (row + i * dx * dir + boardSize) % boardSize;
                let newCol = (col + i * dy * dir + boardSize) % boardSize;
                
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
            }
        }
        
        // Check for potential threats
        // A "threat" is a position that is one move away from winning
        if (count === 4 && openEnds >= 1) {
            threats++; // Four in a row with at least one open end
        } else if (count === 3 && openEnds === 2) {
            threats++; // Three in a row with both ends open (can become four)
        }
    }
    
    // Check for bounce threats if enabled
    if (bounceRuleEnabled) {
        // Check both diagonal directions for bounces
        const diagonalDirections = [
            [1, 1],  // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        for (const [dx, dy] of diagonalDirections) {
            // Similar to above, but check for bounce patterns
            // This is a simplified check - a more accurate one would use winChecker.checkBounceFromPosition
            let path = [];
            let count = 0;
            
            // Check bounce patterns
            // (Simplified - in a full implementation, we'd use the actual bounce logic)
            // Increment threats if we find a potential bounce win
            if (hasPotentialBounceSequence(tempBoard, row, col, dx, dy, player, boardSize)) {
                threats++;
            }
        }
    }
    
    return threats;
}

/**
 * Check if a move creates an "open four" (four in a row with both ends open)
 * @param {Array} board - 2D array representing the game board
 * @param {number} row - Row of the move
 * @param {number} col - Column of the move
 * @param {string} player - Current player ('X' or 'O')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {boolean} - Whether the move creates an open four
 */
function createsOpenFour(board, row, col, player, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
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
        let consecutiveOpenEnds = 0;
        
        // Check in both directions
        for (let dir = -1; dir <= 1; dir += 2) {
            if (dir === 0) continue;
            let foundEmpty = false;
            
            // Look at the position immediately after the sequence
            const checkRow = (row + 4 * dx * dir + boardSize) % boardSize;
            const checkCol = (col + 4 * dy * dir + boardSize) % boardSize;
            
            // Count consecutive pieces in this direction
            let consecutivePieces = 0;
            for (let i = 1; i <= 3; i++) {
                let newRow = (row + i * dx * dir + boardSize) % boardSize;
                let newCol = (col + i * dy * dir + boardSize) % boardSize;
                
                if (tempBoard[newRow][newCol] === player) {
                    consecutivePieces++;
                } else {
                    break;
                }
            }
            
            // If we have 3 consecutive pieces and the position after is empty
            if (consecutivePieces === 3 && 
                checkRow >= 0 && checkRow < boardSize && 
                checkCol >= 0 && checkCol < boardSize && 
                tempBoard[checkRow][checkCol] === '') {
                consecutiveOpenEnds++;
            }
        }
        
        // If we have four in a row with both ends open
        if (count === 4 && consecutiveOpenEnds === 2) {
            return true;
        }
    }
    
    return false;
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
    // This is a simplified check
    // Check if we're near an edge (where bounce could happen)
    const isNearEdge = row < 2 || row >= boardSize - 2 || col < 2 || col >= boardSize - 2;
    
    if (!isNearEdge) return false;
    
    // Count pieces in the diagonal direction
    let count = 1;
    
    // Check in both directions
    for (let dir = -1; dir <= 1; dir += 2) {
        if (dir === 0) continue;
        
        for (let i = 1; i <= 3; i++) {
            const newRow = (row + i * dx * dir + boardSize) % boardSize;
            const newCol = (col + i * dy * dir + boardSize) % boardSize;
            
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

/**
 * Get all possible moves, prioritized by potential
 * @param {Array} board - 2D array representing the game board
 * @param {string} aiPlayer - Current AI player ('X' or 'O')
 * @param {string} humanPlayer - Opponent player ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {Array} - Array of move objects with row, column, and priority
 */
function getPrioritizedMovesFull(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    const moves = [];
    const seenMoves = new Set(); // Track seen positions to avoid duplicates
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    
    // 1. First check cells adjacent to existing pieces (most important)
    // Define adjacent directions (including diagonals)
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    // Find all occupied cells
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] !== '') {
                // Look at adjacent cells
                for (const [dx, dy] of directions) {
                    const newRow = row + dx;
                    const newCol = col + dy;
                    
                    // Check if the adjacent cell is valid and empty
                    if (newRow >= 0 && newRow < boardSize && 
                        newCol >= 0 && newCol < boardSize && 
                        board[newRow][newCol] === '') {
                        
                        const moveKey = `${newRow},${newCol}`;
                        if (!seenMoves.has(moveKey)) {
                            // Calculate a priority score based on position
                            let priority = 100; // Base priority for adjacent moves
                            
                            // Add threat evaluation
                            const aiThreats = countThreats(board, newRow, newCol, aiPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                            const humanThreats = countThreats(board, newRow, newCol, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                            
                            // Prioritize moves that create AI threats or block human threats
                            priority += aiThreats * 50;
                            priority += humanThreats * 40;
                            
                            // Add distance from center as a factor
                            const distFromCenter = Math.sqrt(
                                Math.pow(newRow - centerRow, 2) + 
                                Math.pow(newCol - centerCol, 2)
                            );
                            
                            // Closer to center is slightly better
                            priority += (boardSize - distFromCenter) * 2;
                            
                            moves.push({row: newRow, col: newCol, priority});
                            seenMoves.add(moveKey);
                        }
                    }
                }
            }
        }
    }
    
    // 2. Add other empty cells with lower priority
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const moveKey = `${row},${col}`;
            
            if (board[row][col] === '' && !seenMoves.has(moveKey)) {
                // Calculate priority based on position
                const distFromCenter = Math.sqrt(
                    Math.pow(row - centerRow, 2) + 
                    Math.pow(col - centerCol, 2)
                );
                
                // Lower base priority for non-adjacent moves
                let priority = 50;
                
                // Closer to center is better
                priority += (boardSize - distFromCenter) * 2;
                
                moves.push({row, col, priority});
                seenMoves.add(moveKey);
            }
        }
    }
    
    // Sort moves by priority (descending)
    return moves.sort((a, b) => b.priority - a.priority);
}

/**
 * Improved minimax algorithm with enhanced pruning and evaluation
 * @param {Array} boardState - 2D array representing the game board
 * @param {number} depth - Current depth in the search tree
 * @param {number} alpha - Alpha value for alpha-beta pruning
 * @param {number} beta - Beta value for alpha-beta pruning
 * @param {boolean} isMaximizing - Whether the current player is maximizing
 * @param {string} aiPlayer - AI player marker ('X' or 'O')
 * @param {string} humanPlayer - Human player marker ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @param {number} bestScore - Current best score (for improved pruning)
 * @param {number} parentBestScore - Parent's best score (for improved pruning)
 * @param {Object} lastMove - Last move made
 * @returns {number} - The score of the board position
 */
function improvedMinimax(boardState, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled, bestScore, parentBestScore, lastMove) {
    // Early termination: Check for terminal states
    const winner = winChecker.checkGameWinner(boardState, bounceRuleEnabled, missingTeethRuleEnabled);
    if (winner === aiPlayer) return 1000 + depth; // AI wins
    if (winner === humanPlayer) return -1000 - depth; // Opponent wins
    if (isBoardFull(boardState, boardSize) || depth === 0) {
        return improvedEvaluateBoard(boardState, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled, lastMove);
    }
    
    // Get prioritized moves
    const candidateMoves = getPrioritizedMovesFull(
        boardState, 
        isMaximizing ? aiPlayer : humanPlayer, 
        isMaximizing ? humanPlayer : aiPlayer, 
        boardSize,
        winChecker,
        bounceRuleEnabled,
        missingTeethRuleEnabled
    );
    
    if (isMaximizing) {
        // AI's turn - trying to maximize score
        let maxEval = -Infinity;
        
        // Try each possible move, focusing on highest priority moves first
        for (const {row, col} of candidateMoves.slice(0, 10)) { // Consider top 10 moves for performance
            // Make the move
            boardState[row][col] = aiPlayer;
            
            // Evaluate this move
            const evalScore = improvedMinimax(
                boardState, 
                depth - 1, 
                alpha, 
                beta, 
                false, 
                aiPlayer, 
                humanPlayer, 
                boardSize,
                winChecker, 
                bounceRuleEnabled, 
                missingTeethRuleEnabled,
                maxEval,
                parentBestScore,
                {row, col}
            );
            
            // Undo the move
            boardState[row][col] = '';
            
            // Update best score
            maxEval = Math.max(maxEval, evalScore);
            
            // Alpha-beta pruning with enhancements
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break; // Beta cutoff
            
            // Enhanced pruning: if we've found a score better than parent's best,
            // we can often prune (parent will choose another path)
            if (parentBestScore !== Infinity && maxEval > -parentBestScore) {
                break;
            }
        }
        
        return maxEval;
    } else {
        // Opponent's turn - trying to minimize score
        let minEval = Infinity;
        
        // Try each possible move
        for (const {row, col} of candidateMoves.slice(0, 10)) { // Consider top 10 moves for performance
            // Make the move
            boardState[row][col] = humanPlayer;
            
            // Evaluate this move
            const evalScore = improvedMinimax(
                boardState, 
                depth - 1, 
                alpha, 
                beta, 
                true, 
                aiPlayer, 
                humanPlayer, 
                boardSize,
                winChecker, 
                bounceRuleEnabled, 
                missingTeethRuleEnabled,
                minEval,
                parentBestScore,
                {row, col}
            );
            
            // Undo the move
            boardState[row][col] = '';
            
            // Update best score
            minEval = Math.min(minEval, evalScore);
            
            // Alpha-beta pruning
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break; // Alpha cutoff
            
            // Enhanced pruning
            if (parentBestScore !== -Infinity && minEval < -parentBestScore) {
                break;
            }
        }
        
        return minEval;
    }
}

/**
 * Improved evaluation function for board positions
 * @param {Array} boardState - 2D array representing the game board
 * @param {string} aiPlayer - AI player marker ('X' or 'O')
 * @param {string} humanPlayer - Human player marker ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @param {Object} lastMove - Last move made
 * @returns {number} - Score of the board position
 */
function improvedEvaluateBoard(boardState, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled, lastMove) {
    let score = 0;
    
    // Center control is valuable
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    
    // Define directions
    const directions = [
        [0, 1], // horizontal
        [1, 0], // vertical
        [1, 1], // diagonal
        [1, -1]  // anti-diagonal
    ];
    
    // Evaluate all positions
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (boardState[row][col] === '') continue;
            
            // Position-based evaluation - center control is valuable
            const rowDistance = Math.abs(row - centerRow);
            const colDistance = Math.abs(col - centerCol);
            const distanceFromCenter = Math.sqrt(rowDistance*rowDistance + colDistance*colDistance);
            
            // Center pieces are more valuable
            const positionValue = 5 - Math.min(4, distanceFromCenter);
            
            if (boardState[row][col] === aiPlayer) {
                score += positionValue;
            } else {
                score -= positionValue;
            }
            
            // Pattern-based evaluation
            for (const [dx, dy] of directions) {
                const sequenceValue = evaluateImprovedSequence(
                    boardState, row, col, dx, dy, boardSize, 
                    missingTeethRuleEnabled
                );
                
                if (boardState[row][col] === aiPlayer) {
                    score += sequenceValue;
                } else {
                    // Defensive play - value opponent threats slightly higher to prioritize blocking
                    score -= sequenceValue * 1.2;
                }
            }
            
            // Check for bounce patterns if enabled
            if (bounceRuleEnabled) {
                // Check diagonal directions for bounces
                const diagonalDirections = [
                    [1, 1],  // diagonal
                    [1, -1]  // anti-diagonal
                ];
                
                for (const [dx, dy] of diagonalDirections) {
                    if (boardState[row][col] === aiPlayer || boardState[row][col] === humanPlayer) {
                        // Check bounce patterns from this position
                        const bounceResult = winChecker.checkBounceFromPosition(
                            boardState, row, col, dx, dy, 
                            boardState[row][col], 5, missingTeethRuleEnabled
                        );
                        
                        let bounceValue = 0;
                        
                        // Value the sequence based on length
                        if (bounceResult.length >= 5) {
                            bounceValue = 1000; // Winning sequence
                        } else if (bounceResult.length === 4) {
                            bounceValue = 50; // One move away from win
                        } else if (bounceResult.length === 3) {
                            bounceValue = 10; // Two moves away but worth considering
                        }
                        
                        // Double bounce is more valuable
                        if (bounceResult.secondBounceIndex !== -1) {
                            bounceValue *= 1.2;
                        }
                        
                        if (boardState[row][col] === aiPlayer) {
                            score += bounceValue;
                        } else {
                            score -= bounceValue * 1.2; // Prioritize blocking opponent's bounce patterns
                        }
                    }
                }
            }
            
            // Threat-based evaluation
            // Check for "fork" patterns (multiple threats)
            if (lastMove && lastMove.row === row && lastMove.col === col) {
                const threatCount = countThreats(
                    boardState, row, col, boardState[row][col], 
                    boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                const threatValue = threatCount * 30;
                
                if (boardState[row][col] === aiPlayer) {
                    score += threatValue;
                } else {
                    score -= threatValue * 1.5; // Prioritize blocking multi-threats
                }
            }
        }
    }
    
    // Account for dynamic factors in the game state
    const pieceCount = countPieces(boardState, boardSize);
    
    // Consider tempo - is the AI on offensive or defensive?
    const aiPieces = countPlayerPieces(boardState, aiPlayer, boardSize);
    const humanPieces = countPlayerPieces(boardState, humanPlayer, boardSize);
    
    // If AI has more pieces, slightly favor offensive play
    if (aiPieces > humanPieces) {
        score += 10;
    }
    
    // Late game adjustments
    if (pieceCount > boardSize * boardSize * 0.7) {
        // Prioritize winning/blocking lines in late game
        score *= 1.2;
    }
    
    return score;
}