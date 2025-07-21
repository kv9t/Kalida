/**
 * BouncePatternDetector.js - Specialized detection of bounce patterns
 * This module specifically handles bounce patterns and their evaluation
 */

// FIXED: Correct import path for BounceUtils
import BounceUtils from '../../../utils/BounceUtils.js';

class BouncePatternDetector {
    /**
     * Create a new bounce pattern detector
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.diagonalDirections = [
            [1, 1],   // diagonal down-right
            [1, -1],  // diagonal down-left
            [-1, 1],  // diagonal up-right
            [-1, -1]  // diagonal up-left
        ];
        this.edgePositionBonus = 15;
        this.cornerPositionBonus = 20;
        this.doubleBounceWeight = 2.0;
    }
    
    /**
     * Detect threats in the current board state
     * @param {Array} board - Current board state
     * @param {string} player - Player to check for
     * @param {string} opponent - Opponent player
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of threats with blocking/creating moves
     */
    detectThreats(board, player, opponent, missingTeethRuleEnabled) {
        const threats = [];
        
        // First, check for sequential threats along diagonals
        // These are the most common patterns that lead to bounce wins
        const sequentialThreats = this.detectSequentialThreats(board, player, opponent, missingTeethRuleEnabled);
        threats.push(...sequentialThreats);
        
        // Next, explicitly check for bounce patterns starting from each position
        const bounceThreats = this.detectBounceThreats(board, player, opponent, missingTeethRuleEnabled);
        threats.push(...bounceThreats);
        
        // Special check for patterns the BounceUtils might miss:
        // Double bounce patterns that start from player pieces near corners
        const doubleBounceThreats = this.detectDoubleBounceThreats(board, player, opponent, missingTeethRuleEnabled);
        threats.push(...doubleBounceThreats);
        
        // Sort threats by priority (highest first)
        threats.sort((a, b) => b.priority - a.priority);
        
        return threats;
    }
    
    /**
     * Detect sequential threats along diagonals
     * These are patterns like O _ _ _ O or _ O O _ _ that could lead to bounce wins
     * @param {Array} board - Current board state
     * @param {string} player - Player to check for
     * @param {string} opponent - Opponent player
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of threats
     */
    detectSequentialThreats(board, player, opponent, missingTeethRuleEnabled) {
        const threats = [];
        
        // For each player piece, check diagonal lines that could lead to bounce wins
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Check each diagonal direction
                    for (const [dx, dy] of this.diagonalDirections) {
                        // Look for patterns in this diagonal
                        const pattern = this.traceSequentialPattern(board, row, col, dx, dy, player, missingTeethRuleEnabled);
                        
                        if (pattern.threat) {
                            threats.push({
                                type: 'sequential',
                                player: player,
                                pattern: pattern.cells,
                                priority: pattern.priority,
                                blockingMove: pattern.blockingMove,
                                createMove: pattern.createMove
                            });
                        }
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Trace a sequential pattern in a direction
     * @param {Array} board - Current board state
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Row direction
     * @param {number} dy - Column direction
     * @param {string} player - Player to check for
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Object} - Pattern info
     */
    traceSequentialPattern(board, startRow, startCol, dx, dy, player, missingTeethRuleEnabled) {
        const cells = [[startRow, startCol]];
        const emptyPositions = [];
        let priority = 0;
        
        // Count consecutive pieces and gaps
        for (let i = 1; i < 5; i++) {
            const row = startRow + i * dx;
            const col = startCol + i * dy;
            
            // Check bounds
            if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
                break;
            }
            
            if (board[row][col] === player) {
                cells.push([row, col]);
                priority += 10; // Higher priority for more pieces
            } else if (board[row][col] === '') {
                emptyPositions.push({ row, col });
                // Don't break - we want to find patterns with gaps
            } else {
                break; // Opponent piece blocks the pattern
            }
        }
        
        // Also check the opposite direction
        for (let i = 1; i < 5; i++) {
            const row = startRow - i * dx;
            const col = startCol - i * dy;
            
            // Check bounds
            if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
                break;
            }
            
            if (board[row][col] === player) {
                cells.push([row, col]);
                priority += 10; // Higher priority for more pieces
            } else if (board[row][col] === '') {
                emptyPositions.push({ row, col });
                // Don't break - we want to find patterns with gaps
            } else {
                break; // Opponent piece blocks the pattern
            }
        }
        
