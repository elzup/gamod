import { describe, expect, it } from "vitest"
import { applyMove, isSolved, legalMoves, topDisk } from "../reference/rules.js"
import { allStates, distance, shortestNextMoves } from "../reference/solver.js"
import type { State } from "../src/schema.js"
import { popcount, TARGETS, toText } from "./testUtil.js"

const state = (pegs: State["pegs"], target: State["target"] = 2): State => ({
  pegs,
  target,
})

describe("rules", () => {
  it("finds the smallest disk on each peg", () => {
    const position = state([1, 0, 1])

    expect(topDisk(position, 0)).toBe(1)
    expect(topDisk(position, 1)).toBe(0)
    expect(topDisk(position, 2)).toBeNull()
  })

  it("never puts a disk on a smaller one", () => {
    // 円盤 0 は棒 1、円盤 1 は棒 0。円盤 1 は棒 2 にしか動けない
    expect(legalMoves(state([1, 0]))).toEqual([
      { disk: 1, from: 0, to: 2 },
      { disk: 0, from: 1, to: 0 },
      { disk: 0, from: 1, to: 2 },
    ])
  })

  it("does not mutate the given state", () => {
    const position = state([0, 0])
    const next = applyMove(position, { disk: 0, from: 0, to: 1 })

    expect(position.pegs).toEqual([0, 0])
    expect(next).toEqual(state([1, 0]))
  })

  it("rejects a move that breaks the rules", () => {
    expect(() => applyMove(state([0, 0]), { disk: 1, from: 0, to: 2 })).toThrow(
      /illegal hanoi move/
    )
  })

  it("is solved only when every disk is on the target", () => {
    expect(isSolved(state([2, 2, 2]))).toBe(true)
    expect(isSolved(state([2, 2, 2], 1))).toBe(false)
  })
})

/**
 * 正解役そのものが正しいことを、実装と独立に知られている事実で確かめる。
 * ここが崩れると「攻略法が正解役と一致する」テストが意味を失う。
 */
describe("reference solver", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    "moves the classic tower of %i disks in 2^n - 1 moves",
    (disks) => {
      const start = state(Array.from({ length: disks }, () => 0 as const))

      expect(distance(start)).toBe(2 ** disks - 1)
    }
  )

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    "has 2^popcount(d) positions at distance d with %i disks",
    (disks) => {
      // 大きい円盤から見て、目標の棒に乗るか (0 手) 他の 2 本のどちらか (2^k 手) を選ぶので、
      // 距離 d の局面は d の立っているビットごとに 2 通り。合計は 3^n で、最大距離は 2^n - 1
      for (const target of TARGETS) {
        const counts = new Map<number, number>()

        for (const position of allStates(disks, target)) {
          const d = distance(position)

          counts.set(d, (counts.get(d) ?? 0) + 1)
        }

        expect(counts.size).toBe(2 ** disks)
        for (const [d, count] of counts) expect(count).toBe(2 ** popcount(d))
      }
    }
  )

  it("finds exactly one shortest next move from every unsolved position", () => {
    const ambiguous = TARGETS.flatMap((target) => allStates(6, target))
      .filter((position) => !isSolved(position))
      .filter((position) => shortestNextMoves(position).length !== 1)

    expect(ambiguous.map(toText)).toEqual([])
  })
})
