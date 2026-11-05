import { describe, expect, it } from "vitest"
import {
  dealerDist,
  doubleEv,
  hitEv,
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
import { handOfLabel, rankOfPairLabel, UPCARDS } from "./wizardLabels.js"

/** 公開表は小数 6 桁で丸められている */
const DIGITS = 6

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
