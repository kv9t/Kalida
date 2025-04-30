/**
 * HardStrategy.js - Hard difficulty AI strategy
 * 
 * This strategy combines threat detection and basic evaluation
 * to provide a challenging opponent without the computation
 * cost of full minimax search.
 */
class HardStrategy {
    /**
     * Create a new hard strategy
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     * @param {ThreatDetector} threatDetector - Threat detector instance or null
     * @param {BoardEvaluator} evaluator - Board evaluator instance or null
     */
    constructor(boardSize, rules, threatDetector = null, evaluator = null) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.threatDetector = threatDetector || new ThreatDetector(boardSize, rules);
        this.evaluator = evaluator || new BoardEvaluator(boardSize, rules);
        
        // Track game state
        this.moveCount = 0;
        
        // Opening book for first moves
        this.openingBook = [
            { row: 2, col: 2 },
            { row: 2, col: 3 },
            { row: 3, col: 2 },
            { row: 3, col: 3 }
        ];
        
        // Opening responses
        this.openingResponses = new Map();
        this.initializeOpeningResponses();
    }
    
    /**
     * Initialize opening responses for common first moves
     */
    initializeOpeningResponses() {
        // Responses for center and near-center openings
        for (let row = 2; row <= 3; row++) {
            for (let col = 2; col <= 3; col++) {
                this.openingResponses.set(`${row},${col}`, [
                    { row: 5 - row, col: 5 - col }, // Opposite
                    { row: 0, col: 0 }, // Corner
                    { row: 0, col: 5 },
                    { row: 5, col: 0 },
                    { row: 5, col: 5 }
                ]);
            }
        }
        
        // Responses for corner openings
        this.openingResponses.set('0,0', [{ row: 3, col: 3 }, { row: 2, col: 2 }]);
        this.openingResponses.set('0,5', [{ row: 3, col: 2 }, { row: 2, col: 3 }]);
        this.openingResponses.set('5,0', [{ row: 2, col: 3 }, { row: 3, col: 2 }]);
        this.openingResponses.set('5,5', [{ row: 2, col: 2 }, { row: 3, col: 3 }]);
    }
    
    /**
     * Get a move using this strategy
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Current player ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Object} - The selected move { row, col }
     */
    getMove(board, player, bounceRuleEnabled = true, missingTeethRuleEnabled = true) {
        this.moveCount++;
        const opponent = player === 'X' ? 'O' : 'X';
        
        // 1. Use opening book for early game
        if (this.moveCount <= 2) {
            const openingMove = this.getOpeningBookMove(board, player);
            if (openingMove && board[openingMove.row][openingMove.col] === '') {
                return openingMove;
            }
        }
        
        // 2. Check for immediate win
        const winningMove = this.rules.findWinningMove(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        if (winningMove) {
            return winningMove;
        }
        
        // 3. Check for opponent's winning move to block
        const blockingMove = this.rules.findWinningMove(
            board, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        if (blockingMove) {
            return blockingMove;
        }
        
        // 4. Look for threats from the threat detector
        const threats = this.threatDetector.detectThreats(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        // Filter threats by type
        const attackThreats = threats.filter(t => t.type === 'attack' || t.type === 'develop');
        if (attackThreats.length > 0) {
            // Sort by priority and take the highest
            attackThreats.sort((a, b) => b.priority - a.priority);
            return { row: attackThreats[0].row, col: attackThreats[0].col };
        }
        
        // 5. Check for opponent threats to block
        const opponentThreats = this.threatDetector.detectThreats(
            board, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        if (opponentThreats.length > 0) {
            opponentThreats.sort((a, b) => b.priority - a.priority);
            
            // Block the highest priority threat
            if (opponentThreats[0].priority > 50) { // Only block significant threats
                return { row: opponentThreats[0].row, col: opponentThreats[0].col };
            }
        }
        
        // 6. Evaluate all possible moves and select the best
        return this.findBestMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
    }
    
    /**
     * Get a move from the opening book
     * @param {Array} board - Current board state
     * @param {string} player - Current player
     * @returns {Object|null} - Opening move or null if not applicable
     */
    getOpeningBookMove(board, player) {
        // Check if it's the first move (empty board)
        let isEmpty = true;
        let firstPiece = null;
        let pieceCount = 0;
        const opponent = player === 'X' ? 'O' : 'X';
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    isEmpty = false;
                    pieceCount++;
                    
                    if (board[row][col] === opponent) {
                        firstPiece = { row, col };
                    }
                }
            }
        }
        
        if (isEmpty) {
            // First move - select from opening book
            return this.openingBook[Math.floor(Math.random() * this.openingBook.length)];
        } else if (pieceCount === 1 && firstPiece) {
            // Second move - respond to opponent's opening
            const key = `${firstPiece.row},${firstPiece.col}`;
            
            if (this.openingResponses.has(key)) {
                const responses = this.openingResponses.get(key);
                
                // Find first valid response
                for (const move of responses) {
                    if (board[move.row][move.col] === '') {
                        return move;
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Find the best move by evaluating all possibilities
     * @param {Array} board - Current board state
     * @param {string} player - Current player
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Object} - Best move { row, col }
     */
    findBestMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        let bestMove = null;
        let bestScore = -Infinity;
        const opponent = player === 'X' ? 'O' : 'X';
        
        // Consider all empty cells
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    // Make the move
                    const newBoard = this.applyMove(board, row, col, player);
                    
                    // Evaluate the resulting position
                    const score = this.evaluator.evaluateBoard(
                        newBoard, player, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    
                    // Check if this move is better
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { row, col };
                    }
                }
            }
        }
        
        if (bestMove) {
            return bestMove;
        }
        
        // Fallback to random move (shouldn't happen)
        return this.getRandomMove(board);
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
     * Get a random valid move
     * @param {Array} board - Current board state
     * @returns {Object} - Random move { row, col }
     */
    getRandomMove(board) {
        const emptyCells = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            return emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }
        
        console.error('No valid move found in HardStrategy');
        return { row: 0, col: 0 }; // Fallback (should never happen)
    }
}