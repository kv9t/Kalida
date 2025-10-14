/**
 * TestScenarios.js - Library of predefined board states for testing
 *
 * Contains common scenarios to test AI behavior:
 * - Missed blocks
 * - Missed wins
 * - Bounce patterns
 * - Wrap patterns
 * - Complex threat scenarios
 */

const TestScenarios = {
    /**
     * Basic scenarios
     */
    'missed-block': {
        name: 'Missed Block',
        description: 'O has 4 in a row, AI should block at [0,4]',
        board: `
            . . . . . .
            . O O O O .
            . . . . . .
            . X . . . .
            . . X . . .
            . . . X . .
        `,
        currentPlayer: 'X',
        rules: { bounce: false, wrap: false, missingTeeth: true },
        expectedMove: { row: 1, col: 5 }, // Block the win
        notes: 'AI should immediately block the threat'
    },

    'missed-win': {
        name: 'Missed Win',
        description: 'AI has 4 in a row and should win',
        board: `
            . . . . . .
            . X X X X .
            . . . . . .
            . O . . . .
            . . O . . .
            . . . . . .
        `,
        currentPlayer: 'X',
        rules: { bounce: false, wrap: false, missingTeeth: true },
        expectedMove: { row: 1, col: 5 }, // Win the game
        notes: 'AI should take the winning move'
    },

    'fork-threat': {
        name: 'Fork Threat',
        description: 'X creates two winning threats at once',
        board: `
            . X . . . .
            . . X . . .
            . . . X . .
            O . . . . .
            . O . . . .
            . . . . . .
        `,
        currentPlayer: 'X',
        rules: { bounce: false, wrap: false, missingTeeth: true },
        notes: 'AI should create a position where opponent cannot block both threats'
    },

    'bounce-opportunity': {
        name: 'Bounce Opportunity',
        description: 'AI can create a bounce pattern win',
        board: `
            . . . . . X
            . . . . X .
            . . . X . .
            O . . . . .
            . O . . . .
            . . . . . .
        `,
        currentPlayer: 'X',
        rules: { bounce: true, wrap: false, missingTeeth: true },
        expectedMove: { row: 0, col: 4 }, // Creates bounce pattern
        notes: 'With bounce enabled, AI should spot the diagonal bounce opportunity'
    },

    'missed-bounce-block': {
        name: 'Missed Bounce Block',
        description: 'O is setting up a bounce pattern, AI must block',
        board: `
            O . . . . .
            . O . . . .
            . . O . . .
            X . . . . .
            . X . . . .
            . . . . . .
        `,
        currentPlayer: 'X',
        rules: { bounce: true, wrap: false, missingTeeth: true },
        notes: 'AI must recognize and block the bounce threat'
    },

    'wrap-diagonal': {
        name: 'Diagonal Wrap',
        description: 'AI can use diagonal wrap to win',
        board: `
            X . . . . .
            . X . . . .
            . . . . . .
            . . . . . .
            . . . . . O
            . . . . O .
        `,
        currentPlayer: 'X',
        rules: { bounce: false, wrap: true, missingTeeth: true },
        notes: 'With wrap enabled, diagonal can wrap around edges'
    },

    'center-control': {
        name: 'Center Control',
        description: 'Early game - AI should contest center',
        board: `
            . . . . . .
            . . . . . .
            . . O . . .
            . . . . . .
            . . . . . .
            . . . . . .
        `,
        currentPlayer: 'X',
        rules: { bounce: true, wrap: true, missingTeeth: true },
        notes: 'AI should aim for center control in early game'
    },

    'complex-threat': {
        name: 'Complex Threat',
        description: 'Multiple simultaneous threats',
        board: `
            . . O . . .
            X . O . . .
            . X O . . .
            . . X . . .
            . . . X . O
            . . . . . .
        `,
        currentPlayer: 'O',
        rules: { bounce: true, wrap: true, missingTeeth: true },
        notes: 'AI must prioritize threats correctly'
    },

    'edge-play': {
        name: 'Edge Play',
        description: 'Playing near edges with bounce/wrap enabled',
        board: `
            X . . . . O
            . X . . O .
            . . . . . .
            . . . . . .
            . . . . . .
            . . . . . .
        `,
        currentPlayer: 'X',
        rules: { bounce: true, wrap: true, missingTeeth: true },
        notes: 'Edge positions become more valuable with bounce/wrap'
    },

    'defensive-play': {
        name: 'Defensive Play',
        description: 'AI must defend while under pressure',
        board: `
            . . O X . .
            . O . X . .
            O . . X . .
            . . . . . .
            . . . . . .
            . . . . . .
        `,
        currentPlayer: 'O',
        rules: { bounce: false, wrap: false, missingTeeth: true },
        notes: 'AI must block the immediate threat'
    },

    'empty-board': {
        name: 'Empty Board',
        description: 'Starting position - AI makes first move',
        board: `
            . . . . . .
            . . . . . .
            . . . . . .
            . . . . . .
            . . . . . .
            . . . . . .
        `,
        currentPlayer: 'X',
        rules: { bounce: true, wrap: true, missingTeeth: true },
        notes: 'AI should pick a strong opening move (typically center)'
    },

    'almost-full': {
        name: 'Almost Full Board',
        description: 'Late game with few options',
        board: `
            X O X O X O
            O X O X O X
            X O X O X O
            O X O X O X
            X O X O . O
            O X O X O X
        `,
        currentPlayer: 'X',
        rules: { bounce: true, wrap: true, missingTeeth: true },
        notes: 'AI must make the best of limited options'
    },

    'double-bounce': {
        name: 'Double Bounce',
        description: 'Complex bounce pattern with two bounces',
        board: `
            . . . . . X
            . . . . . .
            . . . . . .
            . . . . . .
            X . . . . .
            . X . . . .
        `,
        currentPlayer: 'X',
        rules: { bounce: true, wrap: false, missingTeeth: true },
        notes: 'Can create winning pattern with double bounce'
    },
        'double-bounce-wide': {
        name: 'Double Bounce Wide',
        description: 'Complex bounce pattern with two bounces',
        board: `
            . . . . . .
            O . . . . .
            . X O . . .
            X . . O . .
            . X . X . .
            . . . . . .
        `,
        currentPlayer: 'O',
        rules: { bounce: true, wrap: false, missingTeeth: true },
        notes: 'Imminent winning pattern with wide double bounce, missing bounce square'
    },
            'Win-in-2': {
        name: 'Win in 2 steps',
        description: 'O has a forced win in 2 steps',
        board: `
            . . . . . .
            . . . . O .
            . . O O . .
            . X O X . .
            X . O X . .
            . X X . . .
        `,
        currentPlayer: 'O',
        rules: { bounce: true, wrap: false, missingTeeth: true },
        notes: '0 should be selecting 1,4 or 0,5 or 5,0 to create a forced win in 2 moves'
    },
                    'fork-play': {
        name: 'Stop Fork',
        description: 'o must place in 3,2 to stop x creating a fork',
        board: `
            o . o . . .
            o x x . x .
            . . o . . .
            . . o o . x
            . x . . x .
            . . . x . .
        `,
        currentPlayer: 'O',
        rules: { bounce: true, wrap: true, missingTeeth: true },
        notes: 'Imminent winning pattern with wide double bounce, missing bounce square'
    },
                'blank-board': {
        name: 'Blank Board',
        description: 'Complex bounce pattern with two bounces',
        board: `
            . . . . . .
            . . . . . .
            . . . . . .
            . . . . . .
            . . . . . .
            . . . . . .
        `,
        currentPlayer: 'O',
        rules: { bounce: true, wrap: false, missingTeeth: true },
        notes: 'Imminent winning pattern with wide double bounce, missing bounce square'
    },

    'user-win-game-move9': {
        name: 'User Win - Critical Move 9',
        description: 'The exact position where AI failed to block forced win (before fix)',
        board: `
            . O . . . .
            O X X O X .
            X . X X . O
            . O O X . .
            X . X . . X
            O . . . . .
        `,
        currentPlayer: 'O',
        rules: { bounce: true, wrap: true, missingTeeth: true },
        expectedMove: { row: 4, col: 5 }, // Should block X's setup at [4,5]
        notes: `Critical test case from actual game loss.
                Move 9: X has [0,4], [1,2], [2,3], [3,3] creating diagonal
                X can play [4,5] then [5,4] for bounce win
                AI MUST block [4,5] or [5,0] (both lead to forced wins)
                Before fix: AI played [0,1] (wrong - only priority 70)
                After fix: AI should recognize [4,5] and [5,0] as priority 85+ threats`
    },

    'user-win-game-move10': {
        name: 'User Win - After Wrong Block',
        description: 'Position after AI made wrong move at [0,1] instead of blocking threat',
        board: `
            . O . . . .
            O X X O X .
            X . X X . O
            . O O X . .
            X . X . . X
            O . . . . .
        `,
        currentPlayer: 'X',
        rules: { bounce: true, wrap: true, missingTeeth: true },
        expectedMove: { row: 4, col: 5 }, // X plays the winning setup
        notes: `This is the position after AI blocked at [0,1] (wrong).
                X should now play [4,5] to set up the forced win.
                Next move X plays [5,4] with bounce for the win.
                This scenario proves AI's mistake was not blocking [4,5]`
    },

    'forced-bounce-win-setup': {
        name: 'Forced Bounce Win Setup',
        description: 'Generic 2-move forced win with bounce pattern',
        board: `
            . . . . X .
            . . . X . .
            . . X . . .
            O X . . . .
            . . . . . .
            . . . . . .
        `,
        currentPlayer: 'O',
        rules: { bounce: true, wrap: false, missingTeeth: true },
        expectedMove: { row: 4, col: 0 }, // Block the bounce completion
        notes: `X has diagonal [0,4] [1,3] [2,2] [3,1]
                X can play [4,0] then bounce to [5,0] for win
                AI must recognize this as priority 85+ threat and block it
                Tests the increased DEVELOPING_THREAT priority fix`
    }
};

/**
 * Get a test scenario by name
 * @param {string} name - Name of the scenario
 * @returns {Object|null} - Scenario object or null if not found
 */
export function getScenario(name) {
    const scenario = TestScenarios[name];
    if (!scenario) {
        console.error(`Scenario "${name}" not found`);
        console.log('Available scenarios:', Object.keys(TestScenarios).join(', '));
        return null;
    }
    return scenario;
}

/**
 * Get all scenario names
 * @returns {Array} - Array of scenario names
 */
export function getScenarioNames() {
    return Object.keys(TestScenarios);
}

/**
 * Get scenarios filtered by rules
 * @param {Object} rules - Rules filter { bounce, wrap }
 * @returns {Array} - Array of matching scenario names
 */
export function getScenariosByRules(rules) {
    return Object.keys(TestScenarios).filter(name => {
        const scenario = TestScenarios[name];
        if (!scenario.rules) return true; // Include scenarios without rule requirements

        if (rules.bounce !== undefined && scenario.rules.bounce !== rules.bounce) {
            return false;
        }
        if (rules.wrap !== undefined && scenario.rules.wrap !== rules.wrap) {
            return false;
        }

        return true;
    });
}

export default TestScenarios;
