/**
 * main.js - Entry point for the Kalida game
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Kalida game...');
    
    // Constants
    const BOARD_SIZE = 6; // 6x6 grid for Kalida
    
    try {
        // Create core components
        const rules = new Rules(BOARD_SIZE);
        const board = new Board(BOARD_SIZE);
        const game = new Game(BOARD_SIZE);
        
        // Create AI factory
        const boardEvaluator = new BoardEvaluator(BOARD_SIZE, rules);
        const threatDetector = new ThreatDetector(BOARD_SIZE, rules);
        const aiFactory = new AIFactory(BOARD_SIZE, rules);
        
        // Set AI factory on game if needed
        if (typeof game.setAIFactory === 'function') {
            game.setAIFactory(aiFactory);
        }
        
        // Create UI components
        const boardUI = new BoardUI('game-board', BOARD_SIZE, (row, col) => {
            game.makeMove(row, col);
        });
        
        // Create game UI and connect to game instance
        const gameUI = new GameUI(game);
        
        // Add board resize slider functionality
        const sizeSlider = document.getElementById('board-size-slider');
        const sizeValue = document.getElementById('size-value');
        
        if (sizeSlider && sizeValue) {
            // Set initial size
            boardUI.resize(sizeSlider.value);
            
            // Add event listener for slider changes
            sizeSlider.addEventListener('input', () => {
                const newSize = sizeSlider.value;
                boardUI.resize(newSize);
                sizeValue.textContent = `${newSize}%`;
            });
        }
        
        // Initialize the game
        game.initialize();
        
        console.log('Kalida game initialized successfully!');
        
        // Export key components to window for debugging if needed
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window._kalida = {
                game,
                rules,
                board,
                boardUI,
                gameUI,
                aiFactory
            };
            console.log('Debug objects exposed as window._kalida');
        }
    } catch (error) {
        console.error('Error initializing Kalida game:', error);
        console.error('Stack trace:', error.stack);
    }
});