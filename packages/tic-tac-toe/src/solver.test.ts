import { describe, expect, it } from "vitest"
import { initialState } from "./schema.js"
import { bestMove, bestMoves, evaluate, evaluateState } from "./solver.js"
import { fromText } from "./testUtil.js"

describe("evaluateState", () => {
  it("says the opening is a draw that runs the full 9 plies", () => {
    expect(evaluateState(initialState())).toEqual({ score: 0, depth: 9 })
  })

  it("says the side to move has lost when the opponent has completed a line", () => {
    expect(evaluateState(fromText("xxx|oo.|..."))).toEqual({
      score: -1,
      depth: 0,
    })
  })
})

describe("bestMoves", () => {
  it("treats every opening move as equally drawn", () => {
    expect(bestMoves(initialState())).toHaveLength(9)
  })

  it("returns nothing once the game is over", () => {
    expect(bestMoves(fromText("xxx|oo.|..."))).toEqual([])
  })

  it("keeps only the edges against the double-corner trap", () => {
    // x が対角の隅、o が中央。ここで o が隅を取るとフォークを食らって負ける
    expect([...bestMoves(fromText("x..|.o.|..x"))].sort()).toEqual([1, 3, 5, 7])
  })
})

describe("bestMove", () => {
  it("takes the immediate win instead of blocking", () => {
    const state = fromText("xx.|oo.|...")

    expect(bestMove(state)).toBe(2)
    expect(evaluate(state)[0]).toEqual({ move: 2, score: 1, depth: 1 })
  })

  it("blocks the only losing threat", () => {
    expect(bestMoves(fromText("oo.|x..|x.."))).toEqual([2])
  })

  it("returns null when there is nothing to play", () => {
    expect(bestMove(fromText("xox|xxo|oxo"))).toBe(null)
  })
})
