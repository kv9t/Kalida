# Kalida
Kalida - a game by Koert Voorhees

```
Kalida/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── board.js
    ├── win-checker.js
    ├── game.js
    ├── main.js
    └── ai/
        ├── MissingTeethHelper.js
        ├── BounceRuleHelper.js
        ├── BoardEvaluator.js
        ├── BasicStrategies.js
        ├── MinimaxStrategy.js
        └── GameAI.js
```

# Kalida: Game Rules and Description

## Game Overview
Kalida is a strategic board game created by Koert Voorhees. The digital implementation brings this intriguing game to life with its unique mechanics that extend beyond traditional tic-tac-toe-style games.

## Basic Information
- **Board**: 6×6 grid
- **Players**: Two players (X and O)
- **Objective**: Place five of your markers in a row (horizontally, vertically, or diagonally)
- **Game Flow**: Players take turns placing their markers on empty cells

## Core Mechanics

### 1. Basic Placement
- Players take turns placing their markers (X or O) on the board
- Once placed, markers cannot be moved
- The game continues until a player wins or the board is full (draw)

### 2. Win Conditions
A player wins by forming a line of five consecutive markers of their symbol. These lines can be formed in three different ways:

#### Regular Wins
- Five consecutive markers in a straight line (horizontal, vertical, or diagonal)
- The line must not extend beyond the board boundaries

#### Wrap Wins
- The board "wraps around" at the edges, meaning:
  - The left edge connects to the right edge
  - The top edge connects to the bottom edge
- This allows lines to continue from one edge to the opposite edge
- Example: A marker at position (0,5) is adjacent to (0,0) horizontally

### 3. Special Rules

#### Bounce Rule (Optional)
- When enabled, diagonal lines can "bounce" off the edges of the board
- A bounced diagonal changes direction but continues the line
- Rules for bounces:
  - Up to two bounces are allowed per winning line
  - Each cell can only be counted once in a winning pattern
  - Bounces maintain the line continuity while changing direction
- Example: A diagonal line reaching the top edge can bounce and continue in a new direction

#### Missing Teeth Rule (Optional)
- When enabled, a winning line cannot have any gaps or opponent's pieces in it
- This applies to regular straight lines within a single row or column
- Exceptions to the Missing Teeth rule:
  - Wrap-around lines can still have gaps
  - "Great diagonals" (the main diagonals that run from corner to corner) are exempt
- This rule ensures that winning lines are solid and uninterrupted

#### Great Diagonals
- These are the two main diagonals that run from one corner of the board to the opposite corner
- They have special status in the game and are exempt from certain restrictions

## AI Opponents
The game offers various AI difficulty levels:
- Easy: Makes mostly random moves
- Medium: Can block obvious threats and make basic strategic moves
- Hard: More sophisticated strategy with better threat detection
- Extra Hard: Uses more advanced planning and evaluation
- Impossible: Uses advanced strategies including bounce pattern detection and opening book moves

## Game Controls
- Board size can be adjusted using the slider
- Game rules can be toggled (Bounce Rule and Missing Teeth Rule)
- Players can choose to play against another human or against AI at different difficulty levels

This implementation of Kalida faithfully reproduces the original game's strategic depth while adding convenient digital features like AI opponents and rule toggles.