/**
 * テスト専用の正解役。ルールどおりに幅優先探索で最短手数を求める。パッケージには含めない (files は lib/ のみ)。
 * 攻略法 (src/strategy.ts) が正しいかは、ここと全局面で突き合わせて保証する。
 */
import { distancesTo, optimalMoves, type Puzzle } from "@gamod/core"
import type { Move, Peg, State } from "../src/schema.js"
import { applyMove, legalMoves } from "./rules.js"

export const stateKey = ({ pegs, target }: State): string =>
  `${target}:${pegs.join("")}`

export const hanoi: Puzzle<State, Move> = {
  legalMoves,
  applyMove,
  key: stateKey,
}

const tables = new Map<string, Map<string, number>>()

/** 同じ枚数・同じ目標の局面どうしで最短手数の表を共有する */
const distanceTable = (disks: number, target: Peg): Map<string, number> => {
  const id = `${disks}:${target}`
  const cached = tables.get(id)

  if (cached !== undefined) return cached

  const goal: State = {
    pegs: Array.from({ length: disks }, () => target),
    target,
  }
  const table = distancesTo(hanoi, goal)

  tables.set(id, table)

  return table
}

/** 目標の棒に揃うまでの最短手数 */
export const distance = (state: State): number => {
  const found = distanceTable(state.pegs.length, state.target).get(
    stateKey(state)
  )

  if (found === undefined)
    throw new Error(`unreachable state: ${stateKey(state)}`)

  return found
}

/** 最短手数を 1 減らす手を全て */
export const shortestNextMoves = (state: State): Move[] =>
  optimalMoves(hanoi, state, distanceTable(state.pegs.length, state.target))

/** disks 枚の全ての並び (3^disks 通り) */
export const allStates = (disks: number, target: Peg): State[] =>
  Array.from({ length: 3 ** disks }, (_, index) => ({
    pegs: Array.from(
      { length: disks },
      (_, disk) => (Math.floor(index / 3 ** disk) % 3) as Peg
    ),
    target,
  }))
