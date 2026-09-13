/**
 * 盤面を「自分の石」「相手の石」の 2 本の 9bit マスクで持つ。マス i が bit i。
 * 攻略法の判定 (リーチ・両取り) を配列コピー無しのビット演算だけで書くための表現。
 */

export const CELL_COUNT = 9
export const FULL_MASK = (1 << CELL_COUNT) - 1

const CELLS = Array.from({ length: CELL_COUNT }, (_, cell) => cell)

export const bit = (cell: number): number => 1 << cell

/** 左上から右下へ row-major に並べたマス番号で書いた勝ち筋 8 本 */
const LINE_CELLS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const

export const LINE_MASKS: readonly number[] = LINE_CELLS.map((cells) =>
  cells.reduce<number>((mask, cell) => mask | bit(cell), 0)
)

export const popcount = (mask: number): number => {
  let count = 0

  for (let rest = mask; rest !== 0; rest &= rest - 1) count += 1

  return count
}

/** 立っている bit のうち最も小さいマス番号 */
export const lowestCell = (mask: number): number =>
  31 - Math.clz32(mask & -mask)

/** 立っている bit のマス番号を昇順で */
export const cellsOf = (mask: number): number[] =>
  CELLS.filter((cell) => (mask & bit(cell)) !== 0)

export const emptyMask = (own: number, other: number): number =>
  FULL_MASK & ~(own | other)

export const hasLine = (own: number): boolean =>
  LINE_MASKS.some((line) => (own & line) === line)

/** own が次の 1 手で揃えられる空きマス (= リーチの完成点) */
export const winningCells = (own: number, other: number): number =>
  LINE_MASKS.reduce((cells, line) => {
    const missing = line & ~own

    return popcount(missing) === 1 && (missing & other) === 0
      ? cells | missing
      : cells
  }, 0)

/** own が置くと完成点が 2 つ以上 (= 両取り) になる空きマス */
export const forkCells = (own: number, other: number): number =>
  cellsOf(emptyMask(own, other)).reduce(
    (cells, cell) =>
      popcount(winningCells(own | bit(cell), other)) >= 2
        ? cells | bit(cell)
        : cells,
    0
  )

/** 配列表現の盤面から、指定した石だけの 9bit マスクを作る */
export const maskOf = <T>(board: readonly T[], stone: T): number =>
  board.reduce(
    (mask, cell, index) => (cell === stone ? mask | bit(index) : mask),
    0
  )
