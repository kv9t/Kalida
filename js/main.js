/**
 * main.js - Entry point for Kalida game
 * Updated to handle cookie consent and initialization
 */

import Game from './core/Game.js';
import GameUI from './ui/GameUI.js';
import AIFactory from './ai/AIFactory.js';
import TestScenarios, { getScenario, getScenarioNames } from './utils/TestScenarios.js';


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
                
                // Add board resize slider functionality
                // IMPORTANT: Added after UI is fully initialized
                try {
                    console.log('Setting up board resize slider...');
                    const sizeSlider = document.getElementById('board-size-slider');
                    const sizeValue = document.getElementById('size-value');
                    
                    if (sizeSlider && sizeValue) {
                        // ISSUE: Your code references 'boardUI' but we have 'gameUI'
                        // Assuming gameUI has a board property or resize method
                        // You'll need to adjust this based on your actual GameUI class structure
                        
                        // Option 1: If gameUI has a resize method
                        if (typeof gameUI.resize === 'function') {
                            // Set initial size
                            gameUI.resize(sizeSlider.value);
                            
                            // Add event listener for slider changes
                            sizeSlider.addEventListener('input', () => {
                                const newSize = sizeSlider.value;
                                gameUI.resize(newSize);
                                sizeValue.textContent = `${newSize}%`;
                            });
                            console.log('Board resize slider initialized successfully');
                        }
                        // Option 2: If gameUI has a board property with resize method
                        else if (gameUI.board && typeof gameUI.board.resize === 'function') {
                            // Set initial size
                            gameUI.board.resize(sizeSlider.value);
                            
                            // Add event listener for slider changes
                            sizeSlider.addEventListener('input', () => {
                                const newSize = sizeSlider.value;
                                gameUI.board.resize(newSize);
                                sizeValue.textContent = `${newSize}%`;
                            });
                            console.log('Board resize slider initialized successfully');
                        }
                        // Option 3: If you need to access boardUI differently
                        else {
                            console.warn('GameUI does not have expected resize method. Please check your GameUI class structure.');
                            // You might need to create or access boardUI differently
                            // For example: const boardUI = gameUI.boardComponent;
                        }
                    } else {
                        // This is normal - not all pages might have the slider
                        console.log('Board size slider elements not found - may not be on this page');
                    }
                } catch (sliderError) {
                    console.error('Error setting up board resize slider:', sliderError);
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
                    },

                    // ====================================================================
                    // STATE LOADING UTILITIES (for AI testing and debugging)
                    // ====================================================================

                    /**
                     * Load a board state from text, JSON, or compact format
                     * @param {string|Array} state - Board state to load
                     * @param {Object} options - Optional configuration
                     */
                    loadState: (state, options = {}) => {
                        console.log('Loading board state...');
                        const success = game.loadBoardState(state, options);
                        if (success) {
                            // Force UI update
                            if (gameUI && gameUI.boardUI) {
                                gameUI.boardUI.updateBoard(game.getBoardState());
                            }

                            console.log('✓ Board state loaded successfully');
                            console.log('Current player:', game.getCurrentPlayer());
                            console.log('Board:');
                            console.log(game.exportBoardState('text'));
                        } else {
                            console.error('✗ Failed to load board state');
                        }
                        return success;
                    },

                    /**
                     * Export current board state
                     * @param {string} format - 'text', 'json', or 'compact'
                     */
                    exportState: (format = 'text') => {
                        const state = game.exportBoardState(format);
                        console.log('Current board state:');
                        console.log(state);
                        return state;
                    },

                    /**
                     * Export complete game state (board + settings)
                     */
                    exportComplete: () => {
                        const state = game.exportCompleteState();
                        console.log('Complete game state:');
                        console.log(state);
                        return state;
                    },

                    /**
                     * Load a predefined test scenario
                     * @param {string} scenarioName - Name of the scenario
                     * @param {boolean} enableAI - Whether to enable AI mode (default: true)
                     */
                    loadScenario: (scenarioName, enableAI = true) => {
                        const scenario = getScenario(scenarioName);
                        if (!scenario) {
                            return false;
                        }

                        console.log(`Loading scenario: ${scenario.name}`);
                        console.log(`Description: ${scenario.description}`);
                        if (scenario.notes) {
                            console.log(`Notes: ${scenario.notes}`);
                        }

                        // Determine the appropriate game mode based on rules
                        let targetMode = 'human';
                        if (enableAI) {
                            // Choose game mode based on scenario rules
                            if (scenario.rules) {
                                if (scenario.rules.bounce && scenario.rules.wrap) {
                                    targetMode = 'level4'; // All rules
                                } else if (scenario.rules.wrap) {
                                    targetMode = 'level3'; // Wrap only
                                } else if (scenario.rules.bounce) {
                                    targetMode = 'level2'; // Bounce only
                                } else {
                                    targetMode = 'level1'; // Basic only
                                }
                            } else {
                                targetMode = 'level4'; // Default to all rules
                            }
                        }

                        // Switch game mode if needed (but don't reset the board yet)
                        if (enableAI && game.gameMode !== targetMode) {
                            console.log(`Switching to ${targetMode} mode for testing...`);
                            // Manually set mode without resetting
                            game.gameMode = targetMode;
                            game.aiDifficulty = 'impossible';

                            // Create AI if needed
                            if (!game.ai) {
                                game.ai = game.createAI(game.aiDifficulty);
                            }
                        }

                        const options = {
                            currentPlayer: scenario.currentPlayer,
                            rules: scenario.rules
                        };

                        const success = game.loadBoardState(scenario.board, options);

                        if (success) {
                            // Force UI update
                            if (gameUI && gameUI.boardUI) {
                                gameUI.boardUI.updateBoard(game.getBoardState());
                            }

                            if (scenario.expectedMove) {
                                console.log(`Expected move: [${scenario.expectedMove.row}, ${scenario.expectedMove.col}]`);
                            }
                        }

                        return success;
                    },

                    /**
                     * List all available test scenarios
                     */
                    listScenarios: () => {
                        const names = getScenarioNames();
                        console.log('Available test scenarios:');
                        names.forEach(name => {
                            const scenario = TestScenarios[name];
                            console.log(`  - ${name}: ${scenario.description}`);
                        });
                        return names;
                    },

                    /**
                     * Get AI's suggested move for current position
                     */
                    getAIMove: async () => {
                        if (!game.ai) {
                            console.log('Creating AI...');
                            game.ai = game.createAI('impossible');
                        }

                        console.log('AI is thinking...');
                        const move = await game.ai.getMove(
                            game.getBoardState(),
                            game.getCurrentPlayer(),
                            game.bounceRuleEnabled,
                            game.missingTeethRuleEnabled,
                            game.wrapRuleEnabled
                        );

                        console.log(`AI suggests: [${move.row}, ${move.col}]`);
                        return move;
                    },

                    /**
                     * Make AI move automatically
                     */
                    makeAIMove: () => {
                        game.makeComputerMove();
                    },

                    /**
                     * Quick test: Load scenario and get AI response
                     * @param {string} scenarioName - Name of the scenario
                     * @param {boolean} autoPlay - If true, AI will automatically make move (default: false)
                     */
                    testScenario: async (scenarioName, autoPlay = false) => {
                        console.log('='.repeat(60));
                        const success = window.KalidaGame.debug.loadScenario(scenarioName, true);
                        if (!success) return;

                        console.log('\nCurrent board:');
                        console.log(game.exportBoardState('text'));

                        if (!autoPlay) {
                            console.log('\nGetting AI move suggestion...');
                            await window.KalidaGame.debug.getAIMove();
                        } else {
                            console.log('\nAI will play automatically...');
                        }
                        console.log('='.repeat(60));
                    },

                    /**
                     * Run through all scenarios and test AI
                     */
                    testAllScenarios: async () => {
                        const names = getScenarioNames();
                        console.log(`Testing ${names.length} scenarios...`);

                        for (const name of names) {
                            await window.KalidaGame.debug.testScenario(name);
                            // Small delay between tests
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }

                        console.log('All scenarios tested!');
                    },

                    /**
                     * Test if a specific move would win the game
                     * @param {number} row - Row index
                     * @param {number} col - Column index
                     * @param {string} player - Player ('X' or 'O', defaults to current player)
                     */
                    testMove: (row, col, player = null) => {
                        player = player || game.getCurrentPlayer();
                        const board = game.getBoardState();

                        console.log(`Testing move [${row},${col}] for player ${player}`);

                        // Check if position is empty
                        if (board[row][col] !== '') {
                            console.error(`Position [${row},${col}] is not empty!`);
                            return false;
                        }

                        // Create test board with the move
                        const testBoard = board.map(r => [...r]);
                        testBoard[row][col] = player;

                        // Check if this would win
                        const result = game.rules.checkWin(
                            testBoard,
                            row,
                            col,
                            game.bounceRuleEnabled,
                            game.missingTeethRuleEnabled,
                            game.wrapRuleEnabled
                        );

                        if (result.winner === player) {
                            console.log(`✓ YES! [${row},${col}] would WIN for ${player}`);
                            if (result.winningCells) {
                                console.log('Winning cells:', result.winningCells);
                            }
                            return true;
                        } else {
                            console.log(`✗ NO, [${row},${col}] would NOT win for ${player}`);
                            return false;
                        }
                    },

                    /**
                     * Test multiple positions to see which ones would win
                     * @param {Array} positions - Array of [row, col] positions
                     * @param {string} player - Player to test
                     */
                    testMoves: (positions, player = null) => {
                        player = player || game.getCurrentPlayer();
                        console.log(`Testing ${positions.length} positions for ${player}:`);

                        const winners = [];
                        positions.forEach(([row, col]) => {
                            const result = window.KalidaGame.debug.testMove(row, col, player);
                            if (result) {
                                winners.push([row, col]);
                            }
                        });

                        console.log(`\nSummary: ${winners.length}/${positions.length} positions would win`);
                        if (winners.length > 0) {
                            console.log('Winning positions:', winners);
                        }

                        return winners;
                    }
                }
            };
            console.log('Debug utilities available at window.KalidaGame.debug');
            console.log('Try: window.KalidaGame.debug.listScenarios()');
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
    
    // CHANGED: Actually show the tutorial instead of just logging
    console.log('First-time user detected - showing tutorial');
    
    // Show tutorial after a brief delay to ensure UI is fully loaded
    setTimeout(() => {
        showTutorialForNewUser(game);
    }, 1000); // 1 second delay to ensure everything is ready
}

