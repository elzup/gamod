import process from "node:process"
import { describe, expect, it } from "vitest"
import { createOracle } from "../reference/solver.js"
import { positionKey } from "../src/board.js"
import { BOOK_SIZE, bookValue, OPENINGS } from "../src/book.js"
import { createSolver } from "../src/solver.js"
import {
  createRandom,
  deepPositions,
  fromMoves,
  solverColumns,
  toPosition,
} from "./testUtil.js"

const solver = createSolver()
const columnsOf = (moves: readonly number[]) =>
  solverColumns(toPosition(fromMoves([...moves])))

describe("opening book", () => {
  it("holds the 8 openings, left-right mirrored ones shared", () => {
    expect(OPENINGS).toHaveLength(8)
    expect(BOOK_SIZE).toBe(5)
  })

  it("is keyed the same way the search keys its positions", () => {
    const wrong = OPENINGS.filter(
      ({ moves }) => bookValue(solver.key(columnsOf(moves))) === undefined
    )

    expect(wrong).toEqual([])
  })

  it("knows nothing about positions outside the opening", () => {
    const oracle = createOracle({ width: 7, height: 6 })
    const positions = deepPositions(oracle.rules, createRandom(11), {
      stones: 20,
      samples: 20,
    })

    expect(
      positions.filter(
        (position) =>
          bookValue(solver.key(solverColumns(position))) !== undefined
      )
    ).toEqual([])
  })

  it("gives mirrored positions the same key", () => {
    expect(positionKey(columnsOf([0]))).toBe(positionKey(columnsOf([6])))
    expect(positionKey(columnsOf([2]))).toBe(positionKey(columnsOf([4])))
    expect(positionKey(columnsOf([0]))).not.toBe(positionKey(columnsOf([1])))
  })

  it("computes the same key as the search does", () => {
    const oracle = createOracle({ width: 7, height: 6 })
    const positions = deepPositions(oracle.rules, createRandom(12), {
      stones: 24,
      samples: 40,
    })
    const wrong = positions.filter((position) => {
      const columns = solverColumns(position)

      return positionKey(columns) !== solver.key(columns)
    })

    expect(wrong.map(oracle.rules.key)).toEqual([])
  })

  /**
   * 定石表の中身 (公開されている解析結果) を自前の探索で検算する。
   * 1 局面あたり数時間かかるので、GAMOD_SLOW=1 のときだけ動かす。
   */
  // biome-ignore lint/complexity/useLiteralKeys: tsconfig の noPropertyAccessFromIndexSignature が index アクセスを要求する
  it.runIf(process.env["GAMOD_SLOW"] === "1")(
    "matches a full search of the opening",
    { timeout: 0 },
    () => {
      const wrong = OPENINGS.filter(
        ({ moves, value }) => solver.solve(columnsOf(moves), true) !== value
      )

      expect(wrong).toEqual([])
    }
  )
})
