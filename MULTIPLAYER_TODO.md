# Multiplayer Implementation TODO

## 🐛 Critical Bugs to Fix Tomorrow

### 1. Board Visual State Not Clearing Between Rooms
**Problem:** Win highlighting/formatting from one room carries over to another room
**Symptoms:**
- Win highlighting from Local room shows in Remote room
- Visual state (cell highlights, win lines) persists across room switches

**Fix Needed:**
- Clear all visual highlights when switching rooms
- Call board UI cleanup methods in `loadGameStateFromRoom()`
- Reset win line highlighting before loading new room state
- Ensure `BoardUI.clearAllHighlights()` or similar is called

**Files to modify:**
- `js/multiplayer/RoomManager.js` (in loadGameStateFromRoom)
- `js/ui/BoardUI.js` (may need cleanup method)

---

### 2. Board State Saving at Wrong Time
**Problem:** Board state saved doesn't match the final game state (shows move or two before win)
**Symptoms:**
- Log out after winning
- Log back in
- Board shows state before the winning move

**Likely causes:**
- `game.on('move')` fires BEFORE game checks for win
- Win detection happens after move event
- Game state saved before `gameEnd` event completes

**Fix options:**
- A) Save state on `turnChange` instead of `move` (happens AFTER win check)
- B) Add delay to ensure win processing completes first
- C) Save on `gameEnd` event captures final state, but verify it triggers

**Files to check:**
- `js/main.js` (event listener setup around line 102-120)
- `js/core/Game.js` (event firing order: move → win check → turnChange)

---

### 3. Rooms Saving Incorrectly
**Problem:** Rooms not saving correctly (needs more specifics)
**Questions to investigate:**
- Are rooms appearing in Firestore at all?
- Are Computer/Local rooms mixing with Remote rooms?
- Is boardState being compressed/decompressed correctly?
- Are old cookie-based rooms conflicting with Firestore rooms?

**Fix needed:**
- Clear old cookie-based rooms when logged in
- Ensure loadRoomsFromFirestore doesn't mix with cookie rooms
- Verify compress/decompress is symmetric

**Files to check:**
- `js/multiplayer/RoomManager.js` (initialize, loadRoomsFromFirestore around line 40-62)

---

## 📋 Phase 3 Completion Checklist

Before moving to Phase 4, verify:
- [ ] Each room maintains independent game state (board, scores, rules)
- [ ] Visual state clears completely between room switches
- [ ] Board state saves at correct time (after wins/moves complete)
- [ ] Rooms persist correctly in Firestore for logged-in users
- [ ] Cross-browser sync works (same rooms on different browsers)
- [ ] No console errors during normal gameplay

---

## 🚀 Phase 4: Real-Time Multiplayer Sync (Next Steps)

Once bugs are fixed, implement remote multiplayer:

### 4.1 Firestore Real-Time Listeners
**Goal:** Both players see moves in real-time

**Implementation:**
- Add Firestore `onSnapshot` listener for remote rooms
- Listen to room document changes
- When opponent makes move, update local board
- Debounce updates to prevent conflicts

**Files to create/modify:**
- `js/multiplayer/RoomManager.js` - Add `subscribeToRoom(roomId)` method
- `js/main.js` - Set up listener when entering remote room

**Key functions:**
```javascript
subscribeToRoom(roomId, callback) {
  const roomRef = doc(this.db, 'rooms', roomId);
  return onSnapshot(roomRef, (doc) => {
    callback(doc.data());
  });
}
```

---

### 4.2 Turn Management for Remote Rooms
**Goal:** Prevent both players from moving at the same time

**Implementation:**
- Track which player you are (X or O) in remote room
- Only allow moves when it's your turn
- Show "Waiting for opponent..." message when it's their turn
- Lock board during opponent's turn

**Files to modify:**
- `js/multiplayer/RoomManager.js` - Add `getMyPlayerSymbol(room)`
- `js/core/Game.js` or `js/ui/BoardUI.js` - Check turn before allowing move
- UI to show whose turn it is more clearly

