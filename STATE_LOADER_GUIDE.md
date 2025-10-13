# Game State Loader - Usage Guide

The game state loader has been successfully implemented! You can now easily test AI behavior by loading specific board configurations.

## Quick Start

Open your browser console (F12) and navigate to http://localhost:8000

### List Available Test Scenarios
```javascript
window.KalidaGame.debug.listScenarios()
```

### Load a Test Scenario
```javascript
window.KalidaGame.debug.loadScenario('missed-block')
```

### Get AI's Response
```javascript
await window.KalidaGame.debug.getAIMove()
```

### Test a Scenario (Load + Get AI Move)
```javascript
await window.KalidaGame.debug.testScenario('missed-block')
```

## Available Commands

### State Loading

**Load custom board state (text format):**
```javascript
window.KalidaGame.debug.loadState(`
  . . . . . .
  . X . . . .
  . . O . . .
  . . . X . .
  . . . . . .
  . . . . . .
`)
```

**Load with compact format:**
```javascript
window.KalidaGame.debug.loadState('....../..X.../..O../...X../...../.....', {
  currentPlayer: 'O'
})
```

**Load with options:**
```javascript
window.KalidaGame.debug.loadState(boardState, {
  currentPlayer: 'X',
  rules: { bounce: true, wrap: false }
})
```

### State Export

**Export current board:**
```javascript
// Text format (default)
window.KalidaGame.debug.exportState()

// JSON format
window.KalidaGame.debug.exportState('json')

// Compact format
window.KalidaGame.debug.exportState('compact')
```

**Export complete game state:**
```javascript
window.KalidaGame.debug.exportComplete()
```

### AI Testing

**Get AI's suggested move:**
```javascript
await window.KalidaGame.debug.getAIMove()
```

**Make AI move on the board:**
```javascript
window.KalidaGame.debug.makeAIMove()
```

**Test a specific scenario:**
```javascript
await window.KalidaGame.debug.testScenario('fork-threat')
```

**Test all scenarios:**
```javascript
await window.KalidaGame.debug.testAllScenarios()
```

## Available Test Scenarios

1. **missed-block** - O has 4 in a row, AI should block
2. **missed-win** - AI has 4 in a row and should win
3. **fork-threat** - Creates two winning threats at once
4. **bounce-opportunity** - AI can create a bounce pattern win
5. **missed-bounce-block** - AI must block a bounce threat
6. **wrap-diagonal** - Use diagonal wrap to win
7. **center-control** - Early game center control
8. **complex-threat** - Multiple simultaneous threats
9. **edge-play** - Playing near edges with bounce/wrap
10. **defensive-play** - Defend while under pressure
11. **empty-board** - Starting position
12. **almost-full** - Late game with few options
13. **double-bounce** - Complex double bounce pattern

## Board State Format

### Text Format (easiest for humans)
```
. . . . . .
. X . . . .
. . O . . .
. . . X . .
. . . . . .
. . . . . .
```
- Use `X` for player X
- Use `O` for player O
- Use `.` or `-` or `_` for empty cells
- Separate cells with spaces
- One row per line

### Compact Format (easier to share)
```
....../..X.../..O../...X../...../.....
```
- Each row is 6 characters
- Rows separated by `/`
- No spaces between cells

### JSON Format (programmatic)
```json
[
  ["", "", "", "", "", ""],
  ["", "X", "", "", "", ""],
  ["", "", "O", "", "", ""],
  ["", "", "", "X", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", ""]
]
```

## Example Workflow: Finding AI Bugs

1. **Play a game and encounter a bad AI move**
2. **Export the current state:**
   ```javascript
   window.KalidaGame.debug.exportState()
   ```

3. **Copy the output and save it for later**

4. **Later, reload that state:**
   ```javascript
   window.KalidaGame.debug.loadState(`your_saved_state_here`)
   ```

5. **Test what AI would do:**
   ```javascript
   await window.KalidaGame.debug.getAIMove()
   ```

6. **Fix the AI logic, then test again**

## Creating Custom Test Scenarios

Edit `js/utils/TestScenarios.js` to add your own scenarios:

```javascript
'my-scenario': {
    name: 'My Scenario',
    description: 'Description of what this tests',
    board: `
        . . . . . .
        . X . . . .
        . . O . . .
        . . . . . .
        . . . . . .
        . . . . . .
    `,
    currentPlayer: 'X',
    rules: { bounce: false, wrap: false, missingTeeth: true },
    expectedMove: { row: 2, col: 3 },
    notes: 'What the AI should do'
}
```

## Tips

- Use `console.clear()` to clean up the console between tests
- The AI takes a moment to think - use `await` with async functions
- You can chain commands: load state → test AI → make move → repeat
- Export interesting states you encounter during play for later debugging

## Troubleshooting

**Command not found?**
- Make sure the page is fully loaded
- Check that you're on http://localhost:8000
- Type `window.KalidaGame` to verify the object exists

**Invalid board state?**
- Check that you have exactly 6 rows of 6 cells
- Use only `X`, `O`, and `.` (dot)
- Make sure rows are separated by newlines or `/`

**AI not responding?**
- The AI call is asynchronous - use `await`
- Make sure you're in the browser console (not Node.js)

## AI Debugging Commands

**Test if a move would win:**
```javascript
// Test if position [5,2] would win for O
window.KalidaGame.debug.testMove(5, 2, 'O')
```

**Test multiple positions:**
```javascript
// Test all empty positions
window.KalidaGame.debug.testMoves([[0,1], [5,2], [4,4]], 'O')
```

**Example debugging workflow:**
```javascript
// 1. Load a problematic scenario
window.KalidaGame.debug.loadScenario('double-bounce-wide')

// 2. Test if the expected move would actually win
window.KalidaGame.debug.testMove(5, 2, 'O')

// 3. See what AI chooses (check console for detailed logs)
await window.KalidaGame.debug.getAIMove()

// 4. Compare: does AI choose the winning move?
```

## Next Steps

Now that you have the state loader working:
1. Load problematic scenarios
2. Test what the AI does
3. Use `testMove()` to verify winning positions
4. Check AI decision logs in console
5. Identify the bug in the AI logic
6. Fix the AI code
7. Re-test the scenario to verify the fix

Happy debugging!
