/**
 * ゲーム非依存の厳密探索エンジン。テスト用の正解役なので、評価関数も打ち切りも持たない。
 *
 * 全状態をメモ化しながら辿るだけなので、扱えるのは
 * 「状態空間そのものが小さいゲーム」か「終局まで数手の局面」に限られる。
 * コネクト4 のような大きいゲームで全局面を解くのは src 側の αβ 探索の仕事。
 */

/** 手番側から見た結果。score は将来 chance node (期待値) を入れられるよう number にしてある */
export type Outcome = {
  /** 手番側から見た評価値。決定的ゲームでは 1 = 勝ち, 0 = 引分, -1 = 負け */
  score: number
  /** 最善を尽くした場合に決着までにかかる手数 (ply) */
  depth: number
}

export type MoveEval<M> = Outcome & { move: M }

export type Game<S, M> = {
  legalMoves: (state: S) => M[]
  applyMove: (state: S, move: M) => S
  /** 終局なら手番側から見たスコア、続行中なら null */
  terminalScore: (state: S) => number | null
  /** 置換表のキー。手番を含め、同一局面が同一キーになること */
  key: (state: S) => string
}

// 引分で -0 が生まれると JSON や deep equal では 0 と別物になるので潰しておく
const negate = ({ score, depth }: Outcome): Outcome => ({
  score: score === 0 ? 0 : -score,
  depth: depth + 1,
})

/**
 * 勝ちは早いほど、負けは遅いほど良い。引分は無駄に伸ばさず早く終わる方を良しとする。
 * 同値なら false を返し、先に見つかった手 (= legalMoves の順) を保つ。
 */
export const isBetter = (a: Outcome, b: Outcome): boolean => {
  if (a.score !== b.score) return a.score > b.score
  if (a.score > 0) return a.depth < b.depth
  if (a.score < 0) return a.depth > b.depth

  return a.depth < b.depth
}

const solveState = <S, M>(
  game: Game<S, M>,
  state: S,
  memo: Map<string, Outcome>
): Outcome => {
  const terminal = game.terminalScore(state)

  if (terminal !== null) return { score: terminal, depth: 0 }

  const key = game.key(state)
  const cached = memo.get(key)

  if (cached !== undefined) return cached

  // evaluateMoves は良い順に並んでいるので先頭が最善
  const [best] = evaluateMoves(game, state, memo)

  if (best === undefined) {
    // 合法手が無いのに終局していない = ゲーム定義側のバグ。黙って引分にすると嘘の解を返す
    throw new Error(`no legal moves in a non-terminal state: ${key}`)
  }

  const outcome: Outcome = { score: best.score, depth: best.depth }

  memo.set(key, outcome)

  return outcome
}

/** 全合法手を「手番側から見て良い順」に並べて返す */
export const evaluateMoves = <S, M>(
  game: Game<S, M>,
  state: S,
  memo: Map<string, Outcome> = new Map()
): MoveEval<M>[] =>
  game
    .legalMoves(state)
    .map((move) => ({
      move,
      ...negate(solveState(game, game.applyMove(state, move), memo)),
    }))
    .sort((a, b) => (isBetter(a, b) ? -1 : isBetter(b, a) ? 1 : 0))

export const solve = <S, M>(
  game: Game<S, M>,
  state: S,
  memo: Map<string, Outcome> = new Map()
): Outcome => solveState(game, state, memo)
