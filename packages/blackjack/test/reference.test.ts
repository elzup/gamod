import { describe, expect, it } from "vitest"
import {
  dealerDist,
  doubleEv,
  type Hand,
  hitEv,
  keepEv,
  type Rank,
  splitEv,
  standEv,
} from "../reference/ev.js"
import {
  doubleTable,
  hitTable,
  splitTable,
  standTable,
  type WizardTable,
} from "../reference/wizardInfiniteDeck.js"

/** Wizard of Odds の表の列順 */
const UPCARDS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1]

/** 公開表は小数 6 桁で丸められている */
const DIGITS = 6

/** 単独で各約 2 秒だが、全パッケージ並列時は既定の 5 秒を超えるため余裕を取る */
const SPLIT_EV_TIMEOUT_MS = 30_000

const handOfLabel = (label: string): Hand => {
  const soft = /^Soft (\d+)$/.exec(label)

  if (soft) return { hard: Number(soft[1]) - 10, hasAce: true }

  return { hard: Number(label.replace(/^Hard /, "")), hasAce: false }
}

const rankOfPairLabel = (label: string): Rank =>
  (label.startsWith("A") ? 1 : Number(label.split(",")[0])) as Rank

const expectTable = (
  table: WizardTable,
  evOf: (label: string, upcard: Rank) => number
) => {
  for (const [label, row] of Object.entries(table)) {
    UPCARDS.forEach((upcard, i) => {
      expect(evOf(label, upcard), `${label} vs ${upcard}`).toBeCloseTo(
        row[i] ?? Number.NaN,
        DIGITS
      )
    })
  }
}

describe("dealerDist", () => {
  it("sums to 1 for every upcard", () => {
    for (const upcard of UPCARDS) {
      const total = dealerDist(upcard).reduce((sum, p) => sum + p, 0)

      expect(total).toBeCloseTo(1, 12)
    }
  })
})

describe("matches the Wizard of Odds infinite-deck tables", () => {
  it("stand", () => {
    expectTable(standTable, (label, upcard) =>
      standEv(label === "0-16" ? 16 : Number(label), upcard)
    )
  })

  it("hit", () => {
    expectTable(hitTable, (label, upcard) => hitEv(handOfLabel(label), upcard))
  })

  it("double", () => {
    expectTable(doubleTable, (label, upcard) =>
      doubleEv(handOfLabel(label), upcard)
    )
  })

  // 公開表は pair が来たら必ずリスプリットする前提。最適に選ぶ既定値とは 2,2 vs 8 などでずれる
  it("split (always resplitting)", () => {
    expectTable(splitTable, (label, upcard) =>
      splitEv(rankOfPairLabel(label), upcard, {
        hands: 1,
        laterPending: 0,
        resplit: "always",
      })
    )
  })
})

describe("splitEv", () => {
  it(
    "is never worse when resplitting is chosen optimally",
    () => {
      for (const label of Object.keys(splitTable)) {
        for (const upcard of UPCARDS) {
          const pair = rankOfPairLabel(label)
          const always = splitEv(pair, upcard, {
            hands: 1,
            laterPending: 0,
            resplit: "always",
          })

          expect(splitEv(pair, upcard)).toBeGreaterThanOrEqual(always)
        }
      }
    },
    SPLIT_EV_TIMEOUT_MS
  )

  it(
    "gives the same split decision whether resplitting is optimal or forced",
    () => {
      for (const label of Object.keys(splitTable)) {
        for (const upcard of UPCARDS) {
          const pair = rankOfPairLabel(label)
          const decides = (resplit: "optimal" | "always") => {
            const context = { hands: 1, laterPending: 0, resplit }

            return (
              splitEv(pair, upcard, context) > keepEv(pair, upcard, context)
            )
          }

          expect(decides("optimal"), `${label} vs ${upcard}`).toBe(
            decides("always")
          )
        }
      }
    },
    SPLIT_EV_TIMEOUT_MS
  )
})
