/**
 * Board.js - Manages the board state for the Kalida game
 * 
 * Manages the game board state with methods for making moves,
 * checking positions, and getting board information.
 * 
 * 
 */
class Board {
    /**
     * Create a new board
     * @param {number} size - Size of the board (e.g., 6 for a 6x6 board)
     */
    constructor(size) {
        this.size = size;
        this.state = this.createEmptyBoard();
        this.lastMove = null;
    }

    /**
     * Create an empty board
     * @returns {Array} - 2D array representing an empty board
     */
    createEmptyBoard() {
        return Array(this.size).fill().map(() => Array(this.size).fill(''));
    }

    /**
     * Reset the board to its initial empty state
     */
    reset() {
        this.state = this.createEmptyBoard();
        this.lastMove = null;
    }

    /**
     * Make a move on the board
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {string} player - Player marker ('X' or 'O')
     * @returns {boolean} - Whether the move was successful
     */
    makeMove(row, col, player) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
            return false; // Invalid position
        }
        
        if (this.state[row][col] !== '') {
            return false; // Cell already occupied
        }
        
        this.state[row][col] = player;
        this.lastMove = { row, col, player };
        return true;
    }

    /**
     * Get the value at a specific position
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {string} - Value at the position ('X', 'O', or '')
     */
    getValueAt(row, col) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
            return null; // Invalid position
        }
        return this.state[row][col];
    }

    /**
     * Check if a position is empty
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean} - Whether the position is empty
     */
    isEmptyAt(row, col) {
        return this.getValueAt(row, col) === '';
    }

    /**
     * Check if the board is full
     * @returns {boolean} - Whether the board is full
     */
    isFull() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.state[row][col] === '') {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Get all empty positions on the board
     * @returns {Array} - Array of positions { row, col }
     */
    getEmptyPositions() {
        const positions = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.state[row][col] === '') {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }

    /**
     * Count the number of pieces on the board
     * @param {string} [player] - Optional player to count ('X', 'O', or null for all)
     * @returns {number} - Number of pieces
     */
    countPieces(player = null) {
        let count = 0;
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (player) {
                    if (this.state[row][col] === player) {
                        count++;
                    }
                } else if (this.state[row][col] !== '') {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Get the current board state
     * @returns {Array} - 2D array representing the current board state
     */
    getState() {
        // Return a deep copy to prevent modification
        return this.state.map(row => [...row]);
    }

    /**
     * Get the last move made on the board
     * @returns {Object|null} - Last move { row, col, player } or null if no moves
     */
    getLastMove() {
        return this.lastMove ? { ...this.lastMove } : null;
    }
    
    /**
     * Get the board size
     * @returns {number} - Size of the board
     */
    getSize() {
        return this.size;
    }
}

export default Board;