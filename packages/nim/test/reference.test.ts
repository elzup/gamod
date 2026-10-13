import { describe, expect, it } from "vitest"
import { applyMove, isOver, legalMoves } from "../reference/rules.js"
import { allStates, gameValue, stateKey } from "../reference/solver.js"
import type { State } from "../src/schema.js"
import { nimSum, RULES } from "./testUtil.js"

const normal = (heaps: number[]): State => ({ heaps, rule: "normal" })
const misere = (heaps: number[]): State => ({ heaps, rule: "misere" })

describe("legalMoves", () => {
  it("lists every amount for every heap", () => {
    expect(legalMoves(normal([2, 0, 1]))).toEqual([
      { heap: 0, take: 1 },
      { heap: 0, take: 2 },
      { heap: 2, take: 1 },
    ])
  })

  it("returns nothing once every heap is empty", () => {
    expect(legalMoves(normal([0, 0]))).toEqual([])
  })
})

describe("applyMove", () => {
  it("does not mutate the given state", () => {
    const state = normal([3, 4, 5])
    const next = applyMove(state, { heap: 1, take: 3 })

    expect(state.heaps).toEqual([3, 4, 5])
    expect(next).toEqual(normal([3, 1, 5]))
  })

  it("rejects taking more than the heap holds", () => {
    expect(() => applyMove(normal([3]), { heap: 0, take: 4 })).toThrow(
      /cannot take 4/
    )
  })

  it("rejects a heap that does not exist", () => {
    expect(() => applyMove(normal([3]), { heap: 1, take: 1 })).toThrow(
      /does not exist/
    )
  })

  it("rejects taking nothing", () => {
    expect(() => applyMove(normal([3]), { heap: 0, take: 0 })).toThrow(
      /invalid nim move/
    )
  })
})

describe("isOver", () => {
  it("is over only when every heap is empty", () => {
    expect(isOver(normal([0, 0, 0]))).toBe(true)
    expect(isOver(normal([0, 1, 0]))).toBe(false)
  })
})

/**
 * 正解役そのものが正しいことを、実装と独立に知られている事実で確かめる。
 * ここが崩れると「攻略法が正解役と一致する」テストが意味を失う。
 */
describe("reference solver", () => {
  it.each([
    [1, 1],
    [2, 8],
    [3, 64],
    [4, 512],
  ])(
    "finds 8^(k-1) lost positions among %i heaps of 0..7",
    (heapCount, expected) => {
      // Bouton の定理: normal で手番側が負けるのはニム和 0 の局面だけ。最後の山は他の山の XOR に決まるので 8^(k-1) 通り。
      // misere は 1 個以下の山だけの局面で勝敗が入れ替わるが、そこでも負けは半数なので総数は同じになる
      for (const rule of RULES) {
        const lost = allStates(heapCount, 7, rule).filter(
          (state) => gameValue(state) === -1
        )

        expect(lost).toHaveLength(expected)
      }
    }
  )

  it("loses exactly the zero nim-sum positions in normal play", () => {
    const mismatched = allStates(3, 7, "normal").filter(
      (state) => (gameValue(state) === -1) !== (nimSum(state.heaps) === 0)
    )

    expect(mismatched).toEqual([])
  })

  it("solves well-known positions", () => {
    expect(gameValue(normal([1, 2, 3]))).toBe(-1)
    expect(gameValue(normal([3, 4, 5]))).toBe(1)
    // 「去年マリエンバートで」の配置。misere では先手が負ける
    expect(gameValue(misere([1, 3, 5, 7]))).toBe(-1)
  })

  it("flips the result of a single stone between the rules", () => {
    expect(gameValue(normal([1]))).toBe(1)
    expect(gameValue(misere([1]))).toBe(-1)
  })

  it("ignores the order of heaps", () => {
    expect(stateKey(normal([5, 0, 3]))).toBe(stateKey(normal([0, 3, 5])))
    expect(stateKey(normal([1]))).not.toBe(stateKey(misere([1])))
  })
})
