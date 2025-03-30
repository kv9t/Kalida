/**
 * main.js - Main entry point for Kalida
 * This file initializes the game when the page loads
 */

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Constants for the game
    const BOARD_SIZE = 6; // 6x6 grid for Kalida
    
    // Create a new Game instance
    const kalidaGame = new Game(BOARD_SIZE);
    
    // Board size control
    const boardSizeSlider = document.getElementById('board-size-slider');
    const sizeValueDisplay = document.getElementById('size-value');
    
    if (boardSizeSlider && sizeValueDisplay) {
        // Initialize with current value
        sizeValueDisplay.textContent = `${boardSizeSlider.value}%`;
        
        // Update when slider moves
        boardSizeSlider.addEventListener('input', function() {
            const size = this.value;
            sizeValueDisplay.textContent = `${size}%`;
            document.documentElement.style.setProperty('--board-width', `${size}%`);
        });
    }
    
    // Game is now initialized and ready to play
    console.log('Kalida game initialized!');
});