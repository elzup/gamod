import { describe, expect, it } from "vitest"
import {
  applyMove,
  judge,
  legalMoves,
  opponent,
  winnerOf,
} from "../reference/rules.js"
import {
  gameValue,
  isTerminal,
  reachableStates,
  solveState,
  stateKey,
} from "../reference/solver.js"
import { initialState } from "../src/schema.js"
import { fromText, SYMMETRIES, transformState } from "./testUtil.js"

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

/**
 * 正解役そのものが正しいことを、実装と独立に知られている数で確かめる。
 * ここが崩れると「攻略法が正解役と一致する」テストが意味を失う。
 */
describe("reference solver", () => {
  const positions = reachableStates()
  const terminals = positions.filter(isTerminal)
  const winnerCount = (player: "x" | "o") =>
    terminals.filter((state) => judge(state).winner === player).length

  it("reaches the well-known number of positions", () => {
    expect(positions).toHaveLength(5478)
    expect(terminals).toHaveLength(958)
  })

  it("splits terminal positions into the well-known outcomes", () => {
    expect(winnerCount("x")).toBe(626)
    expect(winnerCount("o")).toBe(316)
    expect(
      terminals.filter((state) => judge(state).status === "draw")
    ).toHaveLength(16)
  })

  it("reaches 765 positions up to symmetry", () => {
    const canonical = new Set(
      positions.map(
        (state) =>
          SYMMETRIES.map((perm) =>
            stateKey(transformState(state, perm))
          ).sort()[0]
      )
    )

    expect(canonical.size).toBe(765)
  })

  it("solves the opening as a draw over the full 9 plies", () => {
    expect(solveState(initialState())).toEqual({ score: 0, depth: 9 })
  })

  it("uses symmetries that map winning lines onto winning lines", () => {
    const lineBoards = ["xxx|...|...", "x..|x..|x..", "x..|.x.|..x"].map(
      fromText
    )

    for (const perm of SYMMETRIES) {
      for (const state of lineBoards) {
        expect(winnerOf(transformState(state, perm).board)).toBe("x")
      }
    }
  })

  it("gives the same value to symmetric positions", () => {
    const asymmetric = positions.filter((state) =>
      SYMMETRIES.some(
        (perm) => gameValue(transformState(state, perm)) !== gameValue(state)
      )
    )

    expect(asymmetric).toEqual([])
  })
})
