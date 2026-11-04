# Game classification

Every package claims to return "the best move", but what that means and how it is guaranteed differ per game. This page splits that into independent axes so the differences stay visible. Add a row to each table when adding a game (see [adding-a-game.md](adding-a-game.md)).

## Axes

| # | axis | question | values |
| --- | --- | --- | --- |
| 1 | Solve strength | From which positions do we know the best move? | ultra-weakly / weakly / strongly solved |
| 2 | Chance | Does randomness (dice, cards) affect the outcome? | deterministic / stochastic |
| 3 | Information | Is everything relevant to the decision visible? | perfect / hidden |
| 4 | Opponent | Who is the player up against? | two-player / solo (against chance) |
| 5 | Rule fidelity | Is the solved game the real game, or a model of it? | exact / model (state the assumption) |

Axes 2–4 decide what "best" means: win/draw/loss for deterministic two-player games, maximum expected value for stochastic solo games. Axis 1 is about coverage only and does not depend on them.

### Solve strength (axis 1)

The standard terms (Allis, 1994), weakest first. Each level implies the ones above it.

| strength | what is known | tic-tac-toe example |
| --- | --- | --- |
| ultra-weakly solved | Only the outcome of the initial position under perfect play | "Perfect play is a draw", without knowing how to play it |
| weakly solved | A perfect strategy from the initial position | Never lose when starting from the opening, but no answer once the opponent leaves the known line |
| strongly solved | The best move from **every** position | Any mid-game board gets a best move |

`bestMove(state)` accepts any valid state, so **every package must be strongly solved**. Outside gamod for reference: checkers is weakly solved (2007), 8x8 Othello is weakly solved (2023), Connect Four is strongly solved but its table is too large to ship (see the deferred list in the readme).

## Packages

| package | 1. strength | 2. chance | 3. information | 4. opponent | 5. fidelity | "best" means |
| --- | --- | --- | --- | --- | --- | --- |
| tic-tac-toe | strongly | deterministic | perfect | two-player | exact | win, else draw |
| nim | strongly | deterministic | perfect | two-player | exact (normal and misère) | win; when lost, prolong the game |
| blackjack | strongly | stochastic | perfect ※ | solo (dealer follows fixed rules) | **model**: infinite deck, S17, no surrender | max expected value |
| yacht | strongly | stochastic | perfect | solo | exact (Clubhouse Games 51 rules) | max expected total score |

※ The dealer's hole card is hidden, but with an infinite deck it is just a known probability distribution, so it does not need hidden-information techniques.

## How correctness is guaranteed

Strongly solved is the claim; this table is the evidence. "Exhaustive" means every reachable state (or every equivalence class of states) is cross-checked against `reference/`.

| package | method | coverage | independent check of the oracle |
| --- | --- | --- | --- |
| tic-tac-toe | exhaustive cross-check | all 4,520 non-terminal positions | known position count and outcome breakdown |
| nim | proof + sampled cross-check | 8,771 positions (up to 4 heaps of 0..7, 3 heaps of 0..15) per rule; larger positions rely on Bouton's theorem | Bouton's theorem (losing ⇔ nim-sum 0) |
| blackjack | exhaustive over equivalence classes | 9,450 hands × 10 upcards × 1..4 hands (the decision depends only on total, softness, 2-card, pair) | Wizard of Odds infinite-deck tables, every cell to 6 decimals |
| yacht | exact DP + sampled cross-check of in-turn moves | V is solved for all 178,816 turn-start states; `bestMove` checked on 2-open-category sheets for every roll × 0..2 rerolls | published optimum 191.77 and single-category endgame values |

## Computational profile

The state space decides what can be shipped. gamod ships no search, so a game fits only if its best move is either a short formula/ruleset or a table small enough for npm.

| package | states | reference (test-only) cost | shipped artifact | `bestMove` time |
| --- | --- | --- | --- | --- |
| tic-tac-toe | 4,520 | full search, instant | conditionals (~4 rules) | ~64 µs (empty board) |
| nim | **unbounded** (heap sizes have no limit) | search grows exponentially; only small positions are enumerable | XOR formula | ~1 µs (3 heaps), ~30 µs (100 heaps) |
| blackjack | finite after folding into equivalence classes | split EV ~2 s per test case | lookup table (~6 KB source) | ~0.5 µs |
| yacht | 178,816 turn-start states × in-turn states | full DP ~5 s | **undecided**: exact table ~700 KB brotli; approximations lose exactness | 13–63 µs (in-turn computation from V) |

`bestMove` times include schema validation; measured 2026-11 on an Apple M2 with `vitest bench` (single call).

This gives three shapes of game:

1. **Enumerable** (tic-tac-toe): exhaustive cross-check gives a complete guarantee.
2. **Unbounded but provable** (nim): enumeration is impossible, so tests verify the implementation of a proof on a sample.
3. **Enumerable but large to ship** (yacht, and Connect Four on the deferred list): solving is done; the open question is how to fit the result into the package.
