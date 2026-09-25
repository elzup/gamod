/**
 * 近似した ValueFn で手を選んだとき、その方策が実際に取る点の期待値を求める (方策評価)。
 * 「どの手を選ぶか」は近似値で決め、「その手の期待値」は真の値で積み上げるので、近似による損失を正確に測れる。
 */
import { EMPTY_KEEP, KEEP_COUNT, ROLLS } from "../src/dice.js"
import { SCORE_TABLE } from "../src/scoring.js"
import {
  bestSubKeep,
  expectOver,
  scoredValue,
  scoringStage,
  type ValueFn,
} from "../src/turn.js"
import { backwardFill } from "./dp.js"

/** 近似値が選んだ役に記入したときの、真の (点 + ボーナス + 以降の期待値) */
const trueScoring = (
  filled: number,
  upper: number,
  categories: Int8Array,
  truth: ValueFn
): Float64Array => {
  const values = new Float64Array(KEEP_COUNT)

  for (const roll of ROLLS) {
    const category = categories[roll] ?? -1
    const score = SCORE_TABLE[category * KEEP_COUNT + roll] ?? 0

    values[roll] = scoredValue(filled, upper, category, score, truth)
  }

  return values
}

/** 近似値が選んだ残し方で振り直したときの、真の期待値 */
const trueReroll = (
  truthNext: Float64Array,
  keeps: Int16Array
): Float64Array => {
  const expect = expectOver(truthNext)
  const values = new Float64Array(KEEP_COUNT)

  for (const roll of ROLLS) values[roll] = expect[keeps[roll] ?? roll] ?? 0

  return values
}

const policyStartValue =
  (approx: ValueFn) =>
  (filled: number, upper: number, truth: ValueFn): number => {
    const scoring = scoringStage(filled, upper, approx)
    const oneLeft = bestSubKeep(expectOver(scoring.values))
    const twoLeft = bestSubKeep(expectOver(oneLeft.values))
    const truthScored = trueScoring(filled, upper, scoring.categories, truth)
    const truthOneLeft = trueReroll(truthScored, oneLeft.keeps)
    const truthTwoLeft = trueReroll(truthOneLeft, twoLeft.keeps)

    return expectOver(truthTwoLeft)[EMPTY_KEEP] ?? Number.NaN
  }

/** approx で手を選び続けたときの、各手番開始局面からの真の期待値 */
export const evaluatePolicy = (approx: ValueFn): Float64Array =>
  backwardFill(policyStartValue(approx))