        // Sort cells to find the exact pattern
        cells.sort((a, b) => {
            if (a[0] !== b[0]) return a[0] - b[0];
            return a[1] - b[1];
        });
        
        // Check if this forms a threat
        let threat = false;
        let blockingMove = null;
        let createMove = null;
        
        // Check for patterns that could form a line of 5
        // Pattern needs to have at least 3 pieces with 2 or fewer gaps
        if (cells.length >= 3 && emptyPositions.length > 0 && cells.length + emptyPositions.length >= 5) {
            // Check for missing teeth if required
            let hasMissingTeeth = false;
            if (missingTeethRuleEnabled) {
                // Use BounceUtils to check for missing teeth
                hasMissingTeeth = BounceUtils.hasMissingTeeth([...cells, ...emptyPositions.map(p => [p.row, p.col])]);
            }
            
            if (!hasMissingTeeth) {
                threat = true;
                
                // Find the most critical position to block/create
                if (emptyPositions.length > 0) {
                    // Sort empty positions by how critical they are
                    emptyPositions.sort((a, b) => {
                        // Check if this position is adjacent to existing pieces
                        const aAdjacent = this.isAdjacentToPlayer(board, a.row, a.col, player);
                        const bAdjacent = this.isAdjacentToPlayer(board, b.row, b.col, player);
                        
                        if (aAdjacent && !bAdjacent) return -1;
                        if (!aAdjacent && bAdjacent) return 1;
                        
                        // Check if this position is near the edge (for bounce potential)
                        const aEdge = this.isNearEdge(a.row, a.col);
                        const bEdge = this.isNearEdge(b.row, b.col);
                        
                        if (aEdge && !bEdge) return -1;
                        if (!aEdge && bEdge) return 1;
                        
                        return 0;
                    });
                    
                    blockingMove = emptyPositions[0];
                    createMove = emptyPositions[0];
                    
                    // Add bonus for positions near edges
                    if (this.isNearEdge(blockingMove.row, blockingMove.col)) {
                        priority += 15;
                    }
                }
            }
        }
        
