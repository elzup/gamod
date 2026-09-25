/**
 * 1 手番ぶんの期待値計算 (振り直し 2 回 + 役の記入)。
 * 手番をまたぐ先の期待値は ValueFn として外から受け取り、ここではゲーム全体を探索しない。
 *
 * 各段の値は添字 0..461 (dice.ts の多重集合) の Float64Array に置く。
 * 18 万局面 × 数千要素を回す内側のループなので、配列は作り直さず typed array に書き込む。
 */
import {
  ADD,
  DICE_COUNT,
  EMPTY_KEEP,
  FACES,
  KEEP_COUNT,
  KEEP_SIZE,
  REMOVE,
  ROLLS,
} from "./dice.js"
import {
  CATEGORIES,
  SCORE_TABLE,
  UPPER_BONUS,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORY_COUNT,
} from "./scoring.js"

/*
 * vitest (vite の SSR 変換) は import した束縛を、参照のたびにモジュールオブジェクト経由で読む形に書き換える。
 * 内側ループでそれが起きると全局面 DP が node 直の 5 秒から 53 秒に落ちたので、モジュール読み込み時に 1 度だけ受けておく。
 */
const add = ADD
const remove = REMOVE
const keepSize = KEEP_SIZE
const rolls = ROLLS
const scoreTable = SCORE_TABLE
const keepCount = KEEP_COUNT
const faces = FACES
const diceCount = DICE_COUNT

/**
 * 手番開始時点の「これから取れる点」の期待値。filled は記入済みの役の bit (CATEGORIES の添字順)、
 * upper は上段合計を 63 で頭打ちにした値 (63 を超えた分はボーナス判定に影響しないため)。
 */
export type ValueFn = (filled: number, upper: number) => number

export const ALL_FILLED = (1 << CATEGORIES.length) - 1

/**
 * 期待値は 1/6 の平均を重ねて作るので、本来同値の手どうしが末尾桁だけずれる。
 * この幅以下の差は同値とみなし、「振り直さない」「多く残す」側を選ぶ (無意味な振り直しを返さないため)。
 */
const TIE_EPSILON = 1e-9

export const cappedUpper = (upper: number): number =>
  Math.min(upper, UPPER_BONUS_THRESHOLD)

export type ScoringStage = {
  /** 出目ごとの (記入する点 + ボーナス + 以降の期待値) の最大 */
  values: Float64Array
  /** そのときの役の添字 */
  categories: Int8Array
}

/** 役 category に score 点を記入したときの (点 + 上段ボーナス + 以降の期待値) */
export const scoredValue = (
  filled: number,
  upper: number,
  category: number,
  score: number,
  value: ValueFn
): number => {
  const next = filled | (1 << category)

  if (category >= UPPER_CATEGORY_COUNT) return score + value(next, upper)

  const raised = cappedUpper(upper + score)
  const bonus =
    upper < UPPER_BONUS_THRESHOLD && raised >= UPPER_BONUS_THRESHOLD
      ? UPPER_BONUS
      : 0

  return score + bonus + value(next, raised)
}

/** 上段の役は点が「個数 × 目」の 6 通りしか無いので、ValueFn を引くのは 6 回で済ませる */
const upperOutcomes = (
  filled: number,
  upper: number,
  category: number,
  value: ValueFn
): number[] =>
  Array.from({ length: diceCount + 1 }, (_, count) =>
    scoredValue(filled, upper, category, count * (category + 1), value)
  )

export const scoringStage = (
  filled: number,
  upper: number,
  value: ValueFn
): ScoringStage => {
  const values = new Float64Array(keepCount).fill(Number.NEGATIVE_INFINITY)
  const categories = new Int8Array(keepCount).fill(-1)

  for (const [category] of CATEGORIES.entries()) {
    if ((filled & (1 << category)) !== 0) continue

    const isUpper = category < UPPER_CATEGORY_COUNT
    const outcomes = isUpper
      ? upperOutcomes(filled, upper, category, value)
      : []
    const future = isUpper ? 0 : scoredValue(filled, upper, category, 0, value)

    for (const roll of rolls) {
      const score = scoreTable[category * keepCount + roll] as number
      const total = isUpper
        ? (outcomes[score / (category + 1)] as number)
        : score + future

      if (total > (values[roll] as number)) {
        values[roll] = total
        categories[roll] = category
      }
    }
  }

  return { values, categories }
}

/**
 * keep を残して残りを振り直したときの期待値を全 keep について求める。
 * 5 個揃っていれば次の段の値そのもの、それ以外は「もう 1 個振った 6 通り」の平均。
 */
export const expectOver = (next: Float64Array): Float64Array => {
  const expect = new Float64Array(keepCount)

  for (let keep = keepCount - 1; keep >= 0; keep -= 1) {
    if ((keepSize[keep] as number) === diceCount) {
      expect[keep] = next[keep] as number
      continue
    }

    let sum = 0

    for (let face = 0; face < faces; face += 1)
      sum += expect[add[keep * faces + face] as number] as number
    expect[keep] = sum / faces
  }

  return expect
}

export type RerollStage = {
  /** 出目 (5 個) ごとに、最善の残し方をしたときの期待値 */
  values: Float64Array
  /** そのときに残す多重集合の添字。出目自身の添字なら「振り直さない」 */
  keeps: Int16Array
}

/** 各多重集合について、その部分集合のうち期待値が最大になる残し方 */
export const bestSubKeep = (expect: Float64Array): RerollStage => {
  const values = new Float64Array(keepCount)
  const keeps = new Int16Array(keepCount)

  for (let keep = 0; keep < keepCount; keep += 1) {
    let best = expect[keep] as number
    let bestKeep = keep

    for (let face = 0; face < faces; face += 1) {
      const smaller = remove[keep * faces + face] as number

      if (smaller >= 0 && (values[smaller] as number) > best + TIE_EPSILON) {
        best = values[smaller] as number
        bestKeep = keeps[smaller] as number
      }
    }
    values[keep] = best
    keeps[keep] = bestKeep
  }

  return { values, keeps }
}

/** 手番開始時 (まだ 1 回も振っていない) の期待値。ValueFn を 1 段手前に延ばす */
export const turnStartValue = (
  filled: number,
  upper: number,
  value: ValueFn
): number => {
  const scored = scoringStage(filled, upper, value).values
  const oneLeft = bestSubKeep(expectOver(scored)).values
  const twoLeft = bestSubKeep(expectOver(oneLeft)).values

  return expectOver(twoLeft)[EMPTY_KEEP] as number
}
