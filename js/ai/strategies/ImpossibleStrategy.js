/**
 * ImpossibleStrategy.js - Implementation of the Impossible AI difficulty
 * This is the most challenging AI with enhanced minimax and pattern recognition
 */
class ImpossibleStrategy extends AIPlayer {
    /**
     * Create a new Impossible Strategy AI
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     * @param {BoardEvaluator} evaluator - Board evaluation utility
     * @param {ThreatDetector} threatDetector - Threat detection utility
     */
    constructor(boardSize, rules, evaluator, threatDetector) {
        super(boardSize, rules);
        this.name = "Impossible AI";
        this.difficultyLevel = 5;
        this.evaluator = evaluator;
        this.threatDetector = threatDetector;
        this.maxDepth = 4; // Higher depth than Extra Hard
        this.useIterativeDeepening = true; // Use iterative deepening for better time management
        this.useThreatSpace = true; // Use threat-space search for faster pruning
        this.useOpening = true; // Use opening book strategies
        this.adaptiveDepth = true; // Adapt search depth based on board complexity
        this.usePatternDatabase = true; // Use pattern database for common positions
        this.positionCache = new Map(); // Cache evaluated positions
        this.maxCacheSize = 10000; // Maximum number of cached positions
    }

    /**
     * Get the next move for the AI player
     * @param {Array} board - Current board state (2D array)
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - The move to make { row, col }
     */
    getMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Record the current board state for analysis
        this.recordBoardState(board);
        
        // Clear cache if it gets too big
        if (this.positionCache.size > this.maxCacheSize) {
            this.positionCache.clear();
        }
        
        // First priority: Win if possible (direct optimization)
        const winningMove = this.findWinningMove(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (winningMove) {
            this.recordMove(board, winningMove.row, winningMove.col, player);
            return winningMove;
        }
        
        // Second priority: Block opponent from winning (direct optimization)
        const blockingMove = this.findWinningMove(
            board, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        if (blockingMove) {
            this.recordMove(board, blockingMove.row, blockingMove.col, player);
            return blockingMove;
        }
        
        // Check opening book for early game
        if (this.useOpening && this.countPieces(board) < 5) {
            const openingMove = this.getOpeningBookMove(board, player, opponent);
            if (openingMove) {
                this.recordMove(board, openingMove.row, openingMove.col, player);
                return openingMove;
            }
        }
        
        // Check for advanced threat patterns
        if (this.useThreatSpace && this.threatDetector) {
            // Look for double-threat creating moves (forcing sequences)
            const threatMove = this.threatDetector.findForcingMove(
                board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
            );
            if (threatMove) {
                this.recordMove(board, threatMove.row, threatMove.col, player);
                return threatMove;
            }
            
            // Look for opponent's double-threats that must be blocked
            const defensiveMove = this.threatDetector.findCriticalDefensiveMove(
                board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
            );
            if (defensiveMove) {
                this.recordMove(board, defensiveMove.row, defensiveMove.col, player);
                return defensiveMove;
            }
        }
        
        // Determine search depth based on game state
        if (this.adaptiveDepth) {
            this.adjustSearchDepth(board, bounceRuleEnabled, missingTeethRuleEnabled);
        }
        
        // Get highly prioritized candidate moves
        const candidateMoves = this.getHighlyPrioritizedMoves(
            board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        // Use iterative deepening if enabled
        if (this.useIterativeDeepening) {
            return this.iterativeDeepeningSearch(
                board, player, opponent, candidateMoves, bounceRuleEnabled, missingTeethRuleEnabled
            );
        } else {
            return this.standardMinimaxSearch(
                board, player, opponent, candidateMoves, bounceRuleEnabled, missingTeethRuleEnabled
            );
        }
    }
    
    /**
     * Record the current board state for analysis
     * @param {Array} board - Current board state
     */
    recordBoardState(board) {
        // Make a deep copy to avoid reference issues
        this.currentBoardState = board.map(row => [...row]);
    }
    
    /**
     * Count the number of pieces on the board
     * @param {Array} board - 2D array representing the game board
     * @returns {number} - Number of pieces
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
     * Get a move from the opening book
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object|null} - Opening move { row, col } or null if none found
     */
    getOpeningBookMove(board, player, opponent) {
        const pieceCount = this.countPieces(board);
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        // First move: Always take center if available
        if (pieceCount === 0 || (pieceCount === 1 && board[centerRow][centerCol] === '')) {
            return { row: centerRow, col: centerCol };
        }
        
        // Second move: If opponent took center, take a corner
        if (pieceCount === 1 && board[centerRow][centerCol] === opponent) {
            const corners = [
                { row: 0, col: 0 },
                { row: 0, col: this.boardSize - 1 },
                { row: this.boardSize - 1, col: 0 },
                { row: this.boardSize - 1, col: this.boardSize - 1 }
            ];
            
            // Pick a random corner
            const randomIndex = Math.floor(Math.random() * corners.length);
            return corners[randomIndex];
        }
        
        // If AI has center, play strategically around it
        if (board[centerRow][centerCol] === player && pieceCount <= 3) {
            // Look for opponent's pieces
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (board[row][col] === opponent) {
                        // Play opposite from opponent's move for good board control
                        const offsetRow = 2 * centerRow - row;
                        const offsetCol = 2 * centerCol - col;
                        
                        // Make sure it's a valid position
                        if (
                            offsetRow >= 0 && offsetRow < this.boardSize &&
                            offsetCol >= 0 && offsetCol < this.boardSize &&
                            board[offsetRow][offsetCol] === ''
                        ) {
                            return { row: offsetRow, col: offsetCol };
                        }
                    }
                }
            }
            
            // If opponent hasn't moved or offset position is taken, pick a good position
            const goodPositions = [
                { row: centerRow - 1, col: centerCol },
                { row: centerRow + 1, col: centerCol },
                { row: centerRow, col: centerCol - 1 },
                { row: centerRow, col: centerCol + 1 }
            ].filter(pos => {
                const { row, col } = pos;
                return row >= 0 && row < this.boardSize && 
                       col >= 0 && col < this.boardSize &&
                       board[row][col] === '';
            });
            
            if (goodPositions.length > 0) {
                const randomIndex = Math.floor(Math.random() * goodPositions.length);
                return goodPositions[randomIndex];
            }
        }
        
        // Special pattern: If we have two in a row, try to extend the sequence
        const extendSequenceMove = this.findExtendSequenceMove(board, player);
        if (extendSequenceMove) {
            return extendSequenceMove;
        }
        
        return null; // No opening book move found
    }
    
    /**
     * Find a move that extends an existing two-in-a-row sequence
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - AI player marker ('X' or 'O')
     * @returns {Object|null} - Move to extend sequence { row, col } or null if none found
     */
    findExtendSequenceMove(board, player) {
        // Define directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        const sequences = [];
        
        // Find all two-in-a-row sequences
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Check each direction
                    for (const [dx, dy] of directions) {
                        const result = this.countInDirection(board, row, col, dx, dy, player);
                        
                        // If we have exactly 2 in a row with at least one open end
                        if (result.count === 2 && result.openEnds >= 1 && result.emptyPositions.length > 0) {
                            // Add the sequence with its empty positions
                            sequences.push({
                                startRow: row,
                                startCol: col,
                                emptyPositions: result.emptyPositions,
                                openEnds: result.openEnds
                            });
                        }
                    }
                }
            }
        }
        
        // Sort sequences by number of open ends (prefer double-open sequences)
        sequences.sort((a, b) => b.openEnds - a.openEnds);
        
        // Select the best sequence to extend
        if (sequences.length > 0) {
            const sequence = sequences[0];
            // Pick the first empty position to extend
            return sequence.emptyPositions[0];
        }
        
        return null;
    }
    
    /**
     * Adjust search depth based on game state
     * @param {Array} board - Current board state
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     */
    adjustSearchDepth(board, bounceRuleEnabled, missingTeethRuleEnabled) {
        const pieceCount = this.countPieces(board);
        const totalCells = this.boardSize * this.boardSize;
        const emptyCount = totalCells - pieceCount;
        
        // Calculate board complexity based on pattern density
        let complexity = 0;
        
        // Check for threatened winning patterns
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    // Count near-win patterns
                    const directions = [
                        [0, 1], // horizontal
                        [1, 0], // vertical
                        [1, 1], // diagonal
                        [1, -1]  // anti-diagonal
                    ];
                    
                    for (const [dx, dy] of directions) {
                        const result = this.countInDirection(
                            board, row, col, dx, dy, board[row][col]
                        );
                        
                        // Increase complexity for near-win patterns
                        if (result.count >= 3 && result.openEnds >= 1) {
                            complexity += 2;
                        }
                    }
                }
            }
        }
        
        // Adjust depth based on stage and complexity
        if (emptyCount >= 30 || complexity < 3) {
            // Early game or simple position - lower depth
            this.maxDepth = 3;
        } else if (emptyCount >= 20 || complexity < 6) {
            // Mid game or moderate complexity - standard depth
            this.maxDepth = 4;
        } else if (emptyCount >= 10) {
            // Late mid-game or complex position - higher depth
            this.maxDepth = 5;
        } else {
            // End game or very complex position - maximum depth
            this.maxDepth = 6;
        }
        
        // Reduce depth if complex rules are enabled
        if (bounceRuleEnabled && missingTeethRuleEnabled && this.boardSize >= 8) {
            this.maxDepth = Math.max(3, this.maxDepth - 1);
        }
    }
    
    /**
     * Get highly prioritized candidate moves
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Array} - Array of moves { row, col, priority }
     */
    getHighlyPrioritizedMoves(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        const moves = [];
        const seenMoves = new Set(); // To avoid duplicates
        
        // First collect moves adjacent to existing pieces
        const adjacentMoves = this.getAdjacentEmptyPositions(board);
        
        // Calculate priorities for adjacent moves
        for (const { row, col } of adjacentMoves) {
            const moveKey = `${row},${col}`;
            if (!seenMoves.has(moveKey)) {
                seenMoves.add(moveKey);
                
                // Calculate priority score
                let priority = 100; // Base priority for adjacent moves
                
                // Use threat detector if available
                if (this.threatDetector) {
                    // Add threat evaluation
                    const threatInfo = this.threatDetector.evaluatePosition(
                        board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    
                    priority += threatInfo.offensiveScore; // Offensive potential
                    priority += threatInfo.defensiveScore; // Defensive value
                    
                    // Add diagonal threat bonus
                    priority += threatInfo.diagonalThreatBonus;
                } else {
                    // Fallback simpler evaluation
                    // Check for potential threats
                    const aiThreats = this.countPotentialThreats(
                        board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    const humanThreats = this.countPotentialThreats(
                        board, row, col, opponent, player, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    
                    priority += aiThreats * 50; // Offensive value
                    priority += humanThreats * 40; // Defensive value
                }
                
                // Check distance from center (center control is valuable)
                const centerRow = Math.floor(this.boardSize / 2);
                const centerCol = Math.floor(this.boardSize / 2);
                const distanceFromCenter = Math.sqrt(
                    Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
                );
                
                // Closer to center is better
                priority += Math.max(0, 20 - distanceFromCenter * 5);
                
                moves.push({ row, col, priority });
            }
        }
        
        // If we have fewer than 10 moves, add some non-adjacent moves
        if (moves.length < 10) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    const moveKey = `${row},${col}`;
                    
                    if (board[row][col] === '' && !seenMoves.has(moveKey)) {
                        seenMoves.add(moveKey);
                        
                        // Calculate priority (lower for non-adjacent moves)
                        let priority = 50;
                        
                        // Check distance from center
                        const centerRow = Math.floor(this.boardSize / 2);
                        const centerCol = Math.floor(this.boardSize / 2);
                        const distanceFromCenter = Math.sqrt(
                            Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
                        );
                        
                        // Closer to center is better
                        priority += Math.max(0, 20 - distanceFromCenter * 5);
                        
                        moves.push({ row, col, priority });
                    }
                }
            }
        }
        
        // Sort by priority (highest first)
        moves.sort((a, b) => b.priority - a.priority);
        
        return moves;
    }
    
    /**
     * Count potential threats a move creates or blocks
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player to evaluate for
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {number} - Threat score
     */
    countPotentialThreats(board, row, col, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Make a copy of the board with the move applied
        const tempBoard = this.makeMove(board, row, col, player);
        
        // Define directions to check
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        let threatScore = 0;
        
        // Check each direction
        for (const [dx, dy] of directions) {
            // Evaluate the sequence
            const result = this.countInDirection(tempBoard, row, col, dx, dy, player);
            
            // Score based on count and open ends
            if (result.count >= 4 && result.openEnds >= 1) {
                threatScore += 100; // Near win
            } else if (result.count === 3 && result.openEnds === 2) {
                threatScore += 50; // Strong threat (double-sided)
            } else if (result.count === 3 && result.openEnds === 1) {
                threatScore += 10; // Moderate threat (single-sided)
            } else if (result.count === 2 && result.openEnds === 2) {
                threatScore += 5; // Developing position
            }
        }
        
        // Check for bounce patterns if enabled
        if (bounceRuleEnabled) {
            // Check diagonal directions for bounce potential
            const diagonalDirections = [
                [1, 1],  // diagonal
                [1, -1]  // anti-diagonal
            ];
            
            for (const [dx, dy] of diagonalDirections) {
                // Check if position is near an edge (where bounce is possible)
                const isNearEdge = 
                    row <= 1 || row >= this.boardSize - 2 || 
                    col <= 1 || col >= this.boardSize - 2;
                
                if (isNearEdge) {
                    // Check for player pieces in this direction
                    const result = this.countInDirection(tempBoard, row, col, dx, dy, player);
                    
                    // Add threat score for pieces near an edge
                    if (result.count >= 3) {
                        threatScore += 20; // Potential bounce pattern
                    }
                }
            }
        }
        
        return threatScore;
    }
    
    /**
     * Perform iterative deepening search to find the best move
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {Array} candidateMoves - Prioritized candidate moves
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - Best move { row, col }
     */
    iterativeDeepeningSearch(board, player, opponent, candidateMoves, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Start with a simple 1-ply search
        let currentDepth = 1;
        let bestMove = null;
        let lastCompletedDepth = 0;
        
        // Use a time limit of ~250ms for the search
        const startTime = Date.now();
        const timeLimit = 250; // milliseconds
        
        while (currentDepth <= this.maxDepth) {
            // Get the best move at the current depth
            const result = this.depthLimitedSearch(
                board, player, opponent, candidateMoves, currentDepth, 
                bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            // Update best move if we completed this depth
            if (result.completed) {
                bestMove = result.move;
                lastCompletedDepth = currentDepth;
            }
            
            // Check if we've used up our time budget
            if (Date.now() - startTime > timeLimit) {
                break;
            }
            
            // Increment depth for next iteration
            currentDepth++;
        }
        
        // If we didn't complete any depth, use the highest priority move
        if (lastCompletedDepth === 0 && candidateMoves.length > 0) {
            bestMove = {
                row: candidateMoves[0].row,
                col: candidateMoves[0].col
            };
        }
        
        // Record the selected move
        if (bestMove) {
            this.recordMove(board, bestMove.row, bestMove.col, player);
        }
        
        return bestMove;
    }
    
    /**
     * Perform a depth-limited minimax search
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {Array} candidateMoves - Prioritized candidate moves
     * @param {number} depth - Maximum search depth
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - Search result { move, score, completed }
     */
    depthLimitedSearch(board, player, opponent, candidateMoves, depth, bounceRuleEnabled, missingTeethRuleEnabled) {
        let bestScore = -Infinity;
        let bestMove = null;
        let completed = true;
        
        // Alpha-beta pruning parameters
        let alpha = -Infinity;
        let beta = Infinity;
        
        // Use time limit to ensure we don't run too long
        const startTime = Date.now();
        const moveTimeLimit = 200; // milliseconds
        
        // Try each candidate move
        for (let i = 0; i < candidateMoves.length; i++) {
            const { row, col } = candidateMoves[i];
            
            // Make the move on a temporary board
            const tempBoard = this.makeMove(board, row, col, player);
            
            // Check if this is a winning move (optimization)
            const result = this.rules.checkWin(
                tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            if (result.winner === player) {
                // Immediate win - no need to search deeper
                return { 
                    move: { row, col }, 
                    score: 1000, 
                    completed: true 
                };
            }
            
            // Use minimax to evaluate this move
            const score = this.enhancedMinimax(
                tempBoard,
                depth,
                alpha,
                beta,
                false, // Minimizing player's turn next
                player,
                opponent,
                bounceRuleEnabled,
                missingTeethRuleEnabled,
                { row, col }
            );
            
            // Update best move if this one is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = { row, col };
            }
            
            // Update alpha for pruning
            alpha = Math.max(alpha, bestScore);
            
            // Check if we've used up our time budget
            if (Date.now() - startTime > moveTimeLimit) {
                // Mark as incomplete if we couldn't evaluate all moves
                if (i < candidateMoves.length - 1) {
                    completed = false;
                }
                break;
            }
        }
        
        return { 
            move: bestMove, 
            score: bestScore, 
            completed 
        };
    }
    
    /**
     * Perform a standard minimax search (without iterative deepening)
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {Array} candidateMoves - Prioritized candidate moves
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object} - Best move { row, col }
     */
    standardMinimaxSearch(board, player, opponent, candidateMoves, bounceRuleEnabled, missingTeethRuleEnabled) {
        let bestScore = -Infinity;
        let bestMove = null;
        
        // Alpha-beta pruning parameters
        let alpha = -Infinity;
        let beta = Infinity;
        
        // Limit the number of candidate moves for performance
        const movesToConsider = Math.min(15, candidateMoves.length);
        
        // Try each candidate move
        for (let i = 0; i < movesToConsider; i++) {
            const { row, col } = candidateMoves[i];
            
            // Make the move on a temporary board
            const tempBoard = this.makeMove(board, row, col, player);
            
            // Check if this is a winning move (optimization)
            const result = this.rules.checkWin(
                tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            if (result.winner === player) {
                // Immediate win - no need to search deeper
                return { row, col };
            }
            
            // Use minimax to evaluate this move
            const score = this.enhancedMinimax(
                tempBoard,
                this.maxDepth,
                alpha,
                beta,
                false, // Minimizing player's turn next
                player,
                opponent,
                bounceRuleEnabled,
                missingTeethRuleEnabled,
                { row, col }
            );
            
            // Update best move if this one is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = { row, col };
            }
            
            // Update alpha for pruning
            alpha = Math.max(alpha, bestScore);
        }
        
        // If we couldn't find a move, pick the highest priority one
        if (!bestMove && candidateMoves.length > 0) {
            bestMove = {
                row: candidateMoves[0].row,
                col: candidateMoves[0].col
            };
        }
        
        // Record the selected move
        if (bestMove) {
            this.recordMove(board, bestMove.row, bestMove.col, player);
        }
        
        return bestMove;
    }
    
    /**
     * Enhanced minimax with various optimizations
     * @param {Array} board - Current board state
     * @param {number} depth - Remaining depth
     * @param {number} alpha - Alpha value for pruning
     * @param {number} beta - Beta value for pruning
     * @param {boolean} isMaximizing - Whether this is a maximizing node
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @param {Object} lastMove - Last move made { row, col }
     * @returns {number} - Evaluation score
     */
    enhancedMinimax(board, depth, alpha, beta, isMaximizing, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, lastMove) {
        // Generate a key for caching
        const boardKey = this.getBoardKey(board, isMaximizing, depth);
        
        // Check cache
        if (this.positionCache.has(boardKey)) {
            return this.positionCache.get(boardKey);
        }
        
        // Terminal conditions
        if (depth === 0) {
            const score = this.evaluator.evaluateBoard(
                board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled, lastMove
            );
            this.positionCache.set(boardKey, score);
            return score;
        }
        
        // Check for game-ending states
        if (lastMove) {
            const { row, col } = lastMove;
            const currentPlayer = isMaximizing ? opponent : player;
            
            // Check if the last move resulted in a win
            const result = this.rules.checkWin(
                board, row, col, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            if (result.winner) {
                const score = result.winner === player ? 1000 + depth : -1000 - depth;
                this.positionCache.set(boardKey, score);
                return score;
            }
        }
        
        // Check if the board is full (draw)
        if (this.getEmptyPositions(board).length === 0) {
            this.positionCache.set(boardKey, 0);
            return 0;
        }
        
        // Get prioritized moves
        const currentPlayer = isMaximizing ? player : opponent;
        const nextPlayer = isMaximizing ? opponent : player;
        
        const moves = this.getPrioritizedMovesForMinimax(
            board, currentPlayer, nextPlayer, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        // Limit moves to consider for performance
        const movesToConsider = depth >= 4 ? Math.min(7, moves.length) : moves.length;
        
        if (isMaximizing) {
            // Maximizing player (AI)
            let maxEval = -Infinity;
            
            for (let i = 0; i < movesToConsider; i++) {
                const { row, col } = moves[i];
                
                // Make the move
                const tempBoard = this.makeMove(board, row, col, player);
                
                // Recursively evaluate
                const evalScore = this.enhancedMinimax(
                    tempBoard, depth - 1, alpha, beta, false, player, opponent, 
                    bounceRuleEnabled, missingTeethRuleEnabled, { row, col }
                );
                
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            
            // Cache the result
            this.positionCache.set(boardKey, maxEval);
            return maxEval;
        } else {
            // Minimizing player (opponent)
            let minEval = Infinity;
            
            for (let i = 0; i < movesToConsider; i++) {
                const { row, col } = moves[i];
                
                // Make the move
                const tempBoard = this.makeMove(board, row, col, opponent);
                
                // Recursively evaluate
                const evalScore = this.enhancedMinimax(
                    tempBoard, depth - 1, alpha, beta, true, player, opponent,
                    bounceRuleEnabled, missingTeethRuleEnabled, { row, col }
                );
                
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
            
            // Cache the result
            this.positionCache.set(boardKey, minEval);
            return minEval;
        }
    }
    
    /**
     * Get prioritized moves for minimax (different from top-level move selection)
     * @param {Array} board - 2D array representing the game board
     * @param {string} currentPlayer - Current player
     * @param {string} nextPlayer - Next player
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Array} - Array of moves { row, col }
     */
    getPrioritizedMovesForMinimax(board, currentPlayer, nextPlayer, bounceRuleEnabled, missingTeethRuleEnabled) {
        // For performance, focus on adjacent positions
        let moves = this.getAdjacentEmptyPositions(board);
        
        // If no adjacent positions, get all empty positions
        if (moves.length === 0) {
            moves = this.getEmptyPositions(board);
        }
        
        // Simple prioritization for move ordering
        return moves.map(move => {
            const { row, col } = move;
            
            // Make the move on a copy of the board
            const tempBoard = this.makeMove(board, row, col, currentPlayer);
            
            // Check if it's a winning move (highest priority)
            const result = this.rules.checkWin(
                tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            let priority = 0;
            
            if (result.winner === currentPlayer) {
                priority = 1000; // Winning move
            } else {
                // Simple threat counting
                const threatCount = this.countInDirection(
                    tempBoard, row, col, 1, 1, currentPlayer
                ).count +
                this.countInDirection(
                    tempBoard, row, col, 1, 0, currentPlayer
                ).count +
                this.countInDirection(
                    tempBoard, row, col, 0, 1, currentPlayer
                ).count +
                this.countInDirection(
                    tempBoard, row, col, 1, -1, currentPlayer
                ).count;
                
                priority = threatCount * 10;
                
                // Center proximity bonus
                const centerRow = Math.floor(this.boardSize / 2);
                const centerCol = Math.floor(this.boardSize / 2);
                const distanceFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
                priority += Math.max(0, 8 - distanceFromCenter);
            }
            
            return { row, col, priority };
        }).sort((a, b) => b.priority - a.priority);
    }
    
    /**
     * Generate a unique key for a board state (for caching)
     * @param {Array} board - 2D array representing the game board
     * @param {boolean} isMaximizing - Whether this is a maximizing node
     * @param {number} depth - Current search depth
     * @returns {string} - Unique key
     */
    getBoardKey(board, isMaximizing, depth) {
        // Generate a string representation of the board
        const boardString = board.map(row => row.join('')).join('|');
        return `${boardString}:${isMaximizing ? 'max' : 'min'}:${depth}`;
    }
}