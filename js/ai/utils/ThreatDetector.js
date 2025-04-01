/**
 * ThreatDetector.js - Detects and evaluates threats and opportunities on the board
 * Specialized utility for detecting patterns that create or block winning threats
 */
class ThreatDetector {
    /**
     * Create a new threat detector
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        
        // Directions to check
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
     * Find a move that creates multiple threats (a forcing move)
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - Player to find moves for
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object|null} - Forcing move { row, col } or null if none found
     */
    findForcingMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Get all empty positions
        const emptyPositions = this.getEmptyPositions(board);
        
        // Evaluate each position for threat creation
        const threatMoves = [];
        
        for (const { row, col } of emptyPositions) {
            // Count potential threats created by this move
            const threatCount = this.countThreats(
                board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            // If this move creates multiple threats, it's a forcing move
            if (threatCount >= 2) {
                threatMoves.push({ row, col, threats: threatCount });
            }
        }
        
        // Sort by number of threats (highest first)
        threatMoves.sort((a, b) => b.threats - a.threats);
        
        // Return the move that creates the most threats
        return threatMoves.length > 0 ? { row: threatMoves[0].row, col: threatMoves[0].col } : null;
    }
    
    /**
     * Find a critical defensive move to block opponent's threats
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - AI player
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object|null} - Defensive move { row, col } or null if none needed
     */
    findCriticalDefensiveMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Get all empty positions
        const emptyPositions = this.getEmptyPositions(board);
        
        // Evaluate each position for threat blocking
        const defensiveMoves = [];
        
        for (const { row, col } of emptyPositions) {
            // Count potential threats by opponent if they played here
            const opponentThreats = this.countThreats(
                board, row, col, opponent, player, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            // If opponent can create multiple threats, this is a critical position to block
            if (opponentThreats >= 2) {
                defensiveMoves.push({ row, col, threats: opponentThreats });
            }
        }
        
        // Sort by number of threats blocked (highest first)
        defensiveMoves.sort((a, b) => b.threats - a.threats);
        
        // Return the move that blocks the most threats
        return defensiveMoves.length > 0 ? { row: defensiveMoves[0].row, col: defensiveMoves[0].col } : null;
    }
    
    /**
     * Evaluate threats and opportunities for a position
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the position
     * @param {number} col - Column of the position
     * @param {string} player - Player to evaluate for
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - Evaluation { offensiveScore, defensiveScore, diagonalThreatBonus }
     */
    evaluatePosition(board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Skip if position is not empty
        if (board[row][col] !== '') {
            return { offensiveScore: 0, defensiveScore: 0, diagonalThreatBonus: 0 };
        }
        
        // Make a copy of the board with the move applied
        const tempBoard = this.makeMove(board, row, col, player);
        
        let offensiveScore = 0;
        let defensiveScore = 0;
        let diagonalThreatBonus = 0;
        
        // Check each direction for offensive potential
        for (const [dx, dy] of this.directions) {
            // Evaluate the pattern from this position
            const pattern = this.evaluateDirectionalPattern(
                tempBoard, row, col, dx, dy, player, missingTeethRuleEnabled
            );
            
            // Add to offensive score
            offensiveScore += pattern.value;
            
            // Add diagonal bonus if applicable
            if (dx !== 0 && dy !== 0 && pattern.value > 0) {
                diagonalThreatBonus += pattern.value * 0.2; // 20% bonus for diagonal threats
            }
        }
        
        // Now check for defensive value (blocking opponent's threats)
        const opponentBoard = this.makeMove(board, row, col, opponent);
        
        for (const [dx, dy] of this.directions) {
            // Evaluate the pattern as if opponent played here
            const pattern = this.evaluateDirectionalPattern(
                opponentBoard, row, col, dx, dy, opponent, missingTeethRuleEnabled
            );
            
            // Add to defensive score
            defensiveScore += pattern.value * 0.8; // Value blocking slightly less than creating
            
            // Add diagonal bonus if applicable
            if (dx !== 0 && dy !== 0 && pattern.value > 0) {
                diagonalThreatBonus += pattern.value * 0.1; // 10% bonus for blocking diagonal threats
            }
        }
        
        // Check for bounce patterns if enabled
        if (bounceRuleEnabled) {
            // Evaluate bounce patterns for both offensive and defensive value
            for (const [dx, dy] of this.diagonalDirections) {
                // Check offensive bounce potential
                const offensiveBounce = this.evaluateBouncePattern(
                    tempBoard, row, col, dx, dy, player, missingTeethRuleEnabled
                );
                
                offensiveScore += offensiveBounce;
                
                // Check defensive bounce potential
                const defensiveBounce = this.evaluateBouncePattern(
                    opponentBoard, row, col, dx, dy, opponent, missingTeethRuleEnabled
                );
                
                defensiveScore += defensiveBounce * 0.8; // Value blocking slightly less
            }
        }
        
        return { offensiveScore, defensiveScore, diagonalThreatBonus };
    }
    
