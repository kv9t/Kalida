/**
 * EvaluationFunctions.js - Board evaluation for the Impossible AI
 * Contains functions for evaluating board positions and sequences
 */

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
        const newRow = row + i * dx;
        const newCol = col + i * dy;
        
        // Stop if we go out of bounds
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
        const newRow = row - i * dx;
        const newCol = col - i * dy;
        
        // Stop if we go out of bounds
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
    
    // Diagonal patterns get extra value
    const isDiagonal = (dx !== 0 && dy !== 0);
    let diagonalMultiplier = isDiagonal ? 1.1 : 1.0; // Slight boost for diagonal patterns
    
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
            value = 200; // Four with both ends open - extremely strong
        } else if (openEnds === 1) {
            value = 120; // Four with one end open - very strong
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
                const checkRow = row + (forwardSpace + 1) * dx;
                const checkCol = col + (forwardSpace + 1) * dy;
                
                if (checkRow >= 0 && checkRow < boardSize && 
                    checkCol >= 0 && checkCol < boardSize && 
                    boardState[checkRow][checkCol] === '') {
                    extraOpenSpaces++;
                }
            }
            
            if (backwardOpen && backwardSpace >= 0) {
                // Check one more space backward
                const checkRow = row - (backwardSpace + 1) * dx;
                const checkCol = col - (backwardSpace + 1) * dy;
                
                if (checkRow >= 0 && checkRow < boardSize && 
                    checkCol >= 0 && checkCol < boardSize && 
                    boardState[checkRow][checkCol] === '') {
                    extraOpenSpaces++;
                }
            }
            
            if (extraOpenSpaces === 2) {
                value = 100; // Three with both ends having extended open space - very strong
            } else if (extraOpenSpaces === 1) {
                value = 80; // Three with one end having extended open space - strong
            } else {
                value = 60; // Three with both ends open - decent
            }
        } else if (openEnds === 1) {
            value = 20; // Three with one open end - moderate
        }
    } else if (count === 2) {
        // Two in a row
        if (openEnds === 2) {
            value = 10; // Two with both ends open - minor
        } else if (openEnds === 1) {
            value = 4; // Two with one open end - very minor
        }
    }
    
    // Early game: give even more value to diagonal threats
    const totalPieces = countPieces(boardState, boardSize);
    if (totalPieces < 10 && isDiagonal) {
        diagonalMultiplier = 1.3; // Even bigger boost in early game
    }
    
    return value * diagonalMultiplier;
}

/**
 * Count threats (potential wins) a move would create
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
                // Use normal calculation without wrapping
                let newRow = row + i * dx * dir;
                let newCol = col + i * dy * dir;
                
                // Out of bounds check
                if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
                    break;
                }
                
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
            // Immediate threat - four in a row with at least one open end
            threats += 10; // Extremely high threat
            
            // Extra value for diagonal threats
            if (dx !== 0 && dy !== 0) {
                threats += 2; // Additional value for diagonal
            }
        } else if (count === 3 && openEnds === 2) {
            // Potential threat - three in a row with both ends open
            threats += 5; // High threat
            
            // Extra value for diagonal threats
            if (dx !== 0 && dy !== 0) {
                threats += 1; // Additional value for diagonal
            }
        } else if (count === 3 && openEnds === 1) {
            // Three in a row with one open end
            threats += 2; // Moderate threat
            
            // Extra value for diagonal threats
            if (dx !== 0 && dy !== 0) {
                threats += 0.5; // Additional value for diagonal
            }
        } else if (count === 2 && openEnds === 2) {
            // Two in a row with both ends open - only count for diagonals
            if (dx !== 0 && dy !== 0) {
                threats += 1; // Minor threat for diagonal pattern
            }
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
            // More accurate bounce potential evaluation
            if (hasPotentialBounceSequence(tempBoard, row, col, dx, dy, player, boardSize)) {
                threats += 3; // Bounce patterns are deceptive and powerful
            }
        }
    }
    
    // Check for being on the main diagonal or anti-diagonal
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    
    // Determine if this position is on a main diagonal
    const isOnMainDiagonal = (row === col);
    const isOnAntiDiagonal = (row + col === boardSize - 1);
    
    // For early game moves - increase value of diagonal positions
    if ((isOnMainDiagonal || isOnAntiDiagonal) && 
        countPieces(tempBoard, boardSize) < 10) {
        threats += 1;
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
            const checkRow = (row + 4 * dx * dir);
            const checkCol = (col + 4 * dy * dir);
            
            // Count consecutive pieces in this direction
            let consecutivePieces = 0;
            for (let i = 1; i <= 3; i++) {
                let newRow = (row + i * dx * dir);
                let newCol = (col + i * dy * dir);
                
                if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && 
                    tempBoard[newRow][newCol] === player) {
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
 * Evaluate the board position with the improved algorithm
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