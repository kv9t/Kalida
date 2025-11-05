/**
 * RoomUI - Manages room UI interactions
 *
 * Handles:
 * - Room selector display and clicks
 * - Switch Rooms modal
 * - New Room modal
 * - Invite link overlay
 * - Room creation, deletion, switching
 */

export class RoomUI {
    constructor(roomManager) {
        this.roomManager = roomManager;
        this.editMode = false;

        // DOM elements
        this.roomSelector = document.getElementById('room-selector');
        this.currentRoomName = document.getElementById('current-room-name');
        this.switchRoomsModal = document.getElementById('switch-rooms-modal');
        this.newRoomModal = document.getElementById('new-room-modal');
        this.inviteLinkOverlay = document.getElementById('invite-link-overlay');
        this.roomList = document.getElementById('room-list');

        // Initialize event listeners
        this.setupEventListeners();

        // Listen to room changes
        this.roomManager.onRoomChange((currentRoom, allRooms) => {
            this.updateRoomSelector(currentRoom);
            this.updateRoomList(allRooms, currentRoom);
        });

        console.log('RoomUI initialized');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Room selector click
        if (this.roomSelector) {
            this.roomSelector.addEventListener('click', () => this.showSwitchRoomsModal());
        }

        // Close switch rooms modal
        const closeSwitchRooms = document.getElementById('close-switch-rooms');
        if (closeSwitchRooms) {
            closeSwitchRooms.addEventListener('click', () => this.hideSwitchRoomsModal());
        }

        // Add room button
        const addRoomBtn = document.getElementById('add-room-btn');
        if (addRoomBtn) {
            addRoomBtn.addEventListener('click', () => this.showNewRoomModal());
        }

        // Edit rooms button
        const editRoomsBtn = document.getElementById('edit-rooms-btn');
        if (editRoomsBtn) {
            editRoomsBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Close new room modal
        const closeNewRoom = document.getElementById('close-new-room');
        if (closeNewRoom) {
            closeNewRoom.addEventListener('click', () => this.hideNewRoomModal());
        }

        // Create room button
        const createRoomBtn = document.getElementById('create-room-btn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => this.handleCreateRoom());
        }

        // Close invite link overlay
        const closeInviteLink = document.getElementById('close-invite-link');
        if (closeInviteLink) {
            closeInviteLink.addEventListener('click', () => this.hideInviteLinkOverlay());
        }

        // Copy invite link button
        const copyInviteBtn = document.getElementById('copy-invite-link-btn');
        if (copyInviteBtn) {
            copyInviteBtn.addEventListener('click', () => this.copyInviteLink());
        }
    }

    /**
     * Show room selector (after user is authenticated)
     */
    showRoomSelector() {
        if (this.roomSelector) {
            this.roomSelector.style.display = 'block';
        }
    }

    /**
     * Hide room selector
     */
    hideRoomSelector() {
        if (this.roomSelector) {
            this.roomSelector.style.display = 'none';
        }
    }

    /**
     * Update room selector display
     */
    updateRoomSelector(room) {
        if (!room || !this.currentRoomName) return;

        const icon = this.getRoomIcon(room.type);
        const name = room.name.toUpperCase();

        // Update room selector content
        const selectorContent = this.roomSelector.querySelector('.room-selector-content');
        if (selectorContent) {
            selectorContent.innerHTML = `
                <span class="room-icon">${icon}</span>
                <span class="room-name">${name}</span>
                <span class="room-chevron">▼</span>
            `;
        }
    }

    /**
     * Get icon for room type
     */
    getRoomIcon(type) {
        switch (type) {
            case 'computer': return '🖥️';
            case 'local': return '👥';
            case 'remote': return '🌐';
            default: return '🎮';
        }
    }

    /**
     * Show switch rooms modal
     */
    showSwitchRoomsModal() {
        if (this.switchRoomsModal) {
            this.switchRoomsModal.style.display = 'flex';
            setTimeout(() => {
                this.switchRoomsModal.classList.add('show');
                const container = this.switchRoomsModal.querySelector('.modal-container');
                if (container) container.classList.add('show');
            }, 10);

            // Update room list
            const currentRoom = this.roomManager.getCurrentRoom();
            const allRooms = this.roomManager.getAllRooms();
            this.updateRoomList(allRooms, currentRoom);
        }
    }

    /**
     * Hide switch rooms modal
     */
    hideSwitchRoomsModal() {
        if (this.switchRoomsModal) {
            this.switchRoomsModal.classList.remove('show');
            const container = this.switchRoomsModal.querySelector('.modal-container');
            if (container) container.classList.remove('show');

            setTimeout(() => {
                this.switchRoomsModal.style.display = 'none';
                this.editMode = false;
                this.updateEditModeButton();
            }, 300);
        }
    }

    /**
     * Update room list display
     */
    updateRoomList(rooms, currentRoom) {
        if (!this.roomList) return;

        this.roomList.innerHTML = '';

        rooms.forEach(room => {
            const roomItem = this.createRoomListItem(room, room.id === currentRoom?.id);
            this.roomList.appendChild(roomItem);
        });
    }

    /**
     * Create room list item element
     */
    createRoomListItem(room, isActive) {
        const item = document.createElement('div');
        item.className = 'room-item' + (isActive ? ' active' : '') + (this.editMode ? ' edit-mode' : '');
        item.dataset.roomId = room.id;

        const icon = this.getRoomIcon(room.type);
        const status = this.getRoomStatus(room);

        item.innerHTML = `
            ${this.editMode ? `<button class="room-delete-btn" data-room-id="${room.id}">🗑️</button>` : ''}
            <span class="room-item-icon">${icon}</span>
            <div class="room-item-info">
                <div class="room-item-name">${room.name}</div>
                <div class="room-item-status ${status.className}">${status.text}</div>
            </div>
        `;

        // Click to switch rooms (only if not in edit mode)
        if (!this.editMode) {
            item.addEventListener('click', () => {
                this.roomManager.switchToRoom(room.id);
                this.hideSwitchRoomsModal();
            });
        }

        // Delete button click
        if (this.editMode) {
            const deleteBtn = item.querySelector('.room-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleDeleteRoom(room.id);
                });
            }
        }

