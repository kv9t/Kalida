/**
 * BoardUI.js - UI representation of the game board
 * 
 * Manages the visual representation of the board, 
 * with methods for updating the display, highlighting
 * moves, and showing winning patterns
 * 
 */
class BoardUI {
    /**
     * Create a new board UI
     * @param {string} boardElementId - ID of the HTML element for the board
     * @param {number} boardSize - Size of the game board
     * @param {Function} onCellClick - Callback function for cell clicks
     */
    constructor(boardElementId, boardSize, onCellClick) {
        this.boardSize = boardSize;
        this.gameBoard = document.getElementById(boardElementId);
        this.onCellClick = onCellClick;
        this.cells = [];
        
        if (!this.gameBoard) {
            console.error(`Board element with ID "${boardElementId}" not found`);
            return;
        }
        
        this.initializeBoard();
    }
    
    /**
     * Initialize the board UI
     */
    initializeBoard() {
        // Clear the game board
        this.gameBoard.innerHTML = '';
        this.cells = [];
        
        // Set CSS grid layout based on board size
        this.gameBoard.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        this.gameBoard.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
        
        // Create cells
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Add click handler
                cell.addEventListener('click', () => {
                    if (this.onCellClick) {
                        this.onCellClick(row, col);
                    }
                });
                
                // Add hover effect
                cell.addEventListener('mouseenter', () => {
                    cell.classList.add('cell-hover');
                });
                
                cell.addEventListener('mouseleave', () => {
                    cell.classList.remove('cell-hover');
                });
                
                // Add to the game board
                this.gameBoard.appendChild(cell);
                this.cells.push(cell);
            }
        }
    }
    
    /**
     * Update the board UI based on the current state
     * @param {Array} boardState - 2D array representing the current board state
     */
    updateBoard(boardState) {
        // Batch DOM updates for better performance
        const updates = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const index = row * this.boardSize + col;
                const cell = this.cells[index];
                const cellValue = boardState[row][col];
                
                // Only update if the content has changed
                if (cell && cell.textContent !== cellValue) {
                    updates.push({ cell, value: cellValue });
                }
            }
        }
        
        // Apply all updates at once
        if (updates.length > 0) {
            // Use requestAnimationFrame for smoother updates
            requestAnimationFrame(() => {
                updates.forEach(update => {
                    // Update text content
                    update.cell.textContent = update.value;
                    
                    // Update classes
                    update.cell.classList.remove('player-x', 'player-o');
                    if (update.value === 'X') {
                        update.cell.classList.add('player-x');
                    } else if (update.value === 'O') {
                        update.cell.classList.add('player-o');
                    }
                });
            });
        }
    }
    
    /**
     * Highlight the last move
     * @param {Object} lastMove - Last move { row, col, player }
     */
    highlightLastMove(lastMove) {
        if (!lastMove) return;
        
        this.clearLastMoveHighlight();
        
        const index = lastMove.row * this.boardSize + lastMove.col;
        const cell = this.cells[index];
        
        if (cell) {
            if (lastMove.player === 'X') {
                cell.classList.add('last-move-x');
            } else {
                cell.classList.add('last-move-o');
            }
        }
    }
    
    /**
     * Clear the last move highlight
     */
    clearLastMoveHighlight() {
        this.cells.forEach(cell => {
            cell.classList.remove('last-move-x', 'last-move-o');
        });
    }
    
    /**
     * Highlight winning cells
     * @param {Array} winningCells - Array of [row, col] pairs
     * @param {number} bounceCellIndex - Index of the bounce cell in the winning pattern
     * @param {number} secondBounceCellIndex - Index of the second bounce cell
     * @param {Object} lastMove - The last move that caused the win { row, col, player }
     */
    highlightWinningCells(winningCells, bounceCellIndex = -1, secondBounceCellIndex = -1, lastMove = null) {
        if (!winningCells || winningCells.length === 0) return;
        
        // Clear any existing highlights
        this.clearHighlights();
        
        console.log("Highlighting winning cells:", winningCells);
        console.log("Bounce indices received:", bounceCellIndex, secondBounceCellIndex);
        
        // Add highlighting with animation delay for each cell
        winningCells.forEach((cell, i) => {
            const [row, col] = cell;
            const index = row * this.boardSize + col;
            const cellElement = this.cells[index];
            
            if (cellElement) {
                // Add winning cell class with animation delay
                setTimeout(() => {
                    cellElement.classList.add('winning-cell');
                    
                    // If this is a bounce cell, add the bounce indicator
                    if (i === bounceCellIndex) {
                        console.log("Adding bounce-cell class to cell at index", i);
                        cellElement.classList.add('bounce-cell');
                    }
                    
                    // If this is the second bounce cell, also add the bounce indicator
                    if (i === secondBounceCellIndex) {
                        console.log("Adding bounce-cell-second class to cell at index", i);
                        cellElement.classList.add('bounce-cell');
                        cellElement.classList.add('bounce-cell-second');
                    }

                    // If this is the last move that caused the win, add a special class
                    if (lastMove && row === lastMove.row && col === lastMove.col) {
                        console.log("Highlighting final winning move at", row, col);
                        cellElement.classList.add('winning-move');
                    }

                }, i * 50); // Stagger the animation
            }
        });
    }
    
    /**
     * Clear all cell highlights
     */
    clearHighlights() {
        this.cells.forEach(cell => {
            cell.classList.remove(
                'winning-cell', 
                'last-move-x', 
                'last-move-o', 
                'bounce-cell',
                'bounce-cell-second',
                'winning-move'
            );
        });
    }
    
    /**
     * Resize the board
     * @param {number} size - New board size percentage (50-100)
     */
    resize(size) {
        // Convert size percentage to actual CSS value
        const sizePercentage = Math.max(50, Math.min(100, size)); // Clamp between 50-100%
        
        // Set both width AND max-width to allow proper scaling
        this.gameBoard.style.width = `${sizePercentage}%`;
        
        // Set max-width proportionally
        const maxWidthPx = 400 * (sizePercentage / 100);
        this.gameBoard.style.maxWidth = `${maxWidthPx}px`;
        
        // Set a custom attribute for display purposes only
        this.gameBoard.setAttribute('data-size-info', `width: ${sizePercentage}%; max-width: ${maxWidthPx}px`);
    }
    
    /**
     * Set the board size
     * @param {number} boardSize - New board size
     * @param {Function} onCellClick - Callback function for cell clicks
     */
    setBoardSize(boardSize, onCellClick = null) {
        this.boardSize = boardSize;
        if (onCellClick) {
            this.onCellClick = onCellClick;
        }
        this.initializeBoard();
    }
    
    /**
     * Add a visual effect when AI is thinking
     * @param {boolean} isThinking - Whether the AI is thinking
     */
    setAiThinking(isThinking) {
        if (isThinking) {
            this.gameBoard.classList.add('ai-thinking');
        } else {
            this.gameBoard.classList.remove('ai-thinking');
        }
    }
    
    /**
     * Add a visual indication of the current player
     * @param {string} player - Current player ('X' or 'O')
     */
    setCurrentPlayer(player) {
        this.gameBoard.classList.remove('player-turn-x', 'player-turn-o');
        this.gameBoard.classList.add(`player-turn-${player.toLowerCase()}`);
    }
}