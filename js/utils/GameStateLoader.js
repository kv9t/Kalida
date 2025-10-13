/**
 * GameStateLoader.js - Utility for loading and exporting game states
 *
 * This utility helps with testing and debugging by allowing you to:
 * - Load specific board configurations
 * - Export current board states
 * - Create reproducible test scenarios
 */

class GameStateLoader {
    /**
     * Create a new game state loader
     * @param {number} boardSize - Size of the game board
     */
    constructor(boardSize) {
        this.boardSize = boardSize;
    }

    /**
     * Parse a text-based board representation into a 2D array
     * Format: Each cell is represented by 'X', 'O', or '.' (empty)
     * Rows are separated by newlines, cells by spaces
     *
     * Example:
     * . . . . . .
     * . X . . . .
     * . . O . . .
     * . . . X . .
     * . . . . . .
     * . . . . . .
     *
     * @param {string} textState - Text representation of the board
     * @returns {Array|null} - 2D array or null if invalid
     */
    parseTextState(textState) {
        try {
            // Split by lines and filter out empty lines
            const lines = textState.trim().split('\n').filter(line => line.trim());

            if (lines.length !== this.boardSize) {
                console.error(`Expected ${this.boardSize} rows, got ${lines.length}`);
                return null;
            }

            const board = [];

            for (let i = 0; i < lines.length; i++) {
                // Split by spaces and filter out empty strings
                const cells = lines[i].trim().split(/\s+/);

                if (cells.length !== this.boardSize) {
                    console.error(`Row ${i}: Expected ${this.boardSize} cells, got ${cells.length}`);
                    return null;
                }

                const row = [];
                for (const cell of cells) {
                    if (cell === '.' || cell === '-' || cell === '_') {
                        row.push('');
                    } else if (cell === 'X' || cell === 'x') {
                        row.push('X');
                    } else if (cell === 'O' || cell === 'o' || cell === '0') {
                        row.push('O');
                    } else {
                        console.error(`Invalid cell value: "${cell}". Use X, O, or . (dot for empty)`);
                        return null;
                    }
                }
                board.push(row);
            }

            return board;
        } catch (error) {
            console.error('Error parsing text state:', error);
            return null;
        }
    }

    /**
     * Parse a JSON array representation of the board
     * @param {Array|string} jsonState - JSON array or stringified array
     * @returns {Array|null} - 2D array or null if invalid
     */
    parseJSONState(jsonState) {
        try {
            let board = jsonState;

            // If it's a string, parse it
            if (typeof jsonState === 'string') {
                board = JSON.parse(jsonState);
            }

            // Validate structure
            if (!Array.isArray(board) || board.length !== this.boardSize) {
                console.error(`Expected ${this.boardSize} rows in JSON state`);
                return null;
            }

            for (let i = 0; i < board.length; i++) {
                if (!Array.isArray(board[i]) || board[i].length !== this.boardSize) {
                    console.error(`Row ${i}: Invalid structure in JSON state`);
                    return null;
                }

                // Normalize cell values
                for (let j = 0; j < board[i].length; j++) {
                    const cell = board[i][j];
                    if (cell !== 'X' && cell !== 'O' && cell !== '') {
                        console.error(`Invalid cell value at [${i}][${j}]: "${cell}"`);
                        return null;
                    }
                }
            }

            return board;
        } catch (error) {
            console.error('Error parsing JSON state:', error);
            return null;
        }
    }

    /**
     * Parse a compact notation (single string with row separators)
     * Format: "..X.../..O../....." where / separates rows
     *
     * Example: "....../..X.../..O../...X../...../...." for a 6x6 board
     *
     * @param {string} compactState - Compact string representation
     * @returns {Array|null} - 2D array or null if invalid
     */
    parseCompactState(compactState) {
        try {
            const rows = compactState.split('/');

            if (rows.length !== this.boardSize) {
                console.error(`Expected ${this.boardSize} rows, got ${rows.length}`);
                return null;
            }

            const board = [];

            for (let i = 0; i < rows.length; i++) {
                if (rows[i].length !== this.boardSize) {
                    console.error(`Row ${i}: Expected ${this.boardSize} characters, got ${rows[i].length}`);
                    return null;
                }

                const row = [];
                for (const char of rows[i]) {
                    if (char === '.' || char === '-' || char === '_') {
                        row.push('');
                    } else if (char === 'X' || char === 'x') {
                        row.push('X');
                    } else if (char === 'O' || char === 'o' || char === '0') {
                        row.push('O');
                    } else {
                        console.error(`Invalid character: "${char}"`);
                        return null;
                    }
                }
                board.push(row);
            }

            return board;
        } catch (error) {
            console.error('Error parsing compact state:', error);
            return null;
        }
    }

