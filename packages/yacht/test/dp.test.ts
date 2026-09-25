import { describe, expect, it } from "vitest"
import {
  FILLED_STATES,
  reachableStateCount,
  reachableUppers,
  tableIndex,
} from "../reference/dp.js"
import { filledExcept, naiveSolver } from "../reference/naive.js"
import { UPPER_BONUS, UPPER_BONUS_THRESHOLD } from "../src/scoring.js"
import { exactValue, values } from "./testUtil.js"

describe("expected-score DP", () => {
  it("matches the published optimal expected score (191.77)", () => {
    // ぷりんの雑記帳「ヨットを数学的に考える④」の理論値。100 万回のシミュレーション平均 191.7 とも整合
    expect(exactValue(0, 0)).toBeCloseTo(191.77, 2)
  })

  it.each([
    // 最終手番に 1 役だけ残ったときの期待値 (「ヨットを数学的に考える②」の表)。
    // エースは上段合計 0 から 5 点までしか取れずボーナスに届かないので、ボーナス抜きの値と一致する
    ["aces", 2.10648],
    ["choice", 23.33333],
    ["fullHouse", 7.01355],
    ["bigStraight", 7.83285],
    ["yacht", 2.30143],
  ] as const)(
    "matches the published last-turn value of %s",
    (name, expected) => {
      expect(exactValue(filledExcept(name), 0)).toBeCloseTo(expected, 5)
    }
  )

  it("has a value for every reachable state and nothing else", () => {
    const filled = Array.from({ length: FILLED_STATES }, (_, f) => f)
    const defined = values.filter((value) => !Number.isNaN(value)).length
    const missing = filled.flatMap((f) =>
      reachableUppers(f).flatMap((upper) =>
        Number.isNaN(values[tableIndex(f, upper)]) ? [`${f}:${upper}`] : []
      )
    )

    expect(missing).toEqual([])
    expect(defined).toBe(reachableStateCount())
  })

  it("never loses value when the upper total is higher", () => {
    // V は「これから取る点」なので、63 に届いた局面ではボーナス 35 点が過去の点に移って V 自体は下がる。足し戻して比べる
    const withBonus = (f: number, upper: number) =>
      exactValue(f, upper) + (upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0)
    const decreasing = Array.from(
      { length: FILLED_STATES },
      (_, f) => f
    ).flatMap((f) =>
      reachableUppers(f).flatMap((upper, i, uppers) => {
        const lower = uppers[i - 1]

        return lower !== undefined &&
          withBonus(f, upper) < withBonus(f, lower) - 1e-9
          ? [`${f}:${lower}->${upper}`]
          : []
      })
    )

    expect(decreasing).toEqual([])
  })
})

describe("expected-score DP against the naive solver", () => {
  const naive = naiveSolver()

  it.each([
    ["sixes only, bonus needs 18+", filledExcept("sixes"), 45],
    ["fours only, bonus already reached", filledExcept("fours"), 63],
    ["small straight only", filledExcept("smallStraight"), 12],
    ["sixes and yacht, bonus on the line", filledExcept("sixes", "yacht"), 45],
  ])(
    "agrees on %s",
    (_, filled, upper) => {
      expect(exactValue(filled, upper)).toBeCloseTo(naive(filled, upper), 9)
    },
    120_000
  )
})
