/**
 * テスト専用の正解役。ルールどおりに完全読みする。パッケージには含めない (files は lib/ のみ)。
 * 攻略法 (src/strategy.ts) が正しいかは、ここと全局面で突き合わせて保証する。
 */
import { type Game, type Outcome, solve } from "@gamod/core"
import type { Move, Rule, State } from "../src/schema.js"
import { applyMove, isOver, legalMoves } from "./rules.js"

/** 山が全て空の局面の手番側は、直前に相手が最後の 1 個を取っている */
const terminalScore = (state: State): number | null => {
  if (!isOver(state)) return null

  return state.rule === "normal" ? -1 : 1
}

// 山の並び順は勝敗に関係しないので、並べ替えて同じになる局面は同じキーにして置換表を小さくする
export const stateKey = ({ heaps, rule }: State): string =>
  `${rule}:${[...heaps].sort((a, b) => a - b).join(",")}`

export const nim: Game<State, Move> = {
  legalMoves,
  applyMove,
  terminalScore,
  key: stateKey,
}

const memo = new Map<string, Outcome>()

/** 手番側から見た勝敗 (1 = 勝ち / -1 = 負け。ニムに引分は無い) */
export const gameValue = (state: State): number => solve(nim, state, memo).score

/** heapCount 個の山それぞれが 0..maxSize 個の全ての並び (順序を区別する) */
export const allStates = (
  heapCount: number,
  maxSize: number,
  rule: Rule
): State[] => {
  const base = maxSize + 1

  return Array.from({ length: base ** heapCount }, (_, index) => ({
    heaps: Array.from(
      { length: heapCount },
      (_, heap) => Math.floor(index / base ** heap) % base
    ),
    rule,
  }))
}
