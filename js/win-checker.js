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
    checkWin(board, row, col, bounceRuleEnabled, missingTeethRuleEnabled) {
        const player = board[row][col];
        
        // Check for wrap win
        for (const [dx, dy] of this.directions) {
            let consecutiveCount = 1; // Start with 1 for the current piece
            let winningCells = [[row, col]];
            let isWrap = false;
            
            // Check both directions along the line
            for (let dir = -1; dir <= 1; dir += 2) {
                if (dir === 0) continue; // Skip the center
                
                for (let i = 1; i < 5; i++) {
                    // Calculate the position with wrapping
                    let newRow = (row + i * dx * dir + this.boardSize) % this.boardSize;
                    let newCol = (col + i * dy * dir + this.boardSize) % this.boardSize;
                    
                    // Check if we've wrapped around
                    if ((row + i * dx * dir < 0) || (row + i * dx * dir >= this.boardSize) ||
                        (col + i * dy * dir < 0) || (col + i * dy * dir >= this.boardSize)) {
                        isWrap = true;
                    }
                    
                    if (board[newRow][newCol] === player) {
                        consecutiveCount++;
                        winningCells.push([newRow, newCol]);
                    } else {
                        break;
                    }
                }
            }
            
            if (consecutiveCount >= 5) {
                // If this is a wrapping win, it's always valid (even with missing teeth)
                if (isWrap) {
                    return {
                        winner: player, 
                        winningCells: winningCells,
                        bounceCellIndex: -1 // No bounce in this win
                    };
                }
                
                // If missing teeth rule is enabled, check for gaps
                if (missingTeethRuleEnabled) {
                    // Check if this is a major axis (full row, column, or main diagonal)
                    const isMajorAxis = this.isMajorAxis(dx, dy, row, col, winningCells);
                    
                    if (isMajorAxis) {
                        // If it's a major axis, check for missing teeth
                        if (!this.hasMissingTeeth(board, winningCells, player)) {
                            return {
                                winner: player, 
                                winningCells: winningCells,
                                bounceCellIndex: -1 // No bounce in this win
                            };
                        }
                    } else {
                        // If not a major axis, it's a valid win regardless of missing teeth
                        return {
                            winner: player, 
                            winningCells: winningCells,
                            bounceCellIndex: -1 // No bounce in this win
                        };
                    }
                } else {
                    // If missing teeth rule is disabled, it's always a valid win
                    return {
                        winner: player, 
                        winningCells: winningCells,
                        bounceCellIndex: -1 // No bounce in this win
                    };
                }
            }
        }
        
        // Check for bounce win if enabled
        if (bounceRuleEnabled) {
            // Only check diagonal directions for bounces
            for (const [dx, dy] of this.diagonalDirections) {
                const bounceResults = this.checkBounceFromPosition(board, row, col, dx, dy, player, 5, missingTeethRuleEnabled);
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
    checkGameWinner(boardState, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Check for wrap wins first
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // Skip empty cells
                if (boardState[row][col] === '') continue;
                
                const player = boardState[row][col];
                
                // Check all directions from this cell
                for (const [dx, dy] of this.directions) {
                    // Check for a win using wrap
                    if (this.checkWrapWin(boardState, row, col, dx, dy, player, missingTeethRuleEnabled)) {
                        return player;
                    }
                }
                
                // Check for bounce wins if enabled
                if (bounceRuleEnabled) {
                    // Only check diagonal directions for bounces
                    for (const [dx, dy] of this.diagonalDirections) {
                        // Check for a win using bounce
                        const bounceResults = this.checkBounceFromPosition(boardState, row, col, dx, dy, player, 5, missingTeethRuleEnabled);
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
    checkWrapWin(boardState, row, col, dx, dy, player, missingTeethRuleEnabled) {
        let count = 1; // Start with 1 for the current cell
        let winningCells = [[row, col]];
        let isWrap = false;
        
        // Check in both directions
        for (let dir = -1; dir <= 1; dir += 2) {
            if (dir === 0) continue; // Skip center
            
            for (let i = 1; i < 5; i++) {
                // Calculate the position with wrapping
                let newRow = (row + i * dx * dir + this.boardSize) % this.boardSize;
                let newCol = (col + i * dy * dir + this.boardSize) % this.boardSize;
                
                // Check if we've wrapped around
                if ((row + i * dx * dir < 0) || (row + i * dx * dir >= this.boardSize) ||
                    (col + i * dy * dir < 0) || (col + i * dy * dir >= this.boardSize)) {
                    isWrap = true;
                }
                
                if (boardState[newRow][newCol] === player) {
                    count++;
                    winningCells.push([newRow, newCol]);
                } else {
                    break;
                }
            }
        }
        
        // If we have 5 in a row
        if (count >= 5) {
            // If this is a wrapping win, it's always valid (even with missing teeth)
            if (isWrap) {
                return true;
            }
            
            // If missing teeth rule is enabled, check for gaps
            if (missingTeethRuleEnabled) {
                // Check if this is a major axis (full row, column, or main diagonal)
                const isMajorAxis = this.isMajorAxis(dx, dy, row, col, winningCells);
                
                if (isMajorAxis) {
                    // If it's a major axis, check for missing teeth
                    return !this.hasMissingTeeth(boardState, winningCells, player);
                } else {
                    // If not a major axis, it's a valid win regardless of missing teeth
                    return true;
                }
            } else {
                // If missing teeth rule is disabled, it's always a valid win
                return true;
            }
        }
        
        // No win found
        return false;
    }
    
    // Determine if a sequence is on a major axis (full row, column, or main diagonal)
    isMajorAxis(dx, dy, startRow, startCol, winningCells) {
        // Sort cells to find min and max positions
        const sortedByRow = [...winningCells].sort((a, b) => a[0] - b[0]);
        const sortedByCol = [...winningCells].sort((a, b) => a[1] - b[1]);
        const minRow = sortedByRow[0][0];
        const maxRow = sortedByRow[sortedByRow.length - 1][0];
        const minCol = sortedByCol[0][1];
        const maxCol = sortedByCol[sortedByCol.length - 1][1];
        
        // Check if it's a horizontal line (full row)
        if (dx === 0 && minRow === maxRow) {
            return true;
        }
        
        // Check if it's a vertical line (full column)
        if (dy === 0 && minCol === maxCol) {
            return true;
        }
        
        // Check if it's a main diagonal or anti-diagonal
        if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
            // Check if it's on a main diagonal (top-left to bottom-right)
            if (dx === 1 && dy === 1) {
                // Check if cells are on the main diagonal (where row - col is constant)
                const mainDiagonalOffset = minRow - minCol;
                const isMainDiagonal = winningCells.every(cell => cell[0] - cell[1] === mainDiagonalOffset);
                
                if (isMainDiagonal && (mainDiagonalOffset === 0 || 
                    Math.abs(mainDiagonalOffset) === this.boardSize - 1)) {
                    return true;
                }
            }
            
            // Check if it's on an anti-diagonal (top-right to bottom-left)
            if (dx === 1 && dy === -1) {
                // Check if cells are on the anti-diagonal (where row + col is constant)
                const antiDiagonalSum = minRow + maxCol;
                const isAntiDiagonal = winningCells.every(cell => cell[0] + cell[1] === antiDiagonalSum);
                
                if (isAntiDiagonal && (antiDiagonalSum === this.boardSize - 1 || 
                    antiDiagonalSum === 2 * (this.boardSize - 1))) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Check if a sequence has missing teeth
    hasMissingTeeth(board, winningCells, player) {
        // Sort cells to find min and max positions
        const sortedByRow = [...winningCells].sort((a, b) => a[0] - b[0]);
        const sortedByCol = [...winningCells].sort((a, b) => a[1] - b[1]);
        const minRow = sortedByRow[0][0];
        const maxRow = sortedByRow[sortedByRow.length - 1][0];
        const minCol = sortedByCol[0][1];
        const maxCol = sortedByCol[sortedByCol.length - 1][1];
        
        // Create a set of occupied positions for quick lookup
        const occupiedPositions = new Set(winningCells.map(cell => `${cell[0]},${cell[1]}`));
        
        // Horizontal line (check for gaps in a row)
        if (minRow === maxRow) {
            for (let col = minCol; col <= maxCol; col++) {
                if (!occupiedPositions.has(`${minRow},${col}`)) {
                    return true; // Found a gap (missing tooth)
                }
            }
        } 
        // Vertical line (check for gaps in a column)
        else if (minCol === maxCol) {
            for (let row = minRow; row <= maxRow; row++) {
                if (!occupiedPositions.has(`${row},${minCol}`)) {
                    return true; // Found a gap (missing tooth)
                }
            }
        } 
        // Main diagonal (top-left to bottom-right)
        else if (maxRow - minRow === maxCol - minCol) {
            for (let i = 0; i <= maxRow - minRow; i++) {
                if (!occupiedPositions.has(`${minRow + i},${minCol + i}`)) {
                    return true; // Found a gap (missing tooth)
                }
            }
        } 
        // Anti-diagonal (top-right to bottom-left)
        else if (maxRow - minRow === minCol - maxCol) {
            for (let i = 0; i <= maxRow - minRow; i++) {
                if (!occupiedPositions.has(`${minRow + i},${minCol - i}`)) {
                    return true; // Found a gap (missing tooth)
                }
            }
        }
        
        return false; // No gaps found
    }
    
    // Check for bounce patterns from a specific position
    checkBounceFromPosition(boardState, startRow, startCol, dx, dy, player, targetLength, missingTeethRuleEnabled) {
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
            
            // If we found a valid pattern of the target length
            if (length >= targetLength && bounceFound) {
                // If missing teeth rule is enabled, check for gaps in the bounced pattern
                if (missingTeethRuleEnabled) {
                    // Check if the bounced pattern has missing teeth
                    if (this.hasMissingTeeth(boardState, path, player)) {
                        continue; // Not a valid win, try the next direction
                    }
                }
                
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
            
            // If we found a valid pattern of the target length
            if (length >= targetLength && bounceFound) {
                // If missing teeth rule is enabled, check for gaps in the bounced pattern
                if (missingTeethRuleEnabled) {
                    // Check if the bounced pattern has missing teeth
                    if (this.hasMissingTeeth(boardState, path, player)) {
                        continue; // Not a valid win, try the next direction
                    }
                }
                
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