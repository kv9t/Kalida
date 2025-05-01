/**
 * MinimaxStrategy.js - Minimax-based AI strategy for Kalida
 * 
 * This strategy uses minimax with alpha-beta pruning to select moves,
 * with different depth settings based on difficulty.
 */
class MinimaxStrategy {
    /**
     * Create a new minimax strategy
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     * @param {number} difficulty - Difficulty level (1-5)
     */
    constructor(boardSize, rules, difficulty = 3) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.difficulty = difficulty;
        
        // Create the necessary components
        this.evaluator = new BoardEvaluator(boardSize, rules);
        this.minimaxSearch = new MinimaxSearch(boardSize, rules, this.evaluator);
        this.threatDetector = new ThreatDetector(boardSize, rules);
        
        // Set search depth based on difficulty
        this.searchDepth = this.getSearchDepthForDifficulty(difficulty);
        
        // Cache for opening moves
        this.openingBook = new Map();
        this.moveCount = 0;
        
        // Initialize opening book
        this.initializeOpeningBook();
    }
    
    /**
     * Get the search depth based on difficulty level
     * @param {number} difficulty - Difficulty level (1-5)
     * @returns {number} - Search depth
     */
    getSearchDepthForDifficulty(difficulty) {
        switch (difficulty) {
            case 1: return 1;  // Easy
            case 2: return 2;  // Medium
            case 3: return 3;  // Hard
            case 4: return 4;  // Extra Hard
            case 5: return 5;  // Impossible
            default: return 3; // Default to Hard
        }
    }
    
    /**
     * Initialize the opening book with strong first moves
     */
    initializeOpeningBook() {
        // First move: Take center or near-center positions
        const firstMoves = [
            { row: 2, col: 2 }, // Center-adjacent
            { row: 2, col: 3 },
            { row: 3, col: 2 },
            { row: 3, col: 3 },
        ];
        
        this.openingBook.set('first', firstMoves);
        
        // Response moves (simplified, actual implementation would be more comprehensive)
        const responseBook = new Map();
        
        // For example, if opponent took center, take a position two away
        responseBook.set('2,2', [
            { row: 0, col: 0 }, // Corner
            { row: 0, col: 4 },
            { row: 4, col: 0 },
            { row: 4, col: 4 }
        ]);
        
        this.openingBook.set('response', responseBook);
    }
    
    /**
     * Get a move from the opening book
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Current player ('X' or 'O')
     * @returns {Object|null} - Move from opening book or null if not found
     */
    getOpeningBookMove(board, player) {
        // Check if we're in the opening phase (few pieces on board)
        const pieceCount = this.countPieces(board);
        
        if (pieceCount === 0) {
            // First move of the game
            const firstMoves = this.openingBook.get('first');
            return firstMoves[Math.floor(Math.random() * firstMoves.length)];
        } else if (pieceCount === 1) {
            // Response to first move
            const responseBook = this.openingBook.get('response');
            
            // Find opponent's piece
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (board[row][col] !== '' && board[row][col] !== player) {
                        const key = `${row},${col}`;
                        if (responseBook.has(key)) {
                            const responses = responseBook.get(key);
                            return responses[Math.floor(Math.random() * responses.length)];
                        }
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Count pieces on the board
     * @param {Array} board - 2D array representing the board state
     * @returns {number} - Number of pieces on the board
     */
    countPieces(board) {
        let count = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    count++;
                }
            }
        }
        return count;
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
        
        // 1. Check opening book for early game
        if (this.moveCount <= 2) {
            const openingMove = this.getOpeningBookMove(board, player);
            if (openingMove) {
                // Verify the move is valid (empty)
                if (board[openingMove.row][openingMove.col] === '') {
                    console.log("Using opening book move:", openingMove);
                    return openingMove;
                }
            }
        }
        
        // 2. Check for immediate threats first (much faster than minimax)
        const threats = this.threatDetector.detectThreats(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        // If there's a winning move, take it immediately
        const winningMoves = threats.filter(t => t.type === 'win');
        if (winningMoves.length > 0) {
            const winMove = winningMoves[0];
            console.log("Found immediate winning move:", winMove);
            return { row: winMove.row, col: winMove.col };
        }
        
        // If there's a blocking move (prevent opponent win), take it
        const blockingMoves = threats.filter(t => t.type === 'block');
        if (blockingMoves.length > 0) {
            const blockMove = blockingMoves[0];
            console.log("Found blocking move:", blockMove);
            return { row: blockMove.row, col: blockMove.col };
        }
        
        // 3. Use minimax for deeper search
        console.log(`Running minimax search at depth ${this.searchDepth}...`);
        
        // For high difficulty, increase search depth in mid/late game
        let searchDepth = this.searchDepth;
        const pieceCount = this.countPieces(board);
        const emptySpaces = this.boardSize * this.boardSize - pieceCount;
        
        // For impossible difficulty (5), adapt depth based on board state
        if (this.difficulty === 5) {
            if (emptySpaces < 10) {
                searchDepth += 1; // Deeper search in late game
            }
        }
        
        // Limit depth for larger boards to prevent excessive computation
        searchDepth = Math.min(searchDepth, 7);
        
        // Run minimax search
        const bestMove = this.minimaxSearch.findBestMove(
            board, player, searchDepth, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        if (bestMove) {
            console.log(`Minimax selected move: (${bestMove.row}, ${bestMove.col}) with score: ${bestMove.score}`);
            return { row: bestMove.row, col: bestMove.col };
        }
        
        // 4. Fallback to threat-based move
        if (threats.length > 0) {
            threats.sort((a, b) => b.priority - a.priority);
            const move = threats[0];
            console.log("Using threat-based fallback move:", move);
            return { row: move.row, col: move.col };
        }

        // 5. Last resort: random valid move
        console.log("AI RANDOM MOVE: MinimaxStrategy - No good moves found through minimax search or threats, selecting random empty cell");
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
            console.log(`AI RANDOM MOVE: MinimaxStrategy selecting random move at position (${randomMove.row}, ${randomMove.col})`);
            return randomMove;
        }
        
        // Board is full (shouldn't happen)
        console.error("No valid move found on a full board");
        return null;
    }
}