import { describe, expect, it } from "vitest"
import { optimalMoves } from "../reference/solver.js"
import {
  type Card,
  cardValue,
  HAND_COUNTS,
  type StateInput,
  totalOf,
} from "../src/schema.js"
import { bestMove } from "../src/strategy.js"

/** 10/J/Q/K は同じ点数なので照合は 10 で代表させ、絵札は別のテストで確認する */
const RANKS: readonly Card[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
]

/**
 * 無限デッキでは最善手が (合計, ソフトか, 2 枚か, ペアか) で決まるので、
 * 4 枚までの手札で全ての組み合わせが現れる (ハード 21 の 3 枚以上も 10,10,A 等で出る)
 */
const MAX_CARDS = 4

/** 単独で約 2 秒、全パッケージ並列の pnpm test では 4 秒を超えて既定の 5 秒に迫るので余裕を取る */
const EXHAUSTIVE_TIMEOUT_MS = 30_000

/** 最後の 1 枚より前にバーストしていない手札 (= 実戦に現れる手札) を 2..MAX_CARDS 枚まで */
type Hand = StateInput["hand"]

const isHand = (cards: Card[]): cards is Hand => cards.length >= 2

const reachableHands = (): Hand[] => {
  const grow = (hand: Card[]): Hand[] => {
    const self = isHand(hand) ? [hand] : []

    if (hand.length >= MAX_CARDS || totalOf(hand).value > 21) return self

    return [...self, ...RANKS.flatMap((card) => grow([...hand, card]))]
  }

  return grow([])
}

const isSplitAcesHand = (hand: Card[], hands: number): boolean =>
  hands > 1 && hand[0] === "A"

/**
 * 最善手は手札の並びではなく (合計, ソフトか, 2 枚か, ペアの点数) で決まるので、正解役の結果はその単位で使い回す。
 * キーにペアの点数まで含めれば、この仮定が偽でもキャッシュが答えを混ぜることはない
 */
const optimalCache = new Map<string, string[]>()

const cachedOptimalMoves = (
  hand: Card[],
  dealer: Card,
  hands: number,
  later: number
): string[] => {
  const { value, isSoft } = totalOf(hand)
  const pair =
    hand.length === 2 &&
    hand[0] !== undefined &&
    hand[1] !== undefined &&
    cardValue(hand[0]) === cardValue(hand[1])
  const key = [
    value,
    isSoft,
    hand.length === 2,
    pair && hand[0],
    dealer,
    hands,
    later,
  ].join(":")
  const cached = optimalCache.get(key)

  if (cached) return cached

  const moves = optimalMoves(hand, dealer, hands, later)

  optimalCache.set(key, moves)

  return moves
}

