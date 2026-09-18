/**
 * 盤の形だけを持つモジュール。公開する board 配列 (左上から右下への row-major) と、
 * 探索側が使う「列ごとに下から積む」座標を行き来するのはここだけにする。
 */

export const WIDTH = 7
export const HEIGHT = 6
export const BOARD_LENGTH = WIDTH * HEIGHT
/** 何個並べば勝ちか */
export const CONNECT = 4

/** 列 (左が 0) と段 (下が 0)。重力があるので段は必ず下から埋まる */
export type Square = { col: number; row: number }

const DIRECTIONS = [
  { dc: 0, dr: 1 },
  { dc: 1, dr: 0 },
  { dc: 1, dr: 1 },
  { dc: 1, dr: -1 },
] as const

/** 盤の大きさを与えると、4 連になるマスの並びを全部返す */
export const lineSquares = (
  width: number,
  height: number,
  connect: number = CONNECT
): Square[][] => {
  const inside = ({ col, row }: Square) =>
    col >= 0 && col < width && row >= 0 && row < height

  return DIRECTIONS.flatMap(({ dc, dr }) =>
    Array.from({ length: width }, (_, col) =>
      Array.from({ length: height }, (_, row) =>
        Array.from({ length: connect }, (_, step) => ({
          col: col + dc * step,
          row: row + dr * step,
        }))
      )
    )
      .flat()
      .filter((line) => line.every(inside))
  )
}

/** 公開している board 配列上の添字。段は下から数えるので、行は上下を反転させる */
export const boardIndex = (col: number, row: number): number =>
  (HEIGHT - 1 - row) * WIDTH + col

/** 7x6 の勝ち筋 69 本を board 配列の添字で表したもの */
export const LINES: readonly (readonly number[])[] = lineSquares(
  WIDTH,
  HEIGHT
).map((line) => line.map(({ col, row }) => boardIndex(col, row)))

/**
 * 局面キー。列ごとに「手番側の石 + 置かれている石 + 1」を height + 1 bit に詰めたもので、
 * (手番側の石, 全体の石) の組と 1 対 1 に対応する (Pons の key と同じ作り方)。
 * 左右反転しても勝敗は変わらないので、反転した並びと小さい方を採用して同一視する。
 * 7x6 なら 49 bit に収まり、double で厳密に扱える。
 *
 * columns は列ごとに下から並べた石で、1 = 手番側、2 = 相手。
 */
export const positionKey = (
  columns: readonly (readonly number[])[],
  height: number = HEIGHT
): number => {
  const columnKey = (column: readonly number[]) =>
    column.reduce(
      (key, stone, row) => key + (stone === 1 ? 2 : 1) * 2 ** row,
      1
    )
  const keyOf = (order: readonly (readonly number[])[]) =>
    order.reduce(
      (key, column, index) =>
        key + columnKey(column) * 2 ** ((height + 1) * index),
      0
    )

  return Math.min(keyOf(columns), keyOf([...columns].reverse()))
}
