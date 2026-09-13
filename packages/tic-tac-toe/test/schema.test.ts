import { describe, expect, it } from "vitest"
import { allStates, reachableStates, stateKey } from "../reference/solver.js"
import { initialState, parseState, stateSchema } from "../src/schema.js"
import { fromText } from "./testUtil.js"

const emptyCells = () => [...Array(9)].map(() => null)

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
    expect(
      stateSchema.safeParse({
        board: [...emptyCells().slice(1), "z"],
        turn: "x",
      }).success
    ).toBe(false)
  })

  it("rejects an unknown turn", () => {
    expect(
      stateSchema.safeParse({ board: emptyCells(), turn: "z" }).success
    ).toBe(false)
  })

  it("rejects a stone count that contradicts the turn", () => {
    // x が 1 つ置かれているなら手番は o のはず
    expect(
      stateSchema.safeParse({
        board: ["x", ...emptyCells().slice(1)],
        turn: "x",
      }).success
    ).toBe(false)
  })

  it.each([
    ["both players have a line", "xxx|ooo|x.."],
    ["o kept playing after x completed a line", "xxx|oo.|o.."],
    ["x kept playing after o completed a line", "ooo|xx.|xx."],
  ])("rejects an unreachable position: %s", (_, text) => {
    expect(stateSchema.safeParse(fromText(text)).success).toBe(false)
  })

  it("accepts exactly the positions reachable from the initial state", () => {
    const reachable = new Set(reachableStates().map(stateKey))
    const accepted = allStates().filter(
      (state) => stateSchema.safeParse(state).success
    )

    expect(reachable.size).toBe(5478)
    expect(accepted).toHaveLength(reachable.size)
    expect(accepted.every((state) => reachable.has(stateKey(state)))).toBe(true)
  })
})

describe("parseState", () => {
  it("throws with a readable message", () => {
    expect(() => parseState({ board: [], turn: "x" })).toThrow(
      /invalid tic-tac-toe state/
    )
  })

  it("explains why an unreachable position is rejected", () => {
    expect(() => parseState(fromText("xxx|ooo|x.."))).toThrow(
      /cannot arise in a real game/
    )
  })
})
