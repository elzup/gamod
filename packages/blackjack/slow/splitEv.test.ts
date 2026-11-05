import { describe, expect, it } from "vitest"
import { keepEv, splitEv } from "../reference/ev.js"
import { splitTable } from "../reference/wizardInfiniteDeck.js"
import { rankOfPairLabel, UPCARDS } from "../test/wizardLabels.js"

/**
 * readme の「割るかどうかはリスプリットの選び方に依らない (だから state は hands だけで足りる)」の根拠。
 * splitEv を全ペア × 全アップカードで解くので各数秒かかり、ルールを変えない限り結果も変わらないため
 * 通常の pnpm test から外して pnpm --filter @gamod/blackjack test:slow で回す。
 */
describe("splitEv", () => {
  it("is never worse when resplitting is chosen optimally", () => {
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
  })

  it("gives the same split decision whether resplitting is optimal or forced", () => {
    for (const label of Object.keys(splitTable)) {
      for (const upcard of UPCARDS) {
        const pair = rankOfPairLabel(label)
        const decides = (resplit: "optimal" | "always") => {
          const context = { hands: 1, laterPending: 0, resplit }

          return splitEv(pair, upcard, context) > keepEv(pair, upcard, context)
        }

        expect(decides("optimal"), `${label} vs ${upcard}`).toBe(
          decides("always")
        )
      }
    }
  })
})
