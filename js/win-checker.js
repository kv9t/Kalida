/**
 * win-checker.js - Checks for win conditions in the game
 */

class WinChecker {
    constructor(boardSize) {
        this.boardSize = boardSize;
        
        // Directions to check for win (horizontal, vertical, diagonal, anti-diagonal)
        this.directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        // Only diagonal directions (for bounce checking)
        this.diagonalDirections = [
            [1, 1],  // diagonal
            [1, -1]  // anti-diagonal
        ];
    }

    // Check if a move results in a win
    checkWin(board, row, col, bounceRuleEnabled) {
        const player = board[row][col];
        
        // Check for wrap win
        for (const [dx, dy] of this.directions) {
            let consecutiveCount = 1; // Start with 1 for the current piece
            let winningCells = [[row, col]];
            
            // Check both directions along the line
            for (let dir = -1; dir <= 1; dir += 2) {
                if (dir === 0) continue; // Skip the center
                
                for (let i = 1; i < 5; i++) {
                    // Calculate the position with wrapping
                    let newRow = (row + i * dx * dir + this.boardSize) % this.boardSize;
                    let newCol = (col + i * dy * dir + this.boardSize) % this.boardSize;
                    
                    if (board[newRow][newCol] === player) {
                        consecutiveCount++;
                        winningCells.push([newRow, newCol]);
                    } else {
                        break;
                    }
                }
            }
            
            if (consecutiveCount >= 5) {
                return {
                    winner: player, 
                    winningCells: winningCells,
                    bounceCellIndex: -1 // No bounce in this win
                };
            }
        }
        
        // Check for bounce win if enabled
        if (bounceRuleEnabled) {
            // Only check diagonal directions for bounces
            for (const [dx, dy] of this.diagonalDirections) {
                const bounceResults = this.checkBounceFromPosition(board, row, col, dx, dy, player, 5);
                if (bounceResults.length >= 5) {
                    return {
                        winner: player,
                        winningCells: bounceResults.path,
                        bounceCellIndex: bounceResults.bounceIndex
                    };
                }
            }
        }
        
        // No win
        return { winner: null, winningCells: [], bounceCellIndex: -1 };
    }

