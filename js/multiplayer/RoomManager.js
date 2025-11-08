/**
 * RoomManager - Manages game rooms
 *
 * Features:
 * - Create/delete rooms (Computer, Local, Remote)
 * - Store rooms in cookies (guests) or Firestore (logged-in users)
 * - Switch between rooms
 * - Generate room invite links
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class RoomManager {
    constructor(db, authManager, cookieManager) {
        this.db = db;
        this.authManager = authManager;
        this.cookieManager = cookieManager;
        this.rooms = [];
        this.currentRoomId = null;
        this.roomChangeCallbacks = [];
        this.isLoadingGameState = false; // Prevent recursion during load
        this.roomSubscription = null; // Track current room listener
        this.roomSyncCallbacks = []; // Callbacks for real-time room updates

        console.log('RoomManager initialized');
    }

    /**
     * Initialize rooms - load from cookies or Firestore
     */
    async initialize() {
        const user = this.authManager.getCurrentUser();

        if (user && !user.isAnonymous) {
            // Logged-in user: load from Firestore
            await this.loadRoomsFromFirestore(user.uid);
        } else {
            // Guest: load from cookies
            this.loadRoomsFromCookies();
        }

        // Create default room if no rooms exist
        if (this.rooms.length === 0) {
            await this.createDefaultRoom();
        }

        // Try to restore last room from cookies
        const lastRoomId = this.cookieManager.getLastRoom();
        if (lastRoomId && this.rooms.find(r => r.id === lastRoomId)) {
            this.currentRoomId = lastRoomId;
            console.log('Restored last room from cookies:', lastRoomId);
        } else {
            // Set current room to first room
            if (this.rooms.length > 0 && !this.currentRoomId) {
                this.currentRoomId = this.rooms[0].id;
            }
        }

        // Save current room to cookies
        if (this.currentRoomId) {
            this.cookieManager.saveLastRoom(this.currentRoomId);
        }

        console.log('Rooms initialized:', this.rooms);
        return this.rooms;
    }

    /**
     * Create a new room
     * @param {string} type - 'computer', 'local', or 'remote'
     * @param {string} opponentName - Name of opponent
     * @param {object} rules - Game rules
     * @returns {Promise<object>} Created room object
     */
    async createRoom(type, opponentName, rules = null) {
        const user = this.authManager.getCurrentUser();
        const roomId = this.generateRoomId();

        // Default rules
        const gameRules = rules || {
            bounce: true,
            wrap: true,
            missingTeeth: true,
            knightMove: true
        };

        const room = {
            id: roomId,
            type: type, // 'computer', 'local', 'remote'
            name: opponentName,
            createdBy: user ? user.uid : null,
            createdAt: new Date().toISOString(),
            rules: gameRules,
            scores: { X: 0, O: 0 },
            matchScores: { X: 0, O: 0 },
            status: type === 'remote' ? 'waiting' : 'active',
            lastMoveAt: null,
            lastMoveBy: null,
            // Game state
            gameMode: type === 'computer' ? 'level4' : 'human',
            boardState: this.createEmptyBoard(),
            currentPlayer: 'X',
            gameActive: true,
            moveCount: { X: 0, O: 0 },
            lastMove: null
        };

        // For remote rooms, add invite link and ready tracking
        if (type === 'remote') {
            room.inviteLink = `${window.location.origin}/?invite=${roomId}`;
            room.players = {
                X: { userId: user ? user.uid : null, displayName: user ? (user.displayName || 'You') : 'You' },
                O: null
            };
            room.readyPlayers = { X: false, O: false }; // Track who's ready for next game
        }

        // Add to local array
        this.rooms.push(room);

        // Save to appropriate storage
        if (user && !user.isAnonymous) {
            // Save all room types to Firestore for logged-in users
            await this.saveRoomToFirestore(room);
        } else {
            // Save to cookies (for guest users only)
            this.saveRoomsToCookies();
        }

        console.log('Room created:', room);
        this.notifyRoomChange();

        return room;
    }

    /**
     * Create default computer room
     */
    async createDefaultRoom() {
        return await this.createRoom('computer', 'COMPUTER');
    }

    /**
     * Delete a room or leave it (depending on ownership)
     * @param {string} roomId - Room ID to delete
     */
    async deleteRoom(roomId) {
        const user = this.authManager.getCurrentUser();
        const roomIndex = this.rooms.findIndex(r => r.id === roomId);

        if (roomIndex === -1) {
            console.error('Room not found:', roomId);
            return false;
        }

        const room = this.rooms[roomIndex];

        // Remove from local array
        this.rooms.splice(roomIndex, 1);

        // Delete from storage
        if (user && !user.isAnonymous) {
            // Check if user is the creator
            if (room.createdBy === user.uid) {
                // Creator: Hard delete from Firestore
                await this.deleteRoomFromFirestore(roomId, user.uid);
                console.log('Room deleted from Firestore (creator):', roomId);
            } else if (room.type === 'remote' && room.players) {
                // Non-creator: Leave the room (remove from players)
                await this.leaveRoom(roomId, user.uid);
                console.log('Left room (non-creator):', roomId);
            }
        } else {
            this.saveRoomsToCookies();
        }

        // If deleted room was current room, switch to another room
        if (this.currentRoomId === roomId) {
            if (this.rooms.length > 0) {
                this.currentRoomId = this.rooms[0].id;
            } else {
                // Create default room if no rooms left
                await this.createDefaultRoom();
                this.currentRoomId = this.rooms[0].id;
            }
        }

        this.notifyRoomChange();

        return true;
    }

    /**
     * Leave a room (remove yourself from players list)
     * @param {string} roomId - Room ID to leave
     * @param {string} userId - User ID leaving
     */
    async leaveRoom(roomId, userId) {
        try {
            const roomRef = doc(this.db, 'rooms', roomId);
            const roomDoc = await getDoc(roomRef);

            if (!roomDoc.exists()) {
                console.log('Room no longer exists:', roomId);
                return;
            }

            const roomData = roomDoc.data();
            const players = roomData.players || {};

            // Find which player slot the user has and remove them
            const updatedPlayers = { ...players };
            if (players.X?.userId === userId) {
                delete updatedPlayers.X;
            }
            if (players.O?.userId === userId) {
                delete updatedPlayers.O;
            }

            // Check if room is now empty (no players left)
            const hasPlayers = updatedPlayers.X || updatedPlayers.O;

            if (!hasPlayers && roomData.createdBy === userId) {
                // Room is empty and user is creator - delete it
                await deleteDoc(roomRef);
                console.log('Room deleted (no players left, creator leaving):', roomId);
            } else if (!hasPlayers) {
                // Room is empty but user is not creator - just mark as abandoned
                await updateDoc(roomRef, {
                    players: updatedPlayers,
                    status: 'abandoned'
                });
                console.log('Room marked as abandoned:', roomId);
            } else {
                // Update players list
                await updateDoc(roomRef, {
                    players: updatedPlayers,
                    status: 'waiting' // Back to waiting for opponent
                });
                console.log('User removed from room:', roomId);
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }

    /**
     * Switch to a different room
     * @param {string} roomId - Room ID to switch to
     */
    switchToRoom(roomId) {
        const room = this.rooms.find(r => r.id === roomId);

        if (!room) {
            console.error('Room not found:', roomId);
            return false;
        }

        this.currentRoomId = roomId;

        // Save to cookies so we remember the room on refresh
        this.cookieManager.saveLastRoom(roomId);

        console.log('Switched to room:', room);
        this.notifyRoomChange();

        return room;
    }

    /**
     * Get current room
     * @returns {object|null} Current room object
     */
    getCurrentRoom() {
        return this.rooms.find(r => r.id === this.currentRoomId) || null;
    }

    /**
     * Get all rooms
     * @returns {Array} All rooms
     */
    getAllRooms() {
        return this.rooms;
    }

    /**
     * Update room data
     * @param {string} roomId - Room ID
     * @param {object} updates - Data to update
     * @param {boolean} silent - If true, don't trigger room change callbacks
     */
    async updateRoom(roomId, updates, silent = false) {
        const room = this.rooms.find(r => r.id === roomId);

        if (!room) {
            console.error('Room not found:', roomId);
            return false;
        }

        // Update local data
        Object.assign(room, updates);

        // Save to storage
        const user = this.authManager.getCurrentUser();
        if (user && !user.isAnonymous) {
            await this.updateRoomInFirestore(roomId, updates);
        } else {
            this.saveRoomsToCookies();
        }

        // Only notify if not silent (don't reload state when auto-saving)
        if (!silent) {
            this.notifyRoomChange();
        }
        return true;
    }

    /**
     * Save rooms to cookies (for guests and local/computer rooms)
     */
    saveRoomsToCookies() {
        try {
            const roomsData = JSON.stringify(this.rooms);
            document.cookie = `kalida_rooms=${encodeURIComponent(roomsData)}; max-age=${30 * 24 * 60 * 60}; path=/`;
            console.log('Rooms saved to cookies');
        } catch (error) {
            console.error('Error saving rooms to cookies:', error);
        }
    }

    /**
     * Load rooms from cookies
     */
    loadRoomsFromCookies() {
        try {
            const cookies = document.cookie.split(';');
            const roomsCookie = cookies.find(c => c.trim().startsWith('kalida_rooms='));

            if (roomsCookie) {
                const roomsData = decodeURIComponent(roomsCookie.split('=')[1]);
                this.rooms = JSON.parse(roomsData);
                console.log('Rooms loaded from cookies:', this.rooms);
            }
        } catch (error) {
            console.error('Error loading rooms from cookies:', error);
            this.rooms = [];
        }
    }

    /**
     * Save room to Firestore (for remote rooms)
     */
    async saveRoomToFirestore(room) {
        try {
            const user = this.authManager.getCurrentUser();
            if (!user || user.isAnonymous) return;

            // Prepare room data for Firestore - compress boardState if it's an array
            const roomData = { ...room };
            if (roomData.boardState && Array.isArray(roomData.boardState)) {
                roomData.boardState = this.compressBoard(roomData.boardState);
            }

            const roomRef = doc(this.db, 'rooms', room.id);
            await setDoc(roomRef, {
                ...roomData,
                createdAt: serverTimestamp(),
                lastActivityAt: serverTimestamp()
            });

            console.log('Room saved to Firestore:', room.id);
        } catch (error) {
            console.error('Error saving room to Firestore:', error);
        }
    }

    /**
     * Load rooms from Firestore (for logged-in users)
     * Loads rooms created by user OR where user is a player
     */
    async loadRoomsFromFirestore(userId) {
        try {
            // Query 1: Rooms created by this user
            const createdByQuery = query(
                collection(this.db, 'rooms'),
                where('createdBy', '==', userId)
            );

            // Query 2: Rooms where user is Player X
            const playerXQuery = query(
                collection(this.db, 'rooms'),
                where('players.X.userId', '==', userId)
            );

            // Query 3: Rooms where user is Player O
            const playerOQuery = query(
                collection(this.db, 'rooms'),
                where('players.O.userId', '==', userId)
            );

            // Execute all queries in parallel
            const [createdSnapshot, playerXSnapshot, playerOSnapshot] = await Promise.all([
                getDocs(createdByQuery),
                getDocs(playerXQuery),
                getDocs(playerOQuery)
            ]);

            // Collect all rooms, using a Map to deduplicate by ID
            const roomsMap = new Map();

            [createdSnapshot, playerXSnapshot, playerOSnapshot].forEach(snapshot => {
                snapshot.forEach(doc => {
                    const roomData = doc.data();
                    // Skip abandoned rooms
                    if (roomData.status !== 'abandoned') {
                        roomsMap.set(doc.id, { ...roomData, id: doc.id });
                    }
                });
            });

            // Convert Map to array
            this.rooms = Array.from(roomsMap.values());

            console.log('Rooms loaded from Firestore:', this.rooms.length, 'rooms');
        } catch (error) {
            console.error('Error loading rooms from Firestore:', error);
            this.rooms = [];
        }
    }

    /**
     * Update room in Firestore
     */
    async updateRoomInFirestore(roomId, updates) {
        try {
            // Prepare updates for Firestore - compress boardState if it's an array
            const firestoreUpdates = { ...updates };
            if (firestoreUpdates.boardState && Array.isArray(firestoreUpdates.boardState)) {
                firestoreUpdates.boardState = this.compressBoard(firestoreUpdates.boardState);
            }

            const roomRef = doc(this.db, 'rooms', roomId);
            await updateDoc(roomRef, {
                ...firestoreUpdates,
                lastActivityAt: serverTimestamp()
            });

            console.log('Room updated in Firestore:', roomId);
        } catch (error) {
            console.error('Error updating room in Firestore:', error);
        }
    }

    /**
     * Delete room from Firestore
     */
    async deleteRoomFromFirestore(roomId, userId) {
        try {
            const roomRef = doc(this.db, 'rooms', roomId);
            const roomDoc = await getDoc(roomRef);

            if (roomDoc.exists() && roomDoc.data().createdBy === userId) {
                await deleteDoc(roomRef);
                console.log('Room deleted from Firestore:', roomId);
            }
        } catch (error) {
            console.error('Error deleting room from Firestore:', error);
        }
    }

    /**
     * Generate unique room ID
     */
    generateRoomId() {
        return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Register callback for room changes
     */
    onRoomChange(callback) {
        this.roomChangeCallbacks.push(callback);

        // Call immediately with current room
        const currentRoom = this.getCurrentRoom();
        if (currentRoom) {
            callback(currentRoom, this.rooms);
        }

        // Return unsubscribe function
        return () => {
            const index = this.roomChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.roomChangeCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Notify all callbacks of room change
     */
    notifyRoomChange() {
        const currentRoom = this.getCurrentRoom();
        this.roomChangeCallbacks.forEach(callback => {
            try {
                callback(currentRoom, this.rooms);
            } catch (error) {
                console.error('Error in room change callback:', error);
            }
        });
    }

    /**
     * Create empty 6x6 board
     */
    createEmptyBoard() {
        return Array(6).fill(null).map(() => Array(6).fill(''));
    }

    /**
     * Save current game state to the active room
     * @param {object} game - Game instance
     */
    async saveGameStateToRoom(game) {
        // Prevent saving during loading to avoid infinite recursion
        if (this.isLoadingGameState) {
            return;
        }

        const currentRoom = this.getCurrentRoom();
        if (!currentRoom) {
            console.warn('No current room to save game state');
            return;
        }

        const gameState = {
            boardState: this.compressBoard(game.getBoardState()), // Compress for Firestore
            currentPlayer: game.getCurrentPlayer(),
            gameActive: game.gameActive,
            scores: { ...game.scores },
            matchScores: { ...game.matchScores },
            moveCount: { ...game.moveCount },
            lastMove: game.lastMove,
            gameMode: game.gameMode,
            rules: {
                bounce: game.bounceRuleEnabled,
                wrap: game.wrapRuleEnabled,
                missingTeeth: game.missingTeethRuleEnabled,
                knightMove: game.knightMoveRuleEnabled
            },
            lastMoveAt: new Date().toISOString()
        };

        // If game is over, check for winner by analyzing the board
        if (!game.gameActive) {
            const gameStatus = game.rules.checkGameStatus(
                game.getBoardState(),
                game.bounceRuleEnabled,
                game.missingTeethRuleEnabled,
                game.wrapRuleEnabled
            );

            if (gameStatus.winner) {
                gameState.winner = gameStatus.winner;
                gameState.winningLine = gameStatus.winningCells; // Save as winningLine for consistency
                gameState.bounceCellIndex = gameStatus.bounceCellIndex;
                gameState.secondBounceCellIndex = gameStatus.secondBounceCellIndex;
            }
            gameState.isDraw = gameStatus.isDraw;
        }

        // Use silent=true to prevent reloading game state after save
        await this.updateRoom(currentRoom.id, gameState, true);
        console.log('Game state saved to room:', currentRoom.id, {
            gameActive: gameState.gameActive,
            winner: gameState.winner,
            currentPlayer: gameState.currentPlayer,
            lastMove: gameState.lastMove
        });
    }

    /**
     * Load game state from room to game
     * @param {string} roomId - Room ID to load from
     * @param {object} game - Game instance
     */
    async loadGameStateFromRoom(roomId, game) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) {
            console.error('Room not found:', roomId);
            return false;
        }

        console.log('Loading game state from room:', room);

        // Set loading flag to prevent infinite recursion
        this.isLoadingGameState = true;

        try {
            // Set game mode based on room type
            let targetGameMode = room.gameMode || 'human';
            if (room.type === 'computer' && !room.gameMode) {
                targetGameMode = 'level4'; // Default AI level
            } else if (room.type === 'local' || room.type === 'remote') {
                targetGameMode = 'human';
            }

            // Set game mode
            if (game.gameMode !== targetGameMode) {
                game.setGameMode(targetGameMode);
            }

            // Set rules
            if (room.rules) {
                game.bounceRuleEnabled = room.rules.bounce || false;
                game.wrapRuleEnabled = room.rules.wrap || false;
                game.missingTeethRuleEnabled = room.rules.missingTeeth || false;
                game.knightMoveRuleEnabled = room.rules.knightMove || false;
            }

            // Load board state if it exists
            if (room.boardState) {
                // Decompress if it's a string (new format) or use directly if array (legacy)
                const boardState = typeof room.boardState === 'string'
                    ? this.decompressBoard(room.boardState)
                    : room.boardState;

                game.board.setState(boardState);
                game.currentPlayer = room.currentPlayer || 'X';
                game.gameActive = room.gameActive !== undefined ? room.gameActive : true;
                game.moveCount = room.moveCount || { X: 0, O: 0 };
                game.lastMove = room.lastMove || null;
            } else {
                // Reset to empty board
                game.resetGame();
            }

            // Load scores
            game.scores = room.scores || { X: 0, O: 0 };
            game.matchScores = room.matchScores || { X: 0, O: 0 };

            // Fix for old remote rooms: ensure players structure exists
            if (room.type === 'remote' && !room.players) {
                console.warn('Remote room missing players structure, fixing...');
                const user = this.authManager.getCurrentUser();
                room.players = {
                    X: { userId: user ? user.uid : null, displayName: user ? (user.displayName || 'You') : 'You' },
                    O: null
                };
                // Save the fix to Firestore
                await this.updateRoom(room.id, { players: room.players }, true);
            }

            // Trigger game events to update UI (using correct event data format)
            game.triggerEvent('boardSync', { room });
            game.triggerEvent('scoreUpdate', { scores: { ...game.scores } });
            game.triggerEvent('matchScoreUpdate', {
                matchScores: { ...game.matchScores },
                roundScores: { ...game.scores }
            });

            // If game was finished, trigger game end event to show proper UI
            if (room.gameActive === false) {
                console.log('Loading finished game state:', {
                    winner: room.winner,
                    isDraw: room.isDraw,
                    winningLine: room.winningLine
                });

                if (room.winner) {
                    console.log('Triggering gameEnd event for winner:', room.winner);
                    game.triggerEvent('gameEnd', {
                        type: 'win',
                        winner: room.winner,
                        board: game.getBoardState(),
                        winningLine: room.winningLine || [],
                        bounceCellIndex: room.bounceCellIndex || -1,
                        secondBounceCellIndex: room.secondBounceCellIndex || -1,
                        restored: true // Flag to indicate this was restored from save
                    });
                } else if (room.isDraw) {
                    console.log('Triggering gameEnd event for draw');
                    game.triggerEvent('gameEnd', {
                        type: 'draw',
                        board: game.getBoardState(),
                        restored: true
                    });
                }
                console.log('Restored finished game state');
            }

            console.log('Game state loaded from room');
            return true;
        } finally {
            // Always clear loading flag, even if there's an error
            this.isLoadingGameState = false;
        }
    }

    /**
     * Compress board state to string for efficient storage
     * @param {Array} board - 2D board array
     * @returns {string} Compressed board state
     */
    compressBoard(board) {
        return board.flat().map(cell => cell || '0').join('');
    }

    /**
     * Decompress board state from string
     * @param {string} compressed - Compressed board string
     * @returns {Array} 2D board array
     */
    decompressBoard(compressed) {
        const flat = compressed.split('').map(c => c === '0' ? '' : c);
        const board = [];
        for (let i = 0; i < 6; i++) {
            board.push(flat.slice(i * 6, (i + 1) * 6));
        }
        return board;
    }

    /**
     * Get which player (X or O) the current user is in a remote room
     * @param {object} room - Room object
     * @returns {string|null} 'X', 'O', or null if not a player
     */
    getMyPlayerSymbol(room) {
        if (!room || room.type !== 'remote' || !room.players) {
            return null;
        }

        const user = this.authManager.getCurrentUser();
        if (!user) return null;

        if (room.players.X && room.players.X.userId === user.uid) {
            return 'X';
        }
        if (room.players.O && room.players.O.userId === user.uid) {
            return 'O';
        }

        return null;
    }

    /**
     * Check if it's the current user's turn in a remote room
     * @param {object} room - Room object
     * @returns {boolean} True if it's the user's turn
     */
    isMyTurn(room) {
        if (!room || room.type !== 'remote') {
            return true; // Always allow moves in non-remote rooms
        }

        const mySymbol = this.getMyPlayerSymbol(room);
        const currentPlayer = room.currentPlayer;

        console.log('Turn check:', {
            roomType: room.type,
            mySymbol,
            currentPlayer,
            isMyTurn: mySymbol === currentPlayer,
            players: room.players
        });

        if (!mySymbol) {
            console.warn('User is not a player in this remote room');
            return false; // Not a player in this room
        }

        return currentPlayer === mySymbol;
    }

    /**
     * Join a remote room via invite link
     * @param {string} roomId - Room ID to join
     * @returns {Promise<object|null>} Joined room or null if failed
     */
    async joinRoomByInvite(roomId) {
        try {
            const user = this.authManager.getCurrentUser();
            if (!user) {
                console.error('Must be logged in to join room');
                return null;
            }

            // Load room from Firestore
            const roomRef = doc(this.db, 'rooms', roomId);
            const roomDoc = await getDoc(roomRef);

            if (!roomDoc.exists()) {
                console.error('Room not found:', roomId);
                return null;
            }

            const room = { ...roomDoc.data(), id: roomDoc.id };

            // Verify it's a remote room
            if (room.type !== 'remote') {
                console.error('Cannot join non-remote room via invite');
                return null;
            }

            // Check if room is already full
            if (room.players && room.players.O) {
                console.warn('Room is already full');
                return null;
            }

            // Check if user is already Player X (inviting themselves)
            if (room.players && room.players.X && room.players.X.userId === user.uid) {
                console.warn('Cannot join own room as second player');
                // Still allow - just switch to the room
                this.rooms.push(room);
                this.switchToRoom(roomId);
                return room;
            }

            // Add user as Player O
            const updates = {
                players: {
                    ...room.players,
                    O: {
                        userId: user.uid,
                        displayName: user.displayName || user.email || 'Opponent'
                    }
                },
                status: 'active' // Room is now active with both players
            };

            await updateDoc(roomRef, updates);
            console.log('Joined room as Player O:', roomId);

            // Add room to local list
            const updatedRoom = { ...room, ...updates };
            this.rooms.push(updatedRoom);

            // Switch to the joined room
            this.switchToRoom(roomId);

            return updatedRoom;
        } catch (error) {
            console.error('Error joining room by invite:', error);
            return null;
        }
    }

    /**
     * Subscribe to real-time updates for a room
     * @param {string} roomId - Room ID to subscribe to
     * @returns {Function} Unsubscribe function
     */
    subscribeToRoom(roomId) {
        // Unsubscribe from previous room if any
        this.unsubscribeFromRoom();

        const room = this.rooms.find(r => r.id === roomId);
        if (!room || room.type !== 'remote') {
            console.log('Not subscribing - room is not remote:', roomId);
            return null;
        }

        console.log('Subscribing to room:', roomId);
        const roomRef = doc(this.db, 'rooms', roomId);

        this.roomSubscription = onSnapshot(roomRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const updatedRoom = { ...docSnapshot.data(), id: docSnapshot.id };

                // Update local room data
                const roomIndex = this.rooms.findIndex(r => r.id === roomId);
                if (roomIndex !== -1) {
                    this.rooms[roomIndex] = updatedRoom;
                }

                // Notify listeners of room sync
                console.log('Room synced from Firestore:', updatedRoom);
                this.notifyRoomSync(updatedRoom);
            }
        }, (error) => {
            console.error('Error in room subscription:', error);
        });

        return this.roomSubscription;
    }

    /**
     * Unsubscribe from current room
     */
    unsubscribeFromRoom() {
        if (this.roomSubscription) {
            console.log('Unsubscribing from room');
            this.roomSubscription();
            this.roomSubscription = null;
        }
    }

    /**
     * Register callback for real-time room sync
     * @param {Function} callback - Called when room updates from Firestore
     */
    onRoomSync(callback) {
        this.roomSyncCallbacks.push(callback);
    }

    /**
     * Notify all room sync callbacks
     * @param {object} room - Updated room data
     */
    notifyRoomSync(room) {
        this.roomSyncCallbacks.forEach(callback => callback(room));
    }

    /**
     * Set player ready state for next game
     * @param {string} roomId - Room ID
     * @param {string} playerSymbol - 'X' or 'O'
     * @param {boolean} ready - Ready state
     */
    async setPlayerReady(roomId, playerSymbol, ready) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || room.type !== 'remote') {
            console.error('Cannot set ready state for non-remote room');
            return false;
        }

        if (!room.readyPlayers) {
            room.readyPlayers = { X: false, O: false };
        }

        room.readyPlayers[playerSymbol] = ready;

        console.log(`Player ${playerSymbol} ready state: ${ready}`);

        // Update in Firestore
        await this.updateRoom(roomId, { readyPlayers: room.readyPlayers }, true);

        return true;
    }

    /**
     * Check if both players are ready
     * @param {object} room - Room object
     * @returns {boolean} True if both players ready
     */
    areBothPlayersReady(room) {
        if (!room || room.type !== 'remote') {
            return false;
        }

        if (!room.readyPlayers) {
            return false;
        }

        return room.readyPlayers.X === true && room.readyPlayers.O === true;
    }

    /**
     * Clear ready states (after game starts)
     * @param {string} roomId - Room ID
     */
    async clearReadyStates(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || room.type !== 'remote') {
            return;
        }

        room.readyPlayers = { X: false, O: false };

        console.log('Clearing ready states');

        // Update in Firestore
        await this.updateRoom(roomId, { readyPlayers: room.readyPlayers }, true);
    }
}

export default RoomManager;
