import {
  type Counts,
  DICE_COUNT,
  KEEP_COUNT,
  keepCounts,
  ROLLS,
} from "./dice.js"

/** 世界のアソビ大全51 版の 12 役。添字 0..5 が上段 (1〜6 の目) */
export const CATEGORIES = [
  "aces",
  "deuces",
  "treys",
  "fours",
  "fives",
  "sixes",
  "choice",
  "fourDice",
  "fullHouse",
  "smallStraight",
  "bigStraight",
  "yacht",
] as const

export type Category = (typeof CATEGORIES)[number]

export const UPPER_CATEGORY_COUNT = 6
export const UPPER_BONUS_THRESHOLD = 63
export const UPPER_BONUS = 35

const SMALL_STRAIGHT_SCORE = 15
const BIG_STRAIGHT_SCORE = 30
const YACHT_SCORE = 50

const total = (counts: Counts): number =>
  counts.reduce((sum, count, face) => sum + count * (face + 1), 0)

/** 連続する length 種類の目がすべて 1 個以上ある */
const hasRun = (counts: Counts, length: number): boolean =>
  counts.some((_, start) => {
    const window = counts.slice(start, start + length)

    return window.length === length && window.every((count) => count > 0)
  })

const scoreByIndex = (category: number, counts: Counts): number => {
  if (category < UPPER_CATEGORY_COUNT)
    return (counts[category] ?? 0) * (category + 1)

  const most = Math.max(...counts)

  switch (CATEGORIES[category]) {
    case "choice":
      return total(counts)
    case "fourDice":
      return most >= 4 ? total(counts) : 0
    // 5 つ同じ目もフルハウスに含む (アソビ大全の実機仕様。最終手番の期待値 7.01355 がこの解釈でだけ一致する)
    case "fullHouse":
      return most === DICE_COUNT || (most === 3 && counts.includes(2))
        ? total(counts)
        : 0
    case "smallStraight":
      return hasRun(counts, 4) ? SMALL_STRAIGHT_SCORE : 0
    case "bigStraight":
      return hasRun(counts, 5) ? BIG_STRAIGHT_SCORE : 0
    case "yacht":
      return most === DICE_COUNT ? YACHT_SCORE : 0
    default:
      throw new Error(`unknown category index: ${category}`)
  }
}

/** 出目 (5 個) を役に記入したときの点。上段ボーナスは含まない */
export const scoreOf = (category: Category, counts: Counts): number =>
  scoreByIndex(CATEGORIES.indexOf(category), counts)

/** SCORE_TABLE[c * KEEP_COUNT + roll]。DP の内側で毎回数え直さないための表 (5 個未満の添字は 0) */
export const SCORE_TABLE = (() => {
  const table = new Int16Array(CATEGORIES.length * KEEP_COUNT)

  for (const [category] of CATEGORIES.entries())
    for (const roll of ROLLS)
      table[category * KEEP_COUNT + roll] = scoreByIndex(
        category,
        keepCounts(roll)
      )

  return table
})()

/** 役ごとに、いずれかの出目で取りうる点の集合。記入済みの点が実戦で現れるかの判定に使う */
export const POSSIBLE_SCORES: readonly ReadonlySet<number>[] = CATEGORIES.map(
  (_, category) =>
    new Set(
      [...ROLLS].map(
        (roll) => SCORE_TABLE[category * KEEP_COUNT + roll] as number
      )
    )
)
