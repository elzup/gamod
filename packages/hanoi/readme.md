# @gamod/hanoi

English | [日本語](readme.ja.md)

Give it a Tower of Hanoi position and it returns the next move of the shortest solution onto the target peg. Internally it is not a search but **a single pass over the disks from largest to smallest (O(n))**. Given only the step number of the classic solution, it returns that move in **O(1)** without any position at all.

> Draft (`private: true`, not published yet).

## Install

```bash
pnpm add @gamod/hanoi
```

## Usage

```ts
import { bestMove, initialState, moveAt, movesLeft } from "@gamod/hanoi"

bestMove(initialState()) // => { disk: 0, from: 0, to: 2 } (3 disks from peg 0 to peg 2)

// Any position works. pegs[k] = the peg disk k (0 is the smallest) is on
bestMove({ pegs: [1, 1, 0], target: 2 }) // => { disk: 2, from: 0, to: 2 }
movesLeft({ pegs: [1, 1, 0], target: 2 }) // => 4

// The step-th move (1-based) of the shortest solution from peg 0 to peg 2
moveAt(3, 4) // => { disk: 2, from: 0, to: 2 }
```

## API

| export | description |
| --- | --- |
| `bestMove(state)` | `{ disk, from, to }`: the next move of the shortest solution, or `null` when every disk is on the target. O(n) |
| `movesLeft(state)` | Number of moves in the shortest solution. O(n) |
| `moveAt(disks, step)` | The `step`-th move (`1..2^disks - 1`) of moving `disks` disks from peg 0 to peg 2. O(1) |
| `stateSchema` / `parseState` | zod schema and validating parser |
| `moveSchema` / `pegSchema` | zod schemas for the parts |
| `initialState(disks = 3)` | `disks` disks stacked on peg 0, targeting peg 2 |
| `MAX_DISKS` | Largest supported number of disks (31) |

## Guarantees

**"Best" means the next move of the shortest solution.** In the Tower of Hanoi the shortest solution from any position to a full tower on the target peg is unique.

- Every position with 1..8 disks and all three targets (29,520 positions) is checked against a test-only breadth-first search (`reference/`); `movesLeft` matches the shortest distance on every one of them
- `moveAt` is replayed to the end for 1..20 disks (no illegal move, ends on peg 2) and matches `bestMove` move by move for 1..10 disks
- The breadth-first search itself is checked against known facts: 2^n - 1 moves from the start, and exactly 2^popcount(d) positions at distance d (3^n in total, at most 2^n - 1 away)

## Strategy

Number the pegs 0, 1, 2 and walk the disks from largest to smallest, deciding the peg t[k] each disk must end up on (the largest disk's is the target).

- If disk k is on t[k], the smaller disks aim for the same peg
- Otherwise the smaller disks must first clear out to the third peg, so they aim for that one

Both cases collapse to `t[k-1] = -(t[k] + pegs[k]) mod 3`. The shortest move takes the **smallest** misplaced disk to its t[k]. The distance is the sum of 2^k over the misplaced disks k.

### Why moveAt is O(1)

Positions on the classic solution are fully described by their step number (a single n-bit integer). The disk moved at step m is the lowest set bit of m, and it moves from `(m & (m - 1)) % 3` to `((m | (m - 1)) + 1) % 3` (swapping pegs 1 and 2 for an even number of disks), so no loop is needed. `bestMove` takes a full position, and since every disk's peg can change the answer, reading all disks (O(n)) is the lower bound.

## State

```ts
type State = {
  pegs: (0 | 1 | 2)[] // pegs[k] = the peg disk k (0 is the smallest) is on. 1..31 disks
  target?: 0 | 1 | 2 // peg to gather every disk on. Defaults to 2
}

type Move = { disk: number; from: 0 | 1 | 2; to: 0 | 1 | 2 }
```

- On any peg the larger disk is always below, so the order within a peg is not stored. An illegal stack cannot be written in this form.
- Every arrangement is reachable from the start, so no position is rejected as unreachable. Malformed states (no disks, a peg that does not exist, more than 31 disks) throw.

## Development

```
src/        # shipped: schema + strategy. No game progression, no search
reference/  # test-only oracle (rules + breadth-first search from @gamod/core). Not shipped
test/       # exhaustive cross-checks and property tests
```
