/**
 * main.js - Direct approach to board sizing
 */

document.addEventListener('DOMContentLoaded', () => {
    // Constants for the game
    const BOARD_SIZE = 6; // 6x6 grid for Kalida
    
    // Create a new Game instance
    const kalidaGame = new Game(BOARD_SIZE);
    
    // Direct board size control without CSS variables
    const boardSizeSlider = document.getElementById('board-size-slider');
    const sizeValueDisplay = document.getElementById('size-value');
    const gameBoard = document.getElementById('game-board');
    
    if (boardSizeSlider && sizeValueDisplay && gameBoard) {
        console.log('Setting up direct board sizing');
        
        // Initialize with current value
        const initialSize = boardSizeSlider.value;
        sizeValueDisplay.textContent = `${initialSize}%`;
        
        // Apply initial size directly to the board element
        gameBoard.style.width = `${initialSize}%`;
        
        // Update when slider moves
        // Update main.js slider event listener
        boardSizeSlider.addEventListener('input', function() {
            const percentage = this.value;
            sizeValueDisplay.textContent = `${percentage}%`;
            
            // Calculate actual pixel width based on default max width
            const defaultMaxWidth = 400; // Same as in CSS
            const pixelWidth = (percentage / 100) * defaultMaxWidth;
            
            // Set specific pixel width
            gameBoard.style.width = `${pixelWidth}px`;
            console.log('New width in pixels:', pixelWidth);
        });
    } else {
        console.error('Required elements not found!');
        console.log('Slider found:', !!boardSizeSlider);
        console.log('Size display found:', !!sizeValueDisplay);
        console.log('Game board found:', !!gameBoard);
    }
    
    // Game is now initialized and ready to play
    console.log('Kalida game initialized!');
});