# Using Flagged Moves to Improve AI

This guide shows you how to access and analyze flagged bad moves to improve the Kalida AI.

## Quick Start (5 Minutes)

### Option 1: Use the Visual Dashboard (Easiest)

1. **Serve the game locally:**
   ```bash
   cd /home/user/Kalida
   python3 -m http.server 8000
   ```

2. **Open the analyzer:**
   - Navigate to: `http://localhost:8000/flag-analyzer.html`

3. **Click "Load All Flags"** to see all flagged moves

4. **Explore the data:**
   - View summary statistics
   - Filter by reason or AI level
   - Export to JSON/CSV
   - Load specific scenarios into the game

### Option 2: Browser Console (Quick Analysis)

1. **Open Kalida in browser:**
   ```
   http://localhost:8000/index.html
   ```

2. **Open browser console** (F12)

3. **Run the quick analysis script:**
   - Copy contents of `scripts/quick-analyze-flags.js`
   - Paste into console
   - Press Enter

4. **View results** in console with tables and statistics

### Option 3: Programmatic Access

```javascript
// In browser console (with Kalida loaded)
import FlaggedMoveAnalyzer from './js/tools/FlaggedMoveAnalyzer.js';

const analyzer = new FlaggedMoveAnalyzer(window.firebaseDb);

// Get all flags
const flags = await analyzer.getAllFlags();

// Print summary
analyzer.printSummary(flags);

// Get specific types
const missedWins = await analyzer.getFlagsByReason('missed_win');
const level4Flags = await analyzer.getFlagsByLevel('level4');

// Find patterns
analyzer.findPatterns(flags);

// Load a scenario
await analyzer.loadScenario('flag_1234567890_abc123');

// Export data
analyzer.exportToJSON(flags);
analyzer.exportToCSV(flags);
```

---

## Understanding the Data

### What Gets Flagged

When a user flags an AI move, this information is stored:

```javascript
{
  // Identification
  flagId: "flag_1234567890_abc123",
  flaggedAt: "2025-11-12T10:30:00Z",
  gameId: "game_1234567890_xyz789",

  // Flag details
  flagReason: "missed_win" | "missed_block" | "weak_position" | "other",
  userComment: "AI should have blocked at [2,3]",

  // Game context
  gameMode: "level4",
  rules: { bounce: true, wrap: false, missingTeeth: false, knightMove: false },

  // Move information
  moveNumber: 7,
  aiMove: { row: 1, col: 4 },
  boardStateBefore: "compressed board string",
  boardStateAfter: "compressed board string",
  recentMoves: [/* last 5 moves */],

  // Debug info
  testScenarioExport: { /* ready-to-use test scenario */ }
}
```

### Flag Reasons

1. **missed_win** - AI had a winning move but didn't take it
2. **missed_block** - AI failed to block an opponent's winning move
3. **weak_position** - AI made a move that left it in a weak position
4. **other** - General poor move quality

---

## Analysis Workflow

### Step 1: Load and Explore Data

```javascript
const analyzer = new FlaggedMoveAnalyzer(window.firebaseDb);
const flags = await analyzer.getAllFlags();

// How many flags do we have?
console.log(`Total flags: ${flags.length}`);

// What are the main issues?
analyzer.printSummary(flags);
```

### Step 2: Identify Patterns

```javascript
// Find common patterns
analyzer.findPatterns(flags);

// Look at specific categories
const missedWins = await analyzer.getFlagsByReason('missed_win');
console.log(`Found ${missedWins.length} missed wins`);

// Check which AI level has issues
const level4Issues = await analyzer.getFlagsByLevel('level4');
console.log(`Level 4 has ${level4Issues.length} flagged moves`);
```

### Step 3: Debug Specific Scenarios

```javascript
// Load the first missed win scenario
const scenario = missedWins[0];
await analyzer.loadScenario(scenario.flagId);

// The board will now show the position
// You can step through the AI decision-making in DevTools
```

### Step 4: Fix the AI

1. **Understand the failure:**
   - Load scenario in game
   - Check what move AI makes
   - Step through `ImpossibleStrategy.js` in debugger
   - Identify why AI chose wrong move

2. **Implement fix:**
   - Update threat detection weights
   - Fix evaluation function
   - Improve minimax search
   - Add special case handling

3. **Test the fix:**
   - Reload the scenario
   - Verify AI now makes correct move
   - Add to `TestScenarios.js` for regression testing

4. **Validate broadly:**
   ```javascript
   // Test AI performance on all flagged moves
   await analyzer.testAIPerformance(flags);
   ```

---

## Common Improvement Strategies

### Strategy 1: Fix Threat Detection

**Problem:** AI missing immediate wins/blocks

**File:** `js/ai/utils/ThreatDetector.js`

**Solution:**
- Increase priority for immediate threats
- Add multi-move threat detection
- Improve pattern recognition for bounce/wrap rules

### Strategy 2: Improve Evaluation Function

