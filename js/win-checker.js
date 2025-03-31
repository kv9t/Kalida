/**
 * win-checker.js - Checks for win conditions in the game with proper order
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

    // Main entry point: Check if a move results in a win
    checkWin(board, row, col, bounceRuleEnabled, missingTeethRuleEnabled) {
        const player = board[row][col];
        
        // No need to check if the cell is empty
        if (player === '') {
            return { winner: null, winningCells: [], bounceCellIndex: -1 };
        }
        
        // Order of checking:
        // 1. Regular win (straight line without wrapping) without missing teeth
        // 2. Great diagonal win without missing teeth
        // 3. Wrap win without missing teeth (if not in single row/column/great diagonal)
        // 4. Bounce win without missing teeth (if enabled)
        
        // 1. Check for regular win (straight line without wrapping)
        const regularWin = this.checkRegularWin(board, row, col, player, missingTeethRuleEnabled);
        if (regularWin.winner) {
            return regularWin;
        }
        
        // 2. Great diagonal win is handled within the straight line check
        
        // 3. Check for wrap win
        const wrapWin = this.checkWrapWin(board, row, col, player, missingTeethRuleEnabled);
        if (wrapWin.winner) {
            return wrapWin;
        }
        
        // 4. Check for bounce win if enabled
        if (bounceRuleEnabled) {
            const bounceWin = this.checkBounceWin(board, row, col, player, missingTeethRuleEnabled);
            if (bounceWin.winner) {
                return bounceWin;
            }
        }
        
        // No win
        return { winner: null, winningCells: [], bounceCellIndex: -1 };
    }
    
    // Check for a regular win (straight line without wrapping)
    checkRegularWin(board, row, col, player, missingTeethRuleEnabled) {
        for (const [dx, dy] of this.directions) {
            // Collect all cells in this direction (both ways)
            let winningCells = [[row, col]];
            
            // Check both directions along the line
            for (let dir = -1; dir <= 1; dir += 2) {
                if (dir === 0) continue; // Skip the center
                
                for (let i = 1; i < 5; i++) {
                    const newRow = row + i * dx * dir;
                    const newCol = col + i * dy * dir;
                    
                    // Stop if we go out of bounds (no wrap)
                    if (newRow < 0 || newRow >= this.boardSize || 
                        newCol < 0 || newCol >= this.boardSize) {
                        break;
                    }
                    
                    if (board[newRow][newCol] === player) {
                        winningCells.push([newRow, newCol]);
                    } else {
                        break;
                    }
                }
            }
            
            // Check if we have 5 in a row
            if (winningCells.length >= 5) {
                // Sort the cells for easier checking
                if (dx === 0) { // Horizontal line
                    winningCells.sort((a, b) => a[1] - b[1]);
                } else if (dy === 0) { // Vertical line
                    winningCells.sort((a, b) => a[0] - b[0]);
                } else if (dx === dy) { // Main diagonal
                    winningCells.sort((a, b) => a[0] - b[0]);
                } else { // Anti-diagonal
                    winningCells.sort((a, b) => a[0] - b[0]);
                }
                
                // Check if this is a great diagonal
                const isGreatDiagonal = this.isGreatDiagonal(winningCells);
                
                // If missing teeth rule is enabled, check for gaps
                if (missingTeethRuleEnabled) {
                    // Exempt great diagonals from missing teeth rule
                    const hasTeeth = this.checkForMissingTeeth(board, winningCells, player, dx, dy, isGreatDiagonal);
                    if (!hasTeeth) {
                        // This is a win!
                        return {
                            winner: player,
                            winningCells: winningCells,
                            bounceCellIndex: -1 // No bounce
                        };
                    }
                } else {
                    // Missing teeth rule is disabled, this is a win
                    return {
                        winner: player,
                        winningCells: winningCells,
                        bounceCellIndex: -1 // No bounce
                    };
                }
            }
        }
        
        // No regular win
        return { winner: null, winningCells: [], bounceCellIndex: -1 };
    }
    
    // Check for a wrap win
    checkWrapWin(board, row, col, player, missingTeethRuleEnabled) {
        for (const [dx, dy] of this.directions) {
            let winningCells = [[row, col]];
            let isWrap = false;
            
            // Check both directions along the line
            for (let dir = -1; dir <= 1; dir += 2) {
                if (dir === 0) continue; // Skip the center
                
                for (let i = 1; i < 5; i++) {
                    // Calculate normal position (without wrap)
                    const normalRow = row + i * dx * dir;
                    const normalCol = col + i * dy * dir;
                    
                    // Calculate wrapped position
                    const newRow = (normalRow + this.boardSize) % this.boardSize;
                    const newCol = (normalCol + this.boardSize) % this.boardSize;
                    
                    // Determine if this is a wrap
                    if (normalRow < 0 || normalRow >= this.boardSize || 
                        normalCol < 0 || normalCol >= this.boardSize) {
                        isWrap = true;
                    }
                    
                    if (board[newRow][newCol] === player) {
                        winningCells.push([newRow, newCol]);
                    } else {
                        break;
                    }
                }
            }
            
            // Check if we have 5 in a row
            if (winningCells.length >= 5 && isWrap) {
                // Check if this wrap win is in a single row/column
                const allSameRow = winningCells.every(cell => cell[0] === winningCells[0][0]);
                const allSameCol = winningCells.every(cell => cell[1] === winningCells[0][1]);
                
                // Check if this is a great diagonal
                const isGreatDiagonal = this.isGreatDiagonal(winningCells);
                
                // If all cells are in a single row or column, we need to check for missing teeth
                if ((allSameRow || allSameCol) && missingTeethRuleEnabled) {
                    if (this.checkForMissingTeeth(board, winningCells, player, dx, dy, false)) {
                        continue; // Has missing teeth, not a win
                    }
                }
                
                // Check if this is a great diagonal (where wrap is still subject to missing teeth rule)
                if (isGreatDiagonal && missingTeethRuleEnabled) {
                    // Exempt great diagonals from missing teeth rule
                    if (this.checkForMissingTeeth(board, winningCells, player, dx, dy, true)) {
                        continue; // Has missing teeth, not a win
                    }
                }
                
                // This is a valid wrap win!
                return {
                    winner: player,
                    winningCells: winningCells,
                    bounceCellIndex: -1 // No bounce
                };
            }
        }
        
        // No wrap win
        return { winner: null, winningCells: [], bounceCellIndex: -1 };
    }
    
    // Check for a bounce win
    checkBounceWin(board, row, col, player, missingTeethRuleEnabled) {
        // Only check diagonal directions for bounces
        for (const [dx, dy] of this.diagonalDirections) {
            const bounceResult = this.checkBounceFromPosition(board, row, col, dx, dy, player, 5, missingTeethRuleEnabled);
            
            if (bounceResult.length >= 5) {
                // This is a valid bounce win!
                return {
                    winner: player,
                    winningCells: bounceResult.path,
                    bounceCellIndex: bounceResult.bounceIndex
                };
            }
        }
        
        // No bounce win
        return { winner: null, winningCells: [], bounceCellIndex: -1 };
    }
    
    // Check for missing teeth in a line of cells
    // Added exemptGreatDiagonal parameter to bypass check for main diagonals when true
    checkForMissingTeeth(board, cells, player, dx, dy, exemptGreatDiagonal = false) {
        // If we're exempting great diagonals and this is a great diagonal, skip the check
        if (exemptGreatDiagonal && this.isGreatDiagonal(cells)) {
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
            // Get the diagonal offset (constant for this diagonal)
            const diagonalOffset = minRow - minCol;
            
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
    
    // Check if cells are part of a great diagonal
    isGreatDiagonal(cells) {
        if (cells.length < 5) return false;
        
        // Main great diagonal (A1 to F6): cells where row == col
        const onMainGreatDiagonal = cells.every(cell => cell[0] === cell[1]);
        
        // Anti great diagonal (A6 to F1): cells where row + col = boardSize - 1
        const onAntiGreatDiagonal = cells.every(cell => cell[0] + cell[1] === this.boardSize - 1);
        
        return onMainGreatDiagonal || onAntiGreatDiagonal;
    }
    
    // Check for bounce patterns from a specific position
    checkBounceFromPosition(board, startRow, startCol, dx, dy, player, targetLength, missingTeethRuleEnabled) {
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
        
        // Try both directions from the starting point
        for (let firstDir = -1; firstDir <= 1; firstDir += 2) {
            if (firstDir === 0) continue; // Skip center
            
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
                const newRow = currentRow + firstDir * dx;
                const newCol = currentCol + firstDir * dy;
                
                // If we hit a boundary, this is where we can bounce
                if (newRow < 0 || newRow >= this.boardSize || 
                    newCol < 0 || newCol >= this.boardSize) {
                    bounceFound = true;
                    bounceIndex = path.length - 1;
                    preBounceSteps = i - 1; // Number of steps before the bounce
                    
                    // Calculate bounce direction: flip the appropriate component
                    let bounceDx = dx;
                    let bounceDy = dy;
                    
                    if (newRow < 0 || newRow >= this.boardSize) bounceDx = -dx;
                    if (newCol < 0 || newCol >= this.boardSize) bounceDy = -dy;
                    
                    // Now follow the bounced pattern
                    let bounceRow = currentRow;
                    let bounceCol = currentCol;
                    
                    // Check up to 5-length positions after the bounce
                    for (let j = 1; j < targetLength - preBounceSteps && length < targetLength; j++) {
                        const newBounceRow = bounceRow + firstDir * bounceDx;
                        const newBounceCol = bounceCol + firstDir * bounceDy;
                        
                        // Check if we're still on the board
                        if (newBounceRow < 0 || newBounceRow >= this.boardSize || 
                            newBounceCol < 0 || newBounceCol >= this.boardSize) {
                            break; // Hit another boundary
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
                
                // Check if we're still on the board
                if (newRow < 0 || newRow >= this.boardSize || 
                    newCol < 0 || newCol >= this.boardSize) {
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
            
            // If we found a valid bounce pattern of the target length
            if (length >= targetLength && bounceFound) {
                // If missing teeth rule is enabled, check for gaps
                if (missingTeethRuleEnabled) {
                    // Check if this is a great diagonal
                    const isGreatDiagonal = this.isGreatDiagonal(path);
                    
                    // For bounce patterns with great diagonals, we still need to check
                    // since they don't follow the standard great diagonal path
                    if (this.checkForMissingTeethInBounce(board, path, player, bounceIndex)) {
                        continue; // Has missing teeth, not a win
                    }
                }
                
                return { length, path, bounceIndex };
            }
        }
        
        // No valid bounce pattern found
        return { length: 0, path: [], bounceIndex: -1 };
    }
    
    // Check for missing teeth in a bounce pattern
    checkForMissingTeethInBounce(board, path, player, bounceIndex) {
        if (path.length < 5 || bounceIndex < 0) return true;
        
        // For a bounce pattern, we check two segments:
        // 1. From start to bounce point
        // 2. From bounce point to end
        
        // Since bounce patterns don't have a simple linear formula like straight lines,
        // we need to check if there are any gaps between consecutive points
        
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
    
    // Check the game state (for AI)
    checkGameWinner(boardState, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Check all occupied cells
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (boardState[row][col] === '') continue;
                
                const result = this.checkWin(boardState, row, col, bounceRuleEnabled, missingTeethRuleEnabled);
                if (result.winner) {
                    return result.winner;
                }
            }
        }
        
        return null; // No winner yet
    }
}