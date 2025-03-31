/**
 * OpeningStrategy.js - Strategic opening moves for the Impossible AI
 * Contains functions for strategic opening game play
 */

/**
 * Get an optimal opening move (first 2-3 moves)
 * @param {Array} board - 2D array representing the game board
 * @param {string} aiPlayer - Current AI player ('X' or 'O')
 * @param {string} humanPlayer - Opponent player ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @returns {Object} - The selected move with row and column coordinates
 */
function getStrategicOpeningMove(board, aiPlayer, humanPlayer, boardSize) {
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    
    // First move: Always take center if available
    if (board[centerRow][centerCol] === '') {
        return {row: centerRow, col: centerCol};
    }
    
    // Check for early diagonal patterns from the opponent
    // Count human pieces in main diagonal
    let mainDiagonalCount = 0;
    let lastMainDiagonalPiece = {row: -1, col: -1};
    
    for (let i = 0; i < boardSize; i++) {
        if (board[i][i] === humanPlayer) {
            mainDiagonalCount++;
            lastMainDiagonalPiece = {row: i, col: i};
        }
    }
    
    // If opponent has 2 pieces in the main diagonal, block the next position
    if (mainDiagonalCount === 2) {
        // Find the next empty spot in the diagonal
        for (let i = 0; i < boardSize; i++) {
            if (board[i][i] === '') {
                return {row: i, col: i};
            }
        }
    }
    
    // Count human pieces in anti-diagonal
    let antiDiagonalCount = 0;
    let lastAntiDiagonalPiece = {row: -1, col: -1};
    
    for (let i = 0; i < boardSize; i++) {
        if (board[i][boardSize - 1 - i] === humanPlayer) {
            antiDiagonalCount++;
            lastAntiDiagonalPiece = {row: i, col: boardSize - 1 - i};
        }
    }
    
    // If opponent has 2 pieces in the anti-diagonal, block the next position
    if (antiDiagonalCount === 2) {
        // Find the next empty spot in the anti-diagonal
        for (let i = 0; i < boardSize; i++) {
            if (board[i][boardSize - 1 - i] === '') {
                return {row: i, col: boardSize - 1 - i};
            }
        }
    }
    
    // Second move: If opponent took center, take a position 2 steps away
    // This creates better strategic opportunities than just taking an adjacent cell
    const optimalDistance = 2;
    const optimalPositions = [];
    
    // Check for strategically strong positions
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                const rowDist = Math.abs(row - centerRow);
                const colDist = Math.abs(col - centerCol);
                const distance = Math.max(rowDist, colDist);
                
                // Prioritize positions at optimal distance from center
                if (distance === optimalDistance) {
                    optimalPositions.push({row, col});
                }
            }
        }
    }
    
    // If we found optimal positions, randomly select one
    if (optimalPositions.length > 0) {
        const randomIndex = Math.floor(Math.random() * optimalPositions.length);
        return optimalPositions[randomIndex];
    }
    
    // Fall back to any position near the center
    for (let d = 1; d < boardSize; d++) {
        for (let row = Math.max(0, centerRow - d); row <= Math.min(boardSize - 1, centerRow + d); row++) {
            for (let col = Math.max(0, centerCol - d); col <= Math.min(boardSize - 1, centerCol + d); col++) {
                if (board[row][col] === '') {
                    return {row, col};
                }
            }
        }
    }
    
    // Should never reach here, but just in case
    return getRandomMove(board, boardSize);
}

/**
 * Find moves that create advanced threats or block opponent's threats
 * @param {Array} board - 2D array representing the game board
 * @param {string} aiPlayer - Current AI player ('X' or 'O')
 * @param {string} humanPlayer - Opponent player ('O' or 'X')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {Object|null} - The threat move, or null if no threat move is found
 */
function findAdvancedThreatMove(board, aiPlayer, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // Look for double threat opportunities (creating two winning threats in one move)
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                // Check if this move creates multiple threats
                const threatCount = countThreats(board, row, col, aiPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                
                // If it creates multiple threats, this is a powerful move
                if (threatCount >= 2) {
                    return {row, col};
                }
            }
        }
    }
    
    // Look for moves that create "open fours" (four in a row with both ends open)
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                if (createsOpenFour(board, row, col, aiPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled)) {
                    return {row, col};
                }
            }
        }
    }
    
    // Look for moves that block opponent's potential threats
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                const opponentThreatCount = countThreats(board, row, col, humanPlayer, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
                
                // If it blocks multiple threats, this is a necessary defensive move
                if (opponentThreatCount >= 2) {
                    return {row, col};
                }
            }
        }
    }
    
    return null;
}