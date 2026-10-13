import { describe, expect, it } from "vitest"
import { applyMove, isOver } from "../reference/rules.js"
import { allStates, gameValue } from "../reference/solver.js"
import { MAX_HEAP_SIZE, type State } from "../src/schema.js"
import { bestMove } from "../src/strategy.js"
import { nimSum, RULES, toText } from "./testUtil.js"

/**
 * 照合する範囲。山 4 つまでを 0..7 個で総当たりし、ビット幅の広い側は山 3 つを 0..15 個で見る。
 * 攻略法は山の数にも個数にも依らない式なので、ここで合えばそれより大きい局面でも同じ計算になる。
 */
const RANGES = [
  { heapCount: 1, maxSize: 7 },
  { heapCount: 2, maxSize: 7 },
  { heapCount: 3, maxSize: 7 },
  { heapCount: 4, maxSize: 7 },
  { heapCount: 3, maxSize: 15 },
] as const

const playBest = (state: State): State => {
  const move = bestMove(state)

  if (move === null) throw new Error(`no move in ${toText(state)}`)

  return applyMove(state, move)
}

describe.each(RULES)("bestMove against the exhaustive solver (%s)", (rule) => {
  const positions = RANGES.flatMap(({ heapCount, maxSize }) =>
    allStates(heapCount, maxSize, rule)
  )
  const openPositions = positions.filter((state) => !isOver(state))

  it("is checked on every position in the ranges", () => {
    // 8 + 64 + 512 + 4096 + 4096 通りから、山が全て空の 5 通りを除く
    expect(openPositions).toHaveLength(8771)
  })

  it("always plays a legal move", () => {
    const illegal = openPositions.filter((state) => {
      const move = bestMove(state)

      return (
        move === null ||
        move.take < 1 ||
        move.take > (state.heaps[move.heap] ?? 0)
      )
    })

    expect(illegal.map(toText)).toEqual([])
  })

  it("keeps the game-theoretic value in every position", () => {
    const wrong = openPositions.filter(
      (state) => -gameValue(playBest(state)) !== gameValue(state)
    )

    expect(wrong.map(toText)).toEqual([])
  })

  it("takes a single stone when every move loses", () => {
    const greedy = openPositions
      .filter((state) => gameValue(state) === -1)
      .filter((state) => bestMove(state)?.take !== 1)

    expect(greedy.map(toText)).toEqual([])
  })

  it("returns null when every heap is empty", () => {
    const terminals = positions.filter(isOver)

    expect(terminals).toHaveLength(RANGES.length)
    expect(terminals.filter((state) => bestMove(state) !== null)).toEqual([])
  })
})

describe("bestMove as a strategy", () => {
  it("hands over a zero nim-sum from every winning position in normal play", () => {
    const missed = allStates(4, 7, "normal")
      .filter((state) => nimSum(state.heaps) !== 0)
      .filter((state) => nimSum(playBest(state).heaps) !== 0)

    expect(missed.map(toText)).toEqual([])
  })

  it.each(RULES)("wins a won position against every opponent (%s)", (rule) => {
    // follower が bestMove どおりに指し、相手は全ての手を試す。follower が勝った対局だけ true
    const followerWinsAll = (
      state: State,
      isFollowerTurn: boolean
    ): boolean => {
      if (isOver(state)) return (rule === "normal") !== isFollowerTurn
      if (isFollowerTurn) return followerWinsAll(playBest(state), false)

      return state.heaps.every((size, heap) =>
        Array.from({ length: size }, (_, index) => index + 1).every((take) =>
          followerWinsAll(applyMove(state, { heap, take }), true)
        )
      )
    }
    const start: State = { heaps: [2, 3, 4], rule }

    expect(gameValue(start)).toBe(1)
    expect(followerWinsAll(start, true)).toBe(true)
  })
})

describe("bestMove on known positions", () => {
  it("zeroes the nim-sum of 3-4-5", () => {
    // 3 ^ 4 ^ 5 = 2。勝てる手は 3 個の山を 1 個にする手だけ
    expect(bestMove({ heaps: [3, 4, 5] })).toEqual({ heap: 0, take: 2 })
  })

  it("takes the whole heap when only one is left", () => {
    expect(bestMove({ heaps: [0, 6, 0] })).toEqual({ heap: 1, take: 6 })
  })

  it("leaves the last stone to the opponent in misère play", () => {
    expect(bestMove({ heaps: [0, 6, 0], rule: "misere" })).toEqual({
      heap: 1,
      take: 5,
    })
  })

  it("leaves an odd number of single stones in misère play", () => {
    // 1 個の山が 2 つあるので、大きい山は 1 個残して 1,1,1 で渡す
    expect(bestMove({ heaps: [1, 5, 1], rule: "misere" })).toEqual({
      heap: 1,
      take: 4,
    })
    // 1 個の山が 1 つなら、大きい山を取り切って 1 だけ残す
    expect(bestMove({ heaps: [1, 5], rule: "misere" })).toEqual({
      heap: 1,
      take: 5,
    })
  })

  it("stalls on the largest heap in a lost position", () => {
    // 1 ^ 2 ^ 3 = 0。normal では手番側の負け
    expect(bestMove({ heaps: [1, 2, 3] })).toEqual({ heap: 2, take: 1 })
  })

  it("handles the largest supported heap", () => {
    expect(bestMove({ heaps: [MAX_HEAP_SIZE, 1] })).toEqual({
      heap: 0,
      take: MAX_HEAP_SIZE - 1,
    })
  })
})

describe("bestMove input handling", () => {
  it("plays normal rule when the rule is omitted", () => {
    expect(bestMove({ heaps: [0, 6, 0] })).toEqual(
      bestMove({ heaps: [0, 6, 0], rule: "normal" })
    )
  })

  it("does not mutate the given state", () => {
    const heaps = Object.freeze([3, 4, 5]) as number[]
    const frozen = Object.freeze({ heaps, rule: "normal" as const })

    expect(() => bestMove(frozen)).not.toThrow()
    expect(frozen.heaps).toEqual([3, 4, 5])
  })

  it("rejects a malformed state", () => {
    expect(() => bestMove({ heaps: [] })).toThrow(/invalid nim state/)
  })
})
