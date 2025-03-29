/**
 * ai.js - Computer player logic for Kalida
 */

class GameAI {
    constructor(boardSize, winChecker) {
        this.boardSize = boardSize;
        this.winChecker = winChecker;
    }
    
    // Get a move based on the difficulty level
    getMove(board, gameMode, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        switch (gameMode) {
            case 'easy':
                return this.getRandomMove(board);
            case 'medium':
                // 50% chance to make a strategic move, 50% chance to make a random move
                return Math.random() < 0.5 ? this.findBestMove(board, player, 1, bounceRuleEnabled, missingTeethRuleEnabled) : this.getRandomMove(board);
            case 'hard':
                return this.findBestMove(board, player, 2, bounceRuleEnabled, missingTeethRuleEnabled);
            case 'extrahard':
                return this.findMinimaxMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
            default:
                return this.getRandomMove(board);
        }
    }

    // Get a random valid move
    getRandomMove(board) {
        const emptyCells = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    emptyCells.push({row, col});
                }
            }
        }
        
        if (emptyCells.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        return emptyCells[randomIndex];
    }

    // Find the best move for the computer using basic heuristics
    findBestMove(board, player, depth, bounceRuleEnabled, missingTeethRuleEnabled) {
        const opponent = player === 'X' ? 'O' : 'X';
        
        // First priority: Win if possible
        const winningMove = this.findWinningMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
        if (winningMove) return winningMove;
        
        // Second priority: Block opponent from winning
        const blockingMove = this.findWinningMove(board, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
        if (blockingMove) return blockingMove;
        
        // If we're at depth 2 (hard difficulty), look for creating opportunities
        if (depth >= 2) {
            // Try to find a move that creates a "fork" (multiple winning paths)
            const forkingMove = this.findForkingMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
            if (forkingMove) return forkingMove;
        }
        
        // If center is empty, take it as it's usually strategically good
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        if (board[centerRow][centerCol] === '') {
            return {row: centerRow, col: centerCol};
        }
        
        // Otherwise, take a random move
        return this.getRandomMove(board);
    }

    // Find a move that would win the game for the specified player
    findWinningMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Make a copy of the board to simulate moves
        const tempBoard = board.map(row => [...row]);
        
        // Try each empty cell
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (tempBoard[row][col] === '') {
                    // Place the player's marker
                    tempBoard[row][col] = player;
                    
                    // Check if this move would win 
                    const winResult = this.winChecker.checkWin(tempBoard, row, col, bounceRuleEnabled, missingTeethRuleEnabled);
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

    // Find a move that creates multiple winning opportunities (a fork)
    findForkingMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Try each empty cell
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    // Check if placing here creates multiple potential winning paths
                    if (this.countPotentialWins(board, row, col, player, bounceRuleEnabled, missingTeethRuleEnabled) >= 2) {
                        return {row, col};
                    }
                }
            }
        }
        
        return null;
    }

    // Count how many potential wins a move would create
    countPotentialWins(board, row, col, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        let potentialWins = 0;
        const tempBoard = board.map(row => [...row]);
        tempBoard[row][col] = player;
        
        // Define directions
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        // Check each direction
        for (const [dx, dy] of directions) {
            // Start counting consecutive pieces and empty spaces
            let count = 1; // Current position
            let emptySpaces = 0;
            let blocked = false;
            let path = [[row, col]]; // Track the path for missing teeth check
            
            // Check in both directions
            for (let dir = -1; dir <= 1; dir += 2) {
                if (dir === 0) continue;
                
                // Look up to 4 positions away
                for (let i = 1; i <= 4; i++) {
                    let newRow = (row + i * dx * dir + this.boardSize) % this.boardSize;
                    let newCol = (col + i * dy * dir + this.boardSize) % this.boardSize;
                    
                    if (tempBoard[newRow][newCol] === player) {
                        count++;
                        path.push([newRow, newCol]);
                    } else if (tempBoard[newRow][newCol] === '') {
                        emptySpaces++;
                    } else {
                        blocked = true;
                        break;
                    }
                }
            }
            
            // If we have 3 or 4 in a row with enough spaces to make 5, it's a potential win
            if (count >= 3 && count + emptySpaces >= 5 && !blocked) {
                // If missing teeth rule is enabled, check if this would create a valid win
                if (missingTeethRuleEnabled) {
                    // Only check for major axes
                    const isMajorAxis = this.winChecker.isMajorAxis(dx, dy, row, col, path);
                    
                    if (!isMajorAxis || !this.winChecker.hasMissingTeeth(tempBoard, path, player)) {
                        potentialWins++;
                    }
                } else {
                    potentialWins++;
                }
            }
        }
        
        // Also check bounce patterns if enabled
        if (bounceRuleEnabled) {
            const diagonalDirections = [
                [1, 1],  // diagonal
                [1, -1]  // anti-diagonal
            ];
            
            for (const [dx, dy] of diagonalDirections) {
                const bounceResults = this.winChecker.checkBounceFromPosition(tempBoard, row, col, dx, dy, player, 4, missingTeethRuleEnabled);
                if (bounceResults.length >= 3) {
                    potentialWins++;
                }
            }
        }
        
        return potentialWins;
    }

    // Find the best move using minimax with alpha-beta pruning
    findMinimaxMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Maximum depth to search (higher = stronger but slower)
        const maxDepth = 3;
        const opponent = player === 'X' ? 'O' : 'X';
        
        let bestScore = -Infinity;
        let bestMove = null;
        
        // Try each possible move
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    // Make the move on a temporary board
                    const tempBoard = board.map(row => [...row]);
                    tempBoard[row][col] = player;
                    
                    // Use minimax to evaluate this move
                    const score = this.minimax(tempBoard, maxDepth, -Infinity, Infinity, false, player, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
                    
                    // Update the best move if this one is better
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = {row, col};
                    }
                }
            }
        }
        
        return bestMove || this.getRandomMove(board);
    }

    // Minimax algorithm with alpha-beta pruning
    minimax(boardState, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Check for terminal states
        const winner = this.winChecker.checkGameWinner(boardState, bounceRuleEnabled, missingTeethRuleEnabled);
        if (winner === aiPlayer) return 1000 + depth; // AI wins
        if (winner === humanPlayer) return -1000 - depth; // Opponent wins
        if (this.isBoardFull(boardState) || depth === 0) return this.evaluateBoard(boardState, aiPlayer, humanPlayer, bounceRuleEnabled, missingTeethRuleEnabled); // Draw or max depth
        
        if (isMaximizing) {
            // AI's turn - trying to maximize score
            let maxEval = -Infinity;
            
            // Try each possible move
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (boardState[row][col] === '') {
                        // Make the move
                        boardState[row][col] = aiPlayer;
                        
                        // Evaluate this move
                        const evalScore = this.minimax(boardState, depth - 1, alpha, beta, false, aiPlayer, humanPlayer, bounceRuleEnabled, missingTeethRuleEnabled);
                        
                        // Undo the move
                        boardState[row][col] = '';
                        
                        // Update best score
                        maxEval = Math.max(maxEval, evalScore);
                        
                        // Alpha-beta pruning
                        alpha = Math.max(alpha, evalScore);
                        if (beta <= alpha) break; // Beta cutoff
                    }
                }
            }
            
            return maxEval;
        } else {
            // Opponent's turn - trying to minimize score
            let minEval = Infinity;
            
            // Try each possible move
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (boardState[row][col] === '') {
                        // Make the move
                        boardState[row][col] = humanPlayer;
                        
                        // Evaluate this move
                        const evalScore = this.minimax(boardState, depth - 1, alpha, beta, true, aiPlayer, humanPlayer, bounceRuleEnabled, missingTeethRuleEnabled);
                        
                        // Undo the move
                        boardState[row][col] = '';
                        
                        // Update best score
                        minEval = Math.min(minEval, evalScore);
                        
                        // Alpha-beta pruning
                        beta = Math.min(beta, evalScore);
                        if (beta <= alpha) break; // Alpha cutoff
                    }
                }
            }
            
            return minEval;
        }
    }

    // Check if the board is full (used by minimax)
    isBoardFull(boardState) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (boardState[row][col] === '') {
                    return false;
                }
            }
        }
        return true;
    }

    // Evaluate the board position (heuristic function)
    evaluateBoard(boardState, aiPlayer, humanPlayer, bounceRuleEnabled, missingTeethRuleEnabled) {
        let score = 0;
        
        // Define directions
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        // Define diagonal directions for bounce evaluation
        const diagonalDirections = [
            [1, 1],  // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        // Check all directions
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (boardState[row][col] !== '') {
                    // For each position that has a marker, check all directions
                    for (const [dx, dy] of directions) {
                        // Check this direction for sequences
                        const sequenceValue = this.evaluateSequence(boardState, row, col, dx, dy, missingTeethRuleEnabled);
                        
                        // Add to score (positive for AI, negative for human)
                        if (boardState[row][col] === aiPlayer) {
                            score += sequenceValue;
                        } else {
                            score -= sequenceValue;
                        }
                    }
                    
                    // Check for bounce sequences if enabled
                    if (bounceRuleEnabled) {
                        // Only check diagonal directions for bounces
                        for (const [dx, dy] of diagonalDirections) {
                            const bounceValue = this.evaluateBounceSequence(boardState, row, col, dx, dy, bounceRuleEnabled, missingTeethRuleEnabled);
                            
                            // Add to score (positive for AI, negative for human)
                            if (boardState[row][col] === aiPlayer) {
                                score += bounceValue;
                            } else {
                                score -= bounceValue;
                            }
                        }
                    }
                }
            }
        }
        
        return score;
    }

    // Evaluate a sequence starting at a position and going in a direction
    evaluateSequence(boardState, row, col, dx, dy, missingTeethRuleEnabled) {
        const player = boardState[row][col];
        let count = 1;
        let openEnds = 0;
        let path = [[row, col]]; // Track the path for missing teeth check
        
        // Check forward
        let forwardOpen = false;
        for (let i = 1; i < 5; i++) {
            const newRow = (row + i * dx + this.boardSize) % this.boardSize;
            const newCol = (col + i * dy + this.boardSize) % this.boardSize;
            
            if (boardState[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else if (boardState[newRow][newCol] === '') {
                forwardOpen = true;
                break;
            } else {
                break;
            }
        }
        
        // Check backward
        let backwardOpen = false;
        for (let i = 1; i < 5; i++) {
            const newRow = (row - i * dx + this.boardSize) % this.boardSize;
            const newCol = (col - i * dy + this.boardSize) % this.boardSize;
            
            if (boardState[newRow][newCol] === player) {
                count++;
                path.push([newRow, newCol]);
            } else if (boardState[newRow][newCol] === '') {
                backwardOpen = true;
                break;
            } else {
                break;
            }
        }
        
        // Count open ends
        if (forwardOpen) openEnds++;
        if (backwardOpen) openEnds++;
        
        // Calculate value based on sequence length and open ends
        let value = 0;
        
        if (count >= 5) {
            // If missing teeth rule is enabled and this is a major axis, check for missing teeth
            if (missingTeethRuleEnabled) {
                const isMajorAxis = this.winChecker.isMajorAxis(dx, dy, row, col, path);
                if (isMajorAxis && this.winChecker.hasMissingTeeth(boardState, path, player)) {
                    // This is not a valid win due to missing teeth
                    value = 50; // Still valuable but not a win
                } else {
                    value = 1000; // Winning sequence
                }
            } else {
                value = 1000; // Winning sequence
            }
        } else if (count === 4 && openEnds >= 1) {
            value = 100; // Four in a row with an open end
        } else if (count === 3 && openEnds === 2) {
            value = 50; // Three in a row with two open ends
        } else if (count === 3 && openEnds === 1) {
            value = 10; // Three in a row with one open end
        } else if (count === 2 && openEnds === 2) {
            value = 5; // Two in a row with two open ends
        }
        
        return value;
    }

    // Evaluate a bounce sequence starting at a position and going in a diagonal direction
    evaluateBounceSequence(boardState, row, col, dx, dy, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Only evaluate if we're using diagonal directions and bounce rule is enabled
        if (!bounceRuleEnabled || (dx === 0 || dy === 0)) return 0;
        
        const player = boardState[row][col];
        
        // Try bounces from this position
        const bounceResults = this.winChecker.checkBounceFromPosition(boardState, row, col, dx, dy, player, 5, missingTeethRuleEnabled);
        
        // Calculate value based on the longest sequence with a bounce
        if (bounceResults.length >= 5) return 1000; // Winning sequence with bounce
        if (bounceResults.length === 4) return 80; // Four in a row with a bounce
        if (bounceResults.length === 3) return 30; // Three in a row with a bounce
        
        return 0; // No significant pattern with bounce
    }
}