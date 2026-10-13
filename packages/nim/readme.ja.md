# @gamod/nim

[English](readme.md) | 日本語

ニムの山を渡すと最善手を返す。中身は探索ではなく**ニム和の攻略法 (XOR 数回)**。

> draft (`private: true`、未公開)。

## Install

```bash
pnpm add @gamod/nim
```

## Usage

```ts
import { bestMove } from "@gamod/nim"

bestMove({ heaps: [3, 4, 5] }) // => { heap: 0, take: 2 } (1, 4, 5 にする)

// misere: 最後の 1 個を取った側の負け
bestMove({ heaps: [1, 5, 1], rule: "misere" }) // => { heap: 1, take: 4 } (1, 1, 1 にする)

bestMove({ heaps: [1, 2, 3] }) // => { heap: 2, take: 1 } (既に負け。長引かせる)
bestMove({ heaps: [0, 0, 0] }) // => null (終局)
```

## API

| export | 説明 |
| --- | --- |
| `bestMove(state)` | `{ heap, take }`: `heaps[heap]` から `take` 個取る。全ての山が空なら `null` |
| `stateSchema` / `parseState` | zod schema と検証付きパーサ |
| `moveSchema` / `ruleSchema` / `heapSchema` | 部品の zod schema |
| `initialState` | よく使われる 3・4・5 個の 3 山 (normal) |
| `MAX_HEAP_SIZE` | 扱える山の最大個数 (2^31 - 1) |

## 保証

**「最善」= 完全読みと同じ勝敗になる手。** 勝てる局面では必ず勝ち切る。負けが確定している局面ではどう取っても負けなので、最大の山から 1 個だけ取って対局を長引かせる。

- 山 4 つまでを 0..7 個、山 3 つを 0..15 個で総当たりし (ルールごとに終局を除く 8771 局面)、テスト専用の完全読み (`reference/`) と勝敗が一致することをテストしている
- 攻略法は山の数にも個数にも依らない式なので、それより大きい局面でも同じ計算になる
- 完全読みの側も、Bouton の定理 (負けの局面 = ニム和 0) と有名な局面で確かめている

## 攻略法

全ての山の個数の XOR をニム和と呼ぶ。

- **normal** (最後の 1 個を取ったら勝ち): ニム和が 0 でなければ、ある山を減らして 0 にする。既に 0 なら負けの局面。
- **misere** (最後の 1 個を取ったら負け): 2 個以上の山が 2 つ以上あるうちは normal と同じ手を指す。2 個以上の山が残り 1 つになったら、その山を 0 個か 1 個にして、**1 個の山が奇数個**残る形で渡す。

## State

```ts
type State = {
  heaps: number[] // 山は 1 つ以上。0 は取り尽くした山
  rule?: "normal" | "misere" // 既定は "normal"
}

type Move = { heap: number; take: number }
```

- 手番のフィールドは無い。ニムはどちらの手番でも打てる手が同じなので、最善手は山だけで決まる。
- 取り尽くした山は `0` のまま残す (対局中に山の番号がずれないようにするため)。
- どの山の並びもそのまま初期配置になりうるので、到達不能として弾く局面は無い。形のおかしい state (山が無い、負や小数の個数、`MAX_HEAP_SIZE` 超) は例外を投げる。

## 開発

```
src/        # 出荷物: schema + 攻略法。ゲームの進行も探索も持たない
reference/  # テスト専用の正解役 (ルール + @gamod/core による完全読み)。出荷しない
test/       # 全局面照合・性質テスト
```
