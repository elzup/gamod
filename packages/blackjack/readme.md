# @gamod/blackjack

English | [日本語](readme.ja.md)

Give it your blackjack hand and the dealer's up card, and it returns the move with the highest expected value. Internally it is **a basic-strategy table lookup**, not a simulation.

> Draft (`private: true`, not published yet).

## Install

```bash
pnpm add @gamod/blackjack
```

## Usage

```ts
import { bestMove } from "@gamod/blackjack"

bestMove({ dealer: "10", hand: ["6", "10"] }) // => "hit"
bestMove({ dealer: "6", hand: ["8", "8"] }) // => "split"
bestMove({ dealer: "3", hand: ["A", "7"] }) // => "double"
bestMove({ dealer: "3", hand: ["A", "3", "4"] }) // => "stand" (soft 18, can no longer double)

// after a split: pass how many hands you hold now
bestMove({ dealer: "10", hand: ["8", "8"], hands: 4 }) // => "hit" (no more resplits)
```

## API

| export | description |
| --- | --- |
| `bestMove(state)` | `"hit" \| "stand" \| "double" \| "split"`. `null` when there is nothing to decide (bust, natural blackjack, a split-ace hand) |
| `stateSchema` / `parseState` | zod schema and a validating parser |
| `cardValue` / `totalOf` | card points (A = 1) and hand total (`{ value, isSoft }`) |

## Rules

- **Infinite deck**: every card is drawn with the same probability (each rank 1/13) regardless of what has been dealt. Real 6–8 deck shoes give almost the same chart
- Dealer stands on soft 17 and has already peeked (the dealer does not have blackjack)
- Blackjack pays 3:2. No surrender, no insurance
- Double on any first two cards, including after a split
- Split up to 4 hands; aces cannot be resplit and receive one card each

## Guarantees

**"Best" = the move with the same expected value as exhaustive calculation.**

- Tested against a test-only exact expected-value solver (`reference/`) on every hand of up to 4 cards (9,450 hands) × 10 up cards × 1–4 hands. In an infinite deck the best move depends only on (total, soft or not, two cards or not, pair), so this covers every case
- The solver itself matches all four [Wizard of Odds infinite-deck tables](https://wizardofodds.com/games/blackjack/expected-return-infinite-deck/) (stand / hit / double / split) to 6 decimal places. That split table assumes you always resplit; the solver also chooses whether to resplit, and that never changes whether to split
- Whether to split does not depend on how many hands you hold or how many are still waiting, which is why `hands` is the only split context in the state

## State

```ts
type State = {
  dealer: Card // "A" | "2".."10" | "J" | "Q" | "K"
  hand: Card[] // 2 or more cards. After a split, the first card is the split card
  hands?: number // hands you hold now, 1..4 (default 1). 2 or more means this hand came from a split
}
```

**Hands that cannot arise in a real game throw**: a hand that kept drawing after busting, or a third card on a split ace.

## Development

```
src/        # shipped: schema + strategy table. No simulation, no search
reference/  # test-only exact expected-value solver + Wizard of Odds tables. Not shipped
test/       # cross-checks against the solver and the published tables
```
