import { describe, expect, it } from "vitest"
import { applyMove, judge, legalMoves, opponent, winnerOf } from "./rules.js"
import { initialState } from "./schema.js"
import { fromText } from "./testUtil.js"

describe("winnerOf", () => {
  it("finds a row", () => {
    expect(winnerOf(fromText("xxx|oo.|...").board)).toBe("x")
  })

  it("finds a diagonal", () => {
    expect(winnerOf(fromText("o.x|.x.|x.o").board)).toBe("x")
  })

  it("returns null while the game is open", () => {
    expect(winnerOf(fromText("xo.|...|...").board)).toBe(null)
  })
})

describe("legalMoves", () => {
  it("lists empty cells", () => {
    expect(legalMoves(fromText("xo.|.x.|..o"))).toEqual([2, 3, 5, 6, 7])
  })

  it("returns nothing once someone has won", () => {
    expect(legalMoves(fromText("xxx|oo.|..."))).toEqual([])
  })
})

describe("applyMove", () => {
  it("does not mutate the given state", () => {
    const state = initialState()
    const next = applyMove(state, 4)

    expect(state.board[4]).toBe(null)
    expect(next.board[4]).toBe("x")
    expect(next.turn).toBe("o")
  })

  it("rejects a taken cell", () => {
    expect(() => applyMove(fromText("x..|...|..."), 0)).toThrow(/already taken/)
  })

  it("rejects an out-of-range move", () => {
    expect(() => applyMove(initialState(), 9)).toThrow(
      /invalid tic-tac-toe move/
    )
  })

  it("rejects a move after the game is over", () => {
    expect(() => applyMove(fromText("xxx|oo.|..."), 5)).toThrow(/already over/)
  })
})

describe("judge", () => {
  it("reports a win", () => {
    expect(judge(fromText("xxx|oo.|..."))).toEqual({
      status: "win",
      winner: "x",
    })
  })

  it("reports a draw on a full board", () => {
    expect(judge(fromText("xox|xxo|oxo"))).toEqual({
      status: "draw",
      winner: null,
    })
  })

  it("reports an open game", () => {
    expect(judge(initialState())).toEqual({ status: "playing", winner: null })
  })
})

describe("opponent", () => {
  it("flips the player", () => {
    expect(opponent("x")).toBe("o")
    expect(opponent("o")).toBe("x")
  })
})
