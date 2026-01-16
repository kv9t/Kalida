/**
 * UIAssetManager.js - Manages UI assets like SVG icons and visual elements
 * 
 * Handles swapping of SVG images based on game state changes,
 * keeping visual assets synchronized with game logic.
 */
class UIAssetManager {
    constructor() {
        // Asset mappings for different game states
        this.assetMappings = {
            gameMode: {
                'human': 'images/Kalida_frame366_human-v-human-mode.svg',
                'level1': 'images/Kalida_frame366_human-v-computer-mode.svg',
                'level2': 'images/Kalida_frame366_human-v-computer-mode.svg',
                'level3': 'images/Kalida_frame366_human-v-computer-mode.svg',
                'level4': 'images/Kalida_frame366_human-v-computer-mode.svg'
            },
            rules: {
                'level1': 'images/Mode=Basic.svg',
                'level2': 'images/Mode=Bounce.svg',
                'level3': 'images/Mode=Wrap.svg',
                'level4': 'images/Mode=All.svg',
                'basic': 'images/Mode=Basic.svg',
                'bounce': 'images/Mode=Bounce.svg',
                'wrap': 'images/Mode=Wrap.svg',
                'all': 'images/Mode=All.svg'
            }
        };
        
        // Cache DOM elements for better performance
        this.elements = {
            gameModeImg: null,
            rulesModeImg: null,
            turnIndicator: null
        };
        
        this.initializeElements();
    }
    
    /**
     * Initialize and cache DOM elements
     */
    initializeElements() {
        this.elements.gameModeImg = document.getElementById('game-mode-svg');
        this.elements.rulesModeImg = document.getElementById('rules-mode-svg');
        this.elements.turnIndicator = document.getElementById('turn-indicator');
        
        // Log warnings if elements are not found
        if (!this.elements.gameModeImg) {
            console.warn('UIAssetManager: game-mode-svg element not found');
        }
        if (!this.elements.rulesModeImg) {
            console.warn('UIAssetManager: rules-mode-svg element not found');
        }
        if (!this.elements.turnIndicator) {
            console.warn('UIAssetManager: turn-indicator element not found');
        }
    }
    
    /**
     * Update game mode SVG based on selected mode
     * @param {string} mode - Game mode ('human', 'level1', 'level2', etc.)
     */
    updateGameModeSVG(mode) {
        if (!this.elements.gameModeImg) {
            console.warn('UIAssetManager: Cannot update game mode SVG - element not found');
            return;
        }
        
        const imagePath = this.assetMappings.gameMode[mode];
        if (!imagePath) {
            console.warn(`UIAssetManager: No image mapping found for game mode: ${mode}`);
            return;
        }
        
        // Update the image source and alt text
        this.elements.gameModeImg.src = imagePath;
        this.elements.gameModeImg.alt = mode === 'human' ? 'Human vs Human' : 'Human vs Computer';
        
        console.log(`UIAssetManager: Updated game mode SVG to ${mode} (${imagePath})`);
    }
    
    /**
     * Update rules mode SVG based on selected rules
     * @param {string} rules - Rules mode ('level1', 'level2', etc. or 'basic', 'bounce', etc.)
     */
    updateRulesModeSVG(rules) {
        if (!this.elements.rulesModeImg) {
            console.warn('UIAssetManager: Cannot update rules mode SVG - element not found');
            return;
        }
        
        const imagePath = this.assetMappings.rules[rules];
        if (!imagePath) {
            console.warn(`UIAssetManager: No image mapping found for rules mode: ${rules}`);
            // Fallback to basic rules
            this.elements.rulesModeImg.src = this.assetMappings.rules['basic'];
            return;
        }
        
        // Update the image source and alt text
        this.elements.rulesModeImg.src = imagePath;
        this.elements.rulesModeImg.alt = `Rules: ${rules}`;
        
        console.log(`UIAssetManager: Updated rules mode SVG to ${rules} (${imagePath})`);
    }
    
    /**
     * Update turn indicator text based on current player and game state
     * @param {string} player - Current player ('X' or 'O') - ignored if personalizedText is provided
     * @param {string} gameState - Game state ('playing', 'win', 'draw', 'match_complete')
     * @param {string} personalizedText - Optional personalized text to display (overrides default)
     */
    updateTurnIndicator(player, gameState = 'playing', personalizedText = null) {
        if (!this.elements.turnIndicator) {
            console.warn('UIAssetManager: Cannot update turn indicator - element not found');
            return;
        }

        let text = '';

        // Use personalized text if provided
        if (personalizedText) {
            text = personalizedText;
        } else {
            // Fallback to generic text (should rarely be used now)
            switch(gameState) {
                case 'win':
                    text = `PLAYER ${player} WINS!`;
                    break;
                case 'draw':
                    text = 'DRAW!';
                    break;
                case 'match_complete':
                    text = `PLAYER ${player} WINS MATCH!`;
                    break;
                case 'playing':
                default:
                    text = `PLAYER ${player}'S TURN`;
                    break;
            }
        }

        this.elements.turnIndicator.textContent = text;

        console.log(`UIAssetManager: Updated turn indicator to "${text}"`);
    }
    
    /**
     * Determine rules mode based on current game settings
     * @param {Object} gameSettings - Current game rule settings
     * @returns {string} - Rules mode identifier
     */
    determineRulesMode(gameSettings) {
        const { bounceRuleEnabled, wrapRuleEnabled, missingTeethRuleEnabled } = gameSettings;
        
        // Determine the rules combination
        if (!bounceRuleEnabled && !wrapRuleEnabled) {
            return 'basic';
        } else if (bounceRuleEnabled && !wrapRuleEnabled) {
            return 'bounce';
        } else if (!bounceRuleEnabled && wrapRuleEnabled) {
            return 'wrap';
        } else if (bounceRuleEnabled && wrapRuleEnabled) {
            return 'all';
        }
        
        // Fallback
        return 'basic';
    }
    
    /**
     * Update rules based on game mode (for AI modes)
     * @param {string} gameMode - Current game mode
     */
    updateRulesForGameMode(gameMode) {
        // For AI modes, the rules are determined by the level
        if (gameMode !== 'human') {
            this.updateRulesModeSVG(gameMode);
        }
    }
    
    /**
     * Update rules based on current game settings (for human mode)
     * @param {Object} gameSettings - Current game rule settings
     */
    updateRulesForSettings(gameSettings) {
        const rulesMode = this.determineRulesMode(gameSettings);
        this.updateRulesModeSVG(rulesMode);
    }
    
    /**
     * Refresh all elements (useful after DOM changes)
     */
    refresh() {
        this.initializeElements();
    }
    
    /**
     * Add a new asset mapping
     * @param {string} category - Asset category ('gameMode' or 'rules')
     * @param {string} key - Asset key
     * @param {string} path - Path to the asset
     */
    addAssetMapping(category, key, path) {
        if (!this.assetMappings[category]) {
            this.assetMappings[category] = {};
        }
        this.assetMappings[category][key] = path;
        console.log(`UIAssetManager: Added asset mapping ${category}.${key} = ${path}`);
    }
    
    /**
     * Get current asset mappings (for debugging)
     * @returns {Object} - Current asset mappings
     */
    getAssetMappings() {
        return { ...this.assetMappings };
    }
}

export default UIAssetManager;