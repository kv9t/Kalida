/**
 * game.js - Core game logic for Kalida
 */

class Game {
    constructor(boardSize) {
        this.boardSize = boardSize;
        this.board = this.createEmptyBoard();
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.scores = {
            'X': 0,
            'O': 0
        };
        this.lastMove = null;
        this.bounceRuleEnabled = true;
        this.missingTeethRuleEnabled = true; // New rule, enabled by default
        this.gameMode = 'human'; // Default game mode
        this.computerPlayer = 'O'; // Computer will play as O
        
        // Initialize components
        this.winChecker = new WinChecker(this.boardSize);
        this.ai = new GameAI(this.boardSize, this.winChecker);
        this.boardUI = new BoardUI(this.boardSize, this.makeMove.bind(this));
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Initialize the game
        this.initGame();
    }
    
    // Initialize the game
    initGame() {
        this.boardUI.initializeBoard();
        this.resetGame();
        this.updateScoreDisplay();
    }
    
    // Create an empty board
    createEmptyBoard() {
        return Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    }
    
    // Initialize event listeners
    // Initialize event listeners - updated with impossible option
    initEventListeners() {
        // DOM elements
        this.playerTurn = document.querySelector('.player-turn');
        this.resetButton = document.getElementById('reset-button');
        this.scoreX = document.getElementById('score-x');
        this.scoreO = document.getElementById('score-o');
        this.gameModeSelect = document.getElementById('game-mode-select');
        this.bounceToggle = document.getElementById('bounce-toggle');
        this.missingTeethToggle = document.getElementById('missing-teeth-toggle');
        
        // Event listeners
        this.resetButton.addEventListener('click', () => this.resetGame());
        
        this.gameModeSelect.addEventListener('change', (e) => {
            this.gameMode = e.target.value;
            this.resetGame();
        });
        
        this.bounceToggle.addEventListener('change', () => {
            this.bounceRuleEnabled = this.bounceToggle.checked;
            this.resetGame();
        });
        
        this.missingTeethToggle.addEventListener('change', () => {
            this.missingTeethRuleEnabled = this.missingTeethToggle.checked;
            this.resetGame();
        });
    }
    
    // Make a move
    makeMove(row, col) {
        // If the game is not active or the cell is already taken, do nothing
        if (!this.gameActive || this.board[row][col] !== '') return;
        
        // Clear previous last move highlighting
        this.boardUI.clearLastMoveHighlight();
        
        // Update the board state
        this.board[row][col] = this.currentPlayer;
        
        // Set this as the last move
        this.lastMove = {row, col, player: this.currentPlayer};
        
        // Update the UI
        this.boardUI.updateBoard(this.board);
        
        // Highlight the last move
        this.boardUI.highlightLastMove(this.lastMove);
        
        // Check for a win
        // Check all cells for winning patterns
        const winner = this.winChecker.checkGameWinner(this.board, this.bounceRuleEnabled, this.missingTeethRuleEnabled);
        
        // Need to also get the winning cells to highlight them
        let winningPattern = null;
        if (winner) {
            // Find the winning pattern by checking all cells
            for (let r = 0; r < this.boardSize; r++) {
                for (let c = 0; c < this.boardSize; c++) {
                    if (this.board[r][c] === winner) {
                        const result = this.winChecker.checkWin(this.board, r, c, this.bounceRuleEnabled, this.missingTeethRuleEnabled);
                        if (result.winner) {
                            winningPattern = result;
                            break;
                        }
                    }
                }
                if (winningPattern) break;
            }
        }
        
        if (winner) {
            this.playerTurn.textContent = `Player ${winner} wins!`;
            this.gameActive = false;
            this.boardUI.highlightWinningCells(winningPattern.winningCells, winningPattern.bounceCellIndex, winningPattern.secondBounceCellIndex);
            
            // Update score
            this.scores[winner]++;
            this.updateScoreDisplay();
            return;
        }
        
        // Check for a draw
        if (this.winChecker.checkDraw(this.board)) {
            this.playerTurn.textContent = "It's a draw!";
            this.gameActive = false;
            return;
        }
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.playerTurn.textContent = `Player ${this.currentPlayer}'s Turn`;
        
        // If it's the computer's turn, make a move after a short delay
        if (this.gameMode !== 'human' && this.gameActive && this.currentPlayer === this.computerPlayer) {
            setTimeout(() => this.makeComputerMove(), 500); // Delay for better user experience
        }
    }
    
    // Make a computer move - updated to handle impossible mode
    makeComputerMove() {
        if (!this.gameActive) return;
        
        // When in impossible mode on larger boards, show a "thinking" message
        if (this.gameMode === 'impossible' && this.boardSize >= 8) {
            this.playerTurn.textContent = "AI is thinking...";
            
            // Use setTimeout to allow the UI to update before the expensive computation
            setTimeout(() => {
                const move = this.ai.getMove(
                    this.board, 
                    this.gameMode, 
                    this.computerPlayer, 
                    this.bounceRuleEnabled, 
                    this.missingTeethRuleEnabled
                );
                
                if (move) {
                    this.makeMove(move.row, move.col);
                }
            }, 100);
        } else {
            // For other modes, make the move immediately
            const move = this.ai.getMove(
                this.board, 
                this.gameMode, 
                this.computerPlayer, 
                this.bounceRuleEnabled, 
                this.missingTeethRuleEnabled
            );
            
            if (move) {
                this.makeMove(move.row, move.col);
            }
        }
    }
    
    // Update the score display
    updateScoreDisplay() {
        this.scoreX.textContent = this.scores['X'];
        this.scoreO.textContent = this.scores['O'];
    }
    
    // Reset the game
    resetGame() {
        this.board = this.createEmptyBoard();
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.playerTurn.textContent = `Player ${this.currentPlayer}'s Turn`;
        this.lastMove = null;
        
        // Reset cell highlights
        this.boardUI.clearHighlights();
        
        // Update the board UI
        this.boardUI.updateBoard(this.board);
        
        // If playing against computer and computer goes first, make a move
        if (this.gameMode !== 'human' && this.computerPlayer === 'X') {
            setTimeout(() => this.makeComputerMove(), 500);
        }
    }
}