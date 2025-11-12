# AI Improvement Plan: Using Flagged Bad Moves Data

## Overview
This document outlines the strategy for accessing flagged bad moves from Firebase Firestore and using that data to improve the Kalida AI player.

---

## Current Implementation Summary

### Data Being Captured (via GameFlagManager.js)

When users flag a bad AI move, the following data is stored in Firestore (`flaggedMoves` collection):

```javascript
{
  // Metadata
  flagId: "flag_1234567890_abc123",
  flaggedAt: "2025-11-12T10:30:00.000Z",
  gameId: "game_1234567890_xyz789",

  // User Information
  userId: "user_uid_123",
  userDisplayName: "PlayerName",

  // Game Context
  gameMode: "level4",  // AI difficulty: level1-4 (impossible)
  aiLevel: "level4",
  rules: {
    bounce: true,
    wrap: false,
    missingTeeth: false,
    knightMove: false
  },

  // Flag Details
  flagReason: "missed_win" | "missed_block" | "weak_position" | "other",
  userComment: "AI should have blocked at [2,3]",

  // Move Context
  moveNumber: 7,
  aiMove: { row: 1, col: 4 },
  boardStateBefore: "0000X00X0O000...",  // Board before AI move
  boardStateAfter: "0000X00X0OO00...",   // Board after AI move

  // Recent Move History
  recentMoves: [
    { moveNumber: 3, player: "X", position: {row: 0, col: 4} },
    { moveNumber: 4, player: "O", position: {row: 1, col: 2} },
    // ... last 5 moves
  ],

  // TestScenario Export (for easy debugging)
  testScenarioExport: {
    scenarioName: "flagged-missed_win-1234567890",
    flagId: "flag_1234567890_abc123",
    consoleCommand: "window.KalidaGame.debug.loadFlaggedScenario('flag_...')",
    testScenarioCode: "...",  // Ready-to-use test scenario
    rawBoardState: "...",
    loadCommand: "..."
  }
}
```

### Firestore Structure

```
firestore/
├── users/
│   └── {userId}/           # User profiles
├── rooms/
│   └── {roomId}/           # Multiplayer rooms
└── flaggedMoves/           ← TARGET COLLECTION
    ├── flag_1731410400_abc123/
    ├── flag_1731410401_def456/
    └── ...
```

### Current AI Implementation

**Main AI File:** `js/ai/strategies/ImpossibleStrategy.js`

Key components:
- **MinimaxSearch** - Depth-limited minimax algorithm
- **ThreatDetector** - Identifies win/block opportunities
- **WinTrackGenerator** - Analyzes all possible winning lines
- **BouncePatternDetector** - Handles bounce rule scenarios
- **OpeningBook** - Pre-defined optimal opening moves
- **BoardEvaluator** - Scores positions based on control, threats, etc.

---

## Phase 1: Data Access & Retrieval

### Option A: Browser-Based Access (Quick Analysis)

Create a simple Firebase query tool that runs in the browser console:

**File:** `js/tools/FlaggedMoveAnalyzer.js`

```javascript
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';

class FlaggedMoveAnalyzer {
  constructor(db) {
    this.db = db;
  }

  // Get all flagged moves
  async getAllFlags() {
    const flagsRef = collection(this.db, 'flaggedMoves');
    const snapshot = await getDocs(flagsRef);
    return snapshot.docs.map(doc => doc.data());
  }

  // Get flags by reason
  async getFlagsByReason(reason) {
    const flagsRef = collection(this.db, 'flaggedMoves');
    const q = query(flagsRef, where('flagReason', '==', reason));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }

  // Get flags by AI level
  async getFlagsByLevel(level) {
    const flagsRef = collection(this.db, 'flaggedMoves');
    const q = query(flagsRef, where('aiLevel', '==', level));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }

  // Get recent flags
  async getRecentFlags(count = 50) {
    const flagsRef = collection(this.db, 'flaggedMoves');
    const q = query(flagsRef, orderBy('flaggedAt', 'desc'), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }
}
```

**Console Usage:**
```javascript
// In browser console (with Firebase initialized)
const analyzer = new FlaggedMoveAnalyzer(window.firebaseDb);

// Get all missed wins
const missedWins = await analyzer.getFlagsByReason('missed_win');
console.log('Missed wins:', missedWins.length);

// Get all level4 (impossible) flags
const level4Flags = await analyzer.getFlagsByLevel('level4');
console.log('Level 4 flags:', level4Flags.length);
```

### Option B: Node.js Script (Batch Analysis)

For larger datasets, create a Node.js script:

**File:** `scripts/analyze-flagged-moves.js`

```javascript
// Requires Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json')
});

const db = admin.firestore();

async function analyzeFlaggedMoves() {
  const snapshot = await db.collection('flaggedMoves').get();
  const flags = snapshot.docs.map(doc => doc.data());

  console.log(`Total flagged moves: ${flags.length}`);

  // Analyze by reason
  const byReason = {};
  flags.forEach(flag => {
    byReason[flag.flagReason] = (byReason[flag.flagReason] || 0) + 1;
  });

  console.log('\nBy Reason:', byReason);

  // Analyze by AI level
  const byLevel = {};
  flags.forEach(flag => {
    byLevel[flag.aiLevel] = (byLevel[flag.aiLevel] || 0) + 1;
  });

  console.log('\nBy AI Level:', byLevel);

  return flags;
}

analyzeFlaggedMoves().then(flags => {
  // Export to JSON for further analysis
  require('fs').writeFileSync(
    'flagged-moves-export.json',
    JSON.stringify(flags, null, 2)
  );
});
```

