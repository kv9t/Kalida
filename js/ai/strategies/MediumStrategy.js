/**
 * MediumStrategy.js - Medium difficulty AI strategy
 * 
 * This strategy uses basic threat detection to make somewhat
 * intelligent moves, but isn't as sophisticated as higher levels.
 */
class MediumStrategy {
    /**
     * Create a new medium strategy
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     * @param {ThreatDetector} threatDetector - Threat detector instance or null
     */
    constructor(boardSize, rules, threatDetector = null) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.threatDetector = threatDetector || new ThreatDetector(boardSize, rules);
        
        // For medium difficulty, we'll mostly focus on the center region
        this.centerRegion = this.defineCenterRegion();
        
        // Basic opening book
        this.goodOpeningMoves = [
            { row: 2, col: 2 },
            { row: 2, col: 3 },
            { row: 3, col: 2 },
            { row: 3, col: 3 }
        ];
    }
    
    /**
     * Define the center region (enhanced control area)
     * @returns {Array} - Array of center positions
     */
    defineCenterRegion() {
        const positions = [];
        const centerStart = 1;
        const centerEnd = this.boardSize - 2;
        
        for (let row = centerStart; row <= centerEnd; row++) {
            for (let col = centerStart; col <= centerEnd; col++) {
                positions.push({ row, col });
            }
        }
        
        return positions;
    }
    
    /**
     * Get a move using this strategy
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Current player ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Object} - The selected move { row, col }
     */
    getMove(board, player, bounceRuleEnabled = true, missingTeethRuleEnabled = true, wrapRuleEnabled = true) {
        const opponent = player === 'X' ? 'O' : 'X';
        
        // 1. Check if it's the first move
        if (this.isFirstMove(board)) {
            return this.getOpeningMove(board);
        }
        
        // 2. Check if we can win immediately
        const winningMove = this.rules.findWinningMove(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
        );
        
        if (winningMove) {
            return winningMove;
        }
        
        // 3. Check if opponent can win and block
        const blockingMove = this.rules.findWinningMove(
            board, opponent, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
        );
        
        if (blockingMove) {
            return blockingMove;
        }
        
        // 4. Look for threats
        const threats = this.threatDetector.detectThreats(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled, wrapRuleEnabled
        );
        
        if (threats.length > 0) {
            // Sort threats by priority and take the highest
            threats.sort((a, b) => b.priority - a.priority);
            return { row: threats[0].row, col: threats[0].col };
        }
        
        // 5. Try to place in the center region
        const centerMoves = this.getCenterRegionMoves(board);
        if (centerMoves.length > 0) {
            // 80% chance to choose a center move
            if (Math.random() < 0.8) {
                return centerMoves[Math.floor(Math.random() * centerMoves.length)];
            }
        }
        
        // 6. Fall back to a move that's adjacent to our existing pieces
        const adjacentMove = this.findAdjacentMove(board, player);
        if (adjacentMove) {
            console.log('AI RANDOM MOVE: MediumStrategy - Fall back to an adjacent move');
            return adjacentMove;
        }

        // 7. Last resort: random move
        console.log('AI RANDOM MOVE: MediumStrategy - No better move found, using random fallback');
        return this.getRandomMove(board);
    }
    
    /**
     * Check if it's the first move of the game
     * @param {Array} board - Current board state
     * @returns {boolean} - Whether it's the first move
     */
    isFirstMove(board) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * Get an opening move
     * @param {Array} board - Current board state
     * @returns {Object} - Opening move { row, col }
     */
    getOpeningMove(board) {
        // Randomize from good opening moves
        return this.goodOpeningMoves[
            Math.floor(Math.random() * this.goodOpeningMoves.length)
        ];
    }
    
    /**
     * Get moves in the center region
     * @param {Array} board - Current board state
     * @returns {Array} - Array of available center moves
     */
    getCenterRegionMoves(board) {
        return this.centerRegion.filter(pos => 
            board[pos.row][pos.col] === ''
        );
    }
    
    /**
     * Find a move adjacent to player's existing pieces
     * @param {Array} board - Current board state
     * @param {string} player - Current player
     * @returns {Object|null} - Adjacent move or null if none found
     */
    findAdjacentMove(board, player) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        const adjacentCells = [];
        
        // Find all cells adjacent to player's pieces
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Check adjacent cells
                    for (const [dx, dy] of directions) {
                        const newRow = (row + dx + this.boardSize) % this.boardSize;
                        const newCol = (col + dy + this.boardSize) % this.boardSize;
                        
                        if (board[newRow][newCol] === '') {
                            adjacentCells.push({ row: newRow, col: newCol });
                        }
                    }
                }
            }
        }
        
        // Return a random adjacent cell
        if (adjacentCells.length > 0) {
            return adjacentCells[Math.floor(Math.random() * adjacentCells.length)];
        }
        
        return null;
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
            const randomIndex = Math.floor(Math.random() * emptyCells.length);
            const randomMove = emptyCells[randomIndex];
            console.log(`AI RANDOM MOVE: MediumStrategy falling back to random move at position (${randomMove.row}, ${randomMove.col})`);
            return randomMove;
        }
        
        console.error('No valid move found in MediumStrategy');
        return null;
    }
}