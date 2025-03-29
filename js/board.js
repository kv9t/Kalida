/**
 * board.js - Handles the game board UI and interaction
 */

// BoardUI class to manage the game board display
class BoardUI {
    constructor(boardSize, onCellClick) {
        this.boardSize = boardSize;
        this.gameBoard = document.getElementById('game-board');
        this.onCellClick = onCellClick;
        this.cells = [];
    }

    // Initialize the board UI
    initializeBoard() {
        this.gameBoard.innerHTML = '';
        this.cells = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.onCellClick(row, col));
                this.gameBoard.appendChild(cell);
                this.cells.push(cell);
            }
        }
    }

    // Update the board UI based on the current state
    updateBoard(boardState) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const index = row * this.boardSize + col;
                this.cells[index].textContent = boardState[row][col];
                this.cells[index].classList.remove('player-x', 'player-o');
                
                if (boardState[row][col] === 'X') {
                    this.cells[index].classList.add('player-x');
                } else if (boardState[row][col] === 'O') {
                    this.cells[index].classList.add('player-o');
                }
            }
        }
    }

    // Highlight the most recent move
    highlightLastMove(lastMove) {
        if (!lastMove) return;
        
        this.clearLastMoveHighlight();
        
        const index = lastMove.row * this.boardSize + lastMove.col;
        
        if (lastMove.player === 'X') {
            this.cells[index].classList.add('last-move-x');
        } else {
            this.cells[index].classList.add('last-move-o');
        }
    }

    // Clear the last move highlight
    clearLastMoveHighlight() {
        this.cells.forEach(cell => {
            cell.classList.remove('last-move-x', 'last-move-o');
        });
    }

    // Highlight the winning cells
    highlightWinningCells(winningCells, bounceCellIndex) {
        if (!winningCells || winningCells.length === 0) return;
        
        for (let i = 0; i < winningCells.length; i++) {
            const [row, col] = winningCells[i];
            const index = row * this.boardSize + col;
            this.cells[index].classList.add('winning-cell');
            
            // If this is the bounce cell, add the bounce indicator
            if (i === bounceCellIndex) {
                this.cells[index].classList.add('bounce-cell');
            }
        }
    }

    // Clear all cell highlights
    clearHighlights() {
        this.cells.forEach(cell => {
            cell.classList.remove('winning-cell', 'last-move-x', 'last-move-o', 'bounce-cell');
        });
    }
}