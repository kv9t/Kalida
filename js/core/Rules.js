/**
 * Rules.js - Game rules including win conditions for Kalida
 * 
 * Contains all the game rules including win conditions (regular,
 * wrap, bounce) and special rules like missing teeth.
 * 
 */

import BounceUtils from '../utils/BounceUtils.js';

class Rules {
    /**
     * Create a new rules engine
     * @param {number} boardSize - Size of the game board
     */
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

    /**
     * Check if a game is over (win or draw)
     * @param {Array} board - 2D array representing the game board
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @param {boolean} wrapRuleEnabled - Whether the wrap rule is enabled
     * @returns {Object} - { isOver, winner, winningCells, isDraw }
     */
    checkGameStatus(board, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled = true) {
        // Check all occupied cells for a win
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') continue;
                
                const result = this.checkWin(board, row, col, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled);
                if (result.winner) {
                    return {
                        isOver: true,
                        winner: result.winner,
                        winningCells: result.winningCells,
                        isDraw: false,
                        bounceCellIndex: result.bounceCellIndex,
                        secondBounceCellIndex: result.secondBounceCellIndex
                    };
                }
            }
        }
        
        // Check for a draw (full board)
        const isDraw = this.checkDraw(board);
        return {
            isOver: isDraw,
            winner: null,
            winningCells: [],
            isDraw,
            bounceCellIndex: -1,
            secondBounceCellIndex: -1
        };
    }

    /**
     * Check if a move results in a win
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @param {boolean} wrapRuleEnabled - Whether the wrap rule is enabled
     * @returns {Object} - { winner, winningCells, bounceCellIndex, secondBounceCellIndex }
     */
    checkWin(board, row, col, bounceRuleEnabled = true, missingTeethRuleEnabled = true, wrapRuleEnabled = true) {
        const player = board[row][col];
        
        // No need to check if the cell is empty
        if (player === '') {
            return { winner: null, winningCells: [], bounceCellIndex: -1, secondBounceCellIndex: -1 };
        }
        
        // Order of checking:
        // 1. Regular win (straight line without wrapping) without missing teeth
        // 2. Wrap win without missing teeth (if wrap rule enabled)
        // 3. Bounce win without missing teeth (if bounce rule enabled)
        
        // 1. Check for regular win (straight line without wrapping)
        const regularWin = this.checkRegularWin(board, row, col, player, missingTeethRuleEnabled);
        if (regularWin.winner) {
            return regularWin;
        }
        

        // 2. Check for wrap win (only if wrap rule is enabled)
        if (wrapRuleEnabled) {
            const wrapWin = this.checkWrapWin(board, row, col, player, missingTeethRuleEnabled, wrapRuleEnabled);
            if (wrapWin.winner) {
                return wrapWin;
            }
        }
        
        // 3. Check for bounce win if enabled
        if (bounceRuleEnabled) {
            const bounceWin = this.checkBounceWin(board, row, col, player, missingTeethRuleEnabled);
            if (bounceWin.winner) {
                return bounceWin;
            }
        }
        
        // No win
        return { winner: null, winningCells: [], bounceCellIndex: -1, secondBounceCellIndex: -1 };
    }
    
    /**
     * Check for a regular win (straight line without wrapping)
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Current player
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - { winner, winningCells, bounceCellIndex, secondBounceCellIndex }
     */
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
                            bounceCellIndex: -1, // No bounce
                            secondBounceCellIndex: -1 // No second bounce
                        };
                    }
                } else {
                    // Missing teeth rule is disabled, this is a win
                    return {
                        winner: player,
                        winningCells: winningCells,
                        bounceCellIndex: -1, // No bounce
                        secondBounceCellIndex: -1 // No second bounce
                    };
                }
            }
        }
        
        // No regular win
        return { winner: null, winningCells: [], bounceCellIndex: -1, secondBounceCellIndex: -1 };
    }
    
    /**
     * Check for a wrap win
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Current player
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @param {boolean} wrapRuleEnabled - Whether the wrap rule is enabled
     * @returns {Object} - { winner, winningCells, bounceCellIndex, secondBounceCellIndex }
     */
    checkWrapWin(board, row, col, player, missingTeethRuleEnabled, wrapRuleEnabled = true) {
        // If wrap rule is disabled, return no win
        if (!wrapRuleEnabled) {
            return { winner: null, winningCells: [], bounceCellIndex: -1, secondBounceCellIndex: -1 };
        }
        
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
                    bounceCellIndex: -1, // No bounce
                    secondBounceCellIndex: -1 // No second bounce
                };
            }
        }
        
        // No wrap win
        return { winner: null, winningCells: [], bounceCellIndex: -1, secondBounceCellIndex: -1 };
    }
    
    

    /**
     * Check for a bounce win
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Current player
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - { winner, winningCells, bounceCellIndex, secondBounceCellIndex }
     */
    checkBounceWin(board, row, col, player, missingTeethRuleEnabled) {
        // Use the BounceUtils to find any bounce patterns
        const result = BounceUtils.findBouncePattern(
            board,
            row,
            col,
            player,
            this.boardSize,
            5  // Required length for a win
        );
        
        // If a valid pattern was found
        if (result && result.path.length >= 5) {
            // CRITICAL FIX: Validate the pattern actually includes the current position
            // This prevents false positives where bounce detection finds unrelated patterns
            const includesCurrentPos = result.path.some(([r, c]) => r === row && c === col);
            if (!includesCurrentPos) {
                return { winner: null, winningCells: [], bounceCellIndex: -1, secondBounceCellIndex: -1 };
            }

            // Check for missing teeth if required
            if (missingTeethRuleEnabled && BounceUtils.hasMissingTeeth(result.path)) {
                return { winner: null, winningCells: [], bounceCellIndex: -1, secondBounceCellIndex: -1 };
            }
            
            // Log bounce data for debugging (only in non-minimax contexts)
            // console.log("Bounce pattern found:", result.path);
            // console.log("Bounce indices:", result.bounceIndices);
            
            // Extract bounce indices, ensuring we pass exactly what the UI expects
            const bounceCellIndex = result.bounceIndices && result.bounceIndices.length > 0 ? 
                                result.bounceIndices[0] : -1;
            
            const secondBounceCellIndex = result.bounceIndices && result.bounceIndices.length > 1 ? 
                                    result.bounceIndices[1] : -1;
            
            // console.log("Extracted bounce indices:", bounceCellIndex, secondBounceCellIndex);
            
            // Return the win information with explicit bounce cell indices
            return {
                winner: player,
                winningCells: result.path,
                bounceCellIndex: bounceCellIndex,
                secondBounceCellIndex: secondBounceCellIndex
            };
        }
        
        // No bounce win
        return { winner: null, winningCells: [], bounceCellIndex: -1, secondBounceCellIndex: -1 };
    }
    
    /**
     * Check for bounce patterns from a specific position
     * @param {Array} board - 2D array representing the game board
     * @param {number} startRow - Row of the starting position
     * @param {number} startCol - Column of the starting position
     * @param {number} dx - X direction for checking
     * @param {number} dy - Y direction for checking
     * @param {string} player - Current player ('X' or 'O')
     * @param {number} targetLength - Target length for a winning sequence
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - { length, path, bounceIndex, secondBounceIndex }
     */
    FromPosition(board, startRow, startCol, dx, dy, player, targetLength, missingTeethRuleEnabled) {
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
            
            // Check up to 4 steps in the initial direction
            for (let i = 1; i < 5 && length < targetLength; i++) {
                const newRow = currentRow + firstDir * dx;
                const newCol = currentCol + firstDir * dy;
                
                // If we hit a boundary, this is where we need to bounce
                if (newRow < 0 || newRow >= this.boardSize || 
                    newCol < 0 || newCol >= this.boardSize) {
                    bounceFound = true;
                    
                    // Calculate bounce direction: flip the appropriate component
                    let bounceDx = dx;
                    let bounceDy = dy;
                    
                    if (newRow < 0 || newRow >= this.boardSize) bounceDx = -dx;
                    if (newCol < 0 || newCol >= this.boardSize) bounceDy = -dy;
                    
                    // Now follow the bounced pattern
                    let bounceRow = currentRow;
                    let bounceCol = currentCol;
                    
                    // Check positions after the first bounce
                    for (let j = 1; j < targetLength - i + 1 && length < targetLength; j++) {
                        const newBounceRow = bounceRow + firstDir * bounceDx;
                        const newBounceCol = bounceCol + firstDir * bounceDy;
                        
                        // Check if we hit a second boundary for double bounce
                        if (newBounceRow < 0 || newBounceRow >= this.boardSize || 
                            newBounceCol < 0 || newBounceCol >= this.boardSize) {
                            
                            // Only proceed with second bounce if we don't have 5 in a row yet
                            if (length < targetLength) {
                                secondBounceFound = true;
                                
                                // Calculate second bounce direction
                                let secondBounceDx = bounceDx;
                                let secondBounceDy = bounceDy;
                                
                                if (newBounceRow < 0 || newBounceRow >= this.boardSize) secondBounceDx = -bounceDx;
                                if (newBounceCol < 0 || newBounceCol >= this.boardSize) secondBounceDy = -bounceDy;
                                
                                // Follow the second bounce pattern
                                let secondBounceRow = bounceRow;
                                let secondBounceCol = bounceCol;
                                
                                // Check positions after the second bounce
                                for (let k = 1; k < targetLength - (i + j) + 1 && length < targetLength; k++) {
                                    const newSecondBounceRow = secondBounceRow + firstDir * secondBounceDx;
                                    const newSecondBounceCol = secondBounceCol + firstDir * secondBounceDy;
                                    
                                    // Check if we're still on the board
                                    if (newSecondBounceRow < 0 || newSecondBounceRow >= this.boardSize || 
                                        newSecondBounceCol < 0 || newSecondBounceCol >= this.boardSize) {
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
                                        
                                        // Mark the first cell after the second bounce
                                        if (secondBounceIndex === -1) {
                                            secondBounceIndex = path.length - 1;
                                        }
                                        
                                        secondBounceRow = newSecondBounceRow;
                                        secondBounceCol = newSecondBounceCol;
                                    } else {
                                        break;
                                    }
                                }
                                
                                // Check if we've found a winning line after the second bounce
                                if (length >= targetLength) {
                                    // Fix: Store the bounce indices correctly
                                    let firstBounceIdx = -1;
                                    for (let idx = 1; idx < path.length; idx++) {
                                        if (path[idx][0] !== path[idx-1][0] + firstDir * dx || 
                                            path[idx][1] !== path[idx-1][1] + firstDir * dy) {
                                            firstBounceIdx = idx;
                                            break;
                                        }
                                    }
                                    
                                    return {
                                        length,
                                        path,
                                        bounceIndex: firstBounceIdx,
                                        secondBounceIndex
                                    };
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
                            
                            // Mark the first cell after the first bounce
                            if (bounceIndex === -1) {
                                bounceIndex = path.length - 1;
                            }
                            
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
            
            // If we found a valid pattern of the target length (with either single or double bounce)
            if (length >= targetLength && bounceFound) {
                // If missing teeth rule is enabled, check for gaps
                if (missingTeethRuleEnabled) {
                    if (this.checkForMissingTeethInBounce(board, path, player)) {
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
    
    /**
     * Check for missing teeth in a line of cells
     * @param {Array} board - 2D array representing the game board
     * @param {Array} cells - Array of cell coordinates in the path
     * @param {string} player - Current player
     * @param {number} dx - X direction of the line
     * @param {number} dy - Y direction of the line
     * @param {boolean} exemptGreatDiagonal - Whether great diagonals are exempt from missing teeth check
     * @returns {boolean} - Whether missing teeth are found
     */
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
     * Check for missing teeth in a bounce pattern
     * @param {Array} board - 2D array representing the game board
     * @param {Array} path - Array of cell coordinates in the bounce path
     * @param {string} player - Current player
     * @returns {boolean} - Whether missing teeth are found
     */
    checkForMissingTeethInBounce(board, path, player) {
        if (path.length < 5) return true;
        
        // For a bounce pattern, we check if there are any gaps between consecutive points
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
    
    /**
     * Check if cells are part of a great diagonal
     * @param {Array} cells - Array of cell coordinates [row, col]
     * @returns {boolean} - Whether the cells are part of a great diagonal
     */
    isGreatDiagonal(cells) {
        if (cells.length < 3) return false;
        
        // Main great diagonal (A1 to F6): cells where row == col
        const onMainGreatDiagonal = cells.every(cell => cell[0] === cell[1]);
        
        // Anti great diagonal (A6 to F1): cells where row + col = boardSize - 1
        const onAntiGreatDiagonal = cells.every(cell => cell[0] + cell[1] === this.boardSize - 1);
        
        return onMainGreatDiagonal || onAntiGreatDiagonal;
    }
    
    /**
     * Check if the board is full (draw)
     * @param {Array} board - 2D array representing the game board
     * @returns {boolean} - Whether the board is full
     */
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
    
    /**
     * Get a winning move for a player if one exists
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - Player to check for ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @param {boolean} wrapRuleEnabled - Whether the wrap rule is enabled
     * @returns {Object|null} - { row, col } of winning move or null if none exists
     */
    findWinningMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled = true) {
        // Make a copy of the board to simulate moves
        const tempBoard = board.map(row => [...row]);
        
        // Try each empty cell
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (tempBoard[row][col] === '') {
                    // Place the player's marker
                    tempBoard[row][col] = player;
                    
                    // Check if this move would win
                    const result = this.checkWin(tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled);
                    if (result.winner === player) {
                        return { row, col };
                    }
                    
                    // Reset the cell
                    tempBoard[row][col] = '';
                }
            }
        }
        
        return null;
    }
}

export default Rules;