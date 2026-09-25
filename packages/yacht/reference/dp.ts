/**
 * テスト専用の正解役: 手番開始局面 (記入済みの役, 上段合計) 全部の期待値を後ろ向き DP で求める。
 * パッケージには含めない (files は lib/ のみ)。
 */
import { DICE_COUNT } from "../src/dice.js"
import {
  CATEGORIES,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORY_COUNT,
} from "../src/scoring.js"
import {
  ALL_FILLED,
  cappedUpper,
  turnStartValue,
  type ValueFn,
} from "../src/turn.js"

/** 上段合計は 63 で頭打ちにするので 0..63 の 64 通り */
export const UPPER_STATES = UPPER_BONUS_THRESHOLD + 1
export const FILLED_STATES = ALL_FILLED + 1

export const tableIndex = (filled: number, upper: number): number =>
  filled * UPPER_STATES + upper

/** 記入済みの上段の役から作れる上段合計 (63 で頭打ち) の一覧。昇順 */
export const reachableUppers = (filled: number): number[] => {
  const faces = Array.from(
    { length: UPPER_CATEGORY_COUNT },
    (_, face) => face
  ).filter((face) => (filled & (1 << face)) !== 0)
  const sums = faces.reduce(
    (reached, face) =>
      new Set(
        Array.from(reached).flatMap((sum) =>
          Array.from({ length: DICE_COUNT + 1 }, (_, count) =>
            cappedUpper(sum + count * (face + 1))
          )
        )
      ),
    new Set([0])
  )

  return [...sums].sort((a, b) => a - b)
}

/** 到達しうる手番開始局面の数 (全記入済みを含む) */
export const reachableStateCount = (): number =>
  Array.from(
    { length: FILLED_STATES },
    (_, filled) => reachableUppers(filled).length
  ).reduce((a, b) => a + b, 0)

/** 未到達の局面は NaN のまま残す。万一引かれたら計算結果に NaN が伝播してテストで気付ける */
export const tableValueFn =
  (table: Float64Array): ValueFn =>
  (filled, upper) =>
    table[tableIndex(filled, upper)] ?? Number.NaN

/** turnStartValue を差し替えられるようにしておき、近似方策の評価 (policy.ts) でも同じ後ろ向きの順序を使う */
export const backwardFill = (
  step: (filled: number, upper: number, value: ValueFn) => number
): Float64Array => {
  const table = new Float64Array(FILLED_STATES * UPPER_STATES).fill(Number.NaN)
  const value = tableValueFn(table)

  // 全記入済みはこれ以上点が入らない
  for (const upper of reachableUppers(ALL_FILLED))
    table[tableIndex(ALL_FILLED, upper)] = 0

  // filled に bit を足すと必ず数値が大きくなるので、降順に回せば記入後の局面は計算済み
  for (let filled = ALL_FILLED - 1; filled >= 0; filled -= 1)
    for (const upper of reachableUppers(filled))
      table[tableIndex(filled, upper)] = step(filled, upper, value)

  return table
}

export const solveValues = (): Float64Array => backwardFill(turnStartValue)

export const openCategories = (filled: number): number[] =>
  CATEGORIES.flatMap((_, index) =>
    (filled & (1 << index)) === 0 ? [index] : []
  )
