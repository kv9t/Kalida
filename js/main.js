/**
 * main.js - Entry point for Kalida game
 * Updated to handle cookie consent and initialization
 */

import Game from './core/Game.js';
import GameUI from './ui/GameUI.js';
import AIFactory from './ai/AIFactory.js';


// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Kalida game starting...');
    
    try {
        // Game configuration
        const BOARD_SIZE = 6;
        
        // Initialize game instance
        console.log('Creating Game instance...');
        const game = new Game(BOARD_SIZE);
        
        // Create AI factory and set it on the game
        console.log('Creating AI factory...');
        const aiFactory = new AIFactory(BOARD_SIZE, game.rules);
        game.setAIFactory(aiFactory);
        
        // Create game UI
        console.log('Creating GameUI...');
        const gameUI = new GameUI(game);
        
        // Initialize the game with cookie consent handling
        console.log('Initializing game with cookie consent...');
        game.initialize(() => {
            console.log('Game initialization complete');
            
            // After initialization, ensure UI reflects the actual game state
            setTimeout(() => {
                console.log('Applying current game state to UI...');
                try {
                    gameUI.applySavedPreferences();
                    gameUI.updateAll();
                    
                    // Additional debugging
                    console.log('Final game state after initialization:', {
                        gameMode: game.gameMode,
                        cookiesEnabled: game.cookiesEnabled,
                        bounceEnabled: game.bounceRuleEnabled,
                        wrapEnabled: game.wrapRuleEnabled,
                        scores: game.scores,
                        matchScores: game.matchScores
                    });
                } catch (uiError) {
                    console.error('Error updating UI:', uiError);
                }
            }, 200); // Increased delay to ensure everything is ready
            
            // Check for tutorial
            try {
                checkForTutorial(game);
            } catch (tutorialError) {
                console.error('Error in tutorial check:', tutorialError);
            }
        });
        
        // Add a global reference for debugging
        if (typeof window !== 'undefined') {
            window.KalidaGame = {
                game: game,
                ui: gameUI,
                // Utility functions for debugging/testing
                debug: {
                    clearAllCookies: () => {
                        if (game.cookieManager) {
                            game.cookieManager.clearAllCookies();
                            console.log('All cookies cleared. Refresh page to see effect.');
                        }
                    },
                    showCookieConsent: () => {
                        if (game.cookieManager) {
                            // Temporarily clear consent to show modal again
                            game.cookieManager.deleteCookie(game.cookieManager.cookieNames.CONSENT);
                            location.reload();
                        }
                    },
                    getCookieData: () => {
                        if (!game.cookiesEnabled) {
                            console.log('Cookies are disabled');
                            return null;
                        }
                        return {
                            gameMode: game.cookieManager.getSavedGameMode(),
                            roundScores: game.cookieManager.getSavedRoundScores(),
                            matchScores: game.cookieManager.getSavedMatchScores(),
                            rules: game.cookieManager.getSavedRulePreferences(),
                            tutorialCompleted: game.cookieManager.wasTutorialCompleted()
                        };
                    },
                    // NEW: Force reload saved data
                    reloadSavedData: () => {
                        if (game.cookiesEnabled) {
                            console.log('Force reloading saved data...');
                            game.loadSavedData();
                            gameUI.applySavedPreferences();
                            gameUI.updateAll();
                        }
                    },
                    // NEW: Check initialization state
                    checkState: () => {
                        console.log('Current state:', {
                            cookiesEnabled: game.cookiesEnabled,
                            gameMode: game.gameMode,
                            scores: game.scores,
                            matchScores: game.matchScores,
                            hasConsent: game.cookieManager.hasConsent(),
                            savedGameMode: game.cookieManager.getSavedGameMode(),
                            savedScores: game.cookieManager.getSavedRoundScores()
                        });
                    }
                }
            };
            console.log('Debug utilities available at window.KalidaGame.debug');
        }
        
    } catch (error) {
        console.error('Error initializing Kalida game:', error);
        console.error('Error stack:', error.stack);
        
        // Show user-friendly error message
        showInitializationError(error);
    }
});

/**
 * Check if we should show a tutorial for new users
 * @param {Game} game - The game instance
 */
function checkForTutorial(game) {
    // Only proceed if cookies are enabled
    if (!game.cookiesEnabled) {
        console.log('Cookies disabled, skipping tutorial check');
        return;
    }
    
    // Check if tutorial was already completed
    if (game.wasTutorialCompleted()) {
        console.log('Tutorial already completed');
        return;
    }
    
    // For now, we'll just log that we would show a tutorial
    // In the future, this is where you'd show a tutorial modal
    console.log('First-time user detected - tutorial would be shown here');
    
    // Uncomment the following lines when you add a tutorial modal:
    /*
    setTimeout(() => {
        showTutorialModal(game);
    }, 1000); // Show tutorial after a brief delay
    */
}

/**
 * Show tutorial modal for new users (placeholder for future implementation)
 * @param {Game} game - The game instance
 */
function showTutorialModal(game) {
    // This is a placeholder for a future tutorial modal
    // For now, we'll just mark the tutorial as completed
    
    const showTutorial = confirm(
        'Welcome to Kalida!\n\n' +
        'Would you like a quick tutorial on how to play?\n\n' +
        '(This is just a placeholder - a proper tutorial modal would go here)'
    );
    
    if (showTutorial) {
        alert(
            'Tutorial Placeholder:\n\n' +
            '1. Get 5 in a row to win\n' +
            '2. Try different game modes\n' +
            '3. Experiment with the rules\n' +
            '4. Have fun!\n\n' +
            'A proper interactive tutorial will be added in the future.'
        );
    }
    
    // Mark tutorial as completed so we don't show it again
    game.markTutorialCompleted();
    console.log('Tutorial marked as completed');
}

/**
 * Show initialization error to user
 * @param {Error} error - The error that occurred
 */
function showInitializationError(error) {
    // Create error message element
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff6b6b;
        color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        text-align: center;
        font-family: Arial, sans-serif;
    `;
    
    errorContainer.innerHTML = `
        <h3 style="margin-top: 0;">Game Initialization Error</h3>
        <p>Sorry, there was a problem starting Kalida. Please try refreshing the page.</p>
        <p style="font-size: 0.8em; opacity: 0.8;">Error: ${error.message}</p>
        <button onclick="location.reload()" style="
            background: white;
            color: #ff6b6b;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        ">Refresh Page</button>
    `;
    
    document.body.appendChild(errorContainer);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorContainer.parentNode) {
            errorContainer.parentNode.removeChild(errorContainer);
        }
    }, 10000);
}

/**
 * Handle page visibility changes to save data when user switches tabs/minimizes
 */
document.addEventListener('visibilitychange', function() {
    // Save data when page becomes hidden (user switches tabs, minimizes, etc.)
    if (document.visibilityState === 'hidden') {
        if (window.KalidaGame && window.KalidaGame.game) {
            console.log('Page hidden, saving game data');
            window.KalidaGame.game.saveDataToCookies();
        }
    }
});

/**
 * Handle page unload to save data when user closes/navigates away
 */
window.addEventListener('beforeunload', function() {
    if (window.KalidaGame && window.KalidaGame.game) {
        console.log('Page unloading, saving game data');
        window.KalidaGame.game.saveDataToCookies();
    }
});

/**
 * Handle errors globally
 */
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    
    // Don't show error UI for every little error, just log it
    // You might want to implement error reporting here in the future
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent the default handling (which would log to console)
    // event.preventDefault();
});

console.log('Kalida main.js loaded successfully');

