import type { Peg, State } from "../src/schema.js"

export const TARGETS: readonly Peg[] = [0, 1, 2]

/** 失敗時に読める形にする。例: "0012 -> 2" (円盤 0 から順に乗っている棒) */
export const toText = ({ pegs, target }: State): string =>
  `${pegs.join("")} -> ${target}`

export const popcount = (value: number): number =>
  value.toString(2).replace(/0/g, "").length
