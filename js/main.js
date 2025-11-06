/**
 * main.js - Entry point for Kalida game
 * Updated to handle cookie consent and initialization
 * Firebase integration for multiplayer support
 */

import Game from './core/Game.js';
import GameUI from './ui/GameUI.js';
import AIFactory from './ai/AIFactory.js';
import TestScenarios, { getScenario, getScenarioNames } from './utils/TestScenarios.js';

// Firebase imports for multiplayer functionality
import firebaseServices from './config/firebase-config.js';
const { app: firebaseApp, auth: firebaseAuth, db: firebaseDb } = firebaseServices;

// Authentication imports
import AuthManager from './auth/AuthManager.js';
import AuthUI from './ui/AuthUI.js';

// Room management imports
import RoomManager from './multiplayer/RoomManager.js';
import RoomUI from './ui/RoomUI.js';

// AI Feedback imports
import GameFlagManager from './utils/GameFlagManager.js';


// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Kalida game starting...');

    try {
        // Game configuration
        const BOARD_SIZE = 6;

        // Initialize Firebase authentication
        console.log('Initializing authentication...');
        const authManager = new AuthManager(firebaseAuth, firebaseDb);
        const authUI = new AuthUI(authManager);

        // Initialize game instance
        console.log('Creating Game instance...');
        const game = new Game(BOARD_SIZE);

        // Create AI factory and set it on the game
        console.log('Creating AI factory...');
        const aiFactory = new AIFactory(BOARD_SIZE, game.rules);
        game.setAIFactory(aiFactory);

        // Initialize room management first (needed by GameUI)
        console.log('Initializing room management...');
        const roomManager = new RoomManager(firebaseDb, authManager, game.cookieManager);
        const roomUI = new RoomUI(roomManager);

        // Initialize game flag manager for AI feedback
        console.log('Initializing AI feedback system...');
        const gameFlagManager = new GameFlagManager(firebaseDb, authManager);

        // Create game UI (with roomManager for turn checking)
        console.log('Creating GameUI...');
        const gameUI = new GameUI(game, roomManager);

        // Check for pending invite link before auth
        let pendingInviteRoomId = null;
        const urlParams = new URLSearchParams(window.location.search);
        const inviteRoomId = urlParams.get('invite');
        if (inviteRoomId) {
            pendingInviteRoomId = inviteRoomId;
            console.log('Pending invite detected:', inviteRoomId);
        }

        // Set up authentication state listener
        authManager.onAuthStateChange(async (user) => {
            console.log('Auth state change in main.js:', user ? 'Logged in' : 'Logged out');

            if (user) {
                // User is logged in - hide welcome modal, show game
                authUI.hideWelcomeModal();
                console.log('User authenticated:', user.email || 'Guest');

                // Initialize rooms
                await roomManager.initialize();

                // Load game state from current room
                const currentRoom = roomManager.getCurrentRoom();
                if (currentRoom) {
                    // Clear all visual highlights before loading new room state
                    gameUI.boardUI.clearHighlights();
                    await roomManager.loadGameStateFromRoom(currentRoom.id, game);
                    gameUI.updateAll();
                }

                // Show room selector and logout button
                roomUI.showRoomSelector();
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.style.display = 'block';
                }

                // Check for pending invite link
                if (pendingInviteRoomId) {
                    console.log('Processing invite for room:', pendingInviteRoomId);
                    const joinedRoom = await roomManager.joinRoomByInvite(pendingInviteRoomId);

                    if (joinedRoom) {
                        // Clear the invite parameter from URL
                        window.history.replaceState({}, document.title, window.location.pathname);

                        // Show success message
                        const playerXName = joinedRoom.players?.X?.displayName || 'Player X';
                        alert(`You've joined ${playerXName}'s game! You are Player O.`);

                        // Load the game state
                        gameUI.boardUI.clearHighlights();
                        await roomManager.loadGameStateFromRoom(joinedRoom.id, game);
                        gameUI.updateAll();
                    } else {
                        alert('Failed to join game. The room may be full or no longer available.');
                    }

                    // Clear the pending invite
                    pendingInviteRoomId = null;
                }

                // Check if we should show tutorial (only for authenticated users)
                try {
                    checkForTutorial(game, authManager);
                } catch (tutorialError) {
                    console.error('Error in tutorial check:', tutorialError);
                }
            } else {
                // User is logged out - show welcome modal, hide room selector
                if (pendingInviteRoomId) {
                    // Show message about needing to log in for invite
                    authUI.showWelcomeModal();
                    setTimeout(() => {
                        alert('Please log in or create an account to join this game!');
                    }, 500);
                } else {
                    authUI.showWelcomeModal();
                }
                roomUI.hideRoomSelector();
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.style.display = 'none';
                }
                console.log('User not authenticated, showing welcome screen');
            }
        });

        // Set up logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to logout?')) {
                    const result = await authManager.signOut();
                    if (result.success) {
                        console.log('User logged out successfully');
                        // The onAuthStateChange callback will handle UI updates
                    } else {
                        alert('Logout failed: ' + result.error);
                    }
                }
            });
        }

        // Listen to room changes and load game state
        roomManager.onRoomChange(async (currentRoom, allRooms) => {
            if (currentRoom) {
                console.log('Room changed, loading game state for:', currentRoom.name);
                // Clear all visual highlights before loading new room state
                gameUI.boardUI.clearHighlights();
                await roomManager.loadGameStateFromRoom(currentRoom.id, game);
                gameUI.updateAll();

                // Subscribe to real-time updates for remote rooms
                if (currentRoom.type === 'remote') {
                    roomManager.subscribeToRoom(currentRoom.id);
                } else {
                    roomManager.unsubscribeFromRoom();
                }
            }
        });

        // Listen to real-time room sync events
        roomManager.onRoomSync(async (updatedRoom) => {
            const currentRoom = roomManager.getCurrentRoom();

            // Only sync if this is the current room
            if (currentRoom && currentRoom.id === updatedRoom.id) {
                console.log('Real-time sync: Loading updated game state');
                gameUI.boardUI.clearHighlights();
                await roomManager.loadGameStateFromRoom(updatedRoom.id, game);
                gameUI.updateAll();
            }
        });

        // Auto-save game state to room on game events
        // Save on turnChange (after move completes and win check happens)
        game.on('turnChange', async () => {
            await roomManager.saveGameStateToRoom(game);
        });

        // Save on gameEnd (captures final game state with winner)
        game.on('gameEnd', async () => {
            await roomManager.saveGameStateToRoom(game);
        });

        // Save on gameReset (when starting new round)
        game.on('gameReset', async () => {
            await roomManager.saveGameStateToRoom(game);
        });

        // ===== AI FEEDBACK SYSTEM INTEGRATION =====

        // Track new game start
        game.on('gameReset', () => {
            const currentRoom = roomManager.getCurrentRoom();
            if (currentRoom && currentRoom.type === 'computer') {
                const rules = {
                    bounce: game.bounceRuleEnabled,
                    wrap: game.wrapRuleEnabled,
                    missingTeeth: game.missingTeethRuleEnabled,
                    knightMove: game.knightMoveRuleEnabled
                };
                gameFlagManager.startNewGame(game.gameMode, rules);
            }
        });

        // Record every move for context
        game.on('move', (moveData) => {
            const currentRoom = roomManager.getCurrentRoom();
            if (currentRoom && currentRoom.type === 'computer') {
                gameFlagManager.recordMove(
                    moveData.player,
                    { row: moveData.row, col: moveData.col },
                    game.getBoardState()
                );

                // Show flag button only after AI moves
                if (moveData.player === 'O') {
                    showFlagButton();
                }
            }
        });

        // Hide flag button on game reset/mode change
        game.on('gameReset', () => {
            hideFlagButton();
        });

        // Show/hide flag button based on room type
        roomManager.onRoomChange((currentRoom) => {
            if (currentRoom && currentRoom.type === 'computer') {
                // Will be shown after AI moves
            } else {
                hideFlagButton();
            }
        });

        // Helper functions for flag button visibility
        function showFlagButton() {
            const flagBtn = document.getElementById('flag-ai-btn');
            if (flagBtn) flagBtn.style.display = 'inline-flex';
        }

        function hideFlagButton() {
            const flagBtn = document.getElementById('flag-ai-btn');
            if (flagBtn) flagBtn.style.display = 'none';
        }

        // ===== FLAG MODAL UI HANDLERS =====

        const flagModal = document.getElementById('flag-modal');
        const flagBtn = document.getElementById('flag-ai-btn');
        const flagSubmitBtn = document.getElementById('flag-submit-btn');
        const flagCancelBtn = document.getElementById('flag-cancel-btn');
        const flagReasonSelect = document.getElementById('flag-reason');
        const flagCommentTextarea = document.getElementById('flag-comment');
        const flagSuccessMessage = document.getElementById('flag-success-message');
        const flagExportSection = document.getElementById('flag-export-section');
        const flagExportCode = document.getElementById('flag-export-code');
        const flagCopyExportBtn = document.getElementById('flag-copy-export-btn');

        // Open flag modal
        if (flagBtn) {
            flagBtn.addEventListener('click', () => {
                flagModal.classList.add('show');
                flagModal.style.display = 'flex';
                flagReasonSelect.value = '';
                flagCommentTextarea.value = '';
                flagSuccessMessage.classList.remove('show');
                flagExportSection.style.display = 'none';
            });
        }

        // Close flag modal
        if (flagCancelBtn) {
            flagCancelBtn.addEventListener('click', () => {
                flagModal.classList.remove('show');
                setTimeout(() => flagModal.style.display = 'none', 200);
            });
        }

        // Submit flag
        if (flagSubmitBtn) {
            flagSubmitBtn.addEventListener('click', async () => {
                const reason = flagReasonSelect.value;
                const comment = flagCommentTextarea.value.trim();

                if (!reason) {
                    alert('Please select a reason for flagging this move.');
                    return;
                }

                try {
                    flagSubmitBtn.disabled = true;
                    flagSubmitBtn.textContent = 'Submitting...';

                    const flagData = await gameFlagManager.flagLastAIMove(reason, comment);

                    // Show success message
                    flagSuccessMessage.classList.add('show');

                    // Show export section with test scenario code
                    flagExportSection.style.display = 'block';
                    flagExportCode.textContent = flagData.testScenarioExport.loadCommand;

                    // Reset button
                    flagSubmitBtn.disabled = false;
                    flagSubmitBtn.textContent = 'Submit Flag';

                    // Hide flag button (move already flagged)
                    hideFlagButton();

                    console.log('Flag submitted successfully:', flagData.flagId);

                } catch (error) {
                    console.error('Error submitting flag:', error);
                    alert('Error submitting flag. Please try again.');
                    flagSubmitBtn.disabled = false;
                    flagSubmitBtn.textContent = 'Submit Flag';
                }
            });
        }

        // Copy export code to clipboard
        if (flagCopyExportBtn) {
            flagCopyExportBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(flagExportCode.textContent);
                    flagCopyExportBtn.textContent = '✓ Copied!';
                    flagCopyExportBtn.classList.add('copied');

                    setTimeout(() => {
                        flagCopyExportBtn.textContent = 'Copy to Clipboard';
                        flagCopyExportBtn.classList.remove('copied');
                    }, 2000);
                } catch (error) {
                    console.error('Error copying to clipboard:', error);
                    alert('Failed to copy. Please select and copy manually.');
                }
            });
        }

        // Close modal on background click
        if (flagModal) {
            flagModal.addEventListener('click', (e) => {
                if (e.target === flagModal) {
                    flagModal.classList.remove('show');
                    setTimeout(() => flagModal.style.display = 'none', 200);
                }
            });
        }

        // ===== END AI FEEDBACK SYSTEM =====


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

            // NOTE: Tutorial check moved to auth state change handler
            // It now only shows AFTER user is authenticated
        });
        
        // Add a global reference for debugging
        if (typeof window !== 'undefined') {
            window.KalidaGame = {
                game: game,
                ui: gameUI,
                // Firebase services for multiplayer
                firebase: {
                    app: firebaseApp,
                    auth: firebaseAuth,
                    db: firebaseDb
                },
                // Authentication managers
                authManager: authManager,
                authUI: authUI,
                // Room management
                roomManager: roomManager,
                roomUI: roomUI,
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

                        try {
                            // Check if this would win (with timeout protection)
                            console.log('Checking win condition...');
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
                                if (result.bounceCellIndex !== undefined) {
                                    console.log('Bounce pattern detected at cell index:', result.bounceCellIndex);
                                }
                                return true;
                            } else {
                                console.log(`✗ NO, [${row},${col}] would NOT win for ${player}`);
                                return false;
                            }
                        } catch (error) {
                            console.error(`Error checking move [${row},${col}]:`, error);
                            console.error('This might indicate an infinite loop in bounce detection');
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
            console.log('Firebase services available at window.KalidaGame.firebase');
            console.log('Try: window.KalidaGame.firebase.auth, window.KalidaGame.firebase.db');
            console.log('Authentication: window.KalidaGame.authManager, window.KalidaGame.authUI');
            console.log('Room management: window.KalidaGame.roomManager, window.KalidaGame.roomUI');
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
 * @param {AuthManager} authManager - The auth manager instance
 */
async function checkForTutorial(game, authManager) {
    const user = authManager.getCurrentUser();
    if (!user) {
        console.log('No user logged in, skipping tutorial check');
        return;
    }

    // Check user's Firestore profile for hasSeenTutorial
    try {
        const hasSeenTutorial = await authManager.hasSeenTutorial();

        if (hasSeenTutorial) {
            console.log('User has already seen tutorial');
            return;
        }

        // First time user - show tutorial
        console.log('First-time user detected - showing tutorial');

        // Show tutorial after a brief delay to ensure UI is fully loaded
        setTimeout(() => {
            showTutorialForNewUser(game, authManager);
        }, 1000); // 1 second delay to ensure everything is ready
    } catch (error) {
        console.error('Error checking tutorial status:', error);
        // Fallback to cookie check if Firestore fails
        if (!game.wasTutorialCompleted()) {
            setTimeout(() => {
                showTutorialForNewUser(game, authManager);
            }, 1000);
        }
    }
}

/**
 * Show tutorial modal for new users
 * @param {Game} game - The game instance
 * @param {AuthManager} authManager - The auth manager instance
 */
function showTutorialForNewUser(game, authManager) {
    try {
        // Get the GameUI instance from the global reference
        if (window.KalidaGame && window.KalidaGame.ui) {
            const gameUI = window.KalidaGame.ui;

            // Show the tutorial modal
            if (gameUI.tutorialModal && typeof gameUI.tutorialModal.show === 'function') {
                console.log('Showing tutorial modal for first-time user');

                // Set callback to mark tutorial as seen when user closes it
                gameUI.tutorialModal.setOnCloseCallback(async () => {
                    await authManager.markTutorialAsSeen();
                    console.log('Tutorial marked as seen in user profile');
                });

                gameUI.tutorialModal.show();
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

