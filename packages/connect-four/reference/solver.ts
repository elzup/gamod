/**
 * テスト専用の正解役。@gamod/core の全探索でルールどおりに解く。パッケージには含めない。
 *
 * 7x6 を丸ごと解くことはできない (4.5 兆局面) ので、使うのは
 * 小さい盤の全局面と、終局まで数手しか無い 7x6 の局面。
 */
import { evaluateMoves, type Game, type Outcome, solve } from "@gamod/core"
import { createRules, type Position, type Rules, type Size } from "./rules.js"

export type Oracle = {
  rules: Rules
  /** 手番側から見た完全読みの結果 */
  solveState: (position: Position) => Outcome
  /** 手番側から見た勝敗 (1 / 0 / -1) */
  gameValue: (position: Position) => number
  /** 完全読みで最善と同じ結果になる手 (複数あればすべて) */
  bestMoves: (position: Position) => number[]
  isTerminal: (position: Position) => boolean
  /** 初期局面から合法手だけで辿れる全局面 (終局局面を含む) */
  reachableStates: () => Position[]
}

export const createOracle = (size: Size): Oracle => {
  const rules = createRules(size)
  const terminalScore = (position: Position): number | null => {
    // 4 連を作ったのは直前に指した側なので、終局局面の手番側は負けている
    if (rules.winnerOf(position) !== null) return -1
    if (rules.isFull(position)) return 0

    return null
  }
  const game: Game<Position, number> = {
    legalMoves: rules.legalMoves,
    applyMove: rules.applyMove,
    terminalScore,
    key: rules.key,
  }
  const memo = new Map<string, Outcome>()
  const solveState = (position: Position) => solve(game, position, memo)
  const isTerminal = (position: Position) => terminalScore(position) !== null

  return {
    rules,
    solveState,
    gameValue: (position) => solveState(position).score,
    bestMoves: (position) => {
      const evaluated = evaluateMoves(game, position, memo)
      const [best] = evaluated

      if (best === undefined) return []

      return evaluated
        .filter(({ score }) => score === best.score)
        .map(({ move }) => move)
    },
    isTerminal,
    reachableStates: () => {
      const found = new Map<string, Position>()
      const visit = (position: Position) => {
        const key = rules.key(position)

        if (found.has(key)) return
        found.set(key, position)
        for (const move of rules.legalMoves(position))
          visit(rules.applyMove(position, move))
      }

      visit(rules.initial())

      return [...found.values()]
    },
  }
}