### Option C: Firebase Console (Manual Inspection)

1. Go to: https://console.firebase.google.com/
2. Select project: `kalida-fe435`
3. Navigate to: Firestore Database → `flaggedMoves` collection
4. Export data as JSON or CSV for analysis

---

## Phase 2: Data Analysis

### Step 1: Categorize Flagged Moves

Group flags by:
1. **Flag Reason** - missed_win, missed_block, weak_position, other
2. **AI Level** - Which difficulty levels have most issues?
3. **Game Phase** - Opening (moves 1-5), midgame (6-15), endgame (16+)
4. **Rules Active** - Do certain rule combinations cause issues?

### Step 2: Pattern Detection

For each flagged move, analyze:

```javascript
// Example analysis function
function analyzeFlag(flag) {
  const analysis = {
    flagId: flag.flagId,
    reason: flag.flagReason,
    aiLevel: flag.aiLevel,

    // Reconstruct board state
    boardBefore: decompressBoard(flag.boardStateBefore),
    aiMove: flag.aiMove,

    // Analyze what AI missed
    missedOpportunities: detectMissedOpportunities(
      flag.boardStateBefore,
      flag.recentMoves
    ),

    // Check if threat detection failed
    threatDetectionFailure: checkThreatDetection(
      flag.boardStateBefore,
      flag.aiMove
    ),

    // Evaluate position quality
    positionQuality: evaluatePosition(
      flag.boardStateBefore,
      flag.aiMove
    )
  };

  return analysis;
}
```

### Step 3: Identify Common Failure Modes

Create categories of AI failures:

1. **Threat Detection Failures**
   - Missed immediate wins
   - Missed blocks
   - Missed forced sequences

2. **Evaluation Function Issues**
   - Undervalued certain positions
   - Overvalued weak moves
   - Poor center vs edge trade-offs

3. **Search Depth Limitations**
   - Tactical sequences beyond search horizon
   - Deep forced wins not detected

4. **Rule-Specific Issues**
   - Bounce rule complications
   - Wrap rule edge cases
   - Knight move patterns

### Step 4: Export Test Scenarios

For each flagged move, generate a test case:

```javascript
// The GameFlagManager already creates these!
const testScenario = flag.testScenarioExport;

// Load in browser console:
await window.KalidaGame.debug.loadFlaggedScenario(flag.flagId);

// Or add to TestScenarios.js for permanent regression testing
```

---

## Phase 3: AI Improvement Strategy

### Approach 1: Targeted Bug Fixes

For each common pattern:

1. **Load the scenario** using `loadFlaggedScenario(flagId)`
2. **Debug the AI** - Step through ImpossibleStrategy.js to see why it failed
3. **Fix the specific issue** - Update threat detection, evaluation, etc.
4. **Add regression test** - Add to TestScenarios.js

**Example Fix Flow:**
```
Flagged Move: "Missed win at [2,3], AI played [1,4] instead"
↓
Load scenario: loadFlaggedScenario('flag_123')
↓
Debug: ThreatDetector didn't prioritize 2-move forced win
↓
Fix: Update ThreatDetector.js priority weights
↓
Test: Verify AI now plays [2,3] in this scenario
↓
Regression test: Add to TestScenarios.js
```

### Approach 2: Improve Evaluation Weights

Analyze position evaluations for flagged moves:

**File:** `js/ai/evaluation/BoardEvaluator.js`

Current weights:
```javascript
const weights = {
  centerControl: 10,
  edgeControl: 5,
  cornerControl: 3,
  threatBonus: 50,
  // ... etc
};
```

Update based on flagged move analysis:
- If AI undervalues threats → increase `threatBonus`
- If AI overvalues center in endgame → add game phase detection
- If AI misses tactical sequences → increase search depth

### Approach 3: Enhance Threat Detection

**File:** `js/ai/utils/ThreatDetector.js`

Common improvements based on flagged moves:

1. **Multi-move threat detection**
   - Detect 2-move forced wins
   - Detect 3-move sequences
   - Prioritize forcing moves

2. **Threat priority ordering**
   - Immediate wins > blocks > threats
   - Edge case handling (bounce, wrap)

3. **Defensive threat analysis**
   - Look ahead for opponent threats after each AI move
   - Avoid creating counter-threats

### Approach 4: Opening Book Expansion

**File:** `js/ai/strategies/modules/OpeningBook.js`

If many flags occur in opening (moves 1-5):
- Add flagged positions to opening book
- Map position → correct move
- Override evaluation for known positions

### Approach 5: Machine Learning (Advanced)

For large datasets (100+ flagged moves):

1. **Feature Extraction**
   - Board state features
   - Available moves
   - Threat features
   - Position control metrics

