import { describe, expect, it } from "vitest"
import type { Stone } from "../reference/rules.js"
import { createOracle } from "../reference/solver.js"
import { boardIndex } from "../src/board.js"
import {
  BOARD_LENGTH,
  type Board,
  type Cell,
  emptyBoard,
  initialState,
  isReachable,
  type Player,
  parseState,
  type State,
  stateSchema,
} from "../src/schema.js"
import { fromMoves, fromText, toPosition } from "./testUtil.js"

const cells = (text: string): Board => fromText(text).board

describe("stateSchema", () => {
  it("accepts the initial state", () => {
    expect(stateSchema.safeParse(initialState()).success).toBe(true)
  })

  it("accepts a position from a real game", () => {
    expect(stateSchema.safeParse(fromMoves([3, 3, 4, 2, 5])).success).toBe(true)
  })

  it("rejects a board that is not 42 cells", () => {
    expect(
      stateSchema.safeParse({ board: [null, null], turn: "r" }).success
    ).toBe(false)
  })

  it("rejects an unknown cell value", () => {
    const board = emptyBoard()

    board[0] = "x" as unknown as Cell

    expect(stateSchema.safeParse({ board, turn: "r" }).success).toBe(false)
  })

  it("rejects an unknown turn", () => {
    expect(
      stateSchema.safeParse({ board: emptyBoard(), turn: "x" }).success
    ).toBe(false)
  })

  it("rejects a stone count that contradicts the turn", () => {
    expect(
      stateSchema.safeParse({ ...fromMoves([3]), turn: "r" }).success
    ).toBe(false)
  })

  it.each([
    [
      "a floating stone",
      ".......|.......|.......|...r...|.......|...y...",
      "r",
    ],
    [
      "both players have a line",
      ".......|.......|rrrr...|yyyy...|rrrr...|yyyy...",
      "r",
    ],
    [
      "the winner is still to move",
      ".......|.......|.......|.......|yyy....|rrrr...",
      "r",
    ],
    [
      "the 4 in a row is not the last move",
      ".......|.......|.......|.......|yyyy...|rrrrr..",
      "y",
    ],
    [
      "the stones cannot be stacked in turn order",
      ".......|.......|.......|.......|rr.....|yy.....",
      "r",
    ],
  ] as const)("rejects an unreachable position: %s", (_, text, turn) => {
    expect(stateSchema.safeParse({ board: cells(text), turn }).success).toBe(
      false
    )
  })

  /**
   * 左 4 列 x 下 4 段だけを使う局面なら、その 4 列以外に石は置かれていないので、
   * 4x4 の盤で辿れる局面と 1 対 1 になる。そこを総当たりして到達判定を検算する。
   */
  it("accepts exactly the positions reachable in a 4 x 4 corner", () => {
    const patterns: Stone[][] = [[]]

    for (let index = 0; index < patterns.length; index += 1) {
      const pattern = patterns[index] as Stone[]

      if (pattern.length < 4) patterns.push([...pattern, 1], [...pattern, 2])
    }

    const cornerBoard = (columns: readonly Stone[][]): Board => {
      const board: Board = Array<Cell>(BOARD_LENGTH).fill(null)

      columns.forEach((column, col) => {
        column.forEach((stone, row) => {
          board[boardIndex(col, row)] = stone === 1 ? "r" : "y"
        })
      })

      return board
    }
    const keyOf = ({ board, turn }: State) =>
      `${board.map((cell) => cell ?? ".").join("")}:${turn}`
    const oracle = createOracle({ width: 4, height: 4 })
    const reachable = new Set(
      oracle.reachableStates().map(({ columns, turn }) =>
        keyOf({
          board: cornerBoard(columns as Stone[][]),
          turn: turn === 1 ? "r" : "y",
        })
      )
    )
    const wrong: string[] = []

    for (const a of patterns)
      for (const b of patterns)
        for (const c of patterns)
          for (const d of patterns) {
            const columns = [a, b, c, d]
            const count = (stone: Stone) =>
              columns.reduce(
                (sum, column) =>
                  sum + column.filter((value) => value === stone).length,
                0
              )
            const diff = count(1) - count(2)
            const turn: Player | null =
              diff === 0 ? "r" : diff === 1 ? "y" : null

            if (turn === null) continue

            const state: State = { board: cornerBoard(columns), turn }

            if (isReachable(state) !== reachable.has(keyOf(state)))
              wrong.push(keyOf(state))
          }

    expect(reachable.size).toBe(161029)
    expect(wrong).toEqual([])
  })
})

describe("parseState", () => {
  it("throws with a readable message", () => {
    expect(() => parseState({ board: [], turn: "r" })).toThrow(
      /invalid connect four state/
    )
  })

  it("explains why an unreachable position is rejected", () => {
    expect(() =>
      parseState({
        board: cells(".......|.......|.......|...r...|.......|...y..."),
        turn: "r",
      })
    ).toThrow(/cannot arise in a real game/)
  })

  it("keeps the position as it was given", () => {
    const state = fromMoves([3, 3, 4])

    expect(toPosition(parseState(state))).toEqual(toPosition(state))
  })
})
