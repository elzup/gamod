/**
 * テスト専用の素朴な検算役。src/ の多重集合の添字・得点表・段ごとの DP を一切使わず、
 * 並び順付きの出目をそのまま総当たりする。遅い (1 局面あたり数秒) ので、残りの役が少ない局面の照合にだけ使う。
 */
const CATEGORY_NAMES = [
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

const UPPER_COUNT = 6
const BONUS_LINE = 63
const BONUS = 35
const ALL = (1 << CATEGORY_NAMES.length) - 1

type Dice = readonly number[]
export type NaiveValue = (filled: number, upper: number) => number

const sum = (dice: Dice) => dice.reduce((a, b) => a + b, 0)
const tally = (dice: Dice) =>
  [1, 2, 3, 4, 5, 6].map((face) => dice.filter((d) => d === face).length)
const distinct = (dice: Dice) =>
  [...new Set(dice)].sort((a, b) => a - b).join("")

/** ルールの文面をそのまま書き下した得点 */
export const naiveScore = (category: number, dice: Dice): number => {
  const counts = tally(dice)
  const faces = distinct(dice)

  if (category < UPPER_COUNT)
    return dice.filter((d) => d === category + 1).length * (category + 1)

  switch (CATEGORY_NAMES[category]) {
    case "choice":
      return sum(dice)
    case "fourDice":
      return counts.some((c) => c >= 4) ? sum(dice) : 0
    case "fullHouse":
      return (counts.includes(3) && counts.includes(2)) || counts.includes(5)
        ? sum(dice)
        : 0
    case "smallStraight":
      return ["1234", "2345", "3456"].some((run) =>
        [...run].every((f) => faces.includes(f))
      )
        ? 15
        : 0
    case "bigStraight":
      return faces === "12345" || faces === "23456" ? 30 : 0
    case "yacht":
      return counts.includes(5) ? 50 : 0
    default:
      throw new Error(`unknown category ${category}`)
  }
}

/** 長さ n の並び順付きの出目 6^n 通り */
export const orderedRolls = (n: number): Dice[] =>
  n === 0
    ? [[]]
    : orderedRolls(n - 1).flatMap((rest) =>
        [1, 2, 3, 4, 5, 6].map((f) => [...rest, f])
      )

const ROLLS_BY_COUNT = [0, 1, 2, 3, 4, 5].map(orderedRolls)

const sorted = (dice: Dice): Dice => [...dice].sort((a, b) => a - b)

export type NaiveTurn = {
  /** 役 category に記入したときの (点 + ボーナス + 以降の期待値) */
  scoreValue: (category: number, dice: Dice) => number
  /** positions を残して振り直したときの期待値 (振り直し残り rerollsLeft 回の時点から) */
  rerollValue: (
    dice: Dice,
    positions: readonly number[],
    rerollsLeft: number
  ) => number
  /** 出目と振り直し残り回数から、最善を尽くしたときの期待値 */
  stageValue: (dice: Dice, rerollsLeft: number) => number
  startValue: () => number
}

export const naiveTurn = (
  filled: number,
  upper: number,
  next: NaiveValue
): NaiveTurn => {
  const open = CATEGORY_NAMES.flatMap((_, c) => ((filled >> c) & 1 ? [] : [c]))
  const memo = new Map<string, number>()

  const scoreValue = (category: number, dice: Dice): number => {
    const score = naiveScore(category, dice)

    if (category >= UPPER_COUNT)
      return score + next(filled | (1 << category), upper)

    const raised = Math.min(BONUS_LINE, upper + score)
    const bonus = upper < BONUS_LINE && raised >= BONUS_LINE ? BONUS : 0

    return score + bonus + next(filled | (1 << category), raised)
  }

  const rerollValue = (
    dice: Dice,
    positions: readonly number[],
    rerollsLeft: number
  ): number => {
    const kept = positions.map((p) => dice[p] as number)
    const outcomes = ROLLS_BY_COUNT[dice.length - kept.length] ?? []

    return (
      sum(
        outcomes.map((roll) => stageValue([...kept, ...roll], rerollsLeft - 1))
      ) / outcomes.length
    )
  }

  const stageValue = (dice: Dice, rerollsLeft: number): number => {
    const key = `${sorted(dice).join("")}:${rerollsLeft}`
    const cached = memo.get(key)

    if (cached !== undefined) return cached

    const scoring = Math.max(...open.map((c) => scoreValue(c, dice)))
    const subsets = Array.from({ length: 1 << dice.length }, (_, mask) =>
      dice.flatMap((_, p) => ((mask >> p) & 1 ? [p] : []))
    )
    const value =
      rerollsLeft === 0
        ? scoring
        : Math.max(
            scoring,
            ...subsets.map((positions) =>
              rerollValue(dice, positions, rerollsLeft)
            )
          )

    memo.set(key, value)

    return value
  }

  const startValue = () =>
    sum(ROLLS_BY_COUNT[5]?.map((roll) => stageValue(roll, 2)) ?? []) / 6 ** 5

  return { scoreValue, rerollValue, stageValue, startValue }
}

/** 残りの役が少ない局面を、素朴な手番計算だけで末尾から解く (DP の表を使わない) */
export const naiveSolver = (): NaiveValue => {
  const memo = new Map<string, number>()
  const value: NaiveValue = (filled, upper) => {
    if (filled === ALL) return 0

    const key = `${filled}:${upper}`
    const cached = memo.get(key)

    if (cached !== undefined) return cached

    const result = naiveTurn(filled, upper, value).startValue()

    memo.set(key, result)

    return result
  }

  return value
}

export const categoryBit = (name: (typeof CATEGORY_NAMES)[number]): number =>
  1 << CATEGORY_NAMES.indexOf(name)

/** 指定した役だけが未記入の filled */
export const filledExcept = (
  ...names: (typeof CATEGORY_NAMES)[number][]
): number => names.reduce((mask, name) => mask & ~categoryBit(name), ALL)
