/**
 * WinTrackGenerator.js - Generates all possible winning configurations
 * 
 * This utility generates all possible "win tracks" in the Kalida game,
 * including straight lines, wrapping lines, and bounce patterns.
 * A "win track" is any set of 6 cells that could potentially 
 * contain 5 marks by a player to form a winning line.
 */
class WinTrackGenerator {
    /**
     * Create a new win track generator
     * @param {number} boardSize - Size of the game board (typically 6)
     * @param {Rules} rules - Game rules reference
     */
    constructor(boardSize, rules) {
        this.boardSize = boardSize;
        this.rules = rules;
        this.winLength = 5; // Required marks in a row to win
        this.trackSize = 6;  // Size of a potential win track
        
        // Direction vectors: horizontal, vertical, diagonal, anti-diagonal
        this.directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal
            [1, -1]  // anti-diagonal
        ];
        
        // Cache for generated tracks
        this.cachedTracks = null;
        this.cachedBouncePatterns = null;
    }
    
    /**
     * Generate all possible win tracks on the board
     * @param {boolean} includeBounce - Whether to include bounce patterns
     * @returns {Array} - Array of win tracks, where each track is an array of positions
     */
    generateAllWinTracks(includeBounce = true) {
        // Return cached tracks if available
        if (this.cachedTracks) {
            return includeBounce 
                ? [...this.cachedTracks, ...this.cachedBouncePatterns] 
                : this.cachedTracks;
        }
        
        const tracks = [];
        
        // 1. Generate standard straight and wrapping lines
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                for (const [dx, dy] of this.directions) {
                    const track = this.generateTrack(row, col, dx, dy);
                    if (track && !this.isDuplicateTrack(tracks, track)) {
                        tracks.push(track);
                    }
                }
            }
        }
        
        this.cachedTracks = tracks;
        
        // 2. Generate bounce patterns if requested
        if (includeBounce) {
            if (!this.cachedBouncePatterns) {
                this.cachedBouncePatterns = this.generateBounceTracks();
            }
            return [...tracks, ...this.cachedBouncePatterns];
        }
        
        return tracks;
    }
    
    /**
     * Generate a single win track starting from a position in a direction
     * @param {number} row - Starting row
     * @param {number} col - Starting column
     * @param {number} dx - Row direction
     * @param {number} dy - Column direction
     * @returns {Array|null} - Array of positions forming a track, or null if invalid
     */
    generateTrack(row, col, dx, dy) {
        const track = [];
        
        // Track needs to be exactly of trackSize length
        for (let i = 0; i < this.trackSize; i++) {
            // Calculate position with wrapping
            const newRow = (row + i * dx + this.boardSize) % this.boardSize;
            const newCol = (col + i * dy + this.boardSize) % this.boardSize;
            
            track.push([newRow, newCol]);
        }
        
        // If the track forms a loop (duplicates same position), it's invalid
        if (this.hasDuplicatePositions(track)) {
            return null;
        }
        
        return track;
    }
    
    /**
     * Generate all possible bounce pattern win tracks
     * @returns {Array} - Array of bounce pattern win tracks
     */
    generateBounceTracks() {
        const bounceTracks = [];
        const diagonalDirections = [
            [1, 1],   // diagonal down-right
            [1, -1],  // diagonal down-left
        ];
        
        // Try from every position on the board
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                for (const [dx, dy] of diagonalDirections) {
                    // For each position, try different bounce configurations
                    this.generateBounceTracksFromPosition(
                        row, col, dx, dy, bounceTracks
                    );
                }
            }
        }
        
        return bounceTracks;
    }
    
    /**
     * Generate bounce tracks from a specific starting position
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Initial row direction
     * @param {number} dy - Initial column direction
     * @param {Array} bounceTracks - Array to collect found bounce tracks
     */
    generateBounceTracksFromPosition(startRow, startCol, dx, dy, bounceTracks) {
        // Generate single bounce tracks (one direction change)
        this.generateSingleBounceTracks(startRow, startCol, dx, dy, bounceTracks);
        
        // Generate double bounce tracks (two direction changes)
        this.generateDoubleBounceTracks(startRow, startCol, dx, dy, bounceTracks);
    }
    
    /**
     * Generate single bounce win tracks from a position
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Initial row direction
     * @param {number} dy - Initial column direction
     * @param {Array} bounceTracks - Array to collect found bounce tracks
     */
    generateSingleBounceTracks(startRow, startCol, dx, dy, bounceTracks) {
        // Try all possible bounce points (positions where direction changes)
        for (let steps = 1; steps < this.winLength; steps++) {
            // Position before the bounce
            const bounceRow = (startRow + steps * dx + this.boardSize) % this.boardSize;
            const bounceCol = (startCol + steps * dy + this.boardSize) % this.boardSize;
            
            // Try horizontal bounce (change row direction)
            const trackHBounce = this.constructBounceTrack(
                startRow, startCol, dx, dy, 
                steps, -dx, dy
            );
            
            if (trackHBounce && !this.isDuplicateTrack(bounceTracks, trackHBounce)) {
                bounceTracks.push(trackHBounce);
            }
            
            // Try vertical bounce (change column direction)
            const trackVBounce = this.constructBounceTrack(
                startRow, startCol, dx, dy, 
                steps, dx, -dy
            );
            
            if (trackVBounce && !this.isDuplicateTrack(bounceTracks, trackVBounce)) {
                bounceTracks.push(trackVBounce);
            }
        }
    }
    
    /**
     * Generate double bounce win tracks from a position
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx - Initial row direction
     * @param {number} dy - Initial column direction
     * @param {Array} bounceTracks - Array to collect found bounce tracks
     */
    generateDoubleBounceTracks(startRow, startCol, dx, dy, bounceTracks) {
        // Try all possible first bounce points
        for (let firstSteps = 1; firstSteps < this.winLength - 1; firstSteps++) {
            // For each first bounce, try different second bounce positions
            for (let secondSteps = 1; secondSteps < this.winLength - firstSteps; secondSteps++) {
                // Try different bounce combinations
                // 1. Horizontal then horizontal bounce
                const trackHH = this.constructDoubleBounceTrack(
                    startRow, startCol, dx, dy,
                    firstSteps, -dx, dy,
                    secondSteps, dx, dy
                );
                
                if (trackHH && !this.isDuplicateTrack(bounceTracks, trackHH)) {
                    bounceTracks.push(trackHH);
                }
                
                // 2. Horizontal then vertical bounce
                const trackHV = this.constructDoubleBounceTrack(
                    startRow, startCol, dx, dy,
                    firstSteps, -dx, dy,
                    secondSteps, -dx, -dy
                );
                
                if (trackHV && !this.isDuplicateTrack(bounceTracks, trackHV)) {
                    bounceTracks.push(trackHV);
                }
                
                // 3. Vertical then horizontal bounce
                const trackVH = this.constructDoubleBounceTrack(
                    startRow, startCol, dx, dy,
                    firstSteps, dx, -dy,
                    secondSteps, -dx, -dy
                );
                
                if (trackVH && !this.isDuplicateTrack(bounceTracks, trackVH)) {
                    bounceTracks.push(trackVH);
                }
                
                // 4. Vertical then vertical bounce
                const trackVV = this.constructDoubleBounceTrack(
                    startRow, startCol, dx, dy,
                    firstSteps, dx, -dy,
                    secondSteps, dx, dy
                );
                
                if (trackVV && !this.isDuplicateTrack(bounceTracks, trackVV)) {
                    bounceTracks.push(trackVV);
                }
            }
        }
    }
    
    /**
     * Construct a single bounce track
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx1 - Initial row direction
     * @param {number} dy1 - Initial column direction
     * @param {number} bounceSteps - Steps until the bounce occurs
     * @param {number} dx2 - Row direction after bounce
     * @param {number} dy2 - Column direction after bounce
     * @returns {Array|null} - Array of positions forming a track, or null if invalid
     */
    constructBounceTrack(startRow, startCol, dx1, dy1, bounceSteps, dx2, dy2) {
        const track = [];
        let currentRow = startRow;
        let currentCol = startCol;
        
        // Pre-bounce section
        for (let i = 0; i < bounceSteps; i++) {
            track.push([currentRow, currentCol]);
            currentRow = (currentRow + dx1 + this.boardSize) % this.boardSize;
            currentCol = (currentCol + dy1 + this.boardSize) % this.boardSize;
        }
        
        // Position at bounce point
        track.push([currentRow, currentCol]);
        
        // Post-bounce section
        for (let i = 1; i < this.trackSize - bounceSteps; i++) {
            currentRow = (currentRow + dx2 + this.boardSize) % this.boardSize;
            currentCol = (currentCol + dy2 + this.boardSize) % this.boardSize;
            
            // Check if we've already visited this position
            if (track.some(pos => pos[0] === currentRow && pos[1] === currentCol)) {
                return null; // Invalid track (forms a loop)
            }
            
            track.push([currentRow, currentCol]);
        }
        
        return track.length === this.trackSize ? track : null;
    }
    
    /**
     * Construct a double bounce track
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {number} dx1 - Initial row direction
     * @param {number} dy1 - Initial column direction
     * @param {number} firstBounceSteps - Steps until first bounce
     * @param {number} dx2 - Row direction after first bounce
     * @param {number} dy2 - Column direction after first bounce
     * @param {number} secondBounceSteps - Steps from first to second bounce
     * @param {number} dx3 - Row direction after second bounce
     * @param {number} dy3 - Column direction after second bounce
     * @returns {Array|null} - Array of positions forming a track, or null if invalid
     */
    constructDoubleBounceTrack(
        startRow, startCol, dx1, dy1,
        firstBounceSteps, dx2, dy2,
        secondBounceSteps, dx3, dy3
    ) {
        const track = [];
        let currentRow = startRow;
        let currentCol = startCol;
        
        // Pre-first-bounce section
        for (let i = 0; i < firstBounceSteps; i++) {
            track.push([currentRow, currentCol]);
            currentRow = (currentRow + dx1 + this.boardSize) % this.boardSize;
            currentCol = (currentCol + dy1 + this.boardSize) % this.boardSize;
        }
        
        // First bounce point
        track.push([currentRow, currentCol]);
        
        // Between bounces section
        for (let i = 1; i < secondBounceSteps; i++) {
            currentRow = (currentRow + dx2 + this.boardSize) % this.boardSize;
            currentCol = (currentCol + dy2 + this.boardSize) % this.boardSize;
            
            // Check for loops
            if (track.some(pos => pos[0] === currentRow && pos[1] === currentCol)) {
                return null;
            }
            
            track.push([currentRow, currentCol]);
        }
        
        // Second bounce point
        currentRow = (currentRow + dx2 + this.boardSize) % this.boardSize;
        currentCol = (currentCol + dy2 + this.boardSize) % this.boardSize;
        
        // Check for loops again
        if (track.some(pos => pos[0] === currentRow && pos[1] === currentCol)) {
            return null;
        }
        
        track.push([currentRow, currentCol]);
        
        // Post-second-bounce section
        const remainingSteps = this.trackSize - track.length;
        for (let i = 1; i <= remainingSteps; i++) {
            currentRow = (currentRow + dx3 + this.boardSize) % this.boardSize;
            currentCol = (currentCol + dy3 + this.boardSize) % this.boardSize;
            
            // Check for loops
            if (track.some(pos => pos[0] === currentRow && pos[1] === currentCol)) {
                return null;
            }
            
            track.push([currentRow, currentCol]);
        }
        
        return track.length === this.trackSize ? track : null;
    }
    
    /**
     * Check if a track has duplicate positions
     * @param {Array} track - Array of positions [row, col]
     * @returns {boolean} - Whether the track has duplicates
     */
    hasDuplicatePositions(track) {
        const positionSet = new Set();
        
        for (const [row, col] of track) {
            const key = `${row},${col}`;
            if (positionSet.has(key)) {
                return true;
            }
            positionSet.add(key);
        }
        
        return false;
    }
    
    /**
     * Check if a track is a duplicate of an existing track
     * @param {Array} existingTracks - Array of existing tracks
     * @param {Array} newTrack - New track to check
     * @returns {boolean} - Whether the track is a duplicate
     */
    isDuplicateTrack(existingTracks, newTrack) {
        // Convert track to a more comparable form
        const trackSet = new Set(newTrack.map(pos => `${pos[0]},${pos[1]}`));
        
        for (const track of existingTracks) {
            // If two tracks have the same positions (regardless of order),
            // they're considered duplicates
            if (track.length !== newTrack.length) continue;
            
            const existingTrackSet = new Set(track.map(pos => `${pos[0]},${pos[1]}`));
            
            if (trackSet.size === existingTrackSet.size) {
                let allMatch = true;
                for (const pos of trackSet) {
                    if (!existingTrackSet.has(pos)) {
                        allMatch = false;
                        break;
                    }
                }
                
                if (allMatch) return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get all win tracks that include a specific position
     * @param {number} row - Row of the position
     * @param {number} col - Column of the position
     * @param {boolean} includeBounce - Whether to include bounce patterns
     * @returns {Array} - Array of tracks containing the position
     */
    getWinTracksContainingPosition(row, col, includeBounce = true) {
        const allTracks = this.generateAllWinTracks(includeBounce);
        return allTracks.filter(track => 
            track.some(pos => pos[0] === row && pos[1] === col)
        );
    }
    
    /**
     * Get all win tracks that include multiple positions
     * @param {Array} positions - Array of positions to include
     * @param {boolean} includeBounce - Whether to include bounce patterns
     * @returns {Array} - Array of tracks containing all the positions
     */
    getWinTracksContainingAll(positions, includeBounce = true) {
        const allTracks = this.generateAllWinTracks(includeBounce);
        
        return allTracks.filter(track => {
            // Check if all positions are in this track
            return positions.every(([row, col]) => 
                track.some(pos => pos[0] === row && pos[1] === col)
            );
        });
    }
}