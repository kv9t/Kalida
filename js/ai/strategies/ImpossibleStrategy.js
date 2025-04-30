/**
 * ImpossibleStrategy.js - Advanced AI strategy for Kalida
 * 
 * This strategy combines minimax, pattern recognition, and advanced
 * heuristics to create an extremely challenging AI opponent.
 */
class ImpossibleStrategy {
    /**
     * Create a new impossible strategy
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        
        // Create components
        this.evaluator = new BoardEvaluator(boardSize, rules);
        this.minimaxSearch = new MinimaxSearch(boardSize, rules, this.evaluator);
        this.threatDetector = new ThreatDetector(boardSize, rules);
        this.patternDetector = new BouncePatternDetector(boardSize, rules);
        this.winTrackGenerator = new WinTrackGenerator(boardSize, rules);
        
        // Maximum search depth (will be adjusted dynamically)
        this.baseSearchDepth = 4; // Reduced from 5 for better performance
        
        // Initialize opening book
        this.openingBook = new OpeningBook(boardSize);
        
        // Track game state
        this.moveCount = 0;
        this.lastMove = null;
        this.playerHistory = { X: [], O: [] };
        
        // Pattern recognition cache
        this.patternCache = new Map();
        
        // Position evaluation cache (for faster re-evaluation)
        this.positionCache = new Map();
        this.cacheTTL = 10; // Cache entries expire after 10 moves
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
        try {
            this.moveCount++;
            const opponent = player === 'X' ? 'O' : 'X';
            
            // Clean up expired cache entries
            this.cleanupCache();
            
            // 1. First priority: Find immediate winning move
            const winningMove = this.findImmediateWin(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
            if (winningMove) {
                console.log("Found immediate winning move");
                this.updatePlayerHistory(winningMove.row, winningMove.col, player);
                return winningMove;
            }
            
            // 2. Second priority: Block opponent's immediate win
            const blockingMove = this.findImmediateWin(board, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
            if (blockingMove) {
                console.log("Found blocking move to prevent opponent win");
                this.updatePlayerHistory(blockingMove.row, blockingMove.col, player);
                return blockingMove;
            }
            
            // 3. Check opening book for early game (first 3 moves)
            if (this.moveCount <= 3) {
                const openingMove = this.openingBook.getMove(board, player, opponent);
                if (openingMove && board[openingMove.row][openingMove.col] === '') {
                    console.log("Using opening book move");
                    this.updatePlayerHistory(openingMove.row, openingMove.col, player);
                    return openingMove;
                }
            }
            
            // 4. Special pattern detection using win tracks for 4-in-a-row and double bounces
            // This helps catch patterns the minimax might miss at lower depths
            const specialPatternMove = this.findSpecialPatternMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
            if (specialPatternMove) {
                console.log("Found special pattern move");
                this.updatePlayerHistory(specialPatternMove.row, specialPatternMove.col, player);
                return specialPatternMove;
            }
            
            // 5. For bounce-enabled games, use pattern detector to find advanced bounce threats
            if (bounceRuleEnabled) {
                const bounceThreats = this.patternDetector.detectThreats(
                    board, player, opponent, missingTeethRuleEnabled
                );
                
                // Take the highest priority bounce threat if available
                if (bounceThreats.length > 0) {
                    bounceThreats.sort((a, b) => b.priority - a.priority);
                    if (bounceThreats[0].priority >= 70) { // Only use high-priority threats
                        const move = { 
                            row: bounceThreats[0].blockingMove?.row || bounceThreats[0].createMove?.row, 
                            col: bounceThreats[0].blockingMove?.col || bounceThreats[0].createMove?.col 
                        };
                        
                        if (typeof move.row === 'number' && typeof move.col === 'number') {
                            console.log("Using bounce pattern threat move");
                            this.updatePlayerHistory(move.row, move.col, player);
                            return move;
                        }
                    }
                }
            }
            
            // 6. Determine appropriate search depth based on game phase
            const searchDepth = this.determineSearchDepth(board);
            
            // 7. Run optimized minimax search with iterative deepening
            const timeLimit = 1000; // 1 second max for thinking (reduced from 1.5s)
            const startTime = Date.now();
            
            // Try iterative deepening to find the best move within time constraints
            let bestMove = null;
            let currentDepth = 2;
            
            while (currentDepth <= searchDepth) {
                console.log(`Running minimax at depth ${currentDepth}...`);
                const move = this.minimaxSearch.findBestMove(
                    board, player, currentDepth, bounceRuleEnabled, missingTeethRuleEnabled
                );
                
                if (move && typeof move.row === 'number' && typeof move.col === 'number') {
                    bestMove = move;
                    console.log(`Depth ${currentDepth} found move: (${move.row}, ${move.col}) with score: ${move.score}`);
                    
                    // Cache this position evaluation
                    const boardKey = this.getBoardKey(board);
                    this.positionCache.set(boardKey, {
                        move: bestMove,
                        depth: currentDepth,
                        expireAt: this.moveCount + this.cacheTTL
                    });
                    
                    // If we found a winning move, no need to search deeper
                    if (move.score > 9000 || move.score < -9000) {
                        break;
                    }
                }
                
                // Check if time limit exceeded
                if (Date.now() - startTime > timeLimit) {
                    console.log(`Time limit reached after depth ${currentDepth}`);
                    break;
                }
                
                currentDepth++;
            }
            
            if (bestMove && typeof bestMove.row === 'number' && typeof bestMove.col === 'number') {
                console.log(`Using minimax move: (${bestMove.row}, ${bestMove.col})`);
                this.updatePlayerHistory(bestMove.row, bestMove.col, player);
                return bestMove;
            }
            
            // 8. Fallback: Get all threat-based moves
            const threats = this.threatDetector.detectThreats(
                board, player, bounceRuleEnabled, missingTeethRuleEnabled
            );
            
            if (threats.length > 0) {
                threats.sort((a, b) => b.priority - a.priority);
                const move = { row: threats[0].row, col: threats[0].col };
                if (typeof move.row === 'number' && typeof move.col === 'number') {
                    console.log("Using threat-based fallback move");
                    this.updatePlayerHistory(move.row, move.col, player);
                    return move;
                }
            }
            
            // 9. Last resort: strategic position selection
            console.log("Using strategic position selection");
            const strategicMove = this.selectStrategicPosition(board, player);
            
            // Safety check for undefined coordinates
            if (!strategicMove || typeof strategicMove.row === 'undefined' || typeof strategicMove.col === 'undefined') {
                console.log("Strategic move selection failed, using fallback");
                // Use a simple fallback to find a valid move
                for (let row = 0; row < this.boardSize; row++) {
                    for (let col = 0; col < this.boardSize; col++) {
                        if (board[row][col] === '') {
                            return { row, col }; // First empty cell
                        }
                    }
                }
            }
            
            this.updatePlayerHistory(strategicMove.row, strategicMove.col, player);
            return strategicMove;
        } catch (error) {
            console.error("Error in ImpossibleStrategy:", error);
            // Fallback to center or random move
            const center = Math.floor(this.boardSize / 2);
            if (board[center][center] === '') {
                return { row: center, col: center };
            }
            // Find any empty cell
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (board[row][col] === '') {
                        return { row, col };
                    }
                }
            }
            // This should never happen (board full)
            return { row: 0, col: 0 };
        }
    }
    
    /**
     * Find an immediate winning move or a move to block opponent's win
     * @param {Array} board - Current board state
     * @param {string} player - Player to find winning move for
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Object|null} - Winning move or null if none found
     */
    findImmediateWin(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        // First check using the rules' built-in function
        const winningMove = this.rules.findWinningMove(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        if (winningMove) {
            return winningMove;
        }
        
        // Check all possible win tracks for 4-in-a-row patterns
        const allTracks = this.winTrackGenerator.generateAllWinTracks(bounceRuleEnabled);
        
        for (const track of allTracks) {
            // Count player markers and empty spots in this track
            let playerCount = 0;
            let emptyCount = 0;
            let emptyPos = null;
            
            for (const [row, col] of track) {
                if (board[row][col] === player) {
                    playerCount++;
                } else if (board[row][col] === '') {
                    emptyCount++;
                    emptyPos = { row, col };
                }
                // If opponent's marker is found, this track can't be a win
                else {
                    emptyPos = null;
                    break;
                }
            }
            
            // If 4 player markers and exactly 1 empty spot, this is a winning move
            if (playerCount === 4 && emptyCount === 1 && emptyPos) {
                // Check for missing teeth if enabled
                if (missingTeethRuleEnabled) {
                    // Create a test board with the potential winning move
                    const testBoard = this.copyBoard(board);
                    testBoard[emptyPos.row][emptyPos.col] = player;
                    
                    // Verify this would actually be a win
                    const result = this.rules.checkWin(
                        testBoard, emptyPos.row, emptyPos.col, bounceRuleEnabled, missingTeethRuleEnabled
                    );
                    
                    if (result.winner === player) {
                        return emptyPos;
                    }
                } else {
                    return emptyPos;
                }
            }
        }
        
        // As a backup, check through threat detector
        const threats = this.threatDetector.detectThreats(
            board, player, bounceRuleEnabled, missingTeethRuleEnabled
        );
        
        const winningThreats = threats.filter(t => t.type === 'win');
        if (winningThreats.length > 0) {
            return { row: winningThreats[0].row, col: winningThreats[0].col };
        }
        
        return null;
    }
    
    /**
     * Find special pattern moves that might be missed by regular minimax
     * This includes double bounce patterns and patterns with complex wrap/bounce combinations
     * @param {Array} board - Current board state
     * @param {string} player - Current player
     * @param {string} opponent - Opponent player
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Object|null} - Special move or null if none found
     */
    findSpecialPatternMove(board, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled) {
        if (!bounceRuleEnabled) return null;
        
        // Look for special "wide-U" and "narrow-U" double bounce patterns
        // These patterns can be missed by standard minimax search at lower depths
        
        // Key patterns to look for:
        // 1. Two pieces diagonally with one bounce point between
        // 2. Three pieces in a bounce configuration
        // 3. Four pieces with one empty spot for a double bounce win
        
        // Look for player pieces near edges (where bounce patterns start)
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Check if this piece is near an edge
                    const isNearEdge = row <= 1 || row >= this.boardSize - 2 || 
                                     col <= 1 || col >= this.boardSize - 2;
                    
                    if (isNearEdge) {
                        // Check each diagonal direction for bounce patterns
                        for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                            // Look for three in a row with a potential bounce
                            let pattern = [];
                            let bounceFound = false;
                            let emptySpot = null;
                            
                            // Start with current piece
                            pattern.push([row, col]);
                            
                            // Try to follow the pattern in this direction
                            let currentRow = row;
                            let currentCol = col;
                            let currentDx = dx;
                            let currentDy = dy;
                            
                            // Check up to 5 steps (max pattern length)
                            for (let step = 1; step < 5; step++) {
                                let nextRow = currentRow + currentDx;
                                let nextCol = currentCol + currentDy;
                                
                                // Check if we hit a boundary (need to bounce)
                                if (nextRow < 0 || nextRow >= this.boardSize || 
                                    nextCol < 0 || nextCol >= this.boardSize) {
                                    bounceFound = true;
                                    
                                    // Calculate bounce direction
                                    if (nextRow < 0 || nextRow >= this.boardSize) {
                                        currentDx = -currentDx;
                                    }
                                    if (nextCol < 0 || nextCol >= this.boardSize) {
                                        currentDy = -currentDy;
                                    }
                                    
                                    // Calculate next position with bounced direction
                                    nextRow = currentRow + currentDx;
                                    nextCol = currentCol + currentDy;
                                }
                                
                                // Check if position is valid
                                if (nextRow >= 0 && nextRow < this.boardSize && 
                                    nextCol >= 0 && nextCol < this.boardSize) {
                                    
                                    if (board[nextRow][nextCol] === player) {
                                        // Add to pattern
                                        pattern.push([nextRow, nextCol]);
                                        currentRow = nextRow;
                                        currentCol = nextCol;
                                    } else if (board[nextRow][nextCol] === '') {
                                        // Found an empty spot - potential move
                                        emptySpot = { row: nextRow, col: nextCol };
                                        break;
                                    } else {
                                        // Opponent's piece blocks the pattern
                                        break;
                                    }
                                } else {
                                    // Hit boundary again (double bounce needed)
                                    break;
                                }
                            }
                            
                            // If we found a good pattern (3+ pieces with bounce and empty spot)
                            if (pattern.length >= 3 && bounceFound && emptySpot) {
                                // Check if this move would create a win
                                const testBoard = this.copyBoard(board);
                                testBoard[emptySpot.row][emptySpot.col] = player;
                                
                                const result = this.rules.checkWin(
                                    testBoard, emptySpot.row, emptySpot.col, 
                                    bounceRuleEnabled, missingTeethRuleEnabled
                                );
                                
                                if (result.winner === player) {
                                    return emptySpot;
                                }
                                
                                // Even if not an immediate win, if pattern has 3+ pieces and a bounce,
                                // it's a strong move to consider
                                if (pattern.length >= 3) {
                                    return emptySpot;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Determine appropriate search depth based on game phase
     * @param {Array} board - Current board state
     * @returns {number} - Appropriate search depth
     */
    determineSearchDepth(board) {
        // Count filled cells to determine game phase
        let filledCells = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    filledCells++;
                }
            }
        }
        
        const totalCells = this.boardSize * this.boardSize;
        const gameProgress = filledCells / totalCells;
        
        // Adjust depth based on game phase - OPTIMIZED for speed
        if (gameProgress < 0.2) {
            // Early game: lower depth for speed
            return 3;
        } else if (gameProgress > 0.7) {
            // Late game: higher depth but not too high
            return 4;
        } else {
            // Mid game: standard depth
            return 3;
        }
    }
    
    /**
     * Select a strategic position when no clear best move is found
     * @param {Array} board - Current board state
     * @param {string} player - Current player
     * @returns {Object} - Strategic move { row, col }
     */
    selectStrategicPosition(board, player) {
        // Prioritize positions that:
        // 1. Are empty
        // 2. Are in the center region if available
        // 3. Have good connectivity to existing pieces
        // 4. Avoid getting boxed in
        
        const emptyCells = [];
        const centerRegion = [
            [1, 1], [1, 2], [1, 3], [1, 4],
            [2, 1], [2, 2], [2, 3], [2, 4],
            [3, 1], [3, 2], [3, 3], [3, 4],
            [4, 1], [4, 2], [4, 3], [4, 4]
        ];
        
        // Rate each empty cell
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    let score = 0;
                    
                    // Check if in center region
                    if (centerRegion.some(([r, c]) => r === row && c === col)) {
                        score += 10;
                    }
                    
                    // Check connectivity to friendly pieces
                    score += this.calculateConnectivity(board, row, col, player);
                    
                    // Calculate board control potential
                    score += this.calculateControlPotential(board, row, col, player);
                    
                    emptyCells.push({ row, col, score });
                }
            }
        }
        
