import { describe, expect, it } from "vitest"
import {
  initialState,
  MAX_DISKS,
  parseState,
  stateSchema,
} from "../src/schema.js"

describe("stateSchema", () => {
  it("accepts the initial state", () => {
    expect(stateSchema.safeParse(initialState()).success).toBe(true)
  })

  it("defaults to the rightmost peg as the target", () => {
    expect(stateSchema.parse({ pegs: [0, 1] })).toEqual({
      pegs: [0, 1],
      target: 2,
    })
  })

  it("accepts the largest tower", () => {
    expect(initialState(MAX_DISKS).pegs).toHaveLength(MAX_DISKS)
  })

  it.each([
    ["no disks", { pegs: [] }],
    ["a peg that does not exist", { pegs: [3] }],
    ["a fractional peg", { pegs: [0.5] }],
    [
      "too many disks",
      { pegs: Array.from({ length: MAX_DISKS + 1 }, () => 0) },
    ],
    ["an unknown target", { pegs: [0], target: 3 }],
  ])("rejects %s", (_, input) => {
    expect(stateSchema.safeParse(input).success).toBe(false)
  })
})

describe("initialState", () => {
  it("stacks three disks on the left peg by default", () => {
    expect(initialState()).toEqual({ pegs: [0, 0, 0], target: 2 })
  })

  it("rejects an impossible size", () => {
    expect(() => initialState(0)).toThrow(/invalid hanoi state/)
  })
})

describe("parseState", () => {
  it("throws with a readable message", () => {
    expect(() => parseState({ pegs: [4] })).toThrow(
      /invalid hanoi state: pegs\.0/
    )
  })
})
