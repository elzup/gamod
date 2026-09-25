import { describe, expect, it } from "vitest"
import { reachableUppers } from "../reference/dp.js"
import { filledExcept, naiveSolver, naiveTurn } from "../reference/naive.js"
import { KEEPS, ROLLS } from "../src/dice.js"
import type { Category, State } from "../src/schema.js"
import { CATEGORIES } from "../src/scoring.js"
import { upperTotal } from "../src/strategy.js"
import { bestMove, sheetExcept } from "./testUtil.js"

/** 多重集合を昇順の出目に戻す */
const diceOf = (roll: number): number[] =>
  (KEEPS[roll] ?? []).flatMap((count, face) => Array(count).fill(face + 1))

const allDice = [...ROLLS].map(diceOf)

describe("bestMove against the naive solver", () => {
  const naive = naiveSolver()

  it.each([
    [
      "sixes and yacht, bonus on the line",
      ["sixes", "yacht"],
      { aces: 3, deuces: 6, treys: 9, fours: 12, fives: 15 },
    ],
    ["full house and small straight", ["fullHouse", "smallStraight"], {}],
  ] as const)(
    "reaches the optimal expectation on every roll: %s",
    (_, open, scores) => {
      const sheet = sheetExcept(open, scores)
      const upper = Math.min(63, upperTotal(sheet))
      const filled = filledExcept(...open)
      const turn = naiveTurn(filled, upper, naive)
      const moveValue = (state: State): number => {
        const move = bestMove(state)

        if (move === null) throw new Error("no move")
        if (move.type === "score")
          return turn.scoreValue(CATEGORIES.indexOf(move.category), state.dice)

        return turn.rerollValue(state.dice, move.keep, state.rerollsLeft)
      }
      const wrong = [0, 1, 2].flatMap((rerollsLeft) =>
        allDice.flatMap((dice) => {
          const state = { dice, rerollsLeft, sheet }
          const gap = turn.stageValue(dice, rerollsLeft) - moveValue(state)

          return Math.abs(gap) > 1e-9
            ? [`${dice.join("")} r${rerollsLeft}: -${gap}`]
            : []
        })
      )

      expect(reachableUppers(filled)).toContain(upper)
      expect(wrong).toEqual([])
    },
    120_000
  )
})

describe("bestMove on known positions", () => {
  const onlyOpen = (open: Category[], dice: number[], rerollsLeft: number) => ({
    dice,
    rerollsLeft,
    sheet: sheetExcept(open),
  })

  it("keeps four of a kind when only yacht is left", () => {
    expect(bestMove(onlyOpen(["yacht"], [6, 1, 6, 6, 6], 2))).toEqual({
      type: "reroll",
      keep: [0, 2, 3, 4],
    })
  })

  it("scores a rolled yacht at once", () => {
    expect(bestMove(onlyOpen(["yacht", "choice"], [4, 4, 4, 4, 4], 2))).toEqual(
      {
        type: "score",
        category: "yacht",
      }
    )
  })

  it("must score when no reroll is left", () => {
    expect(bestMove(onlyOpen(["choice"], [1, 1, 1, 1, 1], 0))).toEqual({
      type: "score",
      category: "choice",
    })
  })

  it("rerolls everything low for choice", () => {
    expect(bestMove(onlyOpen(["choice"], [1, 1, 2, 2, 3], 1))).toEqual({
      type: "reroll",
      keep: [],
    })
  })

  it("returns null when the sheet is full", () => {
    expect(bestMove(onlyOpen([], [1, 2, 3, 4, 5], 2))).toBe(null)
  })
})

describe("bestMove as a strategy", () => {
  it("returns a legal move on sampled states from the opening", () => {
    const openings = allDice.flatMap((dice, i) =>
      i % 7 === 0
        ? [0, 1, 2].map((rerollsLeft) => ({ dice, rerollsLeft, sheet: {} }))
        : []
    )
    const illegal = openings.filter((state) => {
      const move = bestMove(state)

      if (move === null) return true
      if (move.type === "score") return false

      return move.keep.some(
        (p, i) => p < 0 || p > 4 || (i > 0 && p <= (move.keep[i - 1] ?? -1))
      )
    })

    expect(openings.length).toBeGreaterThan(100)
    expect(illegal).toEqual([])
  })

  it("does not mutate the given state", () => {
    const state = Object.freeze({
      dice: Object.freeze([6, 6, 1, 2, 6]),
      rerollsLeft: 2,
      sheet: Object.freeze({ aces: 2 }),
    })

    expect(() => bestMove(state)).not.toThrow()
  })

  it("rejects a malformed state", () => {
    expect(() =>
      bestMove({ dice: [7, 1, 1, 1, 1], rerollsLeft: 0, sheet: {} })
    ).toThrow(/invalid yacht state/)
  })
})