describe("bestMove", () => {
  it(
    "matches exhaustive expected-value play on every reachable hand",
    () => {
      const mismatches: string[] = []
      let checked = 0

      for (const hand of reachableHands()) {
        for (const dealer of RANKS) {
          for (const count of HAND_COUNTS) {
            if (isSplitAcesHand(hand, count) && hand.length > 2) continue

            const move = bestMove({ dealer, hand, hands: count })
            const total = totalOf(hand)
            const isOver =
              total.value > 21 ||
              (count === 1 && hand.length === 2 && total.value === 21) ||
              isSplitAcesHand(hand, count)
            const label = `${hand} vs ${dealer} (hands ${count})`

            checked++
            if (isOver) {
              if (move !== null)
                mismatches.push(`${label}: ${move}, expected null`)
              continue
            }

            // 後に控えるハンド数はどれでも最善手が変わらないことも同時に確かめる
            for (let later = 0; later < count; later++) {
              const optimal = cachedOptimalMoves(hand, dealer, count, later)

              if (move === null || !optimal.includes(move)) {
                mismatches.push(
                  `${label} later ${later}: ${move}, expected ${optimal}`
                )
              }
            }
          }
        }
      }

      expect(mismatches).toEqual([])
      expect(checked).toBeGreaterThan(100_000)
    },
    EXHAUSTIVE_TIMEOUT_MS
  )

  it("treats face cards as 10", () => {
    expect(bestMove({ dealer: "K", hand: ["Q", "6"] })).toBe("hit")
    expect(bestMove({ dealer: "6", hand: ["J", "K"] })).toBe("stand")
    expect(bestMove({ dealer: "5", hand: ["J", "A"], hands: 2 })).toBe("stand")
  })

  it("follows the well-known chart on a few cells", () => {
    expect(bestMove({ dealer: "A", hand: ["6", "5"] })).toBe("hit")
    expect(bestMove({ dealer: "10", hand: ["6", "5"] })).toBe("double")
    expect(bestMove({ dealer: "2", hand: ["A", "7"] })).toBe("stand")
    expect(bestMove({ dealer: "3", hand: ["A", "7"] })).toBe("double")
    expect(bestMove({ dealer: "3", hand: ["A", "3", "4"] })).toBe("stand")
    expect(bestMove({ dealer: "7", hand: ["9", "9"] })).toBe("stand")
    expect(bestMove({ dealer: "10", hand: ["8", "8"] })).toBe("split")
  })

  it("does not split when the hand limit is reached", () => {
    expect(bestMove({ dealer: "10", hand: ["8", "8"], hands: 4 })).toBe("hit")
    expect(bestMove({ dealer: "6", hand: ["A", "A"] })).toBe("split")
  })

  it("returns null when there is nothing to decide", () => {
    expect(bestMove({ dealer: "5", hand: ["A", "K"] })).toBe(null)
    expect(bestMove({ dealer: "5", hand: ["10", "8", "5"] })).toBe(null)
    expect(bestMove({ dealer: "5", hand: ["A", "5"], hands: 2 })).toBe(null)
  })
})

describe("parseState", () => {
  it("rejects a hand that kept drawing after busting", () => {
    expect(() =>
      bestMove({ dealer: "5", hand: ["10", "8", "5", "2"] })
    ).toThrow(/cannot arise/)
  })

  it("rejects a third card on split aces", () => {
    expect(() =>
      bestMove({ dealer: "5", hand: ["A", "5", "2"], hands: 2 })
    ).toThrow(/cannot arise/)
  })

  it("rejects values outside the types at runtime too", () => {
    // 型で弾ける値も、JS からの呼び出しや外部入力で来るので実行時に弾く
    // @ts-expect-error hands は 1..4
    expect(() => bestMove({ dealer: "5", hand: ["8", "8"], hands: 5 })).toThrow(
      /invalid blackjack state/
    )
    // @ts-expect-error hand は 2 枚以上
    expect(() => bestMove({ dealer: "5", hand: ["8"] })).toThrow(
      /invalid blackjack state/
    )
  })
})

describe("StateInput type", () => {
  // 呼ばない関数の中に置き、tsc (typecheck) で型エラーになることだけを確かめる
  it("rejects invalid values as type errors", () => {
    const typeCheckOnly = () => {
      // @ts-expect-error 存在しないカード
      bestMove({ dealer: "11", hand: ["8", "8"] })
      // @ts-expect-error 存在しないカード
      bestMove({ dealer: "A", hand: ["X", "8"] })
      // @ts-expect-error カードは文字列
      bestMove({ dealer: "A", hand: [8, 8] })
      // @ts-expect-error 手札は 2 枚以上
      bestMove({ dealer: "A", hand: ["8"] })
      // @ts-expect-error ハンド数は 1..4
      bestMove({ dealer: "A", hand: ["8", "8"], hands: 0 })
      // @ts-expect-error バッククォートでも存在しないカードは弾く
      bestMove({ dealer: "10", hand: ["6", `20`] })
    }

    expect(typeCheckOnly).toBeTypeOf("function")
  })

  it("accepts cards written with double quotes or backticks", () => {
    expect(bestMove({ dealer: "10", hand: ["6", "10"] })).toBe("hit")
    expect(bestMove({ dealer: `10`, hand: [`6`, `10`] })).toBe("hit")
  })
})
