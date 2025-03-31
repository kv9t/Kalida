/**
 * BounceRuleHelper.js - Utilities for handling bounce rules in Kalida game
 */

/**
 * Check for bounce patterns from a specific position
 * Note: This is a simplified version that can be used when WinChecker is not directly available
 * @param {Array} board - 2D array representing the game board
 * @param {number} startRow - Row of the starting position
 * @param {number} startCol - Column of the starting position
 * @param {number} dx - X direction for checking
 * @param {number} dy - Y direction for checking
 * @param {string} player - Current player ('X' or 'O')
 * @param {number} targetLength - Target length for a winning sequence
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @param {number} boardSize - Size of the game board
 * @returns {Object} - Info about the bounce sequence (length, path, bounceIndex)
 */
function checkBounceFromPosition(board, startRow, startCol, dx, dy, player, targetLength, missingTeethRuleEnabled, boardSize) {
    // Skip non-diagonal directions
    if (dx === 0 || dy === 0) return { length: 0, path: [], bounceIndex: -1, secondBounceIndex: -1 };
    
    // Start with the current position
    let path = [[startRow, startCol]];
    let length = 1;
    let bounceFound = false;
    let bounceIndex = -1;
    let secondBounceFound = false;
    let secondBounceIndex = -1;
    
    // Track all cells in the path to prevent double-counting
    const visitedCells = new Set();
    visitedCells.add(`${startRow},${startCol}`);
    
    // Try both directions from the starting point
    for (let firstDir = -1; firstDir <= 1; firstDir += 2) {
        if (firstDir === 0) continue; // Skip center
        
        // Reset for this direction
        path = [[startRow, startCol]];
        length = 1;
        bounceFound = false;
        bounceIndex = -1;
        secondBounceFound = false;
        secondBounceIndex = -1;
        visitedCells.clear();
        visitedCells.add(`${startRow},${startCol}`);
        
        // Follow the pattern in the initial direction (without bounce)
        let currentRow = startRow;
        let currentCol = startCol;
        let preBounceSteps = 0;
        
        // Check up to 4 steps in the initial direction
        for (let i = 1; i < 5 && length < targetLength; i++) {
            const newRow = currentRow + firstDir * dx;
            const newCol = currentCol + firstDir * dy;
            
            // If we hit a boundary, this is where we can bounce
            if (newRow < 0 || newRow >= boardSize || 
                newCol < 0 || newCol >= boardSize) {
                bounceFound = true;
                bounceIndex = path.length - 1;
                preBounceSteps = i - 1; // Number of steps before the bounce
                
                // Calculate bounce direction: flip the appropriate component
                let bounceDx = dx;
                let bounceDy = dy;
                
                if (newRow < 0 || newRow >= boardSize) bounceDx = -dx;
                if (newCol < 0 || newCol >= boardSize) bounceDy = -dy;
                
                // Now follow the bounced pattern
                let bounceRow = currentRow;
                let bounceCol = currentCol;
                let postFirstBounceSteps = 0;
                
                // Check up to targetLength - preBounceSteps positions after the first bounce
                for (let j = 1; j < targetLength - preBounceSteps && length < targetLength; j++) {
                    const newBounceRow = bounceRow + firstDir * bounceDx;
                    const newBounceCol = bounceCol + firstDir * bounceDy;
                    
                    // Check if we hit a second boundary for double bounce
                    if (newBounceRow < 0 || newBounceRow >= boardSize || 
                        newBounceCol < 0 || newBounceCol >= boardSize) {
                        
                        // Only proceed with second bounce if we don't have 5 in a row yet
                        if (length < targetLength) {
                            secondBounceFound = true;
                            secondBounceIndex = path.length - 1;
                            postFirstBounceSteps = j - 1; // Number of steps after first bounce
                            
                            // Calculate second bounce direction
                            let secondBounceDx = bounceDx;
                            let secondBounceDy = bounceDy;
                            
                            if (newBounceRow < 0 || newBounceRow >= boardSize) secondBounceDx = -bounceDx;
                            if (newBounceCol < 0 || newBounceCol >= boardSize) secondBounceDy = -bounceDy;
                            
                            // Follow the second bounce pattern
                            let secondBounceRow = bounceRow;
                            let secondBounceCol = bounceCol;
                            
                            // Check positions after the second bounce
                            for (let k = 1; k < targetLength - preBounceSteps - postFirstBounceSteps && length < targetLength; k++) {
                                const newSecondBounceRow = secondBounceRow + firstDir * secondBounceDx;
                                const newSecondBounceCol = secondBounceCol + firstDir * secondBounceDy;
                                
                                // Check if we're still on the board
                                if (newSecondBounceRow < 0 || newSecondBounceRow >= boardSize || 
                                    newSecondBounceCol < 0 || newSecondBounceCol >= boardSize) {
                                    break; // Hit a third boundary, not allowed
                                }
                                
                                const secondBounceCellKey = `${newSecondBounceRow},${newSecondBounceCol}`;
                                
                                // Prevent double-counting cells
                                if (visitedCells.has(secondBounceCellKey)) {
                                    break;
                                }
                                
                                if (board[newSecondBounceRow][newSecondBounceCol] === player) {
                                    path.push([newSecondBounceRow, newSecondBounceCol]);
                                    visitedCells.add(secondBounceCellKey);
                                    length++;
                                    secondBounceRow = newSecondBounceRow;
                                    secondBounceCol = newSecondBounceCol;
                                } else {
                                    break;
                                }
                            }
                        }
                        break; // Exit the first bounce loop
                    }
                    
                    const bounceCellKey = `${newBounceRow},${newBounceCol}`;
                    
                    // Prevent double-counting cells
                    if (visitedCells.has(bounceCellKey)) {
                        break;
                    }
                    
                    if (board[newBounceRow][newBounceCol] === player) {
                        path.push([newBounceRow, newBounceCol]);
                        visitedCells.add(bounceCellKey);
                        length++;
                        bounceRow = newBounceRow;
                        bounceCol = newBounceCol;
                    } else {
                        break;
                    }
                }
                
                break; // Exit the pre-bounce loop
            }
            
            // Continue in the initial direction if we haven't hit a boundary
            const cellKey = `${newRow},${newCol}`;
            
            if (newRow < 0 || newRow >= boardSize || 
                newCol < 0 || newCol >= boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                path.push([newRow, newCol]);
                visitedCells.add(cellKey);
                length++;
                currentRow = newRow;
                currentCol = newCol;
            } else {
                break;
            }
        }
        
        // If we found a valid pattern of the target length (with either single or double bounce)
        if (length >= targetLength && bounceFound) {
            // If missing teeth rule is enabled, check for gaps
            if (missingTeethRuleEnabled) {
                if (checkForMissingTeethInBounce(board, path, player)) {
                    continue; // Has missing teeth, not a win
                }
            }
            
            return { 
                length, 
                path, 
                bounceIndex,
                secondBounceIndex: secondBounceFound ? secondBounceIndex : -1
            };
        }
    }
    
    // No valid bounce pattern found
    return { 
        length: 0, 
        path: [], 
        bounceIndex: -1,
        secondBounceIndex: -1
    };
}