# gamod

English | [日本語](readme.ja.md)

A monorepo of packages that return the **best move** for a given game state. The calculator side of strategy guides / cheats / CPU opponents, split into one small npm package per game.

## Scope

- Targets **small games that can be fully solved**. Returns a move with the same result as exhaustive search — not an approximation by an evaluation function.
- Games with randomness or hidden information are also in scope; in that case the score is an **expected value** instead of a win/loss.
- Huge games such as Othello, Shogi, and Go are out of scope (they belong to the world of evaluation-function tuning).

## Packages

| package | game | status |
| --- | --- | --- |
| [`@gamod/tic-tac-toe`](packages/tic-tac-toe) | Tic-tac-toe | ✅ rule-based strategy (matches exhaustive search on every position) |
| [`@gamod/connect-four`](packages/connect-four) | Connect Four | ✅ opening book + exact search (the opening takes time) |

### Candidates (not started)

| game | kind | notes |
| --- | --- | --- |
| Gomoku | deterministic, perfect information | 15x15. Solved (first-player win), but there is neither a concise strategy nor a feasible table. Even with a shipped search like Connect Four's, the board is far wider and the pruning has to be designed first |
| Yacht | stochastic, perfect information | Dice. Expectimax DP over rerolls. Needs chance nodes |
| Poker | stochastic, **hidden information** | The opponent's hand is hidden. Enters the world of strategy (mixed strategies), not just expected values |

## Common API convention

Implementations differ per game, but package entry points are aligned.

```ts
import { bestMove, parseState, stateSchema } from "@gamod/<game>"

bestMove(state) // one best move (null if the game is over)
stateSchema // zod schema. The source of truth for the state shape
```

- **"Best" = a move with the same result as exhaustive search.** For deterministic games the win/draw/loss must match; for stochastic games the expected value must match.
- States are validated by the schema before solving. **Positions that cannot arise in a real game throw** (solving them silently would return a lying best move). For games where reachability cannot be checked cheaply, the readme must state that the behavior is undefined.

## Implementation policy

- **Shipped code holds no game progression.** Playing moves and judging the result is the caller's job (or the demo's); a package only returns the best move.
- What goes inside a package is picked in this order. **No approximation** in any of the cases.
  1. A concise strategy, written as conditionals (tic-tac-toe)
  2. Otherwise a pre-generated table to look up
  3. If a table is not feasible either, an **exact search in the shipped code** (Connect Four). Then the opening is slow, so the readme has to state how slow
- **Correctness is guaranteed by tests**, cross-checked against a test-only exhaustive solver (`packages/<game>/reference/`, not shipped). When the whole game cannot be walked, small boards are walked in full and endgame positions are sampled instead.
- The reference solver itself is verified against independently known numbers (position counts, outcome breakdowns, etc.).

## Demo

A minimal demo page listing every package ([`apps/demo`](apps/demo)). Each card has a board, a best-move highlight, and an installation snippet (`pnpm add` and minimal usage).

```bash
pnpm demo
# for a stable URL: portless run --name gamod pnpm demo
```

To add a game, write one `Demo` in `apps/demo/src/games/<game>.ts` and append it to `demos` in `main.ts`.

## Development

```bash
pnpm install
pnpm test       # vitest (all packages)
pnpm check      # biome (format + lint)
pnpm typecheck
pnpm build      # emit cjs / esm / types per package
```

```
packages/<game>/
  src/        # shipped: schema + strategy (or table, or search)
  reference/  # test-only oracle: rules + exhaustive search. Not shipped
  test/       # exhaustive cross-checks and property tests
packages/core # test-only game-agnostic exhaustive search. Not shipped
apps/demo/    # demo page covering all packages
```
