import {
  evaluateMoves,
  type Game,
  isBetter,
  type MoveEval,
  type Outcome,
  solve,
} from "./engine.js"
import { applyMove, judge, legalMoves } from "./rules.js"
import { type Move, parseState, type State } from "./schema.js"

const terminalScore = (state: State): number | null => {
  const judgement = judge(state)

  if (judgement.status === "playing") return null
  if (judgement.status === "draw") return 0

  // 勝ち筋を作った側は直前に指した側なので、終局局面の手番側は負けている
  return judgement.winner === state.turn ? 1 : -1
}

const key = ({ board, turn }: State): string =>
  `${board.map((cell) => cell ?? ".").join("")}${turn}`

export const ticTacToe: Game<State, Move> = {
  legalMoves,
  applyMove,
  terminalScore,
  key,
}

/** 全局面 5478 通りしか無いのでプロセス内に持ち切れる (上限管理は不要) */
const memo = new Map<string, Outcome>()

/** 全合法手を「手番側から見て良い順」に評価して返す */
export const evaluate = (state: State): MoveEval<Move>[] =>
  evaluateMoves(ticTacToe, parseState(state), memo)

/** その局面の厳密な結果 (手番側から見た勝敗と、最善を尽くした場合の残り手数) */
export const evaluateState = (state: State): Outcome =>
  solve(ticTacToe, parseState(state), memo)

/** 最善手が複数ある (完全に同値な) 場合はすべて返す。終局なら空配列 */
export const bestMoves = (state: State): Move[] => {
  const evaluated = evaluate(state)
  const [top] = evaluated

  if (top === undefined) return []

  return evaluated
    .filter((item) => !isBetter(top, item) && !isBetter(item, top))
    .map(({ move }) => move)
}

/** 最善手を 1 つ返す。終局していて指す手が無ければ null */
export const bestMove = (state: State): Move | null =>
  bestMoves(state)[0] ?? null
