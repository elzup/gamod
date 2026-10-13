# @gamod/nim

English | [日本語](readme.ja.md)

Give it the heaps of a Nim game and it returns the best move. Internally it is not a search but the **nim-sum strategy (a few XORs)**.

> Draft (`private: true`, not published yet).

## Install

```bash
pnpm add @gamod/nim
```

## Usage

```ts
import { bestMove } from "@gamod/nim"

bestMove({ heaps: [3, 4, 5] }) // => { heap: 0, take: 2 } (leaves 1, 4, 5)

// misère play: whoever takes the last stone loses
bestMove({ heaps: [1, 5, 1], rule: "misere" }) // => { heap: 1, take: 4 } (leaves 1, 1, 1)

bestMove({ heaps: [1, 2, 3] }) // => { heap: 2, take: 1 } (already lost; stalls)
bestMove({ heaps: [0, 0, 0] }) // => null (the game is over)
```

## API

| export | description |
| --- | --- |
| `bestMove(state)` | `{ heap, take }`: take `take` stones from `heaps[heap]`. `null` if every heap is empty |
| `stateSchema` / `parseState` | zod schema and a validating parser |
| `moveSchema` / `ruleSchema` / `heapSchema` | zod schemas of the parts |
| `initialState` | the common 3-4-5 start in normal play |
| `MAX_HEAP_SIZE` | largest supported heap (2^31 - 1) |

## Guarantees

**"Best" = a move with the same outcome as exhaustive search.** It wins every winnable position. In a lost position every move loses, so it takes one stone from the largest heap to keep the game going.

- Tested to agree with a test-only exhaustive solver (`reference/`) on every position of up to 4 heaps of 0..7 stones and 3 heaps of 0..15 stones (8771 non-terminal positions per rule)
- The strategy is a closed formula that does not depend on the number or size of heaps, so larger positions go through the same computation
- The solver itself is checked against Bouton's theorem (lost positions = zero nim-sum) and well-known positions

## Strategy

Let the nim-sum be the XOR of all heap sizes.

- **Normal play** (taking the last stone wins): if the nim-sum is not 0, shrink one heap so that it becomes 0. If it is already 0, the position is lost.
- **Misère play** (taking the last stone loses): play exactly as in normal play while at least two heaps hold 2 or more stones. Once only one such heap is left, shrink it to 0 or 1 so that an **odd number of single-stone heaps** remains.

## State

```ts
type State = {
  heaps: number[] // at least one heap. 0 means an emptied heap
  rule?: "normal" | "misere" // default "normal"
}

type Move = { heap: number; take: number }
```

- There is no turn field: Nim offers the same moves to both players, so the best move depends on the heaps alone.
- Keep emptied heaps as `0` so that heap indices stay stable during a game.
- Every heap layout is a valid starting position, so no state is rejected as unreachable. Malformed states (no heaps, negative or fractional sizes, sizes above `MAX_HEAP_SIZE`) throw.

## Development

```
src/        # shipped: schema + strategy. No game progression, no search
reference/  # test-only oracle (rules + exhaustive search via @gamod/core). Not shipped
test/       # exhaustive cross-checks and property tests
```
