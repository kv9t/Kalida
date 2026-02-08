/**
 * FinRules.js - Win detection for the Fin board game
 *
 * Win condition: Create an unbroken connected path of your markers
 * from any board edge to its opposite edge (left-right or top-bottom).
 *
 * Corners count as belonging to either adjacent edge.
 * Adjacency includes all 8 directions (orthogonal + diagonal).
 *
 * Special constraint: A winning path may contain AT MOST one
 * contiguous diagonal stretch (of any length). All other connections
 * must be orthogonal (horizontal or vertical adjacency).
 *
 * Win detection is purely board-state based - no move history tracking.
 */

class FinRules {
    /**
     * Create a new Fin rules engine
     * @param {number} boardSize - Size of the game board (default 6)
     */
    constructor(boardSize = 6) {
        this.boardSize = boardSize;
    }

    /**
     * Check if the game is over (win or draw)
     * Called after each move with the full board state.
     * @param {Array} board - 2D array representing the game board
     * @returns {Object} - { isOver, winner, winningCells, isDraw }
     */
    checkGameStatus(board) {
        // Check both players for a win
        for (const player of ['X', 'O']) {
            const result = this.checkWinForPlayer(board, player);
            if (result) {
                return {
                    isOver: true,
                    winner: player,
                    winningCells: result,
                    isDraw: false,
                    bounceCellIndex: -1,
                    secondBounceCellIndex: -1
                };
            }
        }

        // Check for draw (board full)
        const isDraw = this.checkDraw(board);
        return {
            isOver: isDraw,
            winner: null,
            winningCells: [],
            isDraw,
            bounceCellIndex: -1,
            secondBounceCellIndex: -1
        };
    }

    /**
     * Check if a player has a winning path
     * @param {Array} board - 2D array representing the game board
     * @param {string} player - Player to check ('X' or 'O')
     * @returns {Array|null} - Array of [row, col] pairs forming the winning path, or null
     */
    checkWinForPlayer(board, player) {
        // Check left-to-right (start from left edge col=0, target right edge col=boardSize-1)
        const lrResult = this.findEdgeToEdgePath(board, player, 'left-right');
        if (lrResult) return lrResult;

        // Check top-to-bottom (start from top edge row=0, target bottom edge row=boardSize-1)
        const tbResult = this.findEdgeToEdgePath(board, player, 'top-bottom');
        if (tbResult) return tbResult;

        return null;
    }

    /**
     * Find a valid path from one edge to its opposite edge
     * Uses BFS with state tracking for the diagonal constraint.
     *
     * @param {Array} board - 2D array
     * @param {string} player - Player to check
     * @param {string} edgePair - 'left-right' or 'top-bottom'
     * @returns {Array|null} - Winning path as array of [row, col], or null
     */
    findEdgeToEdgePath(board, player, edgePair) {
        const startCells = this.getEdgeCells(board, player, edgePair, 'start');

        if (startCells.length === 0) return null;

        // BFS state: [row, col, diagonalState]
        // diagonalState: 0 = no diagonal used, 1 = in diagonal, 2 = diagonal done (ortho only)
        // visited: Set of "row,col,diagState" strings
        const visited = new Set();
        // parent map for path reconstruction: key = "row,col,diagState", value = "parentRow,parentCol,parentDiagState"
        const parent = new Map();
        const queue = [];

        for (const [row, col] of startCells) {
            for (const diagState of [0]) {
                const key = `${row},${col},${diagState}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push([row, col, diagState]);
                    parent.set(key, null); // root nodes
                }
            }
        }

        // 8-directional neighbors
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [ 0, -1],          [ 0, 1],
            [ 1, -1], [ 1, 0], [ 1, 1]
        ];

        while (queue.length > 0) {
            const [row, col, diagState] = queue.shift();

            // Check if this cell is on the target edge
            if (this.isOnTargetEdge(row, col, edgePair)) {
                // Reconstruct path
                return this.reconstructPath(parent, row, col, diagState);
            }

            for (const [dr, dc] of directions) {
                const nr = row + dr;
                const nc = col + dc;

                // Bounds check
                if (nr < 0 || nr >= this.boardSize || nc < 0 || nc >= this.boardSize) continue;
                // Must be the same player's marker
                if (board[nr][nc] !== player) continue;

                const isDiagonalMove = (dr !== 0 && dc !== 0);
                let newDiagState = diagState;

                if (isDiagonalMove) {
                    if (diagState === 0) {
                        // Starting a new diagonal stretch
                        newDiagState = 1;
                    } else if (diagState === 1) {
                        // Continuing the diagonal stretch
                        newDiagState = 1;
                    } else {
                        // diagState === 2: already used our diagonal stretch, can't do another
                        continue;
                    }
                } else {
                    // Orthogonal move
                    if (diagState === 1) {
                        // Exiting a diagonal stretch
                        newDiagState = 2;
                    }
                    // diagState 0 stays 0, diagState 2 stays 2
                }

                const key = `${nr},${nc},${newDiagState}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    parent.set(key, `${row},${col},${diagState}`);
                    queue.push([nr, nc, newDiagState]);
                }
            }
        }

        return null; // No path found
    }

    /**
     * Get all cells of a player on the start edge for a given edge pair
     * @param {Array} board - 2D board state
     * @param {string} player - Player marker
     * @param {string} edgePair - 'left-right' or 'top-bottom'
     * @param {string} which - 'start' or 'target'
     * @returns {Array} - Array of [row, col] positions
     */
    getEdgeCells(board, player, edgePair, which) {
        const cells = [];
        const max = this.boardSize - 1;

        if (edgePair === 'left-right') {
            const col = (which === 'start') ? 0 : max;
            for (let row = 0; row < this.boardSize; row++) {
                if (board[row][col] === player) {
                    cells.push([row, col]);
                }
            }
            // Corners: for left-right, corners at (0,0),(max,0) are start; (0,max),(max,max) are target
            // But corners also count for top-bottom. Since we check both edge pairs separately,
            // corners are naturally included when they're on the respective edge column/row.
        } else {
            // top-bottom
            const row = (which === 'start') ? 0 : max;
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    cells.push([row, col]);
                }
            }
        }

        return cells;
    }

    /**
     * Check if a cell is on the target (opposite) edge
     * Corners count as being on either adjacent edge.
     * @param {number} row
     * @param {number} col
     * @param {string} edgePair - 'left-right' or 'top-bottom'
     * @returns {boolean}
     */
    isOnTargetEdge(row, col, edgePair) {
        const max = this.boardSize - 1;

        if (edgePair === 'left-right') {
            // Target is right edge (col === max)
            // But also: corners on the right are naturally col===max
            return col === max;
        } else {
            // Target is bottom edge (row === max)
            return row === max;
        }
    }

    /**
     * Reconstruct the winning path from the parent map
     * @param {Map} parent - Parent map from BFS
     * @param {number} endRow - End row
     * @param {number} endCol - End col
     * @param {number} endDiagState - End diagonal state
     * @returns {Array} - Array of [row, col] pairs
     */
    reconstructPath(parent, endRow, endCol, endDiagState) {
        const path = [];
        let key = `${endRow},${endCol},${endDiagState}`;

        while (key !== null) {
            const parts = key.split(',');
            path.unshift([parseInt(parts[0]), parseInt(parts[1])]);
            key = parent.get(key) || null;
        }

        return path;
    }

    /**
     * Check if the board is full (draw)
     * @param {Array} board - 2D array
     * @returns {boolean}
     */
    checkDraw(board) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    return false;
                }
            }
        }
        return true;
    }
}

export default FinRules;