**Problem:** AI undervaluing good positions or overvaluing bad ones

**File:** `js/ai/evaluation/BoardEvaluator.js`

**Solution:**
- Adjust position weights based on flagged moves
- Add game phase awareness (opening vs endgame)
- Fine-tune center control vs edge control trade-offs

### Strategy 3: Increase Search Depth

**Problem:** AI missing deep tactical sequences

**File:** `js/ai/strategies/modules/MinimaxSearch.js`

**Solution:**
- Increase search depth for critical positions
- Add iterative deepening
- Implement quiescence search for forcing sequences

### Strategy 4: Expand Opening Book

**Problem:** AI making poor moves in opening

**File:** `js/ai/strategies/modules/OpeningBook.js`

**Solution:**
- Add flagged positions to opening book
- Map position → correct move
- Override evaluation for known positions

---

## Exporting Data

### Export to JSON

```javascript
analyzer.exportToJSON(flags);
// Downloads: flagged-moves-{timestamp}.json
```

### Export to CSV

```javascript
analyzer.exportToCSV(flags);
// Downloads: flagged-moves-{timestamp}.csv
```

### Use Exported Data

- **Excel/Sheets:** Open CSV for pivot tables and charts
- **Python:** Load JSON for statistical analysis
- **R:** Load CSV for data science analysis
- **Tableau/PowerBI:** Create dashboards

---

## Firebase Console Access

### Manual Inspection

1. Go to: https://console.firebase.google.com/
2. Select project: `kalida-fe435`
3. Navigate to: **Firestore Database** → `flaggedMoves` collection
4. View individual documents
5. Export collection as JSON

### Querying in Console

The Firebase Console allows you to:
- Filter by field values
- Sort by timestamp
- View nested data structures
- Export filtered results

---

## API Reference

### FlaggedMoveAnalyzer Methods

```javascript
// Retrieval
await analyzer.getAllFlags()
await analyzer.getFlagById(flagId)
await analyzer.getFlagsByReason(reason)
await analyzer.getFlagsByLevel(level)
await analyzer.getRecentFlags(count)
await analyzer.getFlagsByRules(rulesObject)

// Analysis
analyzer.printSummary(flags)
analyzer.findPatterns(flags)
analyzer.groupBy(flags, property)
analyzer.groupByPhase(flags)
analyzer.groupByRules(flags)

// Actions
await analyzer.loadScenario(flagId)
await analyzer.testAIPerformance(flags)
analyzer.exportToJSON(flags)
analyzer.exportToCSV(flags)
```

---

## Troubleshooting

### "Firebase not initialized"

**Solution:** Make sure you're on the `claude/add-multiplayer-support-011CUp1urthiSq3EMkvZ2U4w` branch and Firebase is loaded.

### "No flags found"

**Solution:** Users need to flag moves first. Play against the AI and click "Flag Bad Move" after AI moves.

### "Permission denied"

**Solution:** Make sure you're authenticated. Check `firestore.rules` for permissions.

### Can't load scenario

**Solution:** Ensure `window.KalidaGame.debug.loadFlaggedScenario` function exists in the game.

---

## Example Workflow

**Complete example of analyzing and fixing a missed win:**

```javascript
// 1. Load the analyzer
const analyzer = new FlaggedMoveAnalyzer(window.firebaseDb);

// 2. Get all missed wins
const missedWins = await analyzer.getFlagsByReason('missed_win');
console.log(`Found ${missedWins.length} missed wins to fix`);

// 3. Load the first one
const firstMissedWin = missedWins[0];
console.log('Flagged move:', firstMissedWin);
console.log('User comment:', firstMissedWin.userComment);

// 4. Load it in the game
await analyzer.loadScenario(firstMissedWin.flagId);

// 5. Let AI play and see if it still misses
// (Manually click "AI Move" button in game)

// 6. If AI still misses, debug:
// - Open DevTools
// - Set breakpoint in ImpossibleStrategy.js getMove()
// - Step through to see why it chose wrong move

// 7. After fixing, test all missed wins:
await analyzer.testAIPerformance(missedWins);
```

---

## Resources

- **Plan:** See `AI_IMPROVEMENT_PLAN.md` for comprehensive strategy
- **Code:** `js/utils/GameFlagManager.js` - Flagging system
- **Code:** `js/tools/FlaggedMoveAnalyzer.js` - Analysis tool
- **Dashboard:** `flag-analyzer.html` - Visual interface
- **Script:** `scripts/quick-analyze-flags.js` - Console quick start
- **AI Code:** `js/ai/strategies/ImpossibleStrategy.js` - Main AI logic

---

## Need Help?

1. Check `AI_IMPROVEMENT_PLAN.md` for detailed improvement strategies
2. Look at `js/tools/FlaggedMoveAnalyzer.js` source code
3. Review Firebase Console for raw data
4. Test scenarios using `window.KalidaGame.debug.loadFlaggedScenario()`

Happy analyzing! 🚀
