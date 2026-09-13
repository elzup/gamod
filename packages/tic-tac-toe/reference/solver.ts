/**
 * テスト専用の正解役。ルールどおりに全局面を完全読みする。パッケージには含めない (files は lib/ のみ)。
 * 攻略法 (src/strategy.ts) が正しいかは、ここと全局面で突き合わせて保証する。
 */
import type { Board, Cell, Move, Player, State } from "../src/schema.js"
import { type Game, type Outcome, solve } from "./engine.js"
import { applyMove, judge, legalMoves } from "./rules.js"

const terminalScore = (state: State): number | null => {
  const judgement = judge(state)

  if (judgement.status === "playing") return null
  if (judgement.status === "draw") return 0

  // 勝ち筋を作った側は直前に指した側なので、終局局面の手番側は負けている
  return judgement.winner === state.turn ? 1 : -1
}

export const stateKey = ({ board, turn }: State): string =>
  `${board.map((cell) => cell ?? ".").join("")}${turn}`

export const ticTacToe: Game<State, Move> = {
  legalMoves,
  applyMove,
  terminalScore,
  key: stateKey,
}

const memo = new Map<string, Outcome>()

/** 手番側から見た完全読みの結果 */
export const solveState = (state: State): Outcome =>
  solve(ticTacToe, state, memo)

/** 手番側から見た勝敗 (1 / 0 / -1) */
export const gameValue = (state: State): number => solveState(state).score

export const isTerminal = (state: State): boolean =>
  judge(state).status !== "playing"

/** 初期局面から合法手だけで辿れる全局面 (終局局面を含む) */
export const reachableStates = (): State[] => {
  const found = new Map<string, State>()
  const visit = (state: State) => {
    const key = stateKey(state)

    if (found.has(key)) return
    found.set(key, state)
    for (const move of legalMoves(state)) visit(applyMove(state, move))
  }

  visit({ board: Array<Cell>(9).fill(null), turn: "x" })

  return [...found.values()]
}

/** 全 3^9 盤面 x 手番 (到達可能かは問わない) */
export const allStates = (): State[] => {
  const cellOf = (code: number): Cell =>
    code === 1 ? "x" : code === 2 ? "o" : null
  const boardOf = (index: number): Board =>
    Array.from({ length: 9 }, (_, cell) =>
      cellOf(Math.floor(index / 3 ** cell) % 3)
    )
  const turns: Player[] = ["x", "o"]

  return Array.from({ length: 3 ** 9 }, (_, index) => boardOf(index)).flatMap(
    (board) => turns.map((turn) => ({ board, turn }))
  )
}