---

### 4.3 Invite Link Acceptance Flow
**Goal:** Second player can join via invite link

**Implementation:**
- Check URL for `?invite=roomId` parameter on page load
- If found and user authenticated:
  - Load that room from Firestore
  - Add user as Player O
  - Update room status to "active"
  - Start game
- Show modal: "You've been invited to play against [Player X Name]"

**Files to modify:**
- `js/main.js` - Check for invite parameter on auth state change
- `js/multiplayer/RoomManager.js` - Add `joinRoomByInvite(roomId)` method
- `index.html` - Already has invite acceptance modal (just needs wiring)

---

### 4.4 Connection Status & Presence
**Goal:** Show when opponent is online/offline

**Implementation:**
- Use Firestore presence system or manual heartbeat
- Update `lastSeenAt` timestamp every 30 seconds
- Show indicator: "Opponent online" or "Last seen 5 minutes ago"

**Files to create:**
- `js/multiplayer/PresenceManager.js` (optional, can add to RoomManager)

---

### 4.5 Handle Disconnections & Reconnections
**Goal:** Game continues smoothly if player refreshes or loses connection

**Implementation:**
- On page load, check if user is in an active remote game
- Auto-resume game from saved state
- Show reconnection message: "Reconnecting..."
- Opponent sees: "Player disconnected" → "Player reconnected"

---

## 📝 Testing Checklist for Phase 4

Once implemented, test:
- [ ] Create remote room, copy invite link
- [ ] Open invite link in incognito/different browser
- [ ] Second player can join and see board
- [ ] Player X makes move → Player O sees it instantly
- [ ] Player O makes move → Player X sees it instantly
- [ ] Turns alternate correctly (can't move out of turn)
- [ ] Player can't join their own remote room
- [ ] If player refreshes, game resumes correctly
- [ ] If player closes tab and reopens, game still there

---

## 🎯 Nice-to-Have Features (Phase 5+)

Lower priority enhancements:
- [ ] In-game chat between players
- [ ] Match history / past games list
- [ ] Player statistics (wins/losses/draws)
- [ ] Rematch button after game ends
- [ ] Spectator mode (watch ongoing games)
- [ ] Tournament mode (multiple players)
- [ ] Custom timer per move (optional)
- [ ] Push notifications for opponent's move

---

## 🔧 Quick Reference: Key Files

**Room Management:**
- `js/multiplayer/RoomManager.js` - Core room logic
- `js/ui/RoomUI.js` - Room UI interactions

**Game State:**
- `js/core/Game.js` - Game logic and events
- `js/core/Board.js` - Board state management

**UI:**
- `js/ui/GameUI.js` - Main game UI controller
- `js/ui/BoardUI.js` - Board rendering and interactions

**Integration:**
- `js/main.js` - Connects everything together

**Auth:**
- `js/auth/AuthManager.js` - Firebase authentication
- `js/auth/AuthUI.js` - Auth UI

**Firebase:**
- `js/config/firebase-config.js` - Firebase setup
- `firestore.rules` - Security rules (must deploy to Firebase Console)

---

## 📌 Notes

**Current Status:**
- ✅ Phase 1: Firebase setup complete
- ✅ Phase 2: Room management UI complete
- 🚧 Phase 3: Room-to-game integration (bugs to fix)
- ⏳ Phase 4: Real-time multiplayer (not started)

**Don't forget:**
- Deploy firestore.rules to Firebase Console before testing Phase 4
- Clear browser cookies/cache when testing auth changes
- Test on multiple browsers for multiplayer

---

## 🐛 Known Issues Log

**2025-11-05:**
1. Win highlighting carries over between rooms
2. Board state saves before win is registered
3. Rooms saving inconsistently
4. Firestore permissions needed deployment
5. Nested array errors (fixed)
6. Infinite recursion causing crashes (fixed)
