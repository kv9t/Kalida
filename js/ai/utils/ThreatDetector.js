/**
 * ThreatDetector.js - Enhanced threat detection for Kalida
 * 
 * Detects various threats on the board:
 * - Immediate wins (4 in a row with an open end)
 * - Forced wins (3 in a row with two open ends)
 * - Developing threats (3 in a row with one open end)
 * - Pattern-based threats
 */
class ThreatDetector {
    /**
     * Create a new threat detector
     * @param {number} boardSize - Size of the game board
     * @param {Rules} rules - Game rules reference
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.winTrackGenerator = new WinTrackGenerator(boardSize, rules);
        
        // Threat levels and their priorities
        this.threatLevels = {
            IMMEDIATE_WIN: 100,      // 4 in a row with open end
            FORCED_WIN: 90,          // 3 in a row with two open ends
            DEVELOPING_THREAT: 70,   // 3 in a row with one open end
            POTENTIAL_THREAT: 50,    // 2 in a row with two open ends
            EARLY_THREAT: 30         // 2 in a row with one open end
        };
    }
    
    /**
     * Detect all threats on the board
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to find threats for ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of threat objects with position and priority
     */
    detectThreats(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        const threats = [];
        const opponent = player === 'X' ? 'O' : 'X';
        
        // 1. First check if we can win immediately
        const immediateWins = this.findImmediateWins(board, player, bounceRuleEnabled, missingTeethRuleEnabled);
        if (immediateWins.length > 0) {
            return immediateWins.map(pos => ({
                row: pos[0],
                col: pos[1],
                priority: this.threatLevels.IMMEDIATE_WIN,
                type: 'win'
            }));
        }
        
        // 2. Check if opponent has immediate wins (that we need to block)
        const opponentWins = this.findImmediateWins(board, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
        if (opponentWins.length > 0) {
            return opponentWins.map(pos => ({
                row: pos[0],
                col: pos[1],
                priority: this.threatLevels.IMMEDIATE_WIN - 1, // Slightly lower than our own win
                type: 'block'
            }));
        }
        
        // 3. Look for forced wins (3 in a row with two open ends)
        threats.push(...this.findForcedWins(board, player, bounceRuleEnabled, missingTeethRuleEnabled));
        
        // 4. Look for developing threats (3 in a row with one open end)
        threats.push(...this.findDevelopingThreats(board, player, bounceRuleEnabled, missingTeethRuleEnabled));
        
        // 5. Look for potential threats (2 in a row with two open ends)
        threats.push(...this.findPotentialThreats(board, player, bounceRuleEnabled, missingTeethRuleEnabled));
        
        // 6. Look for opponent's forced wins that we should block
        const opponentForced = this.findForcedWins(board, opponent, bounceRuleEnabled, missingTeethRuleEnabled);
        if (opponentForced.length > 0) {
            // Prioritize blocking opponent's forced win
            threats.push(...opponentForced.map(threat => ({
                row: threat.row,
                col: threat.col,
                priority: this.threatLevels.FORCED_WIN - 1, // Slightly lower than our own forced win
                type: 'block'
            })));
        }
        
        return threats;
    }
    
    /**
     * Find immediate win positions (4 in a row with open end)
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to find wins for ('X' or 'O')
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled 
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of winning positions [row, col]
     */
    findImmediateWins(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        const winningPositions = [];
        const allTracks = this.winTrackGenerator.generateAllWinTracks(bounceRuleEnabled);
        
        for (const track of allTracks) {
            // Check if this track has 4 of player's marks and 1 empty
            const positions = this.analyzeTrack(board, track, player);
            
            if (positions.player === 4 && positions.empty === 1 && positions.opponent === 0) {
                // Find the empty position
                const emptyPos = track.find(([row, col]) => board[row][col] === '');
                
                // Check if placing at this position would create a missing teeth scenario
                if (!missingTeethRuleEnabled || !this.wouldCreateMissingTeeth(board, emptyPos[0], emptyPos[1], player, track)) {
                    winningPositions.push(emptyPos);
                }
            }
        }
        
        return winningPositions;
    }
    
    /**
     * Find forced win positions (3 in a row with two open ends)
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to find forced wins for
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of threat objects with position and priority
     */
    findForcedWins(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        const threats = [];
        const allTracks = this.winTrackGenerator.generateAllWinTracks(bounceRuleEnabled);
        
        for (const track of allTracks) {
            // Check if this track has 3 of player's marks and 2 empty
            const positions = this.analyzeTrack(board, track, player);
            
            if (positions.player === 3 && positions.empty === 2 && positions.opponent === 0) {
                // Check if the empty positions are consecutive (critical for forced win)
                const emptyPositions = track.filter(([row, col]) => board[row][col] === '');
                const isConsecutive = this.arePositionsConsecutive(track, emptyPositions);
                
                // Only add if not creating missing teeth
                if (!missingTeethRuleEnabled || !this.wouldCreateMissingTeeth(board, emptyPositions[0][0], emptyPositions[0][1], player, track)) {
                    threats.push({
                        row: emptyPositions[0][0],
                        col: emptyPositions[0][1],
                        priority: isConsecutive ? this.threatLevels.FORCED_WIN : this.threatLevels.DEVELOPING_THREAT,
                        type: 'attack'
                    });
                }
                
                if (!missingTeethRuleEnabled || !this.wouldCreateMissingTeeth(board, emptyPositions[1][0], emptyPositions[1][1], player, track)) {
                    threats.push({
                        row: emptyPositions[1][0],
                        col: emptyPositions[1][1],
                        priority: isConsecutive ? this.threatLevels.FORCED_WIN : this.threatLevels.DEVELOPING_THREAT,
                        type: 'attack'
                    });
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Find developing threat positions (3 in a row with one open end)
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to find threats for
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of threat objects with position and priority
     */
    findDevelopingThreats(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        const threats = [];
        const allTracks = this.winTrackGenerator.generateAllWinTracks(bounceRuleEnabled);
        
        for (const track of allTracks) {
            // Check for 3 player marks and 1-2 empty spaces
            const positions = this.analyzeTrack(board, track, player);
            
            if (positions.player === 3 && positions.empty >= 1 && positions.opponent === 0) {
                // Get all empty positions
                const emptyPositions = track.filter(([row, col]) => board[row][col] === '');
                
                // Add threats for each empty position
                for (const [row, col] of emptyPositions) {
                    if (!missingTeethRuleEnabled || !this.wouldCreateMissingTeeth(board, row, col, player, track)) {
                        threats.push({
                            row,
                            col,
                            priority: this.threatLevels.DEVELOPING_THREAT,
                            type: 'develop'
                        });
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Find potential threat positions (2 in a row with two open ends)
     * @param {Array} board - 2D array representing the board state
     * @param {string} player - Player to find threats for
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @returns {Array} - Array of threat objects with position and priority
     */
    findPotentialThreats(board, player, bounceRuleEnabled, missingTeethRuleEnabled) {
        const threats = [];
        const allTracks = this.winTrackGenerator.generateAllWinTracks(bounceRuleEnabled);
        
        for (const track of allTracks) {
            // Check for 2 player marks and 3+ empty spaces
            const positions = this.analyzeTrack(board, track, player);
            
            if (positions.player === 2 && positions.empty >= 3 && positions.opponent === 0) {
                // Get all empty positions
                const emptyPositions = track.filter(([row, col]) => board[row][col] === '');
                
                // Check if the 2 player marks are consecutive
                const playerPositions = track.filter(([row, col]) => board[row][col] === player);
                const consecutive = this.arePositionsConsecutive(track, playerPositions);
                
                // Add threats for each empty position
                for (const [row, col] of emptyPositions) {
                    if (!missingTeethRuleEnabled || !this.wouldCreateMissingTeeth(board, row, col, player, track)) {
                        // If the position is adjacent to an existing player mark, it's more valuable
                        const adjacentToPlayer = this.isAdjacentInTrack(track, [row, col], playerPositions);
                        
                        threats.push({
                            row,
                            col,
                            priority: adjacentToPlayer 
                                ? (consecutive ? this.threatLevels.POTENTIAL_THREAT : this.threatLevels.EARLY_THREAT)
                                : this.threatLevels.EARLY_THREAT - 10,
                            type: 'develop'
                        });
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Analyze a track to count player's marks, opponent's marks, and empty spaces
     * @param {Array} board - 2D array representing the board state 
     * @param {Array} track - Array of positions forming a track
     * @param {string} player - Player to analyze for ('X' or 'O')
     * @returns {Object} - Counts of player marks, opponent marks, and empty spaces
     */
    analyzeTrack(board, track, player) {
        const opponent = player === 'X' ? 'O' : 'X';
        let playerCount = 0;
        let opponentCount = 0;
        let emptyCount = 0;
        
        for (const [row, col] of track) {
            if (board[row][col] === player) {
                playerCount++;
            } else if (board[row][col] === opponent) {
                opponentCount++;
            } else {
                emptyCount++;
            }
        }
        
        return {
            player: playerCount,
            opponent: opponentCount,
            empty: emptyCount
        };
    }
    
    /**
     * Check if positions are consecutive within a track
     * @param {Array} track - Array of positions forming a track
     * @param {Array} positions - Array of positions to check
     * @returns {boolean} - Whether the positions are consecutive
     */
    arePositionsConsecutive(track, positions) {
        if (positions.length < 2) return true;
        
        // Create a map of track indices for each position
        const positionIndices = new Map();
        for (let i = 0; i < track.length; i++) {
            const [row, col] = track[i];
            positionIndices.set(`${row},${col}`, i);
        }
        
        // Get indices of our target positions
        const indices = positions.map(([row, col]) => 
            positionIndices.get(`${row},${col}`)
        ).sort((a, b) => a - b);
        
        // Check if indices are consecutive
        for (let i = 1; i < indices.length; i++) {
            if (indices[i] !== indices[i-1] + 1) {
                // Check for wrap around the end of the track
                if (!(indices[i-1] === track.length - 1 && indices[i] === 0)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Check if a position is adjacent to any of the specified positions within a track
     * @param {Array} track - Array of positions forming a track
     * @param {Array} position - Position to check [row, col]
     * @param {Array} otherPositions - Positions to check against
     * @returns {boolean} - Whether the position is adjacent to any other position
     */
    isAdjacentInTrack(track, position, otherPositions) {
        // Create a map of track indices for each position
        const positionIndices = new Map();
        for (let i = 0; i < track.length; i++) {
            const [row, col] = track[i];
            positionIndices.set(`${row},${col}`, i);
        }
        
        const posIndex = positionIndices.get(`${position[0]},${position[1]}`);
        
        for (const otherPos of otherPositions) {
            const otherIndex = positionIndices.get(`${otherPos[0]},${otherPos[1]}`);
            
            // Check if adjacent (next to each other in the track)
            if (Math.abs(posIndex - otherIndex) === 1) {
                return true;
            }
            
            // Also check wrap-around case
            if ((posIndex === 0 && otherIndex === track.length - 1) ||
                (posIndex === track.length - 1 && otherIndex === 0)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if placing a mark would create a missing teeth scenario
     * @param {Array} board - 2D array representing the board state
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @param {string} player - Player making the move
     * @param {Array} track - The track to check
     * @returns {boolean} - Whether the move would create missing teeth
     */
    wouldCreateMissingTeeth(board, row, col, player, track) {
        // Create a copy of the board with the move applied
        const tempBoard = board.map(row => [...row]);
        tempBoard[row][col] = player;
        
        // Get all player positions in this track
        const playerPositions = track.filter(([r, c]) => tempBoard[r][c] === player);
        
        // If we don't have enough pieces for a win, missing teeth isn't relevant yet
        if (playerPositions.length < 5) return false;
        
        // Check if the player positions are consecutive in the track
        // If they're not consecutive, there are missing teeth
        return !this.arePositionsConsecutive(track, playerPositions);
    }
}