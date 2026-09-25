import { describe, expect, it } from "vitest"
import { naiveScore, orderedRolls } from "../reference/naive.js"
import { countsOf } from "../src/dice.js"
import { CATEGORIES, POSSIBLE_SCORES, scoreOf } from "../src/scoring.js"

describe("scoreOf", () => {
  it.each([
    ["aces", [1, 1, 3, 1, 6], 3],
    ["sixes", [6, 6, 6, 6, 6], 30],
    ["choice", [1, 2, 3, 4, 6], 16],
    ["fourDice", [4, 4, 4, 4, 2], 18],
    ["fourDice", [5, 5, 5, 5, 5], 25],
    ["fourDice", [4, 4, 4, 2, 2], 0],
    ["fullHouse", [2, 2, 2, 5, 5], 16],
    // 5 つ同じ目もフルハウスに含む
    ["fullHouse", [3, 3, 3, 3, 3], 15],
    ["fullHouse", [3, 3, 3, 3, 1], 0],
    ["smallStraight", [1, 2, 3, 4, 6], 15],
    ["smallStraight", [3, 4, 5, 6, 6], 15],
    ["smallStraight", [1, 2, 3, 5, 6], 0],
    ["bigStraight", [2, 3, 4, 5, 6], 30],
    ["bigStraight", [1, 2, 3, 4, 6], 0],
    ["yacht", [2, 2, 2, 2, 2], 50],
    ["yacht", [2, 2, 2, 2, 1], 0],
  ] as const)("%s of %j is %i", (category, dice, score) => {
    expect(scoreOf(category, countsOf(dice))).toBe(score)
  })

  it("agrees with the rulebook transcription on every ordered roll", () => {
    const mismatches = orderedRolls(5).flatMap((dice) =>
      CATEGORIES.flatMap((category, index) =>
        scoreOf(category, countsOf(dice)) === naiveScore(index, dice)
          ? []
          : [`${category} ${dice.join("")}`]
      )
    )

    expect(mismatches).toEqual([])
  })
})

describe("POSSIBLE_SCORES", () => {
  it("lists the fixed-score categories as 0 or the fixed score", () => {
    const byName = (name: (typeof CATEGORIES)[number]) =>
      [...(POSSIBLE_SCORES[CATEGORIES.indexOf(name)] ?? [])].sort(
        (a, b) => a - b
      )

    expect(byName("smallStraight")).toEqual([0, 15])
    expect(byName("bigStraight")).toEqual([0, 30])
    expect(byName("yacht")).toEqual([0, 50])
    expect(byName("aces")).toEqual([0, 1, 2, 3, 4, 5])
    // チョイスは必ず 5..30 のどれか (0 点は取れない)
    expect(byName("choice")).toEqual(
      Array.from({ length: 26 }, (_, i) => i + 5)
    )
  })
})