2. **Supervised Learning**
   - Input: Board state + features
   - Output: Move quality score (user-labeled via flags)
   - Train model to predict good vs bad moves

3. **Integration**
   - Use ML model to score moves alongside existing evaluation
   - Combine ML score with minimax search
   - A/B test against current AI

---

## Phase 4: Implementation Plan

### Step 1: Create Data Access Tool (1-2 hours)

- [ ] Create `js/tools/FlaggedMoveAnalyzer.js`
- [ ] Add to `index.html` (development mode only)
- [ ] Test retrieval of flagged moves

### Step 2: Analyze Existing Flags (2-4 hours)

- [ ] Export all flagged moves from Firebase
- [ ] Run statistical analysis (by reason, level, phase)
- [ ] Identify top 10 most common patterns
- [ ] Create summary report

### Step 3: Load Test Scenarios (1 hour)

- [ ] For top 10 flagged moves, load scenarios in browser
- [ ] Verify board states are correct
- [ ] Document what AI should have done

### Step 4: Debug & Fix AI (varies by issue)

For each flagged move pattern:
- [ ] Step through AI decision-making
- [ ] Identify root cause (threat detection, evaluation, search depth)
- [ ] Implement fix
- [ ] Verify fix with test scenario
- [ ] Add regression test to TestScenarios.js

### Step 5: Validate Improvements (2-3 hours)

- [ ] Run AI against all flagged move scenarios
- [ ] Measure success rate (% of moves now played correctly)
- [ ] A/B test: Old AI vs New AI in full games
- [ ] Collect new user feedback

### Step 6: Continuous Improvement

- [ ] Set up automated flag analysis (weekly reports)
- [ ] Create dashboard showing flag trends
- [ ] Monitor for new failure patterns
- [ ] Iterate on AI improvements

---

## Quick Start: First 30 Minutes

To immediately start analyzing flagged moves:

### 1. Open Kalida in browser (multiplayer branch)
```bash
# Serve the game locally
python3 -m http.server 8000
# Navigate to: http://localhost:8000
```

### 2. Open browser console and run:
```javascript
// Import Firestore functions
const { collection, getDocs } = await import(
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
);

// Get all flagged moves
const flagsRef = collection(window.firebaseDb, 'flaggedMoves');
const snapshot = await getDocs(flagsRef);
const flags = snapshot.docs.map(doc => doc.data());

console.log(`Total flagged moves: ${flags.length}`);

// Group by reason
const byReason = {};
flags.forEach(f => {
  byReason[f.flagReason] = (byReason[f.flagReason] || 0) + 1;
});
console.table(byReason);

// Show first flagged move
console.log('Example flag:', flags[0]);

// Load first flagged scenario
if (flags[0]) {
  await window.KalidaGame.debug.loadFlaggedScenario(flags[0].flagId);
  console.log('Loaded scenario! Check the board.');
}
```

### 3. For each flagged scenario:

1. **Load it:** `await window.KalidaGame.debug.loadFlaggedScenario(flagId)`
2. **Inspect:** Look at the board state
3. **Run AI:** Let the AI make a move
4. **Compare:** Did AI make the same bad move or has it improved?
5. **Debug:** If still bad, step through ImpossibleStrategy.js

---

## Expected Outcomes

After implementing this plan:

1. **Immediate** (Week 1)
   - Understand what users are flagging
   - Identify top 5 most common AI failures
   - Fix critical bugs (missed wins, missed blocks)

2. **Short-term** (Month 1)
   - Fix 80%+ of flagged scenarios
   - Improve threat detection accuracy
   - Expand opening book with flagged positions
   - Reduce user complaints about AI

3. **Long-term** (Month 2+)
   - Continuous AI improvement loop
   - Automated analysis of new flags
   - ML-based move evaluation (if dataset is large)
   - Best-in-class Kalida AI

---

## Tools & Scripts to Create

1. **FlaggedMoveAnalyzer.js** - Data retrieval & analysis
2. **analyze-flags.js** - Node.js batch processor
3. **flag-dashboard.html** - Visual dashboard of flags
4. **test-flagged-scenarios.js** - Automated testing of all flags
5. **export-flags.js** - Export to CSV/JSON for external analysis

---

## Resources

- **Firebase Console:** https://console.firebase.google.com/project/kalida-fe435
- **Firestore Collection:** `flaggedMoves`
- **AI Code:** `js/ai/strategies/ImpossibleStrategy.js`
- **Test Scenarios:** `js/ai/test/TestScenarios.js`
- **Flag Manager:** `js/utils/GameFlagManager.js`

---

## Next Steps

**Immediate action items:**

1. Check Firebase Console for existing flagged moves
2. Run the "Quick Start" console commands
3. Analyze the first 5 flagged moves
4. Create FlaggedMoveAnalyzer.js tool
5. Start debugging the most common failure pattern

**Questions to answer:**

- How many moves have been flagged so far?
- What's the most common flag reason?
- Which AI level has the most issues?
- Are there any rule-specific patterns?

Would you like me to create the FlaggedMoveAnalyzer.js tool and start analyzing the existing flags?
