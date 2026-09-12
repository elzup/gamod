import { describe, expect, it } from "vitest"
import { initialState, parseState, stateSchema } from "./schema.js"

describe("stateSchema", () => {
  it("accepts the initial state", () => {
    expect(stateSchema.safeParse(initialState()).success).toBe(true)
  })

  it("rejects a board that is not 9 cells", () => {
    expect(
      stateSchema.safeParse({ board: [null, null], turn: "x" }).success
    ).toBe(false)
  })

  it("rejects an unknown cell value", () => {
    const board = [...Array(9)].map(() => null)

    expect(
      stateSchema.safeParse({ board: [...board.slice(1), "z"], turn: "x" })
        .success
    ).toBe(false)
  })

  it("rejects a stone count that contradicts the turn", () => {
    const board = [...Array(9)].map(() => null)

    // x が 1 つ置かれているなら手番は o のはず
    expect(
      stateSchema.safeParse({ board: ["x", ...board.slice(1)], turn: "x" })
        .success
    ).toBe(false)
  })
})

describe("parseState", () => {
  it("throws with a readable message", () => {
    expect(() => parseState({ board: [], turn: "x" })).toThrow(
      /invalid tic-tac-toe state/
    )
  })
})
