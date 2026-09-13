import { describe, expect, it } from "vitest"
import {
  bit,
  cellsOf,
  emptyMask,
  FULL_MASK,
  forkCells,
  hasLine,
  LINE_MASKS,
  lowestCell,
  maskOf,
  popcount,
  winningCells,
} from "../src/bitboard.js"
import { fromText } from "./testUtil.js"

const masks = (text: string) => {
  const { board } = fromText(text)

  return { x: maskOf(board, "x"), o: maskOf(board, "o") }
}

describe("bit helpers", () => {
  it("counts and lists bits for every 9-bit mask", () => {
    for (let mask = 0; mask <= FULL_MASK; mask += 1) {
      const cells = cellsOf(mask)

      expect(popcount(mask)).toBe(cells.length)
      expect(cells.reduce((acc, cell) => acc | bit(cell), 0)).toBe(mask)
      if (mask !== 0) expect(lowestCell(mask)).toBe(cells[0])
    }
  })

  it("has 8 distinct 3-cell lines", () => {
    expect(new Set(LINE_MASKS).size).toBe(8)
    expect(LINE_MASKS.every((line) => popcount(line) === 3)).toBe(true)
  })

  it("builds masks from a board", () => {
    expect(masks("x..|.o.|..x")).toEqual({
      x: bit(0) | bit(8),
      o: bit(4),
    })
  })

  it("lists empty cells", () => {
    const { x, o } = masks("xo.|...|...")

    expect(cellsOf(emptyMask(x, o))).toEqual([2, 3, 4, 5, 6, 7, 8])
  })
})

describe("line patterns", () => {
  it("detects a completed line", () => {
    expect(hasLine(masks("xxx|oo.|...").x)).toBe(true)
    expect(hasLine(masks("xx.|oo.|...").x)).toBe(false)
  })

  it("finds the cell that completes a line", () => {
    const { x, o } = masks("xx.|oo.|...")

    expect(cellsOf(winningCells(x, o))).toEqual([2])
    expect(cellsOf(winningCells(o, x))).toEqual([5])
  })

  it("ignores a line the opponent has already blocked", () => {
    const { x, o } = masks("xxo|...|...")

    expect(winningCells(x, o)).toBe(0)
  })

  it("counts a cell once even when it completes two lines", () => {
    // マス 0 は横と縦の両方を完成させるが、完成点としては 1 つ (斜めは中央の o で塞いである)
    const { x, o } = masks(".xx|xo.|x..")

    expect(cellsOf(winningCells(x, o))).toEqual([0])
  })

  it("finds fork cells", () => {
    // x が 0 と 8 の隅: 2 か 6 に置くと完成点が 2 つになる
    const { x, o } = masks("x..|.o.|..x")

    expect(cellsOf(forkCells(x, o))).toEqual([2, 6])
  })
})
