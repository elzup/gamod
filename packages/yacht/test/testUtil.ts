import { tableValueFn } from "../reference/dp.js"
import { loadValues } from "../reference/table.js"
import type { Category, Sheet } from "../src/schema.js"
import { CATEGORIES, POSSIBLE_SCORES } from "../src/scoring.js"
import { createBestMove } from "../src/strategy.js"

export const values = loadValues()
export const exactValue = tableValueFn(values)
export const bestMove = createBestMove(exactValue)

/** 指定した役だけ未記入で、他は scores の点で埋まった記入表。省略した役はその役で取りうる最小の点 (チョイスは 0 点を取れない) */
export const sheetExcept = (
  open: readonly Category[],
  scores: Sheet = {}
): Sheet =>
  Object.fromEntries(
    CATEGORIES.filter((category) => !open.includes(category)).map(
      (category) => [
        category,
        scores[category] ??
          Math.min(...(POSSIBLE_SCORES[CATEGORIES.indexOf(category)] ?? [])),
      ]
    )
  )
