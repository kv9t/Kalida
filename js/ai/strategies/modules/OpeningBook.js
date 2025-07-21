/**
 * OpeningBook.js - Strategic opening moves for the AI
 * This module handles the early game strategy with improved win-track awareness
 */
// From the modules/ subdirectory, go up to ai/ level
import BoardEvaluator from '../../evaluation/BoardEvaluator.js';
import ThreatDetector from '../../utils/ThreatDetector.js';
import WinTrackGenerator from '../../utils/WinTrackGenerator.js';
import AIPlayer from '../../AIPlayer.js';
import ImpossibleStrategy from '../ImpossibleStrategy.js';
import BounceUtils from '../../../utils/BounceUtils.js';

class OpeningBook {
    /**
     * Create a new opening book
     * @param {number} boardSize - Size of the game board
     */
    constructor(boardSize) {
        this.boardSize = boardSize;
        
        // Strategies based on game state
        this.strategies = {
            'empty': this.emptyBoardStrategy.bind(this),
            'center': this.centerResponseStrategy.bind(this),
            'corner': this.cornerResponseStrategy.bind(this),
            'edge': this.edgeResponseStrategy.bind(this),
            'centerOwned': this.centerOwnedStrategy.bind(this),
            'knightMove': this.knightMoveResponseStrategy.bind(this)
        };
        
        // Win directions for track evaluation
        this.directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal
            [1, -1]  // anti-diagonal
        ];
    }
    
    /**
     * Get a move from the opening book
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object|null} - Opening move { row, col } or null if none found
     */
    getMove(board, player, opponent) {
        // Count pieces to determine the game state
        const pieceCount = this.countPieces(board);
        const playerPieces = this.getPlayerPositions(board, player);
        const opponentPieces = this.getPlayerPositions(board, opponent);
        
        // Get coordinates of the board center
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        // First move: Always take center if available
        if (pieceCount === 0) {
            return this.strategies.empty(board, player, opponent);
        }
        
        // Check if opponent just made a knight move (exactly 2 opponent pieces with specific pattern)
        if (opponentPieces.length === 2 && playerPieces.length === 1) {
            const [x1, y1] = opponentPieces[0];
            const [x2, y2] = opponentPieces[1];
            const dx = Math.abs(x2 - x1);
            const dy = Math.abs(y2 - y1);
            
            // Check if this is a knight move pattern (2,1) or (1,2)
            if ((dx === 2 && dy === 1) || (dx === 1 && dy === 2)) {
                return this.strategies.knightMove(board, player, opponent, opponentPieces);
            }
        }
        
        // If center is taken by opponent, respond to that
        if (pieceCount === 1 && board[centerRow][centerCol] === opponent) {
            return this.strategies.center(board, player, opponent);
        }
        
        // If center is taken by us, build from there
        if (playerPieces.length > 0 && playerPieces.some(([row, col]) => 
            row === centerRow && col === centerCol)) {
            return this.strategies.centerOwned(board, player, opponent, opponentPieces);
        }
        
        // If opponent played in a corner, respond to that
        if (opponentPieces.length === 1) {
            const [row, col] = opponentPieces[0];
            // Check if opponent's piece is in a corner
            if (this.isCorner(row, col)) {
                return this.strategies.corner(board, player, opponent);
            }
        }
        
        // If opponent played on an edge, respond to that
        if (opponentPieces.length === 1) {
            const [row, col] = opponentPieces[0];
            const isEdge = row === 0 || row === this.boardSize - 1 || 
                         col === 0 || col === this.boardSize - 1;
            
            if (isEdge && !this.isCorner(row, col)) {
                return this.strategies.edge(board, player, opponent);
            }
        }
        
        // If we have 2+ in a row, try to extend the sequence
        if (pieceCount >= 3) {
            return this.findExtendSequenceMove(board, player, opponent);
        }
        
        // If nothing else matched, use win-track analysis to find the best move
        return this.findBestWinTrackMove(board, player, opponent);
    }
    
    /**
     * Strategy for an empty board
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    emptyBoardStrategy(board, player, opponent) {
        // Take the center
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        return { row: centerRow, col: centerCol };
    }
    
    /**
     * Strategy when opponent has taken the center
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    centerResponseStrategy(board, player, opponent) {
        // Take a corner (with a slight random element)
        const corners = [
            { row: 0, col: 0 },
            { row: 0, col: this.boardSize - 1 },
            { row: this.boardSize - 1, col: 0 },
            { row: this.boardSize - 1, col: this.boardSize - 1 }
        ];
        
        // Pick a random corner
        const randomIndex = Math.floor(Math.random() * corners.length);
        return corners[randomIndex];
    }
    
    /**
     * Strategy when opponent has taken a corner
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    cornerResponseStrategy(board, player, opponent) {
        // Take the center if available
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        if (board[centerRow][centerCol] === '') {
            return { row: centerRow, col: centerCol };
        }
        
        // Otherwise, take the opposite corner
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === opponent && this.isCorner(row, col)) {
                    // Calculate the opposite corner
                    const oppositeRow = this.boardSize - 1 - row;
                    const oppositeCol = this.boardSize - 1 - col;
                    
                    if (board[oppositeRow][oppositeCol] === '') {
                        return { row: oppositeRow, col: oppositeCol };
                    }
                }
            }
        }
        
        // If opposite corner is not available, take any other corner
        const corners = [
            [0, 0], [0, this.boardSize - 1], 
            [this.boardSize - 1, 0], [this.boardSize - 1, this.boardSize - 1]
        ];
        
        for (const [row, col] of corners) {
            if (board[row][col] === '') {
                return { row, col };
            }
        }
        
        // No good corner move, fall back to win-track analysis
        return this.findBestWinTrackMove(board, player, opponent);
    }
    
    /**
     * Strategy when opponent has taken an edge (not corner)
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    edgeResponseStrategy(board, player, opponent) {
        // Take the center if available
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        if (board[centerRow][centerCol] === '') {
            return { row: centerRow, col: centerCol };
        }
        
        // Find opponent's position
        let opponentRow = -1, opponentCol = -1;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === opponent) {
                    opponentRow = row;
                    opponentCol = col;
                    break;
                }
            }
            if (opponentRow >= 0) break;
        }
        
        // Try to take a position that forms a potential win track with center
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1], // Straight directions first
            [-1, -1], [-1, 1], [1, -1], [1, 1] // Diagonals second
        ];
        
        for (const [dx, dy] of directions) {
            const newRow = centerRow + dx;
            const newCol = centerCol + dy;
            
            if (newRow >= 0 && newRow < this.boardSize && 
                newCol >= 0 && newCol < this.boardSize &&
                board[newRow][newCol] === '') {
                
                // Check this doesn't align with opponent's piece
                if (!this.areAligned(centerRow, centerCol, newRow, newCol, opponentRow, opponentCol)) {
                    return { row: newRow, col: newCol };
                }
            }
        }
        
        // Fall back to win-track analysis
        return this.findBestWinTrackMove(board, player, opponent);
    }
    
    /**
     * Strategy when AI already owns the center
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {Array} opponentPieces - Array of opponent piece positions [[row, col], ...]
     * @returns {Object} - Best move { row, col }
     */
    centerOwnedStrategy(board, player, opponent, opponentPieces) {
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        // If we have multiple opponent pieces, use win-track analysis
        if (opponentPieces.length > 1) {
            return this.findBestWinTrackMove(board, player, opponent);
        }
        
        // With one opponent piece, try to play opposite from it for good board control
        // BUT only if this creates a potentially good win track
        if (opponentPieces.length === 1) {
            const [opponentRow, opponentCol] = opponentPieces[0];
            
            // Calculate position opposite from opponent's move
            const offsetRow = Math.min(this.boardSize - 1, Math.max(0, 
                Math.floor(2 * centerRow - opponentRow)));
            const offsetCol = Math.min(this.boardSize - 1, Math.max(0, 
                Math.floor(2 * centerCol - opponentCol)));
            
            // Make sure it's a valid empty position
            if (board[offsetRow][offsetCol] === '') {
                // Only choose this if it forms a potential win track with our center piece
                // AND is not aligned with opponent's pieces
                if (this.formsPotentialWinTrack(board, centerRow, centerCol, offsetRow, offsetCol, player) &&
                    !this.isAlignedWithAnyOpponent(board, centerRow, centerCol, offsetRow, offsetCol, opponent)) {
                    return { row: offsetRow, col: offsetCol };
                }
            }
        }
        
        // Find a move that creates a strong win track
        // Prioritize:
        // 1. Moves that create win tracks not aligned with opponent pieces
        // 2. Moves that are at a good strategic distance from center
        const possibleMoves = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    // Skip positions that don't form potential win tracks with center
                    if (!this.formsPotentialWinTrack(board, centerRow, centerCol, row, col, player)) {
                        continue;
                    }
                    
                    // Calculate a score for this move
                    let score = 0;
                    
                    // Higher score if not aligned with any opponent piece
                    if (!this.isAlignedWithAnyOpponent(board, centerRow, centerCol, row, col, opponent)) {
                        score += 50;
                    }
                    
                    // Favor positions at a good distance from center
                    const distance = Math.sqrt(Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2));
                    if (distance >= 2 && distance <= 3) {
                        score += 20;
                    }
                    
                    // Bonus for positions near edges (for bounce potential)
                    if (row <= 1 || row >= this.boardSize - 2 || 
                        col <= 1 || col >= this.boardSize - 2) {
                        score += 10;
                    }
                    
                    possibleMoves.push({ row, col, score });
                }
            }
        }
        
        // Sort moves by score (highest first)
        possibleMoves.sort((a, b) => b.score - a.score);
        
        // Return the best move if we found one
        if (possibleMoves.length > 0) {
            return { row: possibleMoves[0].row, col: possibleMoves[0].col };
        }
        
        // Fall back to a direction from center
        const directions = [
            [-1, -1], [-1, 1], [1, -1], [1, 1], // Diagonals first for better win potential
            [-1, 0], [1, 0], [0, -1], [0, 1]    // Then straight directions
        ];
        
        for (const [dx, dy] of directions) {
            const newRow = centerRow + dx;
            const newCol = centerCol + dy;
            
            if (newRow >= 0 && newRow < this.boardSize && 
                newCol >= 0 && newCol < this.boardSize &&
                board[newRow][newCol] === '') {
                return { row: newRow, col: newCol };
            }
        }
        
        // Last resort: any empty cell
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    return { row, col };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Strategy to respond to opponent's knight move
     * @param {Array} board - Current board state 
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @param {Array} opponentPieces - Opponent piece positions [[row, col], ...]
     * @returns {Object} - Best move { row, col }
     */
    knightMoveResponseStrategy(board, player, opponent, opponentPieces) {
        // This strategy specifically addresses the scenario where opponent has made a knight move
        // We want to find a move that:
        // 1. Forms a potential win track with our existing piece
        // 2. Is not aligned with any opponent pieces
        // 3. Ideally creates a "fork" or multiple threats
        
        // Find our piece
        let playerRow = -1, playerCol = -1;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    playerRow = row;
                    playerCol = col;
                    break;
                }
            }
            if (playerRow >= 0) break;
        }
        
        // Calculate potential win tracks from our piece
        const possibleMoves = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    // Check if this forms a win track with our piece
                    if (this.formsPotentialWinTrack(board, playerRow, playerCol, row, col, player)) {
                        let score = 0;
                        
                        // Higher score if not aligned with any opponent piece
                        if (!this.isAlignedWithAnyOpponent(board, playerRow, playerCol, row, col, opponent)) {
                            score += 50;
                        }
                        
                        // Bonus for positions at a good distance from our piece
                        const distance = Math.sqrt(Math.pow(row - playerRow, 2) + Math.pow(col - playerCol, 2));
                        if (distance >= 2 && distance <= 3) {
                            score += 10;
                        }
                        
                        // Bonus for positions that create multiple win tracks
                        const winTrackCount = this.countPotentialWinTracks(board, row, col, player);
                        score += winTrackCount * 15;
                        
                        possibleMoves.push({ row, col, score });
                    }
                }
            }
        }
        
        // Sort by score (highest first)
        possibleMoves.sort((a, b) => b.score - a.score);
        
        // Return the best move if found
        if (possibleMoves.length > 0) {
            return { row: possibleMoves[0].row, col: possibleMoves[0].col };
        }
        
        // Fall back to win-track analysis
        return this.findBestWinTrackMove(board, player, opponent);
    }
    
    /**
     * Find a move that extends an existing sequence
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object|null} - Move to extend a sequence or null if none found
     */
    findExtendSequenceMove(board, player, opponent) {
        const sequences = [];
        
        // Find all sequences of 2+ pieces in a row
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    // Check each direction
                    for (const [dx, dy] of this.directions) {
                        // Count consecutive pieces
                        let count = 1;
                        let emptyPositions = [];
                        let hasOpponent = false;
                        
                        // Look ahead in this direction
                        for (let i = 1; i < 5; i++) {
                            const newRow = row + i * dx;
                            const newCol = col + i * dy;
                            
                            if (newRow < 0 || newRow >= this.boardSize || 
                                newCol < 0 || newCol >= this.boardSize) {
                                break;
                            }
                            
                            if (board[newRow][newCol] === player) {
                                count++;
                            } else if (board[newRow][newCol] === '') {
                                emptyPositions.push({ row: newRow, col: newCol });
                                break;
                            } else {
                                hasOpponent = true;
                                break;
                            }
                        }
                        
                        // Look behind in this direction
                        for (let i = 1; i < 5; i++) {
                            const newRow = row - i * dx;
                            const newCol = col - i * dy;
                            
                            if (newRow < 0 || newRow >= this.boardSize || 
                                newCol < 0 || newCol >= this.boardSize) {
                                break;
                            }
                            
                            if (board[newRow][newCol] === player) {
                                count++;
                            } else if (board[newRow][newCol] === '') {
                                emptyPositions.push({ row: newRow, col: newCol });
                                break;
                            } else {
                                hasOpponent = true;
                                break;
                            }
                        }
                        
                        // If we found at least 2 in a row with an empty spot to extend
                        // and no opponent piece blocking
                        if (count >= 2 && emptyPositions.length > 0 && !hasOpponent) {
                            // Calculate priority based on sequence length and other factors
                            const priority = count * 10 + 
                                (emptyPositions.length > 1 ? 5 : 0) + 
                                (this.isNearEdge(emptyPositions[0].row, emptyPositions[0].col) ? 3 : 0);
                            
                            sequences.push({
                                count,
                                emptyPositions,
                                priority,
                                // Prioritize edge positions for bounce potential
                                isNearEdge: emptyPositions.some(pos => 
                                    this.isNearEdge(pos.row, pos.col)
                                )
                            });
                        }
                    }
                }
            }
        }
        
        // Sort sequences by priority (highest first)
        sequences.sort((a, b) => b.priority - a.priority);
        
        // Take the first empty position from the best sequence
        if (sequences.length > 0) {
            return sequences[0].emptyPositions[0];
        }
        
        // Fall back to general win-track analysis
        return this.findBestWinTrackMove(board, player, opponent);
    }
    
    /**
     * Find the best move based on win-track analysis
     * @param {Array} board - Current board state
     * @param {string} player - AI player marker ('X' or 'O')
     * @param {string} opponent - Opponent player marker ('O' or 'X')
     * @returns {Object} - Best move { row, col }
     */
    findBestWinTrackMove(board, player, opponent) {
        const moves = [];
        
        // Analyze each empty position
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    // Count potential win tracks
                    const playerWinTracks = this.countPotentialWinTracks(board, row, col, player);
                    const opponentWinTracks = this.countPotentialWinTracks(board, row, col, opponent);
                    
                    // Calculate a score for this position
                    let score = playerWinTracks * 10 + opponentWinTracks * 5;
                    
                    // Bonus for positions near edges (for bounce potential)
                    if (this.isNearEdge(row, col)) {
                        score += 5;
                    }
                    
                    // Bonus for positions that align with existing player pieces
                    if (this.alignsWithPlayerPiece(board, row, col, player)) {
                        score += 8;
                    }
                    
                    // Bonus for center and near-center positions
                    const centerDistance = this.distanceFromCenter(row, col);
                    if (centerDistance <= 1) {
                        score += 7;
                    } else if (centerDistance <= 2) {
                        score += 3;
                    }
                    
                    moves.push({ row, col, score });
                }
            }
        }
        
        // Sort by score (highest first)
        moves.sort((a, b) => b.score - a.score);
        
        // Return the best move if found
        if (moves.length > 0) {
            return { row: moves[0].row, col: moves[0].col };
        }
        
        // Last resort: first empty cell
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    return { row, col };
                }
            }
        }
        
        return null; // No valid move found
    }
    
    /**
     * Count the number of potential win tracks that pass through a position
     * @param {Array} board - Current board state
     * @param {number} row - Row of the position
     * @param {number} col - Column of the position
     * @param {string} player - Player marker ('X' or 'O')
     * @returns {number} - Number of potential win tracks
     */
    countPotentialWinTracks(board, row, col, player) {
        let count = 0;
        
        // Make a temporary move
        const tempBoard = this.copyBoard(board);
        tempBoard[row][col] = player;
        
        // Check each direction
        for (const [dx, dy] of this.directions) {
            // Count player pieces and empty spaces in both directions
            let playerCount = 1; // Include the temporary move
            let emptyCount = 0;
            let hasOpponent = false;
            
            // Check forward direction
            for (let i = 1; i < 5; i++) {
                const newRow = row + i * dx;
                const newCol = col + i * dy;
                
                if (newRow < 0 || newRow >= this.boardSize || 
                    newCol < 0 || newCol >= this.boardSize) {
                    break;
                }
                
                if (tempBoard[newRow][newCol] === player) {
                    playerCount++;
                } else if (tempBoard[newRow][newCol] === '') {
                    emptyCount++;
                } else {
                    hasOpponent = true;
                    break;
                }
            }
            
            // Check backward direction
            for (let i = 1; i < 5; i++) {
                const newRow = row - i * dx;
                const newCol = col - i * dy;
                
                if (newRow < 0 || newRow >= this.boardSize || 
                    newCol < 0 || newCol >= this.boardSize) {
                    break;
                }
                
                if (tempBoard[newRow][newCol] === player) {
                    playerCount++;
                } else if (tempBoard[newRow][newCol] === '') {
                    emptyCount++;
                } else {
                    hasOpponent = true;
                    break;
                }
            }
            
            // If there are enough spaces for a potential win (player + empty >= 5)
            // and no opponent piece blocking
            if (playerCount + emptyCount >= 5 && !hasOpponent) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Check if a position forms a potential win track with another position
     * @param {Array} board - Current board state
     * @param {number} row1 - Row of first position
     * @param {number} col1 - Column of first position
     * @param {number} row2 - Row of second position
     * @param {number} col2 - Column of second position
     * @param {string} player - Player marker ('X' or 'O')
     * @returns {boolean} - Whether they form a potential win track
     */
    formsPotentialWinTrack(board, row1, col1, row2, col2, player) {
        // Calculate the direction vector between the two positions
        const dx = row2 - row1;
        const dy = col2 - col1;
        
        // Check if they're on the same line
        if (dx === 0 && dy === 0) return false; // Same position
        
        // Normalize the direction
        const gcd = this.gcd(Math.abs(dx), Math.abs(dy));
        const normDx = dx / gcd;
        const normDy = dy / gcd;
        
        // Check for potential 5-in-a-row including these two positions
        // by looking in both directions
        let playerCount = 0;
        let emptyCount = 0;
        let hasOpponent = false;
        
        // Count the two specified positions
        playerCount += (board[row1][col1] === player || row1 === row2 && col1 === col2) ? 1 : 0;
        playerCount += (board[row2][col2] === player || row1 === row2 && col1 === col2) ? 1 : 0;
        
        // Check positions along the line (forward direction)
        for (let i = 1; i < 5; i++) {
            const newRow = row2 + i * normDx;
            const newCol = col2 + i * normDy;
            
            if (newRow < 0 || newRow >= this.boardSize || 
                newCol < 0 || newCol >= this.boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                playerCount++;
            } else if (board[newRow][newCol] === '') {
                emptyCount++;
            } else {
                hasOpponent = true;
                break;
            }
        }
        
        // Check positions along the line (backward direction)
        for (let i = 1; i < 5; i++) {
            const newRow = row1 - i * normDx;
            const newCol = col1 - i * normDy;
            
            if (newRow < 0 || newRow >= this.boardSize || 
                newCol < 0 || newCol >= this.boardSize) {
                break;
            }
            
            if (board[newRow][newCol] === player) {
                playerCount++;
            } else if (board[newRow][newCol] === '') {
                emptyCount++;
            } else {
                hasOpponent = true;
                break;
            }
        }
        
        // Check if there's potential for a win
        return (playerCount + emptyCount >= 5) && !hasOpponent;
    }
    
    /**
     * Check if three positions are aligned (on the same line)
     * @param {number} row1 - Row of first position
     * @param {number} col1 - Column of first position 
     * @param {number} row2 - Row of second position
     * @param {number} col2 - Column of second position
     * @param {number} row3 - Row of third position
     * @param {number} col3 - Column of third position
     * @returns {boolean} - Whether the positions are aligned
     */
    areAligned(row1, col1, row2, col2, row3, col3) {
        // Check if three points lie on the same line using the cross product
        // (x2-x1)*(y3-y1) - (y2-y1)*(x3-x1) = 0 if collinear
        return ((row2 - row1) * (col3 - col1) - (col2 - col1) * (row3 - row1) === 0);
    }
    
    /**
     * Check if a position is aligned with any opponent piece through another position
     * @param {Array} board - Current board state 
     * @param {number} row1 - Row of first position
     * @param {number} col1 - Column of first position
     * @param {number} row2 - Row of second position
     * @param {number} col2 - Column of second position
     * @param {string} opponent - Opponent marker ('X' or 'O')
     * @returns {boolean} - Whether the positions align with an opponent piece
     */
    isAlignedWithAnyOpponent(board, row1, col1, row2, col2, opponent) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === opponent) {
                    if (this.areAligned(row1, col1, row2, col2, row, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    /**
     * Check if a position aligns with any existing player piece
     * @param {Array} board - Current board state
     * @param {number} row - Row of the position
     * @param {number} col - Column of the position
     * @param {string} player - Player marker ('X' or 'O')
     * @returns {boolean} - Whether the position aligns with a player piece
     */
    alignsWithPlayerPiece(board, row, col, player) {
        for (const [dx, dy] of this.directions) {
            // Check both directions
            for (let dir = -1; dir <= 1; dir += 2) {
                for (let i = 1; i < 5; i++) {
                    const newRow = row + i * dx * dir;
                    const newCol = col + i * dy * dir;
                    
                    if (newRow < 0 || newRow >= this.boardSize || 
                        newCol < 0 || newCol >= this.boardSize) {
                        break;
                    }
                    
                    if (board[newRow][newCol] === player) {
                        return true;
                    } else if (board[newRow][newCol] !== '') {
                        break;
                    }
                }
            }
        }
        return false;
    }
    
    /**
     * Calculate the greatest common divisor of two numbers
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {number} - GCD of a and b
     */
    gcd(a, b) {
        if (b === 0) return a;
        return this.gcd(b, a % b);
    }
    
    /**
     * Get positions of a player's pieces
     * @param {Array} board - Current board state
     * @param {string} player - Player marker ('X' or 'O')
     * @returns {Array} - Array of positions [[row, col], ...]
     */
    getPlayerPositions(board, player) {
        const positions = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === player) {
                    positions.push([row, col]);
                }
            }
        }
        
        return positions;
    }
    
    /**
     * Count the number of pieces on the board
     * @param {Array} board - 2D array representing the game board
     * @returns {number} - Number of pieces
     */
    countPieces(board) {
        let count = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] !== '') {
                    count++;
                }
            }
        }
        return count;
    }
    
    /**
     * Check if a position is a corner
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean} - Whether the position is a corner
     */
    isCorner(row, col) {
        return (row === 0 || row === this.boardSize - 1) && 
               (col === 0 || col === this.boardSize - 1);
    }
    
    /**
     * Check if a position is near an edge
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {boolean} - Whether the position is near an edge
     */
    isNearEdge(row, col) {
        return row <= 1 || row >= this.boardSize - 2 || 
               col <= 1 || col >= this.boardSize - 2;
    }
    
    /**
     * Calculate the distance from center
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {number} - Distance from center
     */
    distanceFromCenter(row, col) {
        const centerRow = Math.floor(this.boardSize / 2);
        const centerCol = Math.floor(this.boardSize / 2);
        
        return Math.sqrt(Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2));
    }
    
    /**
     * Create a copy of the board
     * @param {Array} board - Original board
     * @returns {Array} - Copy of the board
     */
    copyBoard(board) {
        return board.map(row => [...row]);
    }
}

export default OpeningBook;