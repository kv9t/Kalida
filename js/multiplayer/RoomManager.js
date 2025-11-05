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
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class RoomManager {
    constructor(db, authManager, cookieManager) {
        this.db = db;
        this.authManager = authManager;
        this.cookieManager = cookieManager;
        this.rooms = [];
        this.currentRoomId = null;
        this.roomChangeCallbacks = [];

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

        // Set current room to first room
        if (this.rooms.length > 0 && !this.currentRoomId) {
            this.currentRoomId = this.rooms[0].id;
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

        // For remote rooms, add invite link
        if (type === 'remote') {
            room.inviteLink = `${window.location.origin}/?invite=${roomId}`;
            room.players = {
                X: { userId: user ? user.uid : null, displayName: user ? (user.displayName || 'You') : 'You' },
                O: null
            };
        }

        // Add to local array
        this.rooms.push(room);

        // Save to appropriate storage
        if (user && !user.isAnonymous && type === 'remote') {
            // Save remote room to Firestore
            await this.saveRoomToFirestore(room);
        } else {
            // Save to cookies (for computer/local rooms or guest users)
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
     * Delete a room
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
        if (user && !user.isAnonymous && room.type === 'remote') {
            await this.deleteRoomFromFirestore(roomId, user.uid);
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

        console.log('Room deleted:', roomId);
        this.notifyRoomChange();

        return true;
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
     */
    async updateRoom(roomId, updates) {
        const room = this.rooms.find(r => r.id === roomId);

        if (!room) {
            console.error('Room not found:', roomId);
            return false;
        }

        // Update local data
        Object.assign(room, updates);

        // Save to storage
        const user = this.authManager.getCurrentUser();
        if (user && !user.isAnonymous && room.type === 'remote') {
            await this.updateRoomInFirestore(roomId, updates);
        } else {
            this.saveRoomsToCookies();
        }

        this.notifyRoomChange();
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

            const roomRef = doc(this.db, 'rooms', room.id);
            await setDoc(roomRef, {
                ...room,
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
     */
    async loadRoomsFromFirestore(userId) {
        try {
            const roomsQuery = query(
                collection(this.db, 'rooms'),
                where('createdBy', '==', userId)
            );

            const snapshot = await getDocs(roomsQuery);
            const firestoreRooms = [];

            snapshot.forEach(doc => {
                firestoreRooms.push({ ...doc.data(), id: doc.id });
            });

            // Also load local/computer rooms from cookies
            this.loadRoomsFromCookies();

            // Merge Firestore rooms with local rooms (avoid duplicates)
            firestoreRooms.forEach(firestoreRoom => {
                const exists = this.rooms.find(r => r.id === firestoreRoom.id);
                if (!exists) {
                    this.rooms.push(firestoreRoom);
                }
            });

            console.log('Rooms loaded from Firestore:', firestoreRooms);
        } catch (error) {
            console.error('Error loading rooms from Firestore:', error);
        }
    }

    /**
     * Update room in Firestore
     */
    async updateRoomInFirestore(roomId, updates) {
        try {
            const roomRef = doc(this.db, 'rooms', roomId);
            await updateDoc(roomRef, {
                ...updates,
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

        await this.updateRoom(currentRoom.id, gameState);
        console.log('Game state saved to room:', currentRoom.id);
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

        // Trigger game events to update UI (using correct method name)
        game.triggerEvent('boardSync', { room });
        game.triggerEvent('scoreUpdate', game.scores);
        game.triggerEvent('matchScoreUpdate', game.matchScores);

        console.log('Game state loaded from room');
        return true;
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
}

export default RoomManager;