/**
 * Show tutorial modal for new users
 * @param {Game} game - The game instance
 */
function showTutorialForNewUser(game) {
    try {
        // Get the GameUI instance from the global reference
        if (window.KalidaGame && window.KalidaGame.ui) {
            const gameUI = window.KalidaGame.ui;
            
            // Show the tutorial modal
            if (gameUI.tutorialModal && typeof gameUI.tutorialModal.show === 'function') {
                console.log('Showing tutorial modal for first-time user');
                gameUI.tutorialModal.show();
                
                // OPTIONAL: Mark tutorial as "seen" when they close it
                // You might want to add an event listener to mark it completed
                // when they finish or close the tutorial
            } else if (gameUI.showTutorial && typeof gameUI.showTutorial === 'function') {
                // Alternative method if showTutorial method exists
                console.log('Showing tutorial using showTutorial method');
                gameUI.showTutorial();
            } else {
                console.warn('Tutorial modal not available - UI may not be fully initialized');
                
                // FALLBACK: Try again after another delay
                setTimeout(() => {
                    if (window.KalidaGame && window.KalidaGame.ui && window.KalidaGame.ui.tutorialModal) {
                        window.KalidaGame.ui.tutorialModal.show();
                    }
                }, 2000);
            }
        } else {
            console.warn('GameUI not available in global scope for tutorial');
        }
    } catch (error) {
        console.error('Error showing tutorial for new user:', error);
    }
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

