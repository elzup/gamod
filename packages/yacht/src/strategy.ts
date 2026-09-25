import { countsOf, keepCounts, keepIndex } from "./dice.js"
import { type Dice, type Move, parseState, type Sheet } from "./schema.js"
import { CATEGORIES, UPPER_CATEGORY_COUNT } from "./scoring.js"
import {
  ALL_FILLED,
  bestSubKeep,
  cappedUpper,
  expectOver,
  scoringStage,
  type ValueFn,
} from "./turn.js"

export const filledMask = (sheet: Sheet): number =>
  CATEGORIES.reduce(
    (mask, category, index) =>
      sheet[category] === undefined ? mask : mask | (1 << index),
    0
  )

export const upperTotal = (sheet: Sheet): number =>
  CATEGORIES.slice(0, UPPER_CATEGORY_COUNT).reduce(
    (sum, category) => sum + (sheet[category] ?? 0),
    0
  )

/** 残す多重集合を、dice の位置 (昇順) に割り当てる。同じ目が複数あれば前から使う */
const positionsOf = (dice: Dice, keep: number): number[] => {
  const remaining = [...keepCounts(keep)]

  return dice.flatMap((die, position) => {
    const left = remaining[die - 1] ?? 0

    if (left === 0) return []
    remaining[die - 1] = left - 1

    return [position]
  })
}

/** 振り直し rerollsLeft 回ぶん手前の段まで延ばし、最後の段の「残し方」を返す */
const rerollChoice = (scored: Float64Array, rerollsLeft: number) =>
  Array.from({ length: rerollsLeft }).reduce<{
    values: Float64Array
    keeps: Int16Array | null
  }>(({ values }) => bestSubKeep(expectOver(values)), {
    values: scored,
    keeps: null,
  })

/**
 * 手番開始時の期待値 (ValueFn) を受け取り、最善手を返す関数を作る。
 * 「最善」= 合計点の期待値が最大になる手。記入表が埋まっていれば null。
 *
 * draft: ValueFn の出荷形式 (テーブルの圧縮 / 近似) が未決のため、今は外から渡す形にしてある。
 */
export const createBestMove =
  (value: ValueFn) =>
  (input: unknown): Move | null => {
    const { dice, rerollsLeft, sheet } = parseState(input)
    const filled = filledMask(sheet)

    if (filled === ALL_FILLED) return null

    const roll = keepIndex(countsOf(dice))
    const scoring = scoringStage(filled, cappedUpper(upperTotal(sheet)), value)
    const { keeps } = rerollChoice(scoring.values, rerollsLeft)
    const keep = keeps?.[roll] ?? roll

    if (keep !== roll) return { type: "reroll", keep: positionsOf(dice, keep) }

    const category = CATEGORIES[scoring.categories[roll] ?? -1]

    if (category === undefined)
      throw new Error("no open category to score (bug in scoringStage)")

    return { type: "score", category }
  }
