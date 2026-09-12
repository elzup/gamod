# gamod

ゲームの局面 (state) を渡すと**最善手**を返すパッケージ群のモノレポ。攻略本 / チート / CPU 実装の計算機側を、ゲームごとに小さな npm パッケージとして切り出す。

## スコープ

- 対象は**完全解析できる小さいゲーム**。評価関数による近似ではなく**厳密解** (勝ち / 引分 / 負け + 決着までの手数) を返す。
- 乱数・不完全情報を含むゲームも対象。その場合スコアは勝敗ではなく**期待値**になる。
- オセロ・将棋・囲碁のような巨大ゲームは対象外 (評価関数チューニングの世界に入るため)。

## パッケージ

| package | game | 状態 |
| --- | --- | --- |
| [`@gamod/tic-tac-toe`](packages/tic-tac-toe) | 三目並べ | ✅ 完全解析 |

### 候補 (未着手)

| game | 種別 | 備考 |
| --- | --- | --- |
| コネクト4 | 決定的・完全情報 | 7x6。ビットボード + 置換表が要る。エンジンに αβ を足す最初の相手 |
| ヨット (Yacht) | 確率・完全情報 | サイコロ。振り直しの期待値 DP。chance node が要る |
| ポーカー | 確率・**不完全情報** | 相手の手が見えない。期待値だけでなく戦略 (混合戦略) の世界になる |

## 共通の API 規約

ゲームごとに実装は違うが、パッケージの入口は揃える。

```ts
import { bestMove, bestMoves, evaluate, parseState, stateSchema } from "@gamod/<game>"

bestMove(state) // 最善手 1 つ (終局なら null)
bestMoves(state) // 完全に同値な最善手すべて
evaluate(state) // 全合法手を良い順に { move, score, depth } で
stateSchema // zod schema。state の形はこれが正
```

- `score` は**手番側から見た**値。決定的ゲームでは `1 / 0 / -1`、確率ゲームでは期待値。
- `depth` は決着までの手数 (ply)。勝ちは短いほど、負けは長いほど良い。
- state は zod schema で検証してから解く (到達し得ない局面を黙って解くと嘘の最善手が出るため)。

## 共通化の方針

探索そのもの (`packages/*/src/engine.ts`) はゲーム非依存に保ってある。2 つ目のゲームを作る時点で `@gamod/core` として抽出する。ゲーム固有なのは `schema.ts` (局面の形) と `rules.ts` (合法手・遷移・終局判定) だけ。

## デモ

全パッケージを 1 ページに並べた最小デモ ([`apps/demo`](apps/demo))。各カードに盤面 + 全手の評価 + 導入コード (`pnpm add` と最小の使い方) が入る。

```bash
pnpm demo
# 固定 URL で開くなら: portless run --name gamod pnpm demo
```

ゲームを増やすときは `apps/demo/src/games/<game>.ts` に `Demo` を 1 つ書いて `main.ts` の `demos` に足すだけ。

## 開発

```bash
pnpm install
pnpm test       # vitest (全パッケージ)
pnpm check      # biome (format + lint)
pnpm typecheck
pnpm build      # 各パッケージを cjs / esm / types で出力
```

```
packages/<game>/src/
  schema.ts   # 局面の形 (zod)。ゲーム固有
  rules.ts    # 合法手・遷移・終局判定。ゲーム固有
  engine.ts   # 厳密探索。ゲーム非依存 → いずれ @gamod/core へ
  solver.ts   # engine にゲームを差し込んで bestMove を公開
apps/demo/    # 全パッケージのデモページ
```
