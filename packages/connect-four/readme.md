# @gamod/connect-four

English | [日本語](readme.ja.md)

Give it a connect four position (7 columns x 6 rows) and it returns the best move — the column to drop into. Internally it is an **opening book plus exact search**. Unlike tic-tac-toe there is no concise strategy for this game, so this is the one package that ships a search.

## Install

```bash
pnpm add @gamod/connect-four
```

## Usage

```ts
import { bestMove, initialState } from "@gamod/connect-four"

bestMove(initialState()) // => 3 (the middle column, the only winning opening)

// 42 cells from top-left to bottom-right. null means empty, r moves first
bestMove({
  board: [
    ...Array(28).fill(null),
    null, null, null, "y", "y", "y", null,
    null, null, null, "r", "r", "r", null,
  ],
  turn: "r",
}) // => 2 (completes 4 in a row on the bottom)
```

## API

| export | description |
| --- | --- |
| `bestMove(state)` | the column to drop into (0..6). `null` if the game is over or the board is full |
| `stateSchema` / `parseState` | zod schema and a validating parser |
| `initialState` / `emptyBoard` | initial values |
| `WIDTH` / `HEIGHT` / `BOARD_LENGTH` | 7 / 6 / 42 |

## Guarantees

**"Best" = a move with the same outcome as exhaustive search.** It wins every winnable position and never loses a drawn one. Winning in the fewest moves is not guaranteed — it may keep a won position won without converting it right away.

- Checked against a test-only exhaustive solver ([`reference/`](reference)) on all 161029 positions of a 4x4 board, both the win/draw/loss and the distance to the end
- Same cross-check on random endgame positions of 5x4, 4x5 and 7x6 boards
- The rules themselves reproduce John Tromp's published position counts per ply (1, 7, 49, 238, 1120, 4263, 16422, 54859)

## How it works

### Search

The same build as Pascal Pons' Connect 4 solver.

1. **Alpha-beta** with a **transposition table** (a position packs into (height + 1) bits per column; left-right mirrored positions share a key)
2. **Iterative deepening with a null window**: every search only answers "is the score at least this?", narrowing down to the outcome and how fast it comes
3. Connect-four specific pruning
   - stop as soon as the side to move can complete 4 in a row
   - two immediate threats from the opponent means the position is lost
   - one immediate threat means the reply is forced (the move list shrinks to one)
   - never play directly below a square the opponent would win on
4. **Move ordering**: try the moves that create the most new threats first

### Opening book

Early positions are the expensive ones, so the published analysis of the first move is kept as a table. Connect four on 7x6 was solved in 1988 by James D. Allen and Victor Allis independently; with perfect play from both sides:

| opening | result |
| --- | --- |
| middle (col 3) | first player wins (on move 41) |
| next to it (col 2, 4) | draw |
| outer four (col 0, 1, 5, 6) | second player wins |

Those 8 positions (5 keys once mirrored ones are shared) are the whole book, so **the initial position is the only one that comes back instantly** — picking its best move needs the value of all 7 openings, which is exactly what the table holds. From the second move on the search does the work. Re-deriving the book values with our own search takes hours per position, so that test only runs under `GAMOD_SLOW=1 pnpm test`.

### Speed

Time for one `bestMove` call with a cold transposition table (Node.js v22, positions built at random):

| stones on the board | time |
| --- | --- |
| 0 (initial position) | instant, straight from the book |
| 20 or more | under a millisecond to tens of milliseconds |
| 14 to 18 | milliseconds to about a second |
| around 12 | hundreds of milliseconds to tens of seconds |
| 1 to 10 | minutes to hours |

The transposition table is allocated once on the first `bestMove` call (about 21MB) and reused, so solving further positions of the same game keeps getting cheaper.

The shape of that table is a property of connect four, not of this implementation — the C++ original looks the same. A deeper opening book would flatten it, but a book down to move 12 means solving 12 million positions, so it is not bundled here.

## State

```ts
type State = {
  board: ("r" | "y" | null)[] // 42 cells, top-left to bottom-right
  turn: "r" | "y"
}
```

`r` moves first. **Positions that cannot arise in a real game throw** — solving one silently would return a lying best move. Gravity and move order make the check richer than in tic-tac-toe; these four conditions characterize reachable positions exactly, verified by a test that enumerates every position that fits in the left 4 columns x bottom 4 rows.

- the stone count matches the turn (equal on r's turn; r has one more on y's turn)
- no stone is floating above an empty cell
- at most one player has 4 in a row; if someone does, it is the opponent's turn and the last stone that completed it can be taken back off the top
- the remaining stones can be stacked bottom-up in alternating r / y order

## Development

```
src/        # shipped: schema + search + opening book
reference/  # test-only oracle (plain rules + exhaustive search). Not shipped
test/       # full cross-checks on small boards, sampled endgames on 7x6
```
