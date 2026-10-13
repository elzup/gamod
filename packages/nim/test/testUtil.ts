import type { Rule, State } from "../src/schema.js"

export const RULES: readonly Rule[] = ["normal", "misere"]

/** 失敗時に読める形にする。例: "3,4,5 normal" */
export const toText = ({ heaps, rule }: State): string =>
  `${heaps.join(",")} ${rule}`

export const nimSum = (heaps: readonly number[]): number =>
  heaps.reduce((sum, size) => sum ^ size, 0)
