# Kalida
Kalida - a game by Koert Voorhees, brought to digital life by Kristen Voorhees

```
Kalida/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── core/
    │   ├── Board.js
    │   ├── Rules.js
    │   └── Game.js
    ├── utils/
    │   ├── GameUtils.js
    │   └── BounceUtils.js
    ├── ui/
    │   ├── BoardUI.js
    │   └── GameUI.js
    ├── ai/
    │   ├── AIPlayer.js
    │   ├── AIFactory.js
    │   ├── utils/
    │   │   ├── WinTrackGenerator.js
    │   │   └── ThreatDetector.js
    │   ├── evaluation/
    │   │   └── BoardEvaluator.js
    │   ├── strategies/
    │   │   ├── RandomStrategy.js
    │   │   ├── MediumStrategy.js
    │   │   ├── HardStrategy.js
    │   │   ├── MinimaxStrategy.js
    │   │   ├── ImpossibleStrategy.js
    │   │   └── modules/
    │   │       ├── BouncePatternDetector.js
    │   │       ├── MinimaxSearch.js
    │   │       └── OpeningBook.js
    └── main.js
```

# Kalida: Game Rules and Description

## Game Overview
Kalida is a strategic board game created by Koert Voorhees. The digital implementation brings this intriguing game to life with its unique mechanics that extend far beyond traditional tic-tac-toe-style games.

## Basic Information
- **Board**: 6×6 grid
- **Players**: Two players (X and O)
- **Objective**: Place five of your markers in a row (horizontally, vertically, or diagonally)
- **Game Flow**: Players take turns placing their markers on empty cells

## Scoring System

### Round Wins vs Matches Won
- **Round Wins**: Each individual game won (getting 5 in a row)
- **Match Win**: Winning a series of rounds with specific conditions
  - First player to reach **8 round wins**
  - Must have at least **2 more wins** than opponent
  - Example: If score is 8-7, the match continues until someone reaches 9-7 or the score becomes tied

### Score Tracking
- **Round Wins**: Displayed on the left score board
- **Matches Won**: Displayed on the right score board
- Players can reset round scores or continue building toward match wins

## Core Mechanics

### 1. Basic Placement
- Players take turns placing their markers (X or O) on the board
- Once placed, markers cannot be moved
- The game continues until a player wins or the board is full (draw)

### 2. Win Conditions
A player wins by forming a line of five consecutive markers. These lines can be formed in several ways:

#### Regular Wins
- Five consecutive markers in a straight line (horizontal, vertical, or diagonal)
- No gaps or opponent pieces within the winning line

#### Wrap Wins (When Enabled)
- The board "wraps around" at the edges:
  - Left edge connects to right edge
  - Top edge connects to bottom edge
- Allows lines to continue from one edge to the opposite edge
- Example: A horizontal line at row 0 can wrap from column 5 to column 0

#### Bounce Wins (When Enabled)
- Diagonal lines can "bounce" off board edges
- A bounced diagonal changes direction but continues the line
- Rules for bounces:
  - Up to two bounces allowed per winning line
  - Each cell counted only once in a winning pattern
  - Bounces occur when a diagonal hits a board boundary

## Special Rules (Toggleable)

### Knight Move Rule
- **When Enabled**: The first player's (X) second move must follow a chess knight's movement pattern
- **Knight Pattern**: Move in an "L" shape - 2 squares in one direction, then 1 square perpendicular
- **Visual Cues**: Valid knight moves are highlighted with a ♘ symbol
- **Purpose**: Adds strategic depth to opening play

### Missing Teeth Rule
- **When Enabled**: Winning lines cannot have gaps in straight rows, columns, or main diagonals
- **Exceptions**: 
  - Wrap-around lines can still have gaps
  - "Great diagonals" (corner-to-corner) are exempt from this rule
- **Purpose**: Requires more solid, connected winning patterns

### Bounce Rule
- **When Enabled**: Diagonal lines can bounce off board edges to continue
- **Strategy Impact**: Creates complex winning patterns that can surprise opponents
- **Visualization**: Bounce points are highlighted in winning patterns

### Wrap Rule
- **When Enabled**: Board edges connect to create a "wraparound" effect
- **Strategy Impact**: Significantly changes positional play and winning opportunities
- **Interaction**: Works with other rules to create unique winning patterns

## Game Modes

### Human vs Human
- Two human players take turns
- All rules can be manually toggled on/off
- Full control over game configuration

### AI Difficulty Levels
Each AI level has a preset rule configuration and increasing intelligence:

#### Level 1: Basic Rules
- **Rules**: No Bounce, No Wrap
- **AI**: Basic strategy with simple threat detection
- **Best For**: Learning the fundamental game

#### Level 2: + Bounce Rule
- **Rules**: Bounce enabled, No Wrap  
- **AI**: Improved strategy with bounce pattern recognition
- **Best For**: Learning bounce mechanics

#### Level 3: + Wrap Rule
- **Rules**: No Bounce, Wrap enabled
- **AI**: Strategic play utilizing wrap-around tactics
- **Best For**: Learning wrap mechanics

#### Level 4: All Rules
- **Rules**: Both Bounce and Wrap enabled
- **AI**: Advanced strategy using all game mechanics
- **Best For**: Full strategic challenge

*Note: Missing Teeth and Knight Move rules remain manually controllable in all AI levels*

## Advanced AI Features

### Strategic Components
- **Opening Book**: Pre-programmed strong opening moves
- **Threat Detection**: Identifies immediate wins, blocks, and developing threats
- **Pattern Recognition**: Recognizes complex bounce and wrap patterns
- **Minimax Search**: Looks ahead multiple moves to find optimal play
- **Position Evaluation**: Considers center control, mobility, and win potential

### AI Behavior
- **Immediate Wins**: Always takes winning moves when available
- **Defensive Play**: Blocks opponent winning threats
- **Strategic Development**: Builds toward multiple winning threats
- **Adaptive Difficulty**: Higher levels use deeper search and more sophisticated evaluation

## Technical Features

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Visual Feedback**: 
  - Last move highlighting
  - Winning pattern animation
  - Knight move indicators
  - AI thinking indicators
- **Board Sizing**: Adjustable board size (50%-100%)
- **Score Persistence**: Tracks round and match scores across games

### Performance Optimizations
- **Efficient Rule Checking**: Optimized algorithms for win detection
- **AI Caching**: Transposition tables and position caching for faster AI response
- **Smooth Animations**: Hardware-accelerated CSS animations
- **Memory Management**: Efficient data structures for game state

## Strategy Tips

### Opening Play
- **Center Control**: Central positions offer the most winning opportunities
- **Knight Move Consideration**: When enabled, plan your second move carefully
- **Rule Awareness**: Adapt your opening based on which rules are active

### Mid-Game Tactics
- **Multiple Threats**: Try to create situations where you threaten to win in multiple ways
- **Blocking**: Don't just focus on your own threats - watch for opponent opportunities
- **Wrap Utilization**: When wrap is enabled, edge positions become more valuable

### Advanced Strategy
- **Bounce Patterns**: Learn to recognize and create complex bouncing diagonal patterns
- **Rule Interactions**: Understand how different rules combine to create new opportunities
- **Endgame Planning**: In close games, every move matters - think several moves ahead

---

**Kalida** represents a unique evolution of connection games, combining traditional strategic elements with innovative mechanics that create deep, engaging gameplay suitable for players of all skill levels.