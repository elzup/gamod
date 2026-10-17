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
| [`@gamod/nim`](packages/nim) | Nim (normal and misère play) | 🚧 draft (private). Nim-sum strategy; matches exhaustive search on every checked position |
| [`@gamod/yacht`](packages/yacht) | Yacht (Clubhouse Games 51 rules) | 🚧 draft (private). Exact expected-score DP works; the shipping format of the value table is undecided |
| [`@gamod/blackjack`](packages/blackjack) | Blackjack (infinite deck, S17) | 🚧 draft (private). Basic-strategy table; matches exact expected-value play on every hand |

### Candidates (not started)

Candidates are ordered by how well they fit the current package contract: exact decisions, a compact shipped strategy or table, and no runtime search.

| priority | game | kind | why it is a useful next step |
| --- | --- | --- | --- |
| 1 | Video poker | stochastic, perfect information | Closest to Blackjack and Yacht: exact expected-value decisions can be shipped as a compact lookup table. The first ruleset still needs to be chosen |
| 2 | Pig | stochastic, perfect information | A small exact DP, but adds an opponent and chance nodes. This would exercise a reusable stochastic-game reference solver |
| 3 | Mastermind / Bulls and Cows | deterministic, **hidden information** | The state space is small enough for exact analysis, but the objective (expected guesses, worst case, or guaranteed solve) and state representation need to be defined first |

### Deferred until the scope or shipping policy changes

| game | blocker |
| --- | --- |
| Connect Four | A full position table is huge (~4.5 trillion states), and no concise perfect strategy is known. It conflicts with the current "no search in shipped code" policy |
| Gomoku | A 15x15 table is infeasible and no concise perfect strategy is known. Shipping it would require runtime search or a different guarantee |
| Poker | Opponent hidden information requires mixed strategies rather than a single expected-value best move. Video poker covers the tractable single-player part first |

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

- **Shipped code holds neither game progression nor search.** If a concise strategy exists it is expressed as conditionals; otherwise the package looks up a pre-generated table.
- **Correctness is guaranteed by tests.** Every position is cross-checked against a test-only exhaustive solver (`packages/<game>/reference/`, not shipped).
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
  src/        # shipped: schema + strategy (or table)
  reference/  # test-only oracle: rules + exhaustive search
  test/       # exhaustive cross-checks and property tests
packages/core/  # test-only, game-agnostic exhaustive search used by reference/. Private, never published
apps/demo/      # demo page covering all packages
```

To add a game, follow [docs/adding-a-game.md](docs/adding-a-game.md).
