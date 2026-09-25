# @gamod/yacht

English | [日本語](readme.ja.md)

Give it a solo Yacht position (Clubhouse Games 51 rules) and it returns the move that **maximizes the expected total score**: which dice to keep, or which category to score.

> **Draft (private, unpublished).** The in-turn best-move computation and the test-only exact expected-score DP are done.
> **How to ship** the cross-turn value table `V` is undecided, so for now the API takes `V` from the caller (`createBestMove`).
> Once the format is settled, `bestMove(state)` will be exported per the common convention.

## Install

```bash
pnpm add @gamod/yacht # not published yet (draft)
```

## Usage

```ts
import { createBestMove, initialState } from "@gamod/yacht"

// valueFn: (filled category bits, upper total) => expected score from the start of a turn. Shipping format undecided
const bestMove = createBestMove(valueFn)

bestMove(initialState([6, 1, 6, 6, 6]))
// => { type: "reroll", keep: [0, 2, 3, 4] } (keep the four 6s, reroll the 1)

bestMove({ dice: [2, 3, 4, 5, 1], rerollsLeft: 0, sheet: { aces: 3 } })
// => { type: "score", category: "bigStraight" }
```

## API

| export | description |
| --- | --- |
| `createBestMove(valueFn)` | Builds the best-move function. Returns `{ type: "reroll", keep }` (positions of dice to keep) or `{ type: "score", category }`; `null` when the sheet is full |
| `stateSchema` / `parseState` | zod schema and validating parser |
| `moveSchema` | zod schema for moves |
| `initialState(dice)` / `emptySheet` | Initial values (the caller rolls the dice) |
| `CATEGORIES` / `UPPER_BONUS` / `UPPER_BONUS_THRESHOLD` | Category list and bonus constants |

## Guarantees

**"Best" = a move whose expected total score equals that of optimal play.** It maximizes the average, not the score of a single game, and ignores opponents.

- The optimal expected score from the opening matches the published **191.77** (DP: 191.77437)
- Last-turn values with one category left match published numbers (Aces 2.10648, Choice 23.33333, Full House 7.01355, B. Straight 7.83285, Yacht 2.30143)
- DP values match an independent naive solver (brute force over all 7776 ordered rolls), including states on the bonus boundary
- With the same naive solver, the chosen move reaches the optimal expectation for every roll × 0–2 rerolls left in two-category endgames

## How it works

- `V(filled categories, upper total)` = expected points still to come at the start of a turn. The upper total can be capped at 63, leaving **178,816** reachable states.
- Within a turn (two rerolls) the move is computed from V in a few ms (`src/turn.ts`). Dice are collapsed to multisets (462 keeps of 0–5 dice) and expectations are built by averaging one die at a time.
- The shipped code never searches the whole game. The backward DP that fills V lives in `reference/` (test-only, ~5 s).
- A pure rule-based strategy (the tic-tac-toe approach) is not possible: no concise strategy is known to reach the optimal expectation, so V is the irreducible core.

## Rules

| category | condition | score |
| --- | --- | --- |
| Aces–Sixes | — | sum of that face |
| Choice | — | sum of all 5 dice |
| Four Dice | 4+ of a kind | sum of all 5 dice |
| Full House | 3 + 2, **5 of a kind included** | sum of all 5 dice |
| S. Straight | 4+ in a row | 15 |
| B. Straight | 5 in a row | 30 |
| Yacht | 5 of a kind | 50 |

+35 when the upper section (Aces–Sixes) totals 63 or more. A turn is one roll plus two rerolls.

That 5 of a kind counts as a Full House was confirmed by the published last-turn value 7.01355, which matches only under this reading (6.96573 otherwise).

## State

```ts
type State = {
  dice: number[] // length 5, each 1..6
  rerollsLeft: 0 | 1 | 2 // rerolls left in this turn
  sheet: Partial<Record<Category, number>> // only scored categories have a key
}
```

**Positions that cannot arise in a real game throw.** The only condition is that every recorded score can actually be made in its category (e.g. 6 in Aces, 4 in Choice, or 30 in S. Straight are rejected). Categories are filled independently and the upper total follows from them, so this matches exactly the reachable positions.

## Measuring the shipping format (open question)

Run `pnpm --filter @gamod/yacht measure`; results go to `table/measure.md` (`table/` is git-ignored). Sizes use integerize → delta along the upper total → brotli. Loss is the exact drop in opening expected score when moves are chosen from the approximated table (policy evaluation).

| representation | values | brotli | loss (pts/game) |
| --- | ---: | ---: | ---: |
| exact table, float64 | 178,816 | 699 KB | 0 |
| exact, rounded to 1/4096 pt | 178,816 | 213 KB | 2.4e-9 |
| exact, rounded to 1/256 pt | 178,816 | 139 KB | 2.4e-6 |
| exact, rounded to 1/16 pt | 178,816 | 90 KB | 4.2e-4 |
| exact, rounded to 1 pt | 178,816 | 33 KB | 0.10 |
| additive L[lower, open upper count] + U[upper, total] | 3,242 | 2.6 KB | 0.51 |
| additive L[lower] + U[upper, total] | 2,858 | 2.1 KB | 0.97 |

Merging states whose value does not depend on the upper total (bonus already secured or out of reach) leaves 103,552 values while staying exact.

## Development

```
src/         # shipped: schema + score table + one-turn expectation. No whole-game search
reference/   # test-only: expected-score DP / naive solver / policy evaluation / table cache. Not shipped
test/        # checks against published values, the naive solver, and properties
experiment/  # shipping-format measurement (pnpm measure; not part of the normal test run)
table/       # DP cache and measurement output (git-ignored)
```
