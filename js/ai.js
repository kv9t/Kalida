/**
 * ai.js - Computer player logic for Kalida (Updated for Missing Teeth rule)
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
                    // Check if this is on a major axis (horizontal, vertical, or great diagonal)
                    if (this.isOnMajorAxis(dx, dy, row, col, path)) {
                        // Check if this is a great diagonal and exempt from missing teeth
                        const isGreatDiagonal = this.isGreatDiagonal(path);
                        
                        // Check for missing teeth in the path (exempt great diagonals)
                        if (!this.checkForMissingTeeth(tempBoard, path, player, dx, dy, isGreatDiagonal)) {
                            potentialWins++;
                        }
                    } else {
                        // Not on a major axis, so missing teeth rule doesn't apply
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
                const bounceResults = this.checkBounceFromPosition(tempBoard, row, col, dx, dy, player, 4, missingTeethRuleEnabled);
                if (bounceResults.length >= 3) {
                    potentialWins++;
                }
            }
        }
        
        return potentialWins;
    }

    // Check if a path is on a major axis (horizontal, vertical, or great diagonal)
    isOnMajorAxis(dx, dy, row, col, path) {
        if (path.length < 3) return false;
        
        // Check if it's horizontal (all cells have the same row)
        const allSameRow = path.every(cell => cell[0] === path[0][0]);
        
        // Check if it's vertical (all cells have the same column)
        const allSameCol = path.every(cell => cell[1] === path[0][1]);
        
        // Check if it's a great diagonal
        const isGreatDiag = this.isGreatDiagonal(path);
        
        return allSameRow || allSameCol || isGreatDiag;
    }
    
    // Check if cells are part of a great diagonal
    isGreatDiagonal(cells) {
        if (cells.length < 3) return false;
        
        // Main great diagonal (A1 to F6): cells where row == col
        const onMainGreatDiagonal = cells.every(cell => cell[0] === cell[1]);
        
        // Anti great diagonal (A6 to F1): cells where row + col = boardSize - 1
        const onAntiGreatDiagonal = cells.every(cell => cell[0] + cell[1] === this.boardSize - 1);
        
        return onMainGreatDiagonal || onAntiGreatDiagonal;
    }
    
    // Check for missing teeth in a line of cells (adapted from WinChecker.checkForMissingTeeth)
    // Added exemptGreatDiagonal parameter to match the WinChecker implementation
    checkForMissingTeeth(board, cells, player, dx, dy, exemptGreatDiagonal = false) {
        // If we're exempting great diagonals and this is a great diagonal, skip the check
        if (exemptGreatDiagonal && this.isGreatDiagonal(cells)) {
            return false; // Return false = no missing teeth found
        }
        
        // Sort cells to find boundaries
        const sortedByRow = [...cells].sort((a, b) => a[0] - b[0]);
        const sortedByCol = [...cells].sort((a, b) => a[1] - b[1]);
        const minRow = sortedByRow[0][0];
        const maxRow = sortedByRow[sortedByRow.length - 1][0];
        const minCol = sortedByCol[0][1];
        const maxCol = sortedByCol[sortedByCol.length - 1][1];
        
        // Create a set of occupied positions for quick lookup
        const occupiedPositions = new Set(cells.map(cell => `${cell[0]},${cell[1]}`));
        
        // Handle different types of lines
        if (dx === 0) { // Horizontal line
            // Check if all positions in the range are occupied
            for (let col = minCol; col <= maxCol; col++) {
                if (!occupiedPositions.has(`${minRow},${col}`)) {
                    return true; // Found a missing tooth
                }
            }
        } else if (dy === 0) { // Vertical line
            // Check if all positions in the range are occupied
            for (let row = minRow; row <= maxRow; row++) {
                if (!occupiedPositions.has(`${row},${minCol}`)) {
                    return true; // Found a missing tooth
                }
            }
        } else if (dx === dy) { // Main diagonal (top-left to bottom-right)
            // Check all positions in this diagonal segment
            for (let i = 0; i <= maxRow - minRow; i++) {
                if (!occupiedPositions.has(`${minRow + i},${minCol + i}`)) {
                    return true; // Found a missing tooth
                }
            }
        } else { // Anti-diagonal (top-right to bottom-left)
            // Check all positions in this anti-diagonal segment
            for (let i = 0; i <= maxRow - minRow; i++) {
                if (!occupiedPositions.has(`${minRow + i},${maxCol - i}`)) {
                    return true; // Found a missing tooth
                }
            }
        }
        
        return false; // No missing teeth found
    }

    // Check for bounce patterns from a specific position (simplified version of WinChecker.checkBounceFromPosition)
    checkBounceFromPosition(board, startRow, startCol, dx, dy, player, targetLength, missingTeethRuleEnabled) {
        // Skip non-diagonal directions
        if (dx === 0 || dy === 0) return { length: 0, path: [], bounceIndex: -1 };
        
        // Start with the current position
        let path = [[startRow, startCol]];
        let length = 1;
        let bounceFound = false;
        let bounceIndex = -1;
        
        // Track all cells in the path to prevent double-counting
        const visitedCells = new Set();
        visitedCells.add(`${startRow},${startCol}`);
        
        // Try both directions from the starting point
        for (let firstDir = -1; firstDir <= 1; firstDir += 2) {
            if (firstDir === 0) continue; // Skip center
            
            // Reset for this direction
            path = [[startRow, startCol]];
            length = 1;
            bounceFound = false;
            bounceIndex = -1;
            visitedCells.clear();
            visitedCells.add(`${startRow},${startCol}`);
            
            // Follow the pattern in the initial direction (without bounce)
            let currentRow = startRow;
            let currentCol = startCol;
            let preBounceSteps = 0;
            
            // Check up to 4 steps in the initial direction
            for (let i = 1; i < 5 && length < targetLength; i++) {
                const newRow = currentRow + firstDir * dx;
                const newCol = currentCol + firstDir * dy;
                
                // If we hit a boundary, this is where we can bounce
                if (newRow < 0 || newRow >= this.boardSize || 
                    newCol < 0 || newCol >= this.boardSize) {
                    bounceFound = true;
                    bounceIndex = path.length - 1;
                    preBounceSteps = i - 1; // Number of steps before the bounce
                    
                    // Calculate bounce direction: flip the appropriate component
                    let bounceDx = dx;
                    let bounceDy = dy;
                    
                    if (newRow < 0 || newRow >= this.boardSize) bounceDx = -dx;
                    if (newCol < 0 || newCol >= this.boardSize) bounceDy = -dy;
                    
                    // Now follow the bounced pattern
                    let bounceRow = currentRow;
                    let bounceCol = currentCol;
                    
                    // Check up to 5-length positions after the bounce
                    for (let j = 1; j < targetLength - preBounceSteps && length < targetLength; j++) {
                        const newBounceRow = bounceRow + firstDir * bounceDx;
                        const newBounceCol = bounceCol + firstDir * bounceDy;
                        
                        // Check if we're still on the board
                        if (newBounceRow < 0 || newBounceRow >= this.boardSize || 
                            newBounceCol < 0 || newBounceCol >= this.boardSize) {
                            break; // Hit another boundary
                        }
                        
                        const bounceCellKey = `${newBounceRow},${newBounceCol}`;
                        
                        // Prevent double-counting cells
                        if (visitedCells.has(bounceCellKey)) {
                            break;
                        }
                        
                        if (board[newBounceRow][newBounceCol] === player) {
                            path.push([newBounceRow, newBounceCol]);
                            visitedCells.add(bounceCellKey);
                            length++;
                            bounceRow = newBounceRow;
                            bounceCol = newBounceCol;
                        } else {
                            break;
                        }
                    }
                    
                    break; // Exit the pre-bounce loop
                }
                
                // Continue in the initial direction if we haven't hit a boundary
                const cellKey = `${newRow},${newCol}`;
                
                if (newRow < 0 || newRow >= this.boardSize || 
                    newCol < 0 || newCol >= this.boardSize) {
                    break;
                }
                
                if (board[newRow][newCol] === player) {
                    path.push([newRow, newCol]);
                    visitedCells.add(cellKey);
                    length++;
                    currentRow = newRow;
                    currentCol = newCol;
                } else {
                    break;
                }
            }
            
            // If we found a valid bounce pattern of the target length
            if (length >= targetLength && bounceFound) {
                // If missing teeth rule is enabled, check for gaps
                if (missingTeethRuleEnabled) {
                    if (this.checkForMissingTeethInBounce(board, path, player)) {
                        continue; // Has missing teeth, not a win
                    }
                }
                
                return { length, path, bounceIndex };
            }
        }
        
        // No valid bounce pattern found
        return { length: 0, path: [], bounceIndex: -1 };
    }
    
    // Check for missing teeth in a bounce pattern (simplified version of WinChecker.checkForMissingTeethInBounce)
    checkForMissingTeethInBounce(board, path, player) {
        if (path.length < 3) return true;
        
        // Check for gaps in the path (missing teeth)
        for (let i = 1; i < path.length; i++) {
            const prev = path[i-1];
            const curr = path[i];
            
            // Calculate the difference (should be 1 step in some direction)
            const rowDiff = Math.abs(curr[0] - prev[0]);
            const colDiff = Math.abs(curr[1] - prev[1]);
            
            // If the step is greater than 1 in any direction, there's a gap
            if (rowDiff > 1 || colDiff > 1) {
                return true; // Found a missing tooth
            }
        }
        
        return false; // No missing teeth found
    }

    // Find the best move using minimax with alpha-beta pruning (optimized for performance)
    findMinimaxMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Reduce depth for complex rule combinations to improve performance
        let maxDepth = 3;
        if (bounceRuleEnabled && missingTeethRuleEnabled) {
            maxDepth = 2; // Reduce depth for complex rule combinations
        }
        
        const opponent = player === 'X' ? 'O' : 'X';
        
        let bestScore = -Infinity;
        let bestMove = null;
        
        // Try winning move first (optimization)
        const winningMove = this.findWinningMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
        if (winningMove) return winningMove;
        
        // Try blocking move next (optimization)
        const blockingMove = this.findWinningMove(board, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
        if (blockingMove) return blockingMove;
        
        // Try center if available (optimization)
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        if (board[centerRow][centerCol] === '') {
            return {row: centerRow, col: centerCol};
        }
        
        // Focus search on cells adjacent to existing pieces (optimization)
        const candidateMoves = this.getPrioritizedMoves(board);
        
        // If we have too many candidate moves, reduce for performance
        const maxCandidates = 10; // Limit to improve performance
        const limitedCandidates = candidateMoves.slice(0, maxCandidates);
        
        // Try each candidate move
        for (const {row, col} of limitedCandidates) {
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
        
        return bestMove || this.getRandomMove(board);
    }
    
    // Get prioritized moves (cells adjacent to existing pieces)
    getPrioritizedMoves(board) {
        const moves = [];
        const seenMoves = new Set(); // Track seen positions to avoid duplicates
        
        // Define adjacent directions (including diagonals)
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        // Find all occupied cells
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    // Look at adjacent cells
                    for (const [dx, dy] of directions) {
                        const newRow = row + dx;
                        const newCol = col + dy;
                        
                        // Check if the adjacent cell is valid and empty
                        if (newRow >= 0 && newRow < this.boardSize && 
                            newCol >= 0 && newCol < this.boardSize && 
                            board[newRow][newCol] === '') {
                            
                            const moveKey = `${newRow},${newCol}`;
                            if (!seenMoves.has(moveKey)) {
                                moves.push({row: newRow, col: newCol});
                                seenMoves.add(moveKey);
                            }
                        }
                    }
                }
            }
        }
        
        // If no adjacent moves found, return all empty cells
        if (moves.length === 0) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (board[row][col] === '') {
                        moves.push({row, col});
                    }
                }
            }
        }
        
        return moves;
    }

    // Minimax algorithm with alpha-beta pruning (optimized)
    minimax(boardState, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer, bounceRuleEnabled, missingTeethRuleEnabled) {
        // Early termination: Check for terminal states
        const winner = this.winChecker.checkGameWinner(boardState, bounceRuleEnabled, missingTeethRuleEnabled);
        if (winner === aiPlayer) return 1000 + depth; // AI wins
        if (winner === humanPlayer) return -1000 - depth; // Opponent wins
        if (this.isBoardFull(boardState) || depth === 0) return this.evaluateBoard(boardState, aiPlayer, humanPlayer, bounceRuleEnabled, missingTeethRuleEnabled); // Draw or max depth
        
        // Performance optimization: use prioritized moves
        const candidateMoves = this.getPrioritizedMoves(boardState);
        
        if (isMaximizing) {
            // AI's turn - trying to maximize score
            let maxEval = -Infinity;
            
            // Try each possible move
            for (const {row, col} of candidateMoves) {
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
            
            return maxEval;
        } else {
            // Opponent's turn - trying to minimize score
            let minEval = Infinity;
            
            // Try each possible move
            for (const {row, col} of candidateMoves) {
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

    // Evaluate the board position (heuristic function) - simplified for performance
    evaluateBoard(boardState, aiPlayer, humanPlayer, bounceRuleEnabled, missingTeethRuleEnabled) {
        let score = 0;
        
        // Define directions
        const directions = [
            [0, 1], // horizontal
            [1, 0], // vertical
            [1, 1], // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        // Performance optimization: Only check a subset of positions
        const positionsToCheck = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (boardState[row][col] !== '') {
                    positionsToCheck.push({row, col});
                }
            }
        }
        
        // If we have too many positions, sample a subset
        const maxPositions = 10; // Limit to improve performance
        let checkPositions = positionsToCheck;
        if (positionsToCheck.length > maxPositions) {
            // Take a random sample
            checkPositions = [];
            const shuffled = [...positionsToCheck].sort(() => 0.5 - Math.random());
            for (let i = 0; i < Math.min(maxPositions, shuffled.length); i++) {
                checkPositions.push(shuffled[i]);
            }
        }
        
        // Check the selected positions
        for (const {row, col} of checkPositions) {
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
            
            // Check for bounce sequences if enabled (but limit for performance)
            if (bounceRuleEnabled && Math.random() < 0.5) { // Only check 50% of the time for performance
                // Only check diagonal directions for bounces
                const diagonalDirections = [
                    [1, 1],  // diagonal
                    [1, -1]  // anti-diagonal
                ];
                
                // Only check one random diagonal direction for performance
                const randomDirIndex = Math.floor(Math.random() * diagonalDirections.length);
                const [dx, dy] = diagonalDirections[randomDirIndex];
                
                const bounceValue = this.evaluateBounceSequence(boardState, row, col, dx, dy, bounceRuleEnabled, missingTeethRuleEnabled);
                
                // Add to score (positive for AI, negative for human)
                if (boardState[row][col] === aiPlayer) {
                    score += bounceValue;
                } else {
                    score -= bounceValue;
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
            // If missing teeth rule is enabled and this is potentially on a major axis, check
            if (missingTeethRuleEnabled) {
                // Check if this is on a major axis
                if (this.isOnMajorAxis(dx, dy, row, col, path)) {
                    // Check if this is a great diagonal (exempt from missing teeth rule)
                    const isGreatDiagonal = this.isGreatDiagonal(path);
                    
                    // Check for missing teeth (exempt great diagonals)
                    if (this.checkForMissingTeeth(boardState, path, player, dx, dy, isGreatDiagonal)) {
                        value = 50; // Still valuable but not a win due to missing teeth
                    } else {
                        value = 1000; // Winning sequence without missing teeth
                    }
                } else {
                    value = 1000; // Winning sequence (not on major axis, so missing teeth rule doesn't apply)
                }
            } else {
                value = 1000; // Winning sequence (missing teeth rule disabled)
            }
        } else if (count === 4 && openEnds >= 1) {
            value = 100; // Four in a row with an open end
            
            // Check for missing teeth in a potential 4-in-a-row
            if (missingTeethRuleEnabled && this.isOnMajorAxis(dx, dy, row, col, path)) {
                // Check if this is a great diagonal (exempt from missing teeth rule)
                const isGreatDiagonal = this.isGreatDiagonal(path);
                
                if (this.checkForMissingTeeth(boardState, path, player, dx, dy, isGreatDiagonal)) {
                    value = 40; // Reduced value due to missing teeth
                }
            } else {
                value = 100; // four in a row without missing teeth
            }
        
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