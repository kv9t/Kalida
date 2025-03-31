/**
 * MinimaxStrategy.js - Advanced AI strategy using minimax algorithm for Kalida game
 */


/**
 * Find the best move using minimax with alpha-beta pruning (optimized for performance)
 * @param {Array} board - 2D array representing the game board
 * @param {string} aiPlayer - Current AI player ('X' or 'O')
 * @param {string} humanPlayer - Opponent player ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {Object} - The selected move with row and column coordinates
 */
function findMinimaxMove(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // Reduce depth for complex rule combinations to improve performance
    let maxDepth = 3;
    if (bounceRuleEnabled && missingTeethRuleEnabled) {
        maxDepth = 2; // Reduce depth for complex rule combinations
    }
    
    let bestScore = -Infinity;
    let bestMove = null;
    
    // Try winning move first (optimization)
    const winningMove = findWinningMove(board, aiPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (winningMove) return winningMove;
    
    // Try blocking move next (optimization)
    const blockingMove = findWinningMove(board, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (blockingMove) return blockingMove;
    
    // Try center if available (optimization)
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    if (board[centerRow][centerCol] === '') {
        return {row: centerRow, col: centerCol};
    }
    
    // Focus search on cells adjacent to existing pieces (optimization)
    const candidateMoves = getPrioritizedMoves(board, boardSize);
    
    // If we have too many candidate moves, reduce for performance
    const maxCandidates = 10; // Limit to improve performance
    const limitedCandidates = candidateMoves.slice(0, maxCandidates);
    
    // Try each candidate move
    for (const {row, col} of limitedCandidates) {
        // Make the move on a temporary board
        const tempBoard = board.map(row => [...row]);
        tempBoard[row][col] = aiPlayer;
        
        // Use minimax to evaluate this move
        const score = minimax(
            tempBoard, 
            maxDepth, 
            -Infinity, 
            Infinity, 
            false, 
            aiPlayer, 
            humanPlayer,
            boardSize, 
            winChecker, 
            bounceRuleEnabled, 
            missingTeethRuleEnabled
        );
        
        // Update the best move if this one is better
        if (score > bestScore) {
            bestScore = score;
            bestMove = {row, col};
        }
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
 * Get prioritized moves (cells adjacent to existing pieces)
 * @param {Array} board - 2D array representing the game board
 * @param {number} boardSize - Size of the game board
 * @returns {Array} - Array of move objects with row and column coordinates
 */
function getPrioritizedMoves(board, boardSize) {
    const moves = [];
    const seenMoves = new Set(); // Track seen positions to avoid duplicates
    
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
                            moves.push({row: newRow, col: newCol});
                            seenMoves.add(moveKey);
                        }
                    }
                }
            }
        }
    }
    
    // If no adjacent moves found, return all empty cells
    if (moves.length === 0) {
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (board[row][col] === '') {
                    moves.push({row, col});
                }
            }
        }
    }
    
    return moves;
}

/**
 * Minimax algorithm with alpha-beta pruning (optimized)
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
 * @returns {number} - The score of the board position
 */
function minimax(boardState, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // Early termination: Check for terminal states
    const winner = winChecker.checkGameWinner(boardState, bounceRuleEnabled, missingTeethRuleEnabled);
    if (winner === aiPlayer) return 1000 + depth; // AI wins
    if (winner === humanPlayer) return -1000 - depth; // Opponent wins
    if (isBoardFull(boardState, boardSize) || depth === 0) {
        return evaluateBoard(boardState, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    }
    
    // Performance optimization: use prioritized moves
    const candidateMoves = getPrioritizedMoves(boardState, boardSize);
    
    if (isMaximizing) {
        // AI's turn - trying to maximize score
        let maxEval = -Infinity;
        
        // Try each possible move
        for (const {row, col} of candidateMoves) {
            // Make the move
            boardState[row][col] = aiPlayer;
            
            // Evaluate this move
            const evalScore = minimax(
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
                missingTeethRuleEnabled
            );
            
            // Undo the move
            boardState[row][col] = '';
            
            // Update best score
            maxEval = Math.max(maxEval, evalScore);
            
            // Alpha-beta pruning
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break; // Beta cutoff
        }
        
        return maxEval;
    } else {
        // Opponent's turn - trying to minimize score
        let minEval = Infinity;
        
        // Try each possible move
        for (const {row, col} of candidateMoves) {
            // Make the move
            boardState[row][col] = humanPlayer;
            
            // Evaluate this move
            const evalScore = minimax(
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
                missingTeethRuleEnabled
            );
            
            // Undo the move
            boardState[row][col] = '';
            
            // Update best score
            minEval = Math.min(minEval, evalScore);
            
            // Alpha-beta pruning
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break; // Alpha cutoff
        }
        
        return minEval;
    }
}

/**
 * Check if the board is full (used by minimax)
 * @param {Array} boardState - 2D array representing the game board
 * @param {number} boardSize - Size of the game board
 * @returns {boolean} - Whether the board is full
 */
function isBoardFull(boardState, boardSize) {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (boardState[row][col] === '') {
                return false;
            }
        }
    }
    return true;
}