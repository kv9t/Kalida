/**
 * AIConstants.js - Constants for AI behavior and evaluation
 *
 * Centralizes all magic numbers used throughout the AI system
 * with clear documentation of their purpose.
 */

/**
 * Threat priority thresholds
 * These values determine how the AI classifies and responds to different types of threats
 */
export const THREAT_PRIORITIES = {
    // Immediate win - highest priority (4 in a row with one open end)
    IMMEDIATE_WIN: 100,

    // Forced win - creates two winning threats (3 in a row with two open ends)
    // Set to 90 to distinguish from developing threats
    FORCED_WIN: 90,

    // Critical opponent threat threshold
    // Only threats >= 85 are considered critical enough to interrupt our own strategy
    // Lowered from 90 to 85 to catch bounce pattern setups and near-wins
    CRITICAL_THREAT_THRESHOLD: 85,

    // Critical block threshold - opponent's immediate wins
    CRITICAL_BLOCK_THRESHOLD: 95,

    // Developing threat - significant (3 in a row with one open end)
    // Increased from 70 to 85 to better detect bounce pattern setups and 2-move forced wins
    DEVELOPING_THREAT: 85,

    // Medium priority threshold for opponent threats
    MEDIUM_THREAT_THRESHOLD: 40,

    // Potential threat (2 in a row with two open ends)
    POTENTIAL_THREAT: 50,

    // Early threat (2 in a row with one open end)
    EARLY_THREAT: 30
};

/**
 * Board evaluation weights
 * These weights determine how the AI scores different board positions
 */
export const EVALUATION_WEIGHTS = {
    // Terminal state values
    WIN: 10000,                 // Winning position
    WIN_THRESHOLD: 9000,        // Score above this indicates a winning move

    // Pattern values
    FOUR_IN_LINE: 1000,         // Four in a row (one away from winning)
    THREE_OPEN: 500,            // Three in a row with both ends open
    THREE_HALF_OPEN: 100,       // Three in a row with one end open
    TWO_OPEN: 50,               // Two in a row with both ends open
    TWO_HALF_OPEN: 10,          // Two in a row with one end open

    // Positional values
    CENTER_CONTROL: 5,          // Bonus for controlling center positions
    ISOLATED: 1,                // Value of an isolated piece

    // Move ordering bonuses
    ADJACENT_TO_OWN: 2,         // Bonus for being adjacent to own piece
    ADJACENT_TO_OPPONENT: 1,    // Bonus for being adjacent to opponent piece

    // Opponent evaluation discount
    OPPONENT_DISCOUNT: 0.8      // Multiply opponent scores by this factor
};

/**
 * Search configuration
 * Parameters that control the AI's search behavior
 */
export const SEARCH_CONFIG = {
    // Base search depth for minimax
    BASE_DEPTH: 4,

    // Search depths for different game phases
    EARLY_GAME_DEPTH: 5,        // Game progress < 20% (increased from 3)
    MID_GAME_DEPTH: 5,          // Game progress 20-70% (increased from 3)
    LATE_GAME_DEPTH: 6,         // Game progress > 70% (increased from 4)

    // Game phase thresholds
    EARLY_GAME_THRESHOLD: 0.2,  // Board filled < 20%
    LATE_GAME_THRESHOLD: 0.7,   // Board filled > 70%

    // Time limits
    TIME_LIMIT_MS: 1000,        // Maximum time for thinking (1 second)
    ITERATIVE_DEEPENING_START: 2, // Starting depth for iterative deepening

    // Cache settings
    CACHE_TTL: 10               // Cache entries expire after 10 moves
};

/**
 * Pattern detection configuration
 */
export const PATTERN_CONFIG = {
    // Minimum pattern length for special patterns
    MIN_BOUNCE_PATTERN: 3,      // Minimum pieces for bounce pattern consideration

    // Minimum priority for bounce pattern threats
    // Increased from 70 to 80 to better respect bounce pattern importance
    MIN_BOUNCE_PRIORITY: 80,

    // Opening book settings
    OPENING_BOOK_MOVES: 3,      // Use opening book for first N moves

    // Multiple threat threshold
    MULTIPLE_THREAT_COUNT: 2    // Consider blocking if position creates 2+ win tracks
};

/**
 * Strategic position values
 */
export const STRATEGIC_VALUES = {
    // Center region bonus
    CENTER_REGION_BONUS: 10,

    // Connectivity values
    ADJACENT_FRIENDLY: 3,       // Score for being adjacent to friendly piece
    ADJACENT_EMPTY: 1,          // Score for being adjacent to empty space (mobility)

    // Win track values
    VIABLE_TRACK_MULTIPLIER: 2  // Multiply viable track count by this
};

export default {
    THREAT_PRIORITIES,
    EVALUATION_WEIGHTS,
    SEARCH_CONFIG,
    PATTERN_CONFIG,
    STRATEGIC_VALUES
};