        return item;
    }

    /**
     * Get room status text and class
     */
    getRoomStatus(room) {
        // For computer/local rooms
        if (room.type === 'computer' || room.type === 'local') {
            return { text: 'Ready to play', className: '' };
        }

        // For remote rooms
        if (room.status === 'waiting') {
            return { text: 'Waiting for opponent', className: '' };
        }

        if (room.lastMoveAt) {
            const timeSince = this.getTimeSince(room.lastMoveAt);
            if (room.lastMoveBy && room.lastMoveBy !== 'me') {
                return { text: 'YOUR TURN', className: 'your-turn' };
            } else {
                return { text: `Last move ${timeSince}`, className: '' };
            }
        }

        return { text: 'Active', className: '' };
    }

    /**
     * Get time since timestamp
     */
    getTimeSince(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
        if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        return 'just now';
    }

    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        this.editMode = !this.editMode;
        this.updateEditModeButton();

        // Update room list to show/hide delete buttons
        const currentRoom = this.roomManager.getCurrentRoom();
        const allRooms = this.roomManager.getAllRooms();
        this.updateRoomList(allRooms, currentRoom);
    }

    /**
     * Update edit mode button appearance
     */
    updateEditModeButton() {
        const editBtn = document.getElementById('edit-rooms-btn');
        if (editBtn) {
            if (this.editMode) {
                editBtn.classList.add('active');
            } else {
                editBtn.classList.remove('active');
            }
        }
    }

    /**
     * Handle delete room
     */
    async handleDeleteRoom(roomId) {
        if (confirm('Are you sure you want to delete this room?')) {
            await this.roomManager.deleteRoom(roomId);
        }
    }

    /**
     * Show new room modal
     */
    showNewRoomModal() {
        // Hide switch rooms modal
        this.hideSwitchRoomsModal();

        // Show new room modal
        if (this.newRoomModal) {
            this.newRoomModal.style.display = 'flex';
            setTimeout(() => {
                this.newRoomModal.classList.add('show');
                const container = this.newRoomModal.querySelector('.modal-container');
                if (container) container.classList.add('show');
            }, 10);

            // Clear form
            const opponentNameInput = document.getElementById('opponent-name');
            if (opponentNameInput) opponentNameInput.value = '';

            // Clear message
            this.clearRoomMessage();
        }
    }

    /**
     * Hide new room modal
     */
    hideNewRoomModal() {
        if (this.newRoomModal) {
            this.newRoomModal.classList.remove('show');
            const container = this.newRoomModal.querySelector('.modal-container');
            if (container) container.classList.remove('show');

            setTimeout(() => {
                this.newRoomModal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Handle create room
     */
    async handleCreateRoom() {
        const typeRadios = document.querySelectorAll('input[name="room-type"]');
        let selectedType = 'computer';
        typeRadios.forEach(radio => {
            if (radio.checked) selectedType = radio.value;
        });

        const opponentNameInput = document.getElementById('opponent-name');
        let opponentName = opponentNameInput ? opponentNameInput.value.trim() : '';

        // Validate
        if (!opponentName) {
            if (selectedType === 'computer') {
                opponentName = 'COMPUTER';
            } else {
                this.showRoomMessage('Please enter opponent name.', 'error');
                return;
            }
        }

        // Check if remote room requires login
        if (selectedType === 'remote') {
            const user = this.roomManager.authManager.getCurrentUser();
            if (!user || user.isAnonymous) {
                this.showRoomMessage('Please log in to create a remote room.', 'error');
                return;
            }
        }

        // Disable button
        const createBtn = document.getElementById('create-room-btn');
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = 'CREATING...';
        }

        try {
            // Create room
            const room = await this.roomManager.createRoom(selectedType, opponentName);

            // Re-enable button
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = 'CREATE ROOM';
            }

            // Switch to new room
            this.roomManager.switchToRoom(room.id);

            // Hide new room modal
            this.hideNewRoomModal();

            // Show invite link for remote rooms
            if (selectedType === 'remote' && room.inviteLink) {
                this.showInviteLinkOverlay(room.inviteLink);
            }

        } catch (error) {
            console.error('Error creating room:', error);
            this.showRoomMessage('Failed to create room. Please try again.', 'error');

            // Re-enable button
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = 'CREATE ROOM';
            }
        }
    }

    /**
     * Show invite link overlay
     */
    showInviteLinkOverlay(inviteLink) {
        if (this.inviteLinkOverlay) {
            const inviteLinkUrl = document.getElementById('invite-link-url');
            if (inviteLinkUrl) {
                inviteLinkUrl.textContent = inviteLink;
            }

            this.inviteLinkOverlay.style.display = 'flex';
        }
    }

    /**
     * Hide invite link overlay
     */
    hideInviteLinkOverlay() {
        if (this.inviteLinkOverlay) {
            this.inviteLinkOverlay.style.display = 'none';
        }
    }

    /**
     * Copy invite link to clipboard
     */
    async copyInviteLink() {
        const inviteLinkUrl = document.getElementById('invite-link-url');
        const copyBtn = document.getElementById('copy-invite-link-btn');

        if (inviteLinkUrl && copyBtn) {
            try {
                await navigator.clipboard.writeText(inviteLinkUrl.textContent);

                // Update button
                copyBtn.textContent = '✓ COPIED!';
                copyBtn.classList.add('copied');

                // Reset after 2 seconds
                setTimeout(() => {
                    copyBtn.textContent = 'COPY INVITE LINK';
                    copyBtn.classList.remove('copied');
                }, 2000);

            } catch (error) {
                console.error('Failed to copy:', error);
                alert('Failed to copy link. Please copy manually.');
            }
        }
    }

    /**
     * Show room message
     */
    showRoomMessage(text, type) {
        const messageEl = document.getElementById('room-message');
        if (messageEl) {
            messageEl.textContent = text;
            messageEl.className = `room-message ${type}`;
        }
    }

    /**
     * Clear room message
     */
    clearRoomMessage() {
        const messageEl = document.getElementById('room-message');
        if (messageEl) {
            messageEl.textContent = '';
            messageEl.className = 'room-message';
        }
    }
}

export default RoomUI;