        return {
            threat,
            cells,
            priority,
            blockingMove,
            createMove
        };
    }
    
    /**
     * Detect bounce threats (pieces that could form a bounce pattern)
     * @param {Array} board - Current board state
     * @param {string} player - Player to check for
     * @param {string} opponent - Opponent player
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of threats
     */
    detectBounceThreats(board, player, opponent, missingTeethRuleEnabled) {
        const threats = [];
        
        // Check each player piece near edges
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Only check pieces near edges (where bounce is possible)
                    const isNearEdge = row <= 1 || row >= this.boardSize - 2 || 
                                     col <= 1 || col >= this.boardSize - 2;
                    
                    if (isNearEdge) {
                        // Use BounceUtils to find patterns
                        const pattern = BounceUtils.findBouncePattern(
                            board, row, col, player, this.boardSize, 3 // At least 3 for a threat
                        );
                        
                        if (pattern && pattern.path.length >= 3) {
                            // Check for missing teeth
                            let hasMissingTeeth = false;
                            if (missingTeethRuleEnabled) {
                                hasMissingTeeth = BounceUtils.hasMissingTeeth(pattern.path);
                            }
                            
                            if (!hasMissingTeeth) {
                                // Find positions to extend this pattern
                                const extendPositions = this.findBouncePatternExtensions(
                                    board, pattern.path, pattern.bounceIndices, player
                                );
                                
                                if (extendPositions.length > 0) {
                                    // Calculate priority based on pattern
                                    let priority = pattern.path.length * 15; // Base priority
                                    
                                    // Add bounce index bonus
                                    priority += pattern.bounceIndices.length * 20;
                                    
                                    // Double bonus for patterns that already bounce twice
                                    if (pattern.bounceIndices.length >= 2) {
                                        priority *= 1.5;
                                    }
                                    
                                    // Create threat entry
                                    threats.push({
                                        type: 'bounce',
                                        player: player,
                                        pattern: pattern.path,
                                        bounceIndices: pattern.bounceIndices,
                                        priority: priority,
                                        blockingMove: extendPositions[0], // Best position to block
                                        createMove: extendPositions[0]    // Best position to extend
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Find positions that would extend a bounce pattern
     * @param {Array} board - Current board state
     * @param {Array} path - Array of cells in the bounce pattern
     * @param {Array} bounceIndices - Indices of bounce points in the path
     * @param {string} player - Player to check for
     * @returns {Array} - Array of positions to extend the pattern
     */
    findBouncePatternExtensions(board, path, bounceIndices, player) {
        const extensions = [];
        
        // Consider the direction after the last bounce
        if (path.length < 2) return extensions;
        
        // Get the last direction after a bounce
        let lastDirection = [0, 0];
        let startIndex = 0;
        
        if (bounceIndices.length > 0) {
            startIndex = bounceIndices[bounceIndices.length - 1];
        }
        
        if (startIndex < path.length - 1) {
            const [r1, c1] = path[startIndex];
            const [r2, c2] = path[startIndex + 1];
            lastDirection = [r2 - r1, c2 - c1];
        } else if (path.length >= 2) {
            // No bounce yet, use the current direction
            const [r1, c1] = path[path.length - 2];
            const [r2, c2] = path[path.length - 1];
            lastDirection = [r2 - r1, c2 - c1];
        }
        
        // If we have a direction, look for extension positions
        if (lastDirection[0] !== 0 || lastDirection[1] !== 0) {
            const [dx, dy] = lastDirection;
            const [lastRow, lastCol] = path[path.length - 1];
            
            // Check the next position in this direction
            let nextRow = lastRow + dx;
            let nextCol = lastCol + dy;
            
            // If we'd go off the board, consider a bounce
            if (nextRow < 0 || nextRow >= this.boardSize || 
                nextCol < 0 || nextCol >= this.boardSize) {
                
                // Calculate bounce direction
                let newDx = dx;
                let newDy = dy;
                
                if (nextRow < 0 || nextRow >= this.boardSize) {
                    newDx = -dx;
                }
                
                if (nextCol < 0 || nextCol >= this.boardSize) {
                    newDy = -dy;
                }
                
                // Check the position after bounce
                nextRow = lastRow + newDx;
                nextCol = lastCol + newDy;
            }
            
            // Check if the next position is valid and empty
            if (nextRow >= 0 && nextRow < this.boardSize && 
                nextCol >= 0 && nextCol < this.boardSize &&
                board[nextRow][nextCol] === '') {
                
                // Add this as a potential extension
                extensions.push({ row: nextRow, col: nextCol });
                
                // Calculate priority (default 50)
                let priority = 50;
                
                // Increase priority for extensions near edges
                if (this.isNearEdge(nextRow, nextCol)) {
                    priority += 20;
                }
                
                // Set the priority
                extensions[0].priority = priority;
            }
        }
        
        // Also consider any empty adjacent positions
        for (const [r, c] of path) {
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];
            
            for (const [dx, dy] of directions) {
                const adjRow = r + dx;
                const adjCol = c + dy;
                
                if (adjRow >= 0 && adjRow < this.boardSize && 
                    adjCol >= 0 && adjCol < this.boardSize &&
                    board[adjRow][adjCol] === '') {
                    
                    // Check if this position is already in extensions
                    if (!extensions.some(pos => pos.row === adjRow && pos.col === adjCol)) {
                        extensions.push({ 
                            row: adjRow, 
                            col: adjCol,
                            priority: 30 // Lower priority for adjacent positions
                        });
                    }
                }
            }
        }
        
        // Sort by priority
        extensions.sort((a, b) => b.priority - a.priority);
        
        return extensions;
    }
    
    /**
     * Detect double bounce threats (patterns that could form a double bounce win)
     * @param {Array} board - Current board state
     * @param {string} player - Player to check for
     * @param {string} opponent - Opponent player
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of threats
     */
    detectDoubleBounceThreats(board, player, opponent, missingTeethRuleEnabled) {
        const threats = [];
        
        // Check each player piece that's near a corner
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Only check pieces near corners (where double bounce is possible)
                    const isNearCorner = (row <= 1 && col <= 1) || 
                                       (row <= 1 && col >= this.boardSize - 2) ||
                                       (row >= this.boardSize - 2 && col <= 1) ||
                                       (row >= this.boardSize - 2 && col >= this.boardSize - 2);
                    
                    if (isNearCorner) {
                        // Create a pattern to simulate the double bounce pattern
                        const simulatedPattern = this.simulateDoubleBouncePattern(
                            board, row, col, player
                        );
                        
                        if (simulatedPattern.threat) {
                            threats.push({
                                type: 'double-bounce',
                                player: player,
                                pattern: simulatedPattern.path,
                                priority: 100, // High priority for double bounce threats!
                                blockingMove: simulatedPattern.blockingMove,
                                createMove: simulatedPattern.createMove
                            });
                        }
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Simulate a double bounce pattern and find critical blocking positions
     * @param {Array} board - Current board state
     * @param {number} row - Starting row
     * @param {number} col - Starting column
     * @param {string} player - Player to check for
     * @returns {Object} - Pattern info
     */
    simulateDoubleBouncePattern(board, row, col, player) {
        // Determine which corner region we're in
        let dx = 1, dy = 1; // Default direction
        
        if (row <= 1 && col <= 1) {
            // Top-left corner
            dx = 1; dy = 1;
        } else if (row <= 1 && col >= this.boardSize - 2) {
            // Top-right corner
            dx = 1; dy = -1;
        } else if (row >= this.boardSize - 2 && col <= 1) {
            // Bottom-left corner
            dx = -1; dy = 1;
        } else if (row >= this.boardSize - 2 && col >= this.boardSize - 2) {
            // Bottom-right corner
            dx = -1; dy = -1;
        }
        
        // Trace a path in the diagonal direction
        const path = [[row, col]];
        const emptyPositions = [];
        let lastDirection = [dx, dy];
        let bounceCount = 0;
        
        // Simulate up to 6 steps in the pattern
        let currentRow = row;
        let currentCol = col;
        
        for (let step = 1; step <= 6; step++) {
            let nextRow = currentRow + lastDirection[0];
            let nextCol = currentCol + lastDirection[1];
            
            // Check if we hit an edge and need to bounce
            let bounced = false;
            if (nextRow < 0 || nextRow >= this.boardSize || 
                nextCol < 0 || nextCol >= this.boardSize) {
                
                bounced = true;
                bounceCount++;
                
                // Calculate bounce direction
                if (nextRow < 0 || nextRow >= this.boardSize) {
                    lastDirection[0] = -lastDirection[0];
                }
                
                if (nextCol < 0 || nextCol >= this.boardSize) {
                    lastDirection[1] = -lastDirection[1];
                }
                
                // Recalculate next position
                nextRow = currentRow + lastDirection[0];
                nextCol = currentCol + lastDirection[1];
            }
            
            // Check if the next position is valid
            if (nextRow >= 0 && nextRow < this.boardSize && 
                nextCol >= 0 && nextCol < this.boardSize) {
                
                if (board[nextRow][nextCol] === player) {
                    // Add player's piece to the path
                    path.push([nextRow, nextCol]);
                    currentRow = nextRow;
                    currentCol = nextCol;
                } else if (board[nextRow][nextCol] === '') {
                    // Empty position - potential move
                    emptyPositions.push({ row: nextRow, col: nextCol });
                    
                    // For simulation, we "fill in" the empty space if it's the critical position
                    // i.e., one that would complete a double bounce threat
                    if (bounceCount >= 1 || bounced) {
                        // This would complete a bounce pattern - check if it's our first empty position
                        if (emptyPositions.length === 1) {
                            // Simulate continuing the pattern
                            path.push([nextRow, nextCol]);
                            currentRow = nextRow;
                            currentCol = nextCol;
                            continue;
                        }
                    }
                    
                    break; // Stop simulation at empty position
                } else {
                    // Opponent's piece blocks the pattern
                    break;
                }
            } else {
                // Invalid position
                break;
            }
        }
        
        // Determine if this is a threat
        let threat = false;
        let blockingMove = null;
        let createMove = null;
        
        // A double bounce pattern is a threat if:
        // 1. It has at least 3 player pieces
        // 2. It has at least 1 bounce (actual or potential)
        // 3. There's at least one empty position to block or create
        if (path.length >= 3 && (bounceCount > 0 || lastDirection[0] !== dx || lastDirection[1] !== dy) && 
            emptyPositions.length > 0) {
            
            threat = true;
            
            // The most critical position is the first empty position
            if (emptyPositions.length > 0) {
                blockingMove = emptyPositions[0];
                createMove = emptyPositions[0];
            }
        }
        
        return {
            threat,
            path,
            bounceCount,
            blockingMove,
            createMove
        };
    }
    
    /**
     * Evaluate the bounce pattern potential for a position
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the position
     * @param {number} col - Column of the position
     * @param {string} player - Player to evaluate for
     * @param {string} opponent - Opponent player
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {number} - Bounce potential score
     */
    evaluateBouncePotential(board, row, col, player, opponent, missingTeethRuleEnabled) {
        // If not near an edge, no bounce potential
        const isNearEdge = row <= 1 || row >= this.boardSize - 2 || 
                         col <= 1 || col >= this.boardSize - 2;
        
        if (!isNearEdge) {
            return 0;
        }
        
        // Make the move on a temporary board
        const tempBoard = this.makeMove(board, row, col, player);
        
        let bouncePotential = 0;
        
        // Try each diagonal direction
        for (const [dx, dy] of this.diagonalDirections) {
            // Count consecutive pieces in this direction
            const result = this.countInDirection(tempBoard, row, col, dx, dy, player);
            
            // If we have at least 2 pieces in a row and are near an edge
            if (result.count >= 2) {
                // Use BounceUtils to find potential bounce patterns
                const bouncePattern = BounceUtils.findBouncePattern(
                    tempBoard, 
                    row, 
                    col, 
                    player, 
                    this.boardSize, 
                    result.count // Required length - use current count to find any pattern
                );
                
                if (bouncePattern) {
                    // Check for missing teeth if that rule is enabled
                    let hasMissingTeeth = false;
                    if (missingTeethRuleEnabled) {
                        hasMissingTeeth = BounceUtils.hasMissingTeeth(bouncePattern.path);
                    }
                    
                    if (!hasMissingTeeth) {
                        // Calculate potential based on pattern length and number of bounces
                        bouncePotential += bouncePattern.path.length * 10;
                        
                        // Add bonus for each bounce point
                        bouncePotential += bouncePattern.bounceIndices.length * 15;
                        
                        // Add extra bonus for double bounce patterns
                        if (bouncePattern.bounceIndices.length >= 2) {
                            bouncePotential += 30 * this.doubleBounceWeight;
                        }
                    }
                }
            }
        }
        
        // Add bonus for edge/corner positions
        if (this.isInCorner(row, col)) {
            bouncePotential += this.cornerPositionBonus;
        } else if (this.isOnEdge(row, col)) {
            bouncePotential += this.edgePositionBonus;
        }
        
        return bouncePotential;
    }
    
    /**
     * Check if a position is near an edge of the board
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean} - Whether the position is near an edge
     */
    isNearEdge(row, col) {
        return row <= 1 || row >= this.boardSize - 2 || 
               col <= 1 || col >= this.boardSize - 2;
    }
    
    /**
     * Check if a position is on an edge of the board
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean} - Whether the position is on an edge
     */
    isOnEdge(row, col) {
        return row === 0 || row === this.boardSize - 1 || 
               col === 0 || col === this.boardSize - 1;
    }
    
    /**
     * Check if a position is in a corner of the board
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean} - Whether the position is in a corner
     */
    isInCorner(row, col) {
        return (row === 0 || row === this.boardSize - 1) && 
               (col === 0 || col === this.boardSize - 1);
    }
    
    /**
     * Check if a position is adjacent to player's pieces
     * @param {Array} board - Current board state
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {string} player - Player to check for
     * @returns {boolean} - Whether the position is adjacent to player's pieces
     */
    isAdjacentToPlayer(board, row, col, player) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dx, dy] of directions) {
            const adjRow = row + dx;
            const adjCol = col + dy;
            
            if (adjRow >= 0 && adjRow < this.boardSize && 
                adjCol >= 0 && adjCol < this.boardSize) {
                if (board[adjRow][adjCol] === player) {
                    return true;
                }
            }
        }
        
        return false;
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
    
    /**
     * Count consecutive pieces in a direction from a position
     * @param {Array} board - 2D array representing the game board
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Row direction (-1, 0, 1)
     * @param {number} dy - Column direction (-1, 0, 1)
     * @param {string} player - Player marker to count
     * @returns {Object} - Count data { count, openEnds, path }
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
}

export default BouncePatternDetector;