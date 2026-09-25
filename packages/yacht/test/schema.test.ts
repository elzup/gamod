import { describe, expect, it } from "vitest"
import { initialState, parseState, stateSchema } from "../src/schema.js"

const valid = { dice: [1, 2, 3, 4, 5], rerollsLeft: 2, sheet: {} }

describe("stateSchema", () => {
  it("accepts a fresh sheet", () => {
    expect(stateSchema.safeParse(valid).success).toBe(true)
  })

  it("accepts the initial state with two rerolls left", () => {
    expect(initialState([1, 2, 3, 4, 5])).toEqual(valid)
    expect(stateSchema.safeParse(initialState([6, 6, 6, 6, 6])).success).toBe(
      true
    )
  })

  it("accepts scores that some roll can make", () => {
    const sheet = { aces: 3, sixes: 30, choice: 5, fullHouse: 30, yacht: 0 }

    expect(stateSchema.safeParse({ ...valid, sheet }).success).toBe(true)
  })

  it.each([
    ["too few dice", { ...valid, dice: [1, 2, 3, 4] }],
    ["a die out of range", { ...valid, dice: [0, 2, 3, 4, 5] }],
    ["too many rerolls", { ...valid, rerollsLeft: 3 }],
    ["an unknown category", { ...valid, sheet: { chance: 20 } }],
  ])("rejects %s", (_, input) => {
    expect(stateSchema.safeParse(input).success).toBe(false)
  })

  it.each([
    ["aces above 5", { aces: 6 }],
    ["sixes not a multiple of 6", { sixes: 13 }],
    ["choice below 5", { choice: 4 }],
    ["small straight other than 0/15", { smallStraight: 30 }],
    ["four dice above 30", { fourDice: 31 }],
    [
      "full house of 6 (smallest is 1,1,1,1,1 = 5 then 1,1,1,2,2 = 7)",
      { fullHouse: 6 },
    ],
  ])("rejects %s", (_, sheet) => {
    expect(stateSchema.safeParse({ ...valid, sheet }).success).toBe(false)
  })
})

describe("parseState", () => {
  it("throws with a readable message", () => {
    expect(() => parseState({ ...valid, sheet: { yacht: 49 } })).toThrow(
      /invalid yacht state: sheet: sheet has a score that no roll can make/
    )
  })
})