    // Check for a win on a generic board state (for AI)
    checkGameWinner(boardState, bounceRuleEnabled) {
        // Check for wrap wins first
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // Skip empty cells
                if (boardState[row][col] === '') continue;
                
                const player = boardState[row][col];
                
                // Check all directions from this cell
                for (const [dx, dy] of this.directions) {
                    // Check for a win using wrap
                    if (this.checkWrapWin(boardState, row, col, dx, dy, player)) {
                        return player;
                    }
                }
                
                // Check for bounce wins if enabled
                if (bounceRuleEnabled) {
                    // Only check diagonal directions for bounces
                    for (const [dx, dy] of this.diagonalDirections) {
                        // Check for a win using bounce
                        const bounceResults = this.checkBounceFromPosition(boardState, row, col, dx, dy, player, 5);
                        if (bounceResults.length >= 5) {
                            return player;
                        }
                    }
                }
            }
        }
        
        // No winner
        return null;
    }

    // Check for a wrap win from a given position (helper for AI)
    checkWrapWin(boardState, row, col, dx, dy, player) {
        let count = 1; // Start with 1 for the current cell
        
        // Check in the positive direction
        for (let i = 1; i < 5; i++) {
            const newRow = (row + i * dx + this.boardSize) % this.boardSize;
            const newCol = (col + i * dy + this.boardSize) % this.boardSize;
            
            if (boardState[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
        
        // If we don't have enough in the positive direction, no need to check negative
        if (count >= 5) {
            return true;
        }
        
        // No win found
        return false;
    }
    
    // Check for bounce patterns from a specific position
    checkBounceFromPosition(boardState, startRow, startCol, dx, dy, player, targetLength) {
        // Skip non-diagonal directions
        if (dx === 0 || dy === 0) return { length: 0, path: [], bounceIndex: -1 };
        
        // Start with the current position
        let path = [[startRow, startCol]];
        let length = 1;
        let bounceFound = false;
        let bounceIndex = -1;
        
        // Track all cells in the path to prevent double-counting
        const visitedCells = new Set();
        visitedCells.add(`${startRow},${startCol}`);
        
        // Try to find a bounce pattern starting from this position
        // We'll try both directions from the starting point
        for (let firstDir = -1; firstDir <= 1; firstDir += 2) {
            if (firstDir === 0) continue; // Skip center
            
            // Reset for this direction
            path = [[startRow, startCol]];
            length = 1;
            bounceFound = false;
            bounceIndex = -1;
            visitedCells.clear();
            visitedCells.add(`${startRow},${startCol}`);
            
            // First, follow the pattern in the initial direction (without bounce)
            let currentRow = startRow;
            let currentCol = startCol;
            let preBounceSteps = 0;
            
            // Check up to 4 steps in the initial direction
            for (let i = 1; i < 5 && length < targetLength; i++) {
                const newRow = (currentRow + firstDir * dx + this.boardSize) % this.boardSize;
                const newCol = (currentCol + firstDir * dy + this.boardSize) % this.boardSize;
                const cellKey = `${newRow},${newCol}`;
                
                // If we hit a boundary, this is where we can bounce
                const hitVerticalBoundary = (currentRow === 0 && firstDir * dx < 0) || 
                                           (currentRow === this.boardSize - 1 && firstDir * dx > 0);
                const hitHorizontalBoundary = (currentCol === 0 && firstDir * dy < 0) || 
                                             (currentCol === this.boardSize - 1 && firstDir * dy > 0);
                
                // If we hit a boundary and haven't bounced yet, try to bounce
                if ((hitVerticalBoundary || hitHorizontalBoundary) && !bounceFound) {
                    bounceFound = true;
                    bounceIndex = path.length - 1;
                    preBounceSteps = i - 1; // Number of steps before the bounce
                    
                    // Calculate bounce direction: flip only the component that hit the boundary
                    let bounceDx = dx;
                    let bounceDy = dy;
                    
                    if (hitVerticalBoundary) bounceDx = -dx;
                    if (hitHorizontalBoundary) bounceDy = -dy;
                    
                    // Now follow the bounced pattern
                    let bounceRow = currentRow;
                    let bounceCol = currentCol;
                    
                    // Check up to 5-length positions after the bounce
                    for (let j = 1; j < targetLength - preBounceSteps && length < targetLength; j++) {
                        const newBounceRow = (bounceRow + firstDir * bounceDx + this.boardSize) % this.boardSize;
                        const newBounceCol = (bounceCol + firstDir * bounceDy + this.boardSize) % this.boardSize;
                        const bounceCellKey = `${newBounceRow},${newBounceCol}`;
                        
                        // Check if this cell is already in our path (no double-counting)
                        if (visitedCells.has(bounceCellKey)) {
                            break; // Skip this bounce path if it revisits cells
                        }
                        
                        if (boardState[newBounceRow][newBounceCol] === player) {
                            path.push([newBounceRow, newBounceCol]);
                            visitedCells.add(bounceCellKey);
                            length++;
                            bounceRow = newBounceRow;
                            bounceCol = newBounceCol;
                        } else {
                            break;
                        }
                    }
                    
                    // Exit the outer loop, we've already tried the bounce
                    break;
                }
                
                // If no bounce yet, continue in the initial direction
                if (boardState[newRow][newCol] === player) {
                    // Add this cell to the path and mark it as visited
                    path.push([newRow, newCol]);
                    visitedCells.add(cellKey);
                    length++;
                    currentRow = newRow;
                    currentCol = newCol;
                } else {
                    break;
                }
            }
            
            // If we found a valid pattern of the target length, return it
            if (length >= targetLength && bounceFound) {
                return { length, path, bounceIndex };
            }
        }
        
        // Try the second direction (after the starting point)
        for (let secondDir = -1; secondDir <= 1; secondDir += 2) {
            if (secondDir === 0) continue; // Skip center
            
            // Reset for this direction
            path = [[startRow, startCol]];
            length = 1;
            bounceFound = false;
            bounceIndex = -1;
            visitedCells.clear();
            visitedCells.add(`${startRow},${startCol}`);
            
            // Follow the pattern in the initial direction (without bounce)
            let currentRow = startRow;
            let currentCol = startCol;
            let preBounceSteps = 0;
            
            // Check up to 4 steps in the initial direction
            for (let i = 1; i < 5 && length < targetLength; i++) {
                const newRow = (currentRow + secondDir * dx + this.boardSize) % this.boardSize;
                const newCol = (currentCol + secondDir * dy + this.boardSize) % this.boardSize;
                const cellKey = `${newRow},${newCol}`;
                
                // If we hit a boundary, this is where we can bounce
                const hitVerticalBoundary = (currentRow === 0 && secondDir * dx < 0) || 
                                           (currentRow === this.boardSize - 1 && secondDir * dx > 0);
                const hitHorizontalBoundary = (currentCol === 0 && secondDir * dy < 0) || 
                                             (currentCol === this.boardSize - 1 && secondDir * dy > 0);
                
                // If we hit a boundary and haven't bounced yet, try to bounce
                if ((hitVerticalBoundary || hitHorizontalBoundary) && !bounceFound) {
                    bounceFound = true;
                    bounceIndex = path.length - 1;
                    preBounceSteps = i - 1; // Number of steps before the bounce
                    
                    // Calculate bounce direction: flip only the component that hit the boundary
                    let bounceDx = dx;
                    let bounceDy = dy;
                    
                    if (hitVerticalBoundary) bounceDx = -dx;
                    if (hitHorizontalBoundary) bounceDy = -dy;
                    
                    // Now follow the bounced pattern
                    let bounceRow = currentRow;
                    let bounceCol = currentCol;
                    
                    // Check up to 5-length positions after the bounce
                    for (let j = 1; j < targetLength - preBounceSteps && length < targetLength; j++) {
                        const newBounceRow = (bounceRow + secondDir * bounceDx + this.boardSize) % this.boardSize;
                        const newBounceCol = (bounceCol + secondDir * bounceDy + this.boardSize) % this.boardSize;
                        const bounceCellKey = `${newBounceRow},${newBounceCol}`;
                        
                        // Check if this cell is already in our path (no double-counting)
                        if (visitedCells.has(bounceCellKey)) {
                            break; // Skip this bounce path if it revisits cells
                        }
                        
                        if (boardState[newBounceRow][newBounceCol] === player) {
                            path.push([newBounceRow, newBounceCol]);
                            visitedCells.add(bounceCellKey);
                            length++;
                            bounceRow = newBounceRow;
                            bounceCol = newBounceCol;
                        } else {
                            break;
                        }
                    }
                    
                    // Exit the outer loop, we've already tried the bounce
                    break;
                }
                
                // If no bounce yet, continue in the initial direction
                if (boardState[newRow][newCol] === player) {
                    // Add this cell to the path and mark it as visited
                    path.push([newRow, newCol]);
                    visitedCells.add(cellKey);
                    length++;
                    currentRow = newRow;
                    currentCol = newCol;
                } else {
                    break;
                }
            }
            
            // If we found a valid pattern of the target length, return it
            if (length >= targetLength && bounceFound) {
                return { length, path, bounceIndex };
            }
        }
        
        // No valid bounce pattern found
        return { length: 0, path: [], bounceIndex: -1 };
    }

    // Check if the board is full (draw)
    checkDraw(board) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    return false;
                }
            }
        }
        return true;
    }
}