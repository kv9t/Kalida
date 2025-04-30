/**
 * MinimaxSearch.js - Minimax algorithm with alpha-beta pruning
 * 
 * Implements the minimax search algorithm with alpha-beta pruning
 * for finding optimal moves in the Kalida game.
 */
class MinimaxSearch {
    /**
     * Create a new minimax search
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     * @param {BoardEvaluator} evaluator - Board position evaluator
     */
    constructor(boardSize, rules, evaluator) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.evaluator = evaluator;
        
        // Cache for previously evaluated positions
        this.transpositionTable = new Map();
        
        // Move ordering heuristics
        this.moveOrderingCache = new Map();
    }
    
    /**
     * Find the best move using minimax with alpha-beta pruning
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Current player ('X' or 'O')
     * @param {number} depth - Maximum search depth
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Object} - Best move { row, col, score }
     */
    findBestMove(board, player, depth, bounceRuleEnabled = true, missingTeethRuleEnabled = true) {
        // Clear caches for new search
        this.transpositionTable.clear();
        this.moveOrderingCache.clear();
        
        // Get valid moves, sorted by potential
        const validMoves = this.getOrderedMoves(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
        
        let bestMove = null;
        let bestScore = -Infinity;
        const alpha = -Infinity;
        const beta = Infinity;
        
        // Try each move and find the best one
        for (const move of validMoves) {
            // Apply the move
            const newBoard = this.applyMove(board, move.row, move.col, player);
            
            // Calculate score using minimax recursion
            const score = this.minimax(
                newBoard,
                depth - 1,
                alpha,
                beta,
                false,
                player,
                player === 'X' ? 'O' : 'X',
                bounceRuleEnabled,
                missingTeethRuleEnabled
            );
            
            // Update best move if this is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = { row: move.row, col: move.col, score };
            }
        }
        
        return bestMove;
    }
    
    /**
     * Minimax algorithm with alpha-beta pruning
     * @param {Array} board - Current board state
     * @param {number} depth - Remaining search depth
     * @param {number} alpha - Alpha value for pruning
     * @param {number} beta - Beta value for pruning
     * @param {boolean} isMaximizing - Whether current player is maximizing
     * @param {string} originalPlayer - The player who started the search
     * @param {string} currentPlayer - The player for the current move
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {number} - Score for the position
     */
    minimax(
        board, 
        depth, 
        alpha, 
        beta, 
        isMaximizing, 
        originalPlayer, 
        currentPlayer,
        bounceRuleEnabled,
        missingTeethRuleEnabled
    ) {
        // Generate a board hash for the transposition table
        const boardHash = this.hashBoard(board, currentPlayer, isMaximizing);
        
        // Check if we've already evaluated this position
        if (this.transpositionTable.has(boardHash)) {
            return this.transpositionTable.get(boardHash);
        }
        
        // Check for terminal state
        if (depth === 0) {
            const score = this.evaluator.evaluateBoard(
                board, originalPlayer, bounceRuleEnabled, missingTeethRuleEnabled
            );
            this.transpositionTable.set(boardHash, score);
            return score;
        }
        
        // Check for win/loss
        const currentWin = this.checkForWin(board, currentPlayer, bounceRuleEnabled, missingTeethRuleEnabled);
        const opponentWin = this.checkForWin(
            board, 
            currentPlayer === 'X' ? 'O' : 'X', 
            bounceRuleEnabled, 
            missingTeethRuleEnabled
        );
        
        if (currentWin) {
            const score = isMaximizing ? 10000 : -10000;
            this.transpositionTable.set(boardHash, score);
            return score;
        }
        
        if (opponentWin) {
            const score = isMaximizing ? -10000 : 10000;
            this.transpositionTable.set(boardHash, score);
            return score;
        }
        
        // Check for draw (board full)
        if (this.isBoardFull(board)) {
            this.transpositionTable.set(boardHash, 0);
            return 0;
        }
        
        // Get moves in optimal order for better pruning
        const validMoves = this.getOrderedMoves(board, currentPlayer, bounceRuleEnabled, missingTeethRuleEnabled);
        
        if (isMaximizing) {
            let maxScore = -Infinity;
            let newAlpha = alpha;
            
            for (const move of validMoves) {
                // Apply the move
                const newBoard = this.applyMove(board, move.row, move.col, currentPlayer);
                
                // Recursively evaluate position
                const score = this.minimax(
                    newBoard,
                    depth - 1,
                    newAlpha,
                    beta,
                    false,
                    originalPlayer,
                    currentPlayer === 'X' ? 'O' : 'X',
                    bounceRuleEnabled,
                    missingTeethRuleEnabled
                );
                
                maxScore = Math.max(maxScore, score);
                newAlpha = Math.max(newAlpha, score);
                
                // Alpha-beta pruning
                if (beta <= newAlpha) {
                    break;
                }
            }
            
            this.transpositionTable.set(boardHash, maxScore);
            return maxScore;
        } else {
            let minScore = Infinity;
            let newBeta = beta;
            
            for (const move of validMoves) {
                // Apply the move
                const newBoard = this.applyMove(board, move.row, move.col, currentPlayer);
                
                // Recursively evaluate position
                const score = this.minimax(
                    newBoard,
                    depth - 1,
                    alpha,
                    newBeta,
                    true,
                    originalPlayer,
                    currentPlayer === 'X' ? 'O' : 'X',
                    bounceRuleEnabled,
                    missingTeethRuleEnabled
                );
                
                minScore = Math.min(minScore, score);
                newBeta = Math.min(newBeta, score);
                
                // Alpha-beta pruning
                if (newBeta <= alpha) {
                    break;
                }
            }
            
            this.transpositionTable.set(boardHash, minScore);
            return minScore;
        }
    }
    
    /**
     * Check if a player has won
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to check for
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {boolean} - Whether the player has won
     */
    checkForWin(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Iterate through board to find player's pieces
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Check if this piece is part of a winning pattern
                    const result = this.rules.checkWin(
                        board, row, col, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    if (result.winner === player) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Create an order list of valid moves, prioritizing promising moves
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Current player
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of moves with scores
     */
    getOrderedMoves(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        const boardHash = this.hashBoard(board, player, true);
        
        // Check if we've already computed this
        if (this.moveOrderingCache.has(boardHash)) {
            return this.moveOrderingCache.get(boardHash);
        }
        
        const moves = [];
        
        // Use ThreatDetector to find immediate threats
        const threatDetector = new ThreatDetector(this.boardSize, this.rules);
        const threats = threatDetector.detectThreats(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        // Immediate win moves go first
        const winMoves = threats.filter(threat => threat.type === 'win');
        if (winMoves.length > 0) {
            this.moveOrderingCache.set(boardHash, winMoves);
            return winMoves;
        }
        
        // Block moves go second
        const blockMoves = threats.filter(threat => threat.type === 'block');
        if (blockMoves.length > 0) {
            this.moveOrderingCache.set(boardHash, blockMoves);
            return blockMoves;
        }
        
        // Other threat moves
        for (const threat of threats) {
            moves.push({
                row: threat.row,
                col: threat.col,
                score: threat.priority
            });
        }
        
        // Add all other empty cells
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '' && !moves.some(m => m.row === row && m.col === col)) {
                    // Calculate a basic score for move ordering
                    const score = this.getBasicMoveScore(board, row, col, player);
                    moves.push({ row, col, score });
                }
            }
        }
        
        // Sort by score (descending)
        moves.sort((a, b) => b.score - a.score);
        
        // Cache for future use
        this.moveOrderingCache.set(boardHash, moves);
        
        return moves;
    }
    
    /**
     * Get a basic score for a move for ordering purposes
     * @param {Array} board - 2D array representing the board state
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Current player
     * @returns {number} - Basic score for the move
     */
    getBasicMoveScore(board, row, col, player) {
        let score = 0;
        
        // Check for adjacency to existing pieces
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dx, dy] of directions) {
            const newRow = row + dx;
            const newCol = col + dy;
            
            if (newRow >= 0 && newRow < this.boardSize && 
                newCol >= 0 && newCol < this.boardSize) {
                // Adjacent to player's piece is good
                if (board[newRow][newCol] === player) {
                    score += 2;
                }
                // Adjacent to opponent's piece is also good (defensive)
                else if (board[newRow][newCol] !== '') {
                    score += 1;
                }
            }
        }
        
        // Center positions are generally better
        const distanceToCenter = Math.abs(row - this.boardSize / 2) + 
                                Math.abs(col - this.boardSize / 2);
        score += (this.boardSize - distanceToCenter) / 2;
        
        return score;
    }
    
    /**
     * Apply a move to create a new board state
     * @param {Array} board - Current board state
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player making the move
     * @returns {Array} - New board state after the move
     */
    applyMove(board, row, col, player) {
        // Create a deep copy of the board
        const newBoard = board.map(row => [...row]);
        
        // Apply the move
        newBoard[row][col] = player;
        
        return newBoard;
    }
    
    /**
     * Check if the board is full
     * @param {Array} board - 2D array representing the board state
     * @returns {boolean} - Whether the board is full
     */
    isBoardFull(board) {
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
     * Create a hash of the board state for caching
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Current player
     * @param {boolean} isMaximizing - Whether current player is maximizing
     * @returns {string} - Hash of the board state
     */
    hashBoard(board, player, isMaximizing) {
        // Simple string representation of board + current state
        const boardString = board.map(row => row.join('')).join('');
        return `${boardString}|${player}|${isMaximizing ? 'max' : 'min'}`;
    }
}