    /**
     * Count potential threats a move creates
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player who made the move
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Number of threats
     */
    countThreats(board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Skip if position is not empty
        if (board[row][col] !== '') {
            return 0;
        }
        
        // Make a copy of the board with the move applied
        const tempBoard = this.makeMove(board, row, col, player);
        
        let threats = 0;
        
        // Check each direction for threats
        for (const [dx, dy] of this.directions) {
            // Count consecutive pieces and open ends
            const result = this.countInDirection(tempBoard, row, col, dx, dy, player);
            
            // Add to threat count based on pattern
            if (result.count === 4 && result.openEnds >= 1) {
                // Direct threat - four in a row with at least one open end
                threats++;
            } else if (result.count === 3 && result.openEnds === 2) {
                // Indirect threat - three in a row with both ends open
                threats++;
            }
        }
        
        // Check for bounce threats if enabled
        if (bounceRuleEnabled) {
            // Check diagonal directions for bounce potential
            for (const [dx, dy] of this.diagonalDirections) {
                // Check if position is near an edge (where bounce is possible)
                const isNearEdge = 
                    row <= 1 || row >= this.boardSize - 2 || 
                    col <= 1 || col >= this.boardSize - 2;
                
                if (isNearEdge) {
                    // Check for a potential bounce pattern
                    const bounceResult = this.evaluateBouncePattern(
                        tempBoard, row, col, dx, dy, player, missingTeethRuleEnabled
                    );
                    
                    // Count as a threat if the bounce pattern is strong enough
                    if (bounceResult >= 30) {
                        threats++;
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Find diagonal threats specifically
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the last move
     * @param {number} col - Column of the last move
     * @param {string} player - Player who made the move
     * @returns {number} - Diagonal threat score (0-100)
     */
    findDiagonalThreats(board, row, col, player) {
        // Only check diagonal directions
        const diagonalDirections = [
            [1, 1],  // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        let diagonalThreatScore = 0;
        
        for (const [dx, dy] of diagonalDirections) {
            // Count consecutive pieces and open ends
            const result = this.countInDirection(board, row, col, dx, dy, player);
            
            // Calculate threat score based on pattern
            if (result.count >= 4 && result.openEnds >= 1) {
                diagonalThreatScore += 100; // Strong diagonal threat
            } else if (result.count === 3 && result.openEnds === 2) {
                diagonalThreatScore += 60; // Moderate diagonal threat
            } else if (result.count === 3 && result.openEnds === 1) {
                diagonalThreatScore += 30; // Minor diagonal threat
            } else if (result.count === 2 && result.openEnds === 2) {
                diagonalThreatScore += 15; // Potential diagonal threat
            }
            
            // Check if on a great diagonal for additional bonus
            if (this.isGreatDiagonal(result.path)) {
                diagonalThreatScore *= 1.25; // 25% bonus for great diagonal
            }
        }
        
        return diagonalThreatScore;
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
     * @returns {Object} - Evaluation { value, count, openEnds, path }
     */
    evaluateDirectionalPattern(board, startRow, startCol, dx, dy, player, missingTeethRuleEnabled) {
        // Count consecutive pieces and open ends
        const result = this.countInDirection(board, startRow, startCol, dx, dy, player);
        const { count, openEnds, path } = result;
        
        // Check for missing teeth if applicable
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
        let value = 0;
        
        if (count >= 5 && !hasMissingTeeth) {
            // Winning pattern
            value = 1000;
        } else if (count === 4) {
            if (openEnds === 2 && !hasMissingTeeth) {
                // Four in a row with both ends open (very strong)
                value = 300;
            } else if (openEnds === 1 && !hasMissingTeeth) {
                // Four in a row with one open end (strong)
                value = 200;
            } else if (!hasMissingTeeth) {
                // Four in a row with no open ends
                value = 50;
            }
        } else if (count === 3) {
            if (openEnds === 2 && !hasMissingTeeth) {
                // Three in a row with both ends open (strong threat)
                value = 50;
            } else if (openEnds === 1 && !hasMissingTeeth) {
                // Three in a row with one open end
                value = 10;
            }
        } else if (count === 2 && openEnds === 2) {
            // Two in a row with both ends open (developing)
            value = 5;
        }
        
        // Apply diagonal bonus
        const isDiagonal = dx !== 0 && dy !== 0;
        if (isDiagonal) {
            value *= 1.1; // 10% bonus for diagonal patterns
        }
        
        return { value, count, openEnds, path };
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
        // Only consider diagonal directions for bounce
        if (dx === 0 || dy === 0) {
            return 0;
        }
        
        // Only consider cells near edges
        const isNearEdge = 
            startRow <= 1 || startRow >= this.boardSize - 2 || 
            startCol <= 1 || startCol >= this.boardSize - 2;
        
        if (!isNearEdge) {
            return 0;
        }
        
        // Count consecutive pieces toward the edge
        let count = 1;
        let path = [[startRow, startCol]];
        let isFirstBounce = false;
        
        // Determine direction toward the closest edge
        let dirRow = 0;
        let dirCol = 0;
        
        if (startRow <= 1) dirRow = -1;
        else if (startRow >= this.boardSize - 2) dirRow = 1;
        
        if (startCol <= 1) dirCol = -1;
        else if (startCol >= this.boardSize - 2) dirCol = 1;
        
        // If no clear edge direction, use dx/dy
        if (dirRow === 0) dirRow = dx;
        if (dirCol === 0) dirCol = dy;
        
        // Check in the direction of the edge
        for (let i = 1; i < 4; i++) {
            const newRow = startRow + i * dirRow * dx;
            const newCol = startCol + i * dirCol * dy;
            
            // Check if we've reached the edge
            if (newRow < 0 || newRow >= this.boardSize || 
                newCol < 0 || newCol >= this.boardSize) {
                isFirstBounce = true;
                break;
            }
            
            if (board[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else {
                break;
            }
        }
        
        // Simple bounce evaluation based on the length of the sequence
        // A more sophisticated implementation would trace the actual bounce path
        let value = 0;
        
        if (isFirstBounce && count >= 3) {
            value = 30 * (count - 2); // Value increases with length
        }
        
        return value;
    }
    
    /**
     * Count consecutive pieces in a direction
     * @param {Array} board - 2D array representing the game board
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Row direction
     * @param {number} dy - Column direction
     * @param {string} player - Player marker to count
     * @returns {Object} - Count result { count, openEnds, path }
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
                openEnds++;
                break;
            } else {
                break;
            }
        }
        
        return { count, openEnds, path };
    }
    
    /**
     * Check if a path is on a major axis
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
    
    /**
     * Get all empty positions on the board
     * @param {Array} board - 2D array representing the game board
     * @returns {Array} - Array of positions { row, col }
     */
    getEmptyPositions(board) {
        const positions = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }
    
    /**
     * Make a move on a copy of the board (without modifying the original)
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player marker ('X' or 'O')
     * @returns {Array} - New board state after the move
     */
    makeMove(board, row, col, player) {
        // Create a deep copy of the board
        const newBoard = board.map(row => [...row]);
        
        // Make the move
        newBoard[row][col] = player;
        
        return newBoard;
    }
}