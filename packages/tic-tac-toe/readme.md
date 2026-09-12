# @gamod/tic-tac-toe

三目並べの局面を渡すと最善手を返す。全 5478 局面を厳密に解くので、評価関数も探索深さの指定も無い。

## Install

```bash
pnpm add @gamod/tic-tac-toe
```

## Usage

```ts
import { bestMove, bestMoves, evaluate, initialState } from "@gamod/tic-tac-toe"

bestMove(initialState()) // => 0 (初手はどこでも引分なので先頭が返る)

const state = {
  // 左上から右下へ 9 マス。空きは null
  board: ["x", "x", null, "o", "o", null, null, null, null],
  turn: "x",
} as const

bestMove(state) // => 2 (勝ち)
evaluate(state)[0] // => { move: 2, score: 1, depth: 1 }
bestMoves({ board: ["x", null, null, null, "o", null, null, null, "x"], turn: "o" })
// => [1, 3, 5, 7] (隅を取るとフォークで負ける)
```

## API

| export | 説明 |
| --- | --- |
| `bestMove(state)` | 最善手を 1 つ。終局していれば `null` |
| `bestMoves(state)` | 完全に同値な最善手すべて |
| `evaluate(state)` | 全合法手を良い順に `{ move, score, depth }` で |
| `evaluateState(state)` | その局面の結果 `{ score, depth }` |
| `stateSchema` / `parseState` | zod schema と検証付きパーサ |
| `legalMoves` / `applyMove` / `judge` | ルール (すべて非破壊) |
| `initialState` / `emptyBoard` | 初期値 |

`score` は手番側から見て `1` 勝ち / `0` 引分 / `-1` 負け。`depth` は双方最善で決着までにかかる手数。

## State

```ts
type State = {
  board: ("x" | "o" | null)[] // 長さ 9
  turn: "x" | "o"
}
```

x が先手。石数と手番が矛盾する state (例: 盤が空なのに `turn: "o"`) は**弾く** — 到達し得ない局面を黙って解くと嘘の最善手を返すため。
