/**
 * GameFlagManager - Tracks game moves and allows flagging AI moves
 *
 * Captures move context and generates TestScenario-compatible exports
 * for easy debugging of AI behavior
 */

import { collection, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class GameFlagManager {
    constructor(db, authManager) {
        this.db = db;
        this.authManager = authManager;

        // Current game tracking
        this.currentGameContext = {
            gameId: this.generateGameId(),
            startedAt: Date.now(),
            gameMode: null,
            rules: null,
            moves: [], // Store all moves for context
            boardSize: 6
        };
    }

    /**
     * Start tracking a new game
     */
    startNewGame(gameMode, rules) {
        this.currentGameContext = {
            gameId: this.generateGameId(),
            startedAt: Date.now(),
            gameMode: gameMode,
            rules: {
                bounce: rules.bounce || false,
                wrap: rules.wrap || false,
                missingTeeth: rules.missingTeeth || false,
                knightMove: rules.knightMove || false
            },
            moves: [],
            boardSize: 6
        };

        console.log('GameFlagManager: Started tracking game', this.currentGameContext.gameId);
    }

    /**
     * Record a move
     */
    recordMove(player, position, boardState) {
        const moveData = {
            moveNumber: this.currentGameContext.moves.length + 1,
            player: player,
            position: { row: position.row, col: position.col },
            boardState: this.compressBoardState(boardState),
            timestamp: Date.now(),
            isAIMove: player === 'O' && this.currentGameContext.gameMode?.startsWith('level')
        };

        this.currentGameContext.moves.push(moveData);

        // Keep only last 20 moves to prevent memory issues
        if (this.currentGameContext.moves.length > 20) {
            this.currentGameContext.moves.shift();
        }
    }

    /**
     * Get the last AI move
     */
    getLastAIMove() {
        for (let i = this.currentGameContext.moves.length - 1; i >= 0; i--) {
            const move = this.currentGameContext.moves[i];
            if (move.isAIMove) {
                return move;
            }
        }
        return null;
    }

    /**
     * Flag the last AI move
     */
    async flagLastAIMove(reason, comment = '') {
        const aiMove = this.getLastAIMove();
        if (!aiMove) {
            console.warn('No AI move to flag');
            return null;
        }

        // Get board state BEFORE the AI move
        const moveIndex = this.currentGameContext.moves.indexOf(aiMove);
        const boardStateBefore = moveIndex > 0
            ? this.currentGameContext.moves[moveIndex - 1].boardState
            : this.createEmptyBoardState();

        const user = this.authManager.getCurrentUser();

        const flagId = this.generateFlagId();

        const flagData = {
            // Metadata
            flagId: flagId,
            flaggedAt: new Date().toISOString(),
            gameId: this.currentGameContext.gameId,

            // User info
            userId: user ? user.uid : 'anonymous',
            userDisplayName: user ? (user.displayName || user.email || 'Anonymous') : 'Anonymous',

            // Game context
            gameMode: this.currentGameContext.gameMode,
            aiLevel: this.currentGameContext.gameMode,
            rules: this.currentGameContext.rules,

            // Flag details
            flagReason: reason,
            userComment: comment,

            // Move context
            moveNumber: aiMove.moveNumber,
            aiMove: aiMove.position,
            boardStateBefore: boardStateBefore,
            boardStateAfter: aiMove.boardState,

            // Recent moves for context (last 5 moves before AI move)
            recentMoves: this.getRecentMoves(moveIndex, 5),

            // Export format for easy testing
            testScenarioExport: this.generateTestScenarioExport(
                boardStateBefore,
                aiMove,
                reason,
                comment,
                flagId // Pass the flagId
            )
        };

        // Save to Firestore using the flagId as the document ID
        try {
            const flagRef = doc(this.db, 'flaggedMoves', flagId);
            await setDoc(flagRef, flagData);
            console.log('Flag saved successfully:', flagId);
            return flagData;
        } catch (error) {
            console.error('Error saving flag:', error);
            throw error;
        }
    }

    /**
     * Get recent moves for context
     */
    getRecentMoves(upToIndex, count) {
        const startIndex = Math.max(0, upToIndex - count);
        return this.currentGameContext.moves
            .slice(startIndex, upToIndex)
            .map(move => ({
                moveNumber: move.moveNumber,
                player: move.player,
                position: move.position
            }));
    }

    /**
     * Generate TestScenario-compatible export
     */
    generateTestScenarioExport(boardState, aiMove, reason, comment, flagId) {
        const boardString = this.decompressBoardState(boardState);
        const scenarioName = `flagged-${reason}-${Date.now()}`.substring(0, 40);

        const expectedMove = this.determineExpectedMove(reason, aiMove);

        return {
            scenarioName: scenarioName,
            flagId: flagId,
            consoleCommand: `window.KalidaGame.debug.loadFlaggedScenario('${flagId}')`,
            testScenarioCode: `
    '${scenarioName}': {
        name: 'Flagged: ${this.formatReason(reason)}',
        description: '${comment || 'AI made a poor move at ' + JSON.stringify(aiMove.position)}',
        board: \`
${boardString}
        \`,
        currentPlayer: 'O',
        rules: ${JSON.stringify(this.currentGameContext.rules, null, 12)},
        ${expectedMove ? `expectedMove: ${JSON.stringify(expectedMove)}, // What AI should have done` : ''}
        notes: \`Flag reason: ${reason}
                User comment: ${comment || 'None'}
                AI played: [${aiMove.position.row}, ${aiMove.position.col}]\`
    }`.trim(),
            rawBoardState: boardString,
            loadCommand: `
// EASIEST WAY - Load directly from Firestore:
await window.KalidaGame.debug.loadFlaggedScenario('${flagId}')

// Or add to TestScenarios.js for permanent testing:
${this.generateTestScenarioCode(scenarioName, boardString, aiMove, reason, comment)}
            `.trim()
        };
    }

    /**
     * Generate complete TestScenario code block
     */
    generateTestScenarioCode(scenarioName, boardString, aiMove, reason, comment) {
        return `'${scenarioName}': {
    name: 'Flagged: ${this.formatReason(reason)}',
    description: '${comment || 'AI made a poor move'}',
    board: \`
${boardString}
    \`,
    currentPlayer: 'O',
    rules: ${JSON.stringify(this.currentGameContext.rules, null, 8)},
    notes: 'Flag reason: ${reason}. AI played: [${aiMove.position.row}, ${aiMove.position.col}]. ${comment}'
}`;
    }

    /**
     * Determine what move the AI should have made (if obvious)
     */
    determineExpectedMove(reason, aiMove) {
        // This is a placeholder - in the future could analyze board to suggest better move
        if (reason === 'missed_win' || reason === 'missed_block') {
            return null; // User should specify this
        }
        return null;
    }

    /**
     * Format reason for display
     */
    formatReason(reason) {
        const reasons = {
            'missed_win': 'Missed Win',
            'missed_block': 'Missed Block',
            'weak_position': 'Weak Position',
            'other': 'Poor Move'
        };
        return reasons[reason] || reason;
    }

    /**
     * Compress board state to string (like RoomManager does)
     */
    compressBoardState(board) {
        return board.flat().map(cell => cell || '0').join('');
    }

    /**
     * Decompress board state to TestScenario format
     */
    decompressBoardState(compressed) {
        const flat = compressed.split('').map(c => {
            if (c === '0' || c === '.') return '.';
            return c;
        });

        let output = '';
        for (let i = 0; i < 6; i++) {
            const row = flat.slice(i * 6, (i + 1) * 6);
            output += '            ' + row.join(' ') + '\n';
        }
        return output.trimEnd();
    }

    /**
     * Create empty board state
     */
    createEmptyBoardState() {
        return '0'.repeat(36); // 6x6 board of empty cells
    }

    /**
     * Generate unique game ID
     */
    generateGameId() {
        return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique flag ID
     */
    generateFlagId() {
        return `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default GameFlagManager;