    /**
     * Auto-detect format and parse board state
     * @param {string|Array} stateInput - Board state in any supported format
     * @returns {Array|null} - 2D array or null if invalid
     */
    parseState(stateInput) {
        if (!stateInput) {
            console.error('No state input provided');
            return null;
        }

        // If it's already an array, try JSON parsing
        if (Array.isArray(stateInput)) {
            return this.parseJSONState(stateInput);
        }

        const state = stateInput.trim();

        // Try to detect format
        if (state.startsWith('[') || state.startsWith('{')) {
            // JSON format
            return this.parseJSONState(state);
        } else if (state.includes('/')) {
            // Compact format
            return this.parseCompactState(state);
        } else {
            // Text format (default)
            return this.parseTextState(state);
        }
    }

    /**
     * Export board state to text format
     * @param {Array} board - 2D array representing the board
     * @returns {string} - Text representation
     */
    exportToText(board) {
        return board.map(row =>
            row.map(cell => cell === '' ? '.' : cell).join(' ')
        ).join('\n');
    }

    /**
     * Export board state to JSON format
     * @param {Array} board - 2D array representing the board
     * @returns {string} - JSON string
     */
    exportToJSON(board) {
        return JSON.stringify(board, null, 2);
    }

    /**
     * Export board state to compact format
     * @param {Array} board - 2D array representing the board
     * @returns {string} - Compact representation
     */
    exportToCompact(board) {
        return board.map(row =>
            row.map(cell => cell === '' ? '.' : cell).join('')
        ).join('/');
    }

    /**
     * Validate a board state
     * @param {Array} board - 2D array to validate
     * @returns {Object} - { valid: boolean, errors: Array, warnings: Array }
     */
    validateBoardState(board) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Check structure
        if (!Array.isArray(board)) {
            result.valid = false;
            result.errors.push('Board is not an array');
            return result;
        }

        if (board.length !== this.boardSize) {
            result.valid = false;
            result.errors.push(`Board has ${board.length} rows, expected ${this.boardSize}`);
            return result;
        }

        let xCount = 0;
        let oCount = 0;

        for (let i = 0; i < board.length; i++) {
            if (!Array.isArray(board[i]) || board[i].length !== this.boardSize) {
                result.valid = false;
                result.errors.push(`Row ${i} is invalid`);
                continue;
            }

            for (let j = 0; j < board[i].length; j++) {
                const cell = board[i][j];
                if (cell !== 'X' && cell !== 'O' && cell !== '') {
                    result.valid = false;
                    result.errors.push(`Invalid value at [${i}][${j}]: "${cell}"`);
                } else if (cell === 'X') {
                    xCount++;
                } else if (cell === 'O') {
                    oCount++;
                }
            }
        }

        // Check move count validity (X should be equal or one more than O)
        const diff = xCount - oCount;
        if (diff < 0 || diff > 1) {
            result.warnings.push(
                `Unusual move count: X has ${xCount} pieces, O has ${oCount}. ` +
                `Normally X should have equal or one more piece than O.`
            );
        }

        return result;
    }

    /**
     * Count pieces on the board
     * @param {Array} board - 2D array representing the board
     * @returns {Object} - { X: number, O: number, empty: number }
     */
    countPieces(board) {
        const counts = { X: 0, O: 0, empty: 0 };

        for (const row of board) {
            for (const cell of row) {
                if (cell === 'X') counts.X++;
                else if (cell === 'O') counts.O++;
                else counts.empty++;
            }
        }

        return counts;
    }

    /**
     * Determine whose turn it should be based on piece count
     * @param {Array} board - 2D array representing the board
     * @returns {string} - 'X' or 'O'
     */
    inferCurrentPlayer(board) {
        const counts = this.countPieces(board);
        // X goes first, so if counts are equal, it's X's turn
        // If X has one more, it's O's turn
        return counts.X === counts.O ? 'X' : 'O';
    }
}

export default GameStateLoader;
