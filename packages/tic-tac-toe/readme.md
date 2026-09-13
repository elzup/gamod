# @gamod/tic-tac-toe

English | [日本語](readme.ja.md)

Give it a tic-tac-toe position and it returns the best move. Internally it is not a search but a **rule-based strategy (conditionals)**.

## Install

```bash
pnpm add @gamod/tic-tac-toe
```

## Usage

```ts
import { bestMove, initialState } from "@gamod/tic-tac-toe"

bestMove(initialState()) // => 4 (center)

bestMove({
  // 9 cells from top-left to bottom-right. null means empty
  board: ["x", "x", null, "o", "o", null, null, null, null],
  turn: "x",
}) // => 2 (win)

bestMove({ board: ["x", null, null, null, "o", null, null, null, "x"], turn: "o" })
// => 1 (edge. Taking a corner loses to a fork)
```

## API

| export | description |
| --- | --- |
| `bestMove(state)` | cell index (0..8) of the best move. `null` if the game is over |
| `stateSchema` / `parseState` | zod schema and a validating parser |
| `initialState` / `emptyBoard` | initial values |

## Guarantees

**"Best" = a move with the same outcome as exhaustive search.** It wins every winnable position and never loses a drawn one. Winning in the fewest moves is not guaranteed.

- Tested to agree with a test-only exhaustive solver (`reference/`) on all 4520 reachable non-terminal positions
- Verified that following the strategy from the initial position never loses against any possible opponent

## Strategy

Rules are applied top to bottom; the first match is played.

1. **Win**: complete a line if possible
2. **Block**: stop the opponent's immediate win
3. **Attack**: play a forcing win if one exists
   - fork (two ways to complete a line)
   - consecutive threats: keep making moves the opponent must answer, building to a fork
   - create two fork seeds so that one survives any defense
4. **Defend**: among moves that leave the opponent no forcing win, prefer center → the opposite corner of the opponent's corner → corner → edge

Newell & Simon's classic 8 rules (win / block / fork / block fork / center / opposite corner / corner / edge) miss the best move in 49 of the 4520 positions after the opponent leaves the book. The forcing-win rules in 3 and the defense in 4 are the corrections.

## State

```ts
type State = {
  board: ("x" | "o" | null)[] // length 9
  turn: "x" | "o"
}
```

x moves first. **Positions that cannot arise in a real game throw** — solving an unreachable position silently would return a lying best move. The four conditions below characterize reachable positions exactly, verified by a test over all 19683 boards × turns matching the 5478 reachable states.

- the stone count matches the turn (equal on x's turn; x has one more on o's turn)
- there is no position where both players have a line
- if x has a line, it is o's turn
- if o has a line, it is x's turn

## Development

```
src/        # shipped: schema + bitboard + strategy. No game progression, no search
reference/  # test-only oracle (rules + exhaustive search). Not shipped
test/       # exhaustive cross-checks and property tests
```
