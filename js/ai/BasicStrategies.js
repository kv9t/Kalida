/**
 * BasicStrategies.js - Simple AI strategies for Kalida game
 * Contains implementations for random, easy, and medium difficulty moves
 */

/**
 * Get a random valid move
 * @param {Array} board - 2D array representing the game board
 * @param {number} boardSize - Size of the game board
 * @returns {Object} - The selected move with row and column coordinates
 */
function getRandomMove(board, boardSize) {
    const emptyCells = [];
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                emptyCells.push({row, col});
            }
        }
    }
    
    if (emptyCells.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[randomIndex];
}

/**
 * Find the best move for the computer using basic heuristics
 * @param {Array} board - 2D array representing the game board
 * @param {string} player - Current player ('X' or 'O')
 * @param {string} opponent - Opponent player ('O' or 'X')
 * @param {number} depth - Depth of search for strategies
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {Object} - The selected move with row and column coordinates
 */
function findBestMove(board, player, opponent, depth, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // First priority: Win if possible
    const winningMove = findWinningMove(board, player, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (winningMove) return winningMove;
    
    // Second priority: Block opponent from winning
    const blockingMove = findWinningMove(board, opponent, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
    if (blockingMove) return blockingMove;
    
    // If we're at depth 2 (hard difficulty), look for creating opportunities
    if (depth >= 2) {
        // Try to find a move that creates a "fork" (multiple winning paths)
        const forkingMove = findForkingMove(board, player, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled);
        if (forkingMove) return forkingMove;
    }
    
    // If center is empty, take it as it's usually strategically good
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    if (board[centerRow][centerCol] === '') {
        return {row: centerRow, col: centerCol};
    }
    
    // Otherwise, take a random move
    return getRandomMove(board, boardSize);
}

/**
 * Find a move that would win the game for the specified player
 * @param {Array} board - 2D array representing the game board
 * @param {string} player - Current player ('X' or 'O')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {Object|null} - The winning move, or null if no winning move is found
 */
function findWinningMove(board, player, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // Make a copy of the board to simulate moves
    const tempBoard = board.map(row => [...row]);
    
    // Try each empty cell
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (tempBoard[row][col] === '') {
                // Place the player's marker
                tempBoard[row][col] = player;
                
                // Check if this move would win 
                const winResult = winChecker.checkWin(tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled);
                if (winResult.winner === player) {
                    return {row, col};
                }
                
                // Reset the cell
                tempBoard[row][col] = '';
            }
        }
    }
    
    return null;
}

/**
 * Find a move that creates multiple winning opportunities (a fork)
 * @param {Array} board - 2D array representing the game board
 * @param {string} player - Current player ('X' or 'O')
 * @param {number} boardSize - Size of the game board
 * @param {Object} winChecker - WinChecker instance for win validation
 * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
 * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
 * @returns {Object|null} - The forking move, or null if no forking move is found
 */
function findForkingMove(board, player, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) {
    // Try each empty cell
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === '') {
                // Check if placing here creates multiple potential winning paths
                if (countPotentialWins(board, row, col, player, boardSize, winChecker, bounceRuleEnabled, missingTeethRuleEnabled) >= 2) {
                    return {row, col};
                }
            }
        }
    }
    
    return null;
}