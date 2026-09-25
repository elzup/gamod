# @gamod/blackjack

[English](readme.md) | 日本語

ブラックジャックの手札とディーラーのアップカードを渡すと、期待値が最大になる手を返す。中身はシミュレーションではなく **basic strategy の表引き**。

> draft (`private: true`、未公開)。

## インストール

```bash
pnpm add @gamod/blackjack
```

## 使い方

```ts
import { bestMove } from "@gamod/blackjack"

bestMove({ dealer: "10", hand: ["6", "10"] }) // => "hit"
bestMove({ dealer: "6", hand: ["8", "8"] }) // => "split"
bestMove({ dealer: "3", hand: ["A", "7"] }) // => "double"
bestMove({ dealer: "3", hand: ["A", "3", "4"] }) // => "stand" (ソフト 18。3 枚目以降はダブルできない)

// スプリット後は今持っているハンド数を渡す
bestMove({ dealer: "10", hand: ["8", "8"], hands: 4 }) // => "hit" (これ以上割れない)
```

## API

| export | 説明 |
| --- | --- |
| `bestMove(state)` | `"hit" \| "stand" \| "double" \| "split"`。打つ手が無い (バースト / ナチュラル BJ / A スプリット後のハンド) なら `null` |
| `stateSchema` / `parseState` | zod schema と検証付きパーサ |
| `cardValue` / `totalOf` | カードの点数 (A = 1) と手札の合計 (`{ value, isSoft }`) |

## ルール

- **無限デッキ**: 何が配られても、どのカードも同じ確率 (各ランク 1/13) で引く。実際の 6〜8 デッキの卓でも表はほぼ同じ
- ディーラーはソフト 17 でスタンド。peek 済み (ディーラーは BJ ではない)
- BJ は 3:2。サレンダー・インシュランスなし
- 最初の 2 枚ならダブル可 (スプリット後も可)
- 4 ハンドまでスプリット可。A はリスプリット不可で、1 枚ずつしか配られない

## 保証

**「最善」= 厳密計算と同じ期待値になる手。**

- テスト専用の厳密な期待値ソルバ (`reference/`) と、4 枚までの全手札 (9,450 通り) × アップカード 10 種 × ハンド数 1〜4 で照合している。無限デッキでは最善手が (合計, ソフトか, 2 枚か, ペアか) だけで決まるので、これで全ケースを網羅する
- ソルバ自体は [Wizard of Odds の無限デッキ表](https://wizardofodds.com/games/blackjack/expected-return-infinite-deck/) 4 種 (stand / hit / double / split) と全マス小数 6 桁まで一致する。公開されているスプリット表は「ペアが来たら必ずリスプリットする」前提。ソルバはリスプリットするかも最適に選ぶが、それで割るかどうかの判断が変わることはない
- 割るかどうかは、持っているハンド数にも後に控えるハンド数にも依らない。そのため state に持たせるスプリットの情報は `hands` だけ

## State

```ts
type State = {
  dealer: Card // "A" | "2".."10" | "J" | "Q" | "K"
  hand: Card[] // 2 枚以上。スプリット後なら 1 枚目が割ったカード
  hands?: number // 今持っているハンド数 1..4 (既定 1)。2 以上ならこのハンドはスプリットで生まれたもの
}
```

**実戦で現れない手札は例外を投げる**: バースト後も引き続けた手札、A スプリットの 3 枚目。

## 開発

```
src/        # 出荷物: schema + 攻略表。シミュレーションも探索も持たない
reference/  # テスト専用の厳密な期待値ソルバ + Wizard of Odds の表。出荷しない
test/       # ソルバ・公開表との照合
```
