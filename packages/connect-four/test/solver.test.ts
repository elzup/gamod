import { describe, expect, it } from "vitest"
import { createOracle } from "../reference/solver.js"
import { createSolver } from "../src/solver.js"
import {
  createRandom,
  deepPositions,
  expectedScore,
  solverColumns,
  stoneCount,
} from "./testUtil.js"

/**
 * 7x6 を丸ごと解くことはできないので、正解役 (@gamod/core の全探索) との突き合わせは
 * 「小さい盤の全局面」と「終局まで数手しか無い局面」で行う。
 * 枝刈りも置換表も盤の大きさに依存しないので、ここが合えば 7x6 でも同じ理屈が働く。
 */
describe("solver on a 4x4 board (every reachable position)", () => {
  const size = 16
  const oracle = createOracle({ width: 4, height: 4 })
  const solver = createSolver({ width: 4, height: 4, tableBits: 18 })
  const positions = oracle.reachableStates()
  const open = positions.filter((position) => !oracle.isTerminal(position))

  it("walks the whole game", () => {
    expect(positions).toHaveLength(161029)
    expect(open).toHaveLength(134289)
    // Tromp の小さい盤の解析と同じく 4x4 は引分
    expect(oracle.gameValue(oracle.rules.initial())).toBe(0)
  })

  it("gets the same win / draw / loss as exhaustive search", () => {
    const wrong = open.filter(
      (position) =>
        solver.solve(solverColumns(position), true) !==
        oracle.gameValue(position)
    )

    expect(wrong.map(oracle.rules.key)).toEqual([])
  })

  it("gets the same distance to the end as exhaustive search", () => {
    const wrong = open.filter(
      (position) =>
        solver.solve(solverColumns(position)) !==
        expectedScore(size, stoneCount(position), oracle.solveState(position))
    )

    expect(wrong.map(oracle.rules.key)).toEqual([])
  })

  it("plays a move that keeps the game-theoretic value", () => {
    const wrong = open.filter((position) => {
      const move = solver.bestMove(solverColumns(position))

      return move === null || !oracle.bestMoves(position).includes(move)
    })

    expect(wrong.map(oracle.rules.key)).toEqual([])
  })

  it("returns null once the board is full", () => {
    const full = positions.filter(
      (position) =>
        oracle.rules.isFull(position) &&
        oracle.rules.winnerOf(position) === null
    )

    expect(full.length).toBeGreaterThan(0)
    expect(
      full.filter(
        (position) => solver.bestMove(solverColumns(position)) !== null
      )
    ).toEqual([])
  })
})

describe.each([
  { width: 5, height: 4, stones: 14 },
  { width: 4, height: 5, stones: 14 },
  { width: 7, height: 6, stones: 34 },
])(
  "solver on a $width x $height board (random positions with $stones stones)",
  ({ width, height, stones }) => {
    const oracle = createOracle({ width, height })
    const solver = createSolver({ width, height, tableBits: 18 })
    const positions = deepPositions(oracle.rules, createRandom(20260918), {
      stones,
      samples: 60,
    })

    it("collects enough positions", () => {
      expect(positions.length).toBeGreaterThan(30)
      expect(
        positions.every((position) => stoneCount(position) === stones)
      ).toBe(true)
    })

    it("gets the same result as exhaustive search", () => {
      const wrong = positions.filter(
        (position) =>
          solver.solve(solverColumns(position), true) !==
            oracle.gameValue(position) ||
          solver.solve(solverColumns(position)) !==
            expectedScore(
              width * height,
              stoneCount(position),
              oracle.solveState(position)
            )
      )

      expect(wrong.map(oracle.rules.key)).toEqual([])
    })

    it("plays a move that keeps the game-theoretic value", () => {
      const wrong = positions.filter((position) => {
        const move = solver.bestMove(solverColumns(position))

        return move === null || !oracle.bestMoves(position).includes(move)
      })

      expect(wrong.map(oracle.rules.key)).toEqual([])
    })
  }
)
