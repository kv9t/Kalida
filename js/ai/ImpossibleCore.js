/**
 * ImpossibleCore.js - Main entry point for the Impossible AI difficulty
 * This is the main file that interacts with GameAI.js
 */

/**
 * Find the best move using enhanced minimax with advanced evaluation
 * @param {Array} board - 2D array representing the game board
 * @param {string} aiPlayer - Current AI player ('X' or 'O')
 * @param {string} humanPlayer - Opponent player ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {Object} - The selected move with row and column coordinates
 */
function findImpossibleMove(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // Early game handling - critical first few moves
    const pieceCount = countPieces(board, boardSize);
    if (pieceCount < 3) {
        return getStrategicOpeningMove(board, aiPlayer, humanPlayer, boardSize);
    }
    
    // Special check for diagonal threats
    const diagonalThreatMove = findDiagonalThreatMove(board, aiPlayer, humanPlayer, boardSize);
    if (diagonalThreatMove) return diagonalThreatMove;
    
    // Try winning move first (optimization)
    const winningMove = findWinningMove(board, aiPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (winningMove) return winningMove;
    
    // Try blocking move next (optimization)
    const blockingMove = findWinningMove(board, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (blockingMove) return blockingMove;
    
    // Check for threat creation or advanced blocking
    const advancedThreatMove = findAdvancedThreatMove(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (advancedThreatMove) return advancedThreatMove;
    
    // Calculate appropriate depth based on game state
    const emptyCells = countEmptyCells(board, boardSize);
    let maxDepth = 3; // Base depth
    
    // Adaptive depth based on game state
    if (emptyCells < 20) {
        maxDepth = 4;
    }
    if (emptyCells < 12) {
        maxDepth = 5;
    }
    if (emptyCells < 8) {
        maxDepth = 6; // Deeper search for endgame
    }
    
    // Reduce depth slightly if complex rules are enabled for performance
    if (bounceRuleEnabled && missingTeethRuleEnabled && boardSize >= 8) {
        maxDepth = Math.max(3, maxDepth - 1);
    }
    
    console.log(`Using minimax with depth ${maxDepth}`);
    
    // Get all possible candidate moves, prioritized by potential
    const candidateMoves = getPrioritizedMovesFull(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    
    // For very early moves, we can limit candidates to save time
    // but for midgame, we need to consider all reasonable options
    const limitedCandidates = pieceCount < 8 ? 
        candidateMoves.slice(0, 15) : 
        candidateMoves;
    
    let bestScore = -Infinity;
    let bestMove = null;
    let alpha = -Infinity;
    let beta = Infinity;
    
    // Try each candidate move
    for (const {row, col, priority} of limitedCandidates) {
        // Make the move on a temporary board
        const tempBoard = board.map(row => [...row]);
        tempBoard[row][col] = aiPlayer;
        
        // Use improved minimax to evaluate this move
        const score = improvedMinimax(
            tempBoard, 
            maxDepth, 
            alpha, 
            beta, 
            false, 
            aiPlayer, 
            humanPlayer,
            boardSize, 
            winChecker, 
            bounceRuleEnabled, 
            missingTeethRuleEnabled,
            -Infinity,
            Infinity,
            {row, col}
        );
        
        // Update the best move if this one is better
        if (score > bestScore) {
            bestScore = score;
            bestMove = {row, col};
        }
        
        // Alpha-beta pruning
        alpha = Math.max(alpha, bestScore);
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