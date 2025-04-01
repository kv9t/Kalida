/**
 * AIPlayer.js - Base AI class for Kalida game
 * This is an abstract base class that all AI strategies will extend
 */
class AIPlayer {
    /**
     * Create a new AI player
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules instance
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.moveHistory = []; // Track move history for learning and analysis
        this.name = "Base AI"; // Default name, should be overridden by subclasses
        this.difficultyLevel = 0; // Difficulty level (0-5), should be overridden
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
        // This is an abstract method that should be implemented by subclasses
        throw new Error("Method 'getMove' must be implemented by subclasses");
    }

    /**
     * Record a move in the move history
     * @param {Array} board - Board state before the move
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player who made the move
     */
    recordMove(board, row, col, player) {
        // Create a deep copy of the board to prevent reference issues
        const boardCopy = board.map(row => [...row]);
        
        this.moveHistory.push({
            board: boardCopy,
            move: { row, col },
            player
        });
        
        // Keep history limited to avoid memory issues
        if (this.moveHistory.length > 30) {
            this.moveHistory.shift();
        }
    }

    /**
     * Find a winning move for the specified player
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - Player to find winning move for ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether the bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether the missing teeth rule is enabled
     * @returns {Object|null} - Winning move { row, col } or null if none exists
     */
    findWinningMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        return this.rules.findWinningMove(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
    }

    /**
     * Get all empty positions on the board
     * @param {Array} board - 2D array representing the game board
     * @returns {Array} - Array of positions { row, col }
     */
    getEmptyPositions(board) {
        const positions = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }

    /**
     * Get a random move
     * @param {Array} board - 2D array representing the game board
     * @returns {Object|null} - Random move { row, col } or null if the board is full
     */
    getRandomMove(board) {
        const emptyPositions = this.getEmptyPositions(board);
        
        if (emptyPositions.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * emptyPositions.length);
        return emptyPositions[randomIndex];
    }

    /**
     * Check if the center position is empty and return it if so
     * @param {Array} board - 2D array representing the game board
     * @returns {Object|null} - Center position { row, col } or null if occupied
     */
    getCenterMove(board) {
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        if (board[centerRow][centerCol] === '') {
            return { row: centerRow, col: centerCol };
        }
        
        return null;
    }

    /**
     * Make a move on a copy of the board (without modifying the original)
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Row of the move
     * @param {number} col - Column of the move
     * @param {string} player - Player marker ('X' or 'O')
     * @returns {Array} - New board state after the move
     */
    makeMove(board, row, col, player) {
        // Create a deep copy of the board
        const newBoard = board.map(row => [...row]);
        
        // Make the move
        newBoard[row][col] = player;
        
        return newBoard;
    }

    /**
     * Get adjacent empty positions (next to occupied cells)
     * @param {Array} board - 2D array representing the game board
     * @returns {Array} - Array of positions { row, col }
     */
    getAdjacentEmptyPositions(board) {
        const adjacentPositions = new Set();
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        // Find all filled positions
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    // Check all adjacent directions
                    for (const [dx, dy] of directions) {
                        const newRow = row + dx;
                        const newCol = col + dy;
                        
                        // Check if the position is valid and empty
                        if (
                            newRow >= 0 && newRow < this.boardSize &&
                            newCol >= 0 && newCol < this.boardSize &&
                            board[newRow][newCol] === ''
                        ) {
                            // Use a key to avoid duplicates
                            adjacentPositions.add(`${newRow},${newCol}`);
                        }
                    }
                }
            }
        }
        
        // Convert Set back to array of position objects
        return Array.from(adjacentPositions).map(pos => {
            const [row, col] = pos.split(',').map(Number);
            return { row, col };
        });
    }

    /**
     * Count the number of player pieces in a line from a position in a given direction
     * @param {Array} board - 2D array representing the game board
     * @param {number} row - Starting row
     * @param {number} col - Starting column
     * @param {number} dx - Row direction (-1, 0, 1)
     * @param {number} dy - Column direction (-1, 0, 1)
     * @param {string} player - Player marker to count
     * @returns {Object} - Count details { count, openEnds, emptyPositions }
     */
    countInDirection(board, row, col, dx, dy, player) {
        let count = 1; // Start with the position itself
        let openEnds = 0;
        let emptyPositions = [];
        
        // Check both directions
        for (let dir = -1; dir <= 1; dir += 2) {
            let hasOpenEnd = false;
            
            // Look up to 4 positions away
            for (let i = 1; i <= 4; i++) {
                const newRow = row + i * dx * dir;
                const newCol = col + i * dy * dir;
                
                // Check if the position is valid
                if (
                    newRow >= 0 && newRow < this.boardSize &&
                    newCol >= 0 && newCol < this.boardSize
                ) {
                    if (board[newRow][newCol] === player) {
                        count++;
                    } else if (board[newRow][newCol] === '') {
                        emptyPositions.push({ row: newRow, col: newCol });
                        if (!hasOpenEnd) {
                            openEnds++;
                            hasOpenEnd = true;
                        }
                        break;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        }
        
        return { count, openEnds, emptyPositions };
    }

    /**
     * Get info about the current game state
     * @returns {Object} - Game info with AI details
     */
    getInfo() {
        return {
            name: this.name,
            difficultyLevel: this.difficultyLevel,
            moveHistoryLength: this.moveHistory.length
        };
    }
}