/**
 * BoardEvaluator.js - Evaluates board positions for AI decision making
 * Provides heuristic evaluation of board positions for minimax and other algorithms
 */
class BoardEvaluator {
    /**
     * Create a new board evaluator
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        
        // Weights for different pattern types
        this.weights = {
            win: 1000,        // Winning pattern
            fourOpen: 200,    // Four in a row with open end(s)
            fourBlocked: 50,  // Four in a row with no open ends
            threeOpen: 50,    // Three in a row with two open ends
            threeHalfOpen: 10, // Three in a row with one open end
            twoOpen: 5,       // Two in a row with two open ends
            center: 3,        // Center control
            adjacentCenter: 2, // Adjacent to center
            bouncePattern: 30, // Potential bounce pattern
            blockingMove: 8   // Blocking opponent's sequence
        };
    }

    /**
     * Evaluate a board position
     * @param {Array} board - 2D array representing the game board
     * @param {string} aiPlayer - AI player marker ('X' or 'O')
     * @param {string} humanPlayer - Human player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @param {Object} lastMove - Last move made { row, col }
     * @returns {number} - Score of the position (positive favors AI, negative favors human)
     */
    evaluateBoard(board, aiPlayer, humanPlayer, bounceRuleEnabled, missingTeethRuleEnabled, lastMove = null) {
        let score = 0;
        
        // Center control is valuable
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        if (board[centerRow][centerCol] === aiPlayer) {
            score += this.weights.center;
        } else if (board[centerRow][centerCol] === humanPlayer) {
            score -= this.weights.center;
        }
        
        // Define directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        // Check patterns for both players
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // Skip empty cells
                if (board[row][col] === '') continue;
                
                const isAI = board[row][col] === aiPlayer;
                
                // Check each direction for patterns
                for (const [dx, dy] of directions) {
                    const patternValue = this.evaluatePattern(
                        board, row, col, dx, dy, 
                        isAI ? aiPlayer : humanPlayer,
                        missingTeethRuleEnabled
                    );
                    
                    // Add to score (positive for AI, negative for human)
                    if (isAI) {
                        score += patternValue;
                    } else {
                        score -= patternValue;
                    }
                }
                
                // If bounce rule is enabled, check for bounce patterns
                if (bounceRuleEnabled) {
                    // Only diagonal directions can bounce
                    const diagonalDirections = [
                        [1, 1],  // diagonal
                        [1, -1]  // anti-diagonal
                    ];
                    
                    for (const [dx, dy] of diagonalDirections) {
                        const bounceValue = this.evaluateBouncePattern(
                            board, row, col, dx, dy, 
                            isAI ? aiPlayer : humanPlayer,
                            missingTeethRuleEnabled
                        );
                        
                        // Add to score (positive for AI, negative for human)
                        if (isAI) {
                            score += bounceValue;
                        } else {
                            score -= bounceValue;
                        }
                    }
                }
            }
        }
        
        // Evaluate advanced patterns if last move is provided
        if (lastMove) {
            const { row, col } = lastMove;
            const player = board[row][col];
            const isAI = player === aiPlayer;
            
            // Check for fork patterns (multiple threats)
            const forkValue = this.evaluateForkingPatterns(
                board, row, col, player, isAI ? humanPlayer : aiPlayer, 
                bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            // Add to score (positive for AI, negative for human)
            if (isAI) {
                score += forkValue;
            } else {
                score -= forkValue;
            }
        }
        
        // Slight defensive bias (value blocking opponent's threats more)
        // This makes the AI more likely to block human threats
        return score * 0.98;
    }
    
    /**
     * Evaluate a pattern in a specific direction
     * @param {Array} board - 2D array representing the game board
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Row direction (-1, 0, 1)
     * @param {number} dy - Column direction (-1, 0, 1)
     * @param {string} player - Player marker to evaluate for
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Value of the pattern
     */
    evaluatePattern(board, startRow, startCol, dx, dy, player, missingTeethRuleEnabled) {
        // Count consecutive pieces and open ends
        let count = 1; // Start with the cell itself
        let openEnds = 0;
        const path = [[startRow, startCol]];
        
        // Check forward direction
        let forwardOpen = false;
        for (let i = 1; i < 5; i++) {
            const newRow = startRow + i * dx;
            const newCol = startCol + i * dy;
            
            // Check if position is valid
            if (newRow < 0 || newRow >= this.boardSize || 
                newCol < 0 || newCol >= this.boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else if (board[newRow][newCol] === '') {
                forwardOpen = true;
                openEnds++;
                break;
            } else {
                break;
            }
        }
        
        // Check backward direction
        let backwardOpen = false;
        for (let i = 1; i < 5; i++) {
            const newRow = startRow - i * dx;
            const newCol = startCol - i * dy;
            
            // Check if position is valid
            if (newRow < 0 || newRow >= this.boardSize || 
                newCol < 0 || newCol >= this.boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else if (board[newRow][newCol] === '') {
                backwardOpen = true;
                openEnds++;
                break;
            } else {
                break;
            }
        }
        
        // Evaluate the pattern
        let value = 0;
        const isDiagonal = dx !== 0 && dy !== 0;
        const diagonalBonus = isDiagonal ? 1.1 : 1.0; // Slight boost for diagonal patterns
        
        // Check for missing teeth if rule is enabled
        let hasMissingTeeth = false;
        if (missingTeethRuleEnabled && count >= 3) {
            // Check if this pattern is on a major axis
            const isOnMajorAxis = this.isOnMajorAxis(path);
            
            if (isOnMajorAxis) {
                // Check if this is a great diagonal (exempt from missing teeth rule)
                const isGreatDiag = this.isGreatDiagonal(path);
                
                // Only check for missing teeth if not a great diagonal
                if (!isGreatDiag) {
                    hasMissingTeeth = this.checkForMissingTeeth(board, path, player, dx, dy);
                }
            }
        }
        
        // Calculate value based on pattern
        if (count >= 5 && !hasMissingTeeth) {
            // Winning pattern
            value = this.weights.win;
        } else if (count === 4) {
            if (openEnds === 2 && !hasMissingTeeth) {
                // Four in a row with both ends open (very strong)
                value = this.weights.fourOpen * 1.5;
            } else if (openEnds === 1 && !hasMissingTeeth) {
                // Four in a row with one open end (strong)
                value = this.weights.fourOpen;
            } else {
                // Four in a row with no open ends
                value = this.weights.fourBlocked;
            }
        } else if (count === 3) {
            if (openEnds === 2 && !hasMissingTeeth) {
                // Three in a row with both ends open (strong threat)
                value = this.weights.threeOpen;
                
                // Check for extended open space (important for threat assessment)
                let extendedOpenSpace = 0;
                
                // Check forward for second empty space
                if (forwardOpen) {
                    let extRow = startRow + (count + 1) * dx;
                    let extCol = startCol + (count + 1) * dy;
                    
                    if (extRow >= 0 && extRow < this.boardSize && 
                        extCol >= 0 && extCol < this.boardSize && 
                        board[extRow][extCol] === '') {
                        extendedOpenSpace++;
                    }
                }
                
                // Check backward for second empty space
                if (backwardOpen) {
                    let extRow = startRow - (count + 1) * dx;
                    let extCol = startCol - (count + 1) * dy;
                    
                    if (extRow >= 0 && extRow < this.boardSize && 
                        extCol >= 0 && extCol < this.boardSize && 
                        board[extRow][extCol] === '') {
                        extendedOpenSpace++;
                    }
                }
                
                // Bonus for having extended open space (more room to develop)
                if (extendedOpenSpace === 2) {
                    value *= 1.3; // Both sides have extended space
                } else if (extendedOpenSpace === 1) {
                    value *= 1.1; // One side has extended space
                }
            } else if (openEnds === 1) {
                // Three in a row with one open end
                value = this.weights.threeHalfOpen;
            }
        } else if (count === 2 && openEnds === 2) {
            // Two in a row with both ends open (developing)
            value = this.weights.twoOpen;
        }
        
        // Apply diagonal bonus
        return value * diagonalBonus;
    }
    
    /**
     * Evaluate bounce patterns
     * @param {Array} board - 2D array representing the game board
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Row direction (-1, 0, 1)
     * @param {number} dy - Column direction (-1, 0, 1)
     * @param {string} player - Player marker to evaluate for
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Value of the bounce pattern
     */
    evaluateBouncePattern(board, startRow, startCol, dx, dy, player, missingTeethRuleEnabled) {
        // Only consider cells near edges for bounce patterns
        const isNearEdge = 
            startRow <= 1 || startRow >= this.boardSize - 2 || 
            startCol <= 1 || startCol >= this.boardSize - 2;
        
        if (!isNearEdge) {
            return 0;
        }
        
        // Count consecutive pieces in this direction
        let count = 1;
        const path = [[startRow, startCol]];
        
        // Check forward direction toward the edge
        for (let i = 1; i < 4; i++) {
            const newRow = startRow + i * dx;
            const newCol = startCol + i * dy;
            
            // Check if we've reached the edge
            if (newRow < 0 || newRow >= this.boardSize || 
                newCol < 0 || newCol >= this.boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else {
                break;
            }
        }
        
        // Simple bounce evaluation - gives a value based on the length of the sequence
        // A more sophisticated implementation would trace the actual bounce path
        if (count >= 3) {
            return this.weights.bouncePattern * (count - 2);
        }
        
        return 0;
    }
    
    /**
     * Evaluate forking patterns (multiple threats)
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the last move
     * @param {number} col - Column of the last move
     * @param {string} player - Player who made the move
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Value of forking patterns
     */
    evaluateForkingPatterns(board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Define directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        let threatCount = 0;
        
        // Check each direction for threats
        for (const [dx, dy] of directions) {
            // Count consecutive pieces and open ends
            const result = this.countInDirection(board, row, col, dx, dy, player);
            
            // Add to threat count based on pattern
            if (result.count === 4 && result.openEnds >= 1) {
                // Direct threat - four in a row with at least one open end
                threatCount += 2;
            } else if (result.count === 3 && result.openEnds === 2) {
                // Indirect threat - three in a row with both ends open
                threatCount += 1;
            }
        }
        
        // Check for bounce threats if enabled
        if (bounceRuleEnabled) {
            // Check diagonal directions for bounce potential
            const diagonalDirections = [
                [1, 1],  // diagonal
                [1, -1]  // anti-diagonal
            ];
            
            for (const [dx, dy] of diagonalDirections) {
                // Check if position is near an edge (where bounce is possible)
                const isNearEdge = 
                    row <= 1 || row >= this.boardSize - 2 || 
                    col <= 1 || col >= this.boardSize - 2;
                
                if (isNearEdge) {
                    // Count pieces in diagonal path
                    const result = this.countInDirection(board, row, col, dx, dy, player);
                    
                    // Add to threat count if this looks like a bounce threat
                    if (result.count >= 3) {
                        threatCount += 0.5; // Partial threat (potential bounce)
                    }
                }
            }
        }
        
        // Calculate value based on multiple threats
        if (threatCount >= 2) {
            // Multiple threats - forking pattern
            return 150; // Very high value for creating multiple threats
        } else if (threatCount >= 1) {
            // Single threat
            return 30;
        }
        
        return 0;
    }
    
    /**
     * Count pieces in a direction
     * @param {Array} board - 2D array representing the game board
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Row direction (-1, 0, 1)
     * @param {number} dy - Column direction (-1, 0, 1)
     * @param {string} player - Player marker to count
     * @returns {Object} - Result with count, open ends, and path
     */
    countInDirection(board, startRow, startCol, dx, dy, player) {
        let count = 1; // Start with the current position
        let openEnds = 0;
        const path = [[startRow, startCol]];
        
        // Check forward direction
        let forwardOpen = false;
        for (let i = 1; i < 5; i++) {
            const newRow = startRow + i * dx;
            const newCol = startCol + i * dy;
            
            // Check if position is valid
            if (newRow < 0 || newRow >= this.boardSize || 
                newCol < 0 || newCol >= this.boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else if (board[newRow][newCol] === '') {
                forwardOpen = true;
                openEnds++;
                break;
            } else {
                break;
            }
        }
        
        // Check backward direction
        let backwardOpen = false;
        for (let i = 1; i < 5; i++) {
            const newRow = startRow - i * dx;
            const newCol = startCol - i * dy;
            
            // Check if position is valid
            if (newRow < 0 || newRow >= this.boardSize || 
                newCol < 0 || newCol >= this.boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else if (board[newRow][newCol] === '') {
                backwardOpen = true;
                openEnds++;
                break;
            } else {
                break;
            }
        }
        
        return { count, openEnds, path };
    }
    
    /**
     * Check if a path is on a major axis (horizontal, vertical, or great diagonal)
     * @param {Array} cells - Array of [row, col] coordinates
     * @returns {boolean} - Whether the path is on a major axis
     */
    isOnMajorAxis(cells) {
        if (cells.length < 3) return false;
        
        // Check if all cells are in the same row
        const allSameRow = cells.every(cell => cell[0] === cells[0][0]);
        
        // Check if all cells are in the same column
        const allSameCol = cells.every(cell => cell[1] === cells[0][1]);
        
        // Check if cells are on a great diagonal
        const isGreatDiag = this.isGreatDiagonal(cells);
        
        return allSameRow || allSameCol || isGreatDiag;
    }
    
    /**
     * Check if cells are on a great diagonal
     * @param {Array} cells - Array of [row, col] coordinates
     * @returns {boolean} - Whether the cells are on a great diagonal
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
     * Check for missing teeth in a line of cells
     * @param {Array} board - 2D array representing the game board
     * @param {Array} cells - Array of [row, col] coordinates
     * @param {string} player - Player marker
     * @param {number} dx - Row direction
     * @param {number} dy - Column direction
     * @returns {boolean} - Whether there are missing teeth
     */
    checkForMissingTeeth(board, cells, player, dx, dy) {
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
}