        // Sort by score and take the best
        emptyCells.sort((a, b) => b.score - a.score);
        
        // Return best move, or random if no empty cells (shouldn't happen)
        return emptyCells.length > 0 
            ? { row: emptyCells[0].row, col: emptyCells[0].col }
            : { row: 0, col: 0 };
    }
    
    /**
     * Calculate connectivity score for a position
     * @param {Array} board - Current board state
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @param {string} player - Current player
     * @returns {number} - Connectivity score
     */
    calculateConnectivity(board, row, col, player) {
        let score = 0;
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        // Check surrounding cells
        for (const [dx, dy] of directions) {
            const newRow = (row + dx + this.boardSize) % this.boardSize;
            const newCol = (col + dy + this.boardSize) % this.boardSize;
            
            if (board[newRow][newCol] === player) {
                score += 3; // Adjacent to our piece
            } else if (board[newRow][newCol] === '') {
                score += 1; // Adjacent to empty space (mobility)
            }
        }
        
        return score;
    }
    
    /**
     * Calculate control potential for a position
     * @param {Array} board - Current board state
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @param {string} player - Current player
     * @returns {number} - Control potential score
     */
    calculateControlPotential(board, row, col, player) {
        // Count how many potential win tracks go through this position
        const tracks = this.winTrackGenerator.getWinTracksContainingPosition(row, col, true);
        
        // Score based on how many tracks are still viable
        let viableTracks = 0;
        const opponent = player === 'X' ? 'O' : 'X';
        
        for (const track of tracks) {
            // Check if track has opponent pieces
            const hasOpponent = track.some(([r, c]) => board[r][c] === opponent);
            
            if (!hasOpponent) {
                viableTracks++;
                
                // Bonus for tracks with our pieces already
                const ownPieces = track.filter(([r, c]) => board[r][c] === player).length;
                viableTracks += ownPieces;
            }
        }
        
        return viableTracks * 2;
    }
    
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        // Remove expired entries from position cache
        for (const [key, value] of this.positionCache.entries()) {
            if (value.expireAt < this.moveCount) {
                this.positionCache.delete(key);
            }
        }
    }
    
    /**
     * Generate a unique key for board state
     * @param {Array} board - 2D array representing the board
     * @returns {string} - Unique key
     */
    getBoardKey(board) {
        return board.map(row => row.join('')).join('|');
    }
    
    /**
     * Create a copy of the board
     * @param {Array} board - 2D array representing the board
     * @returns {Array} - Copy of the board
     */
    copyBoard(board) {
        return board.map(row => [...row]);
    }
    
    /**
     * Update player move history
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player making the move
     */
    updatePlayerHistory(row, col, player) {
        // Safety check for undefined values
        if (typeof row === 'undefined' || typeof col === 'undefined') {
            console.error('Attempted to update history with undefined coordinates');
            return;
        }
        
        this.lastMove = { row, col, player };
        this.playerHistory[player].push({ row, col, move: this.moveCount });
    }
}