import { describe, expect, it } from "vitest"
import {
  initialState,
  MAX_HEAP_SIZE,
  parseState,
  stateSchema,
} from "../src/schema.js"

describe("stateSchema", () => {
  it("accepts the initial state", () => {
    expect(stateSchema.safeParse(initialState()).success).toBe(true)
  })

  it("defaults to normal play", () => {
    expect(stateSchema.parse({ heaps: [1, 2] })).toEqual({
      heaps: [1, 2],
      rule: "normal",
    })
  })

  it("accepts empty heaps and the largest heap", () => {
    expect(stateSchema.safeParse({ heaps: [0, MAX_HEAP_SIZE] }).success).toBe(
      true
    )
  })

  it.each([
    ["no heaps", { heaps: [] }],
    ["a negative heap", { heaps: [-1] }],
    ["a fractional heap", { heaps: [1.5] }],
    ["a heap beyond the supported size", { heaps: [MAX_HEAP_SIZE + 1] }],
    ["an unknown rule", { heaps: [1], rule: "reverse" }],
  ])("rejects %s", (_, input) => {
    expect(stateSchema.safeParse(input).success).toBe(false)
  })
})

describe("parseState", () => {
  it("throws with a readable message", () => {
    expect(() => parseState({ heaps: [-1] })).toThrow(
      /invalid nim state: heaps\.0/
    )
  })
})
