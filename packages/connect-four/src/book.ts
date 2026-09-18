/**
 * 定石表。序盤ほど探索が重いので、解析結果が公開されている局面だけ表で持つ。
 *
 * 7x6 のコネクト4 は 1988 年に James D. Allen と Victor Allis が独立に解いていて、
 * 初手ごとの勝敗は双方最善で次のとおり。
 * - 中央 (col 3): 先手勝ち (41 手目で決着)
 * - その隣 (col 2, 4): 引分
 * - 外側 4 列 (col 0, 1, 5, 6): 後手勝ち
 *
 * 表に入れてあるのはこの 8 局面だけで、それ以外は探索が答える。
 * 値は「その局面の手番側から見た勝敗」なので、初手を指した後は符号が反転する。
 */
import { positionKey, WIDTH } from "./board.js"

/** そこまでの手順 (列番号) と、その局面の手番側から見た勝敗 */
export type BookEntry = { moves: readonly number[]; value: number }

export const OPENINGS: readonly BookEntry[] = [
  { moves: [], value: 1 },
  { moves: [3], value: -1 },
  { moves: [2], value: 0 },
  { moves: [4], value: 0 },
  { moves: [0], value: 1 },
  { moves: [1], value: 1 },
  { moves: [5], value: 1 },
  { moves: [6], value: 1 },
]

/** 手順を「列ごとに下から並べた石 (1 = 手番側, 2 = 相手)」に直す */
const columnsAfter = (moves: readonly number[]): number[][] => {
  const columns: number[][] = Array.from({ length: WIDTH }, () => [])

  moves.forEach((col, ply) => {
    columns[col]?.push(ply % 2 === moves.length % 2 ? 1 : 2)
  })

  return columns
}

const BOOK = new Map(
  OPENINGS.map(({ moves, value }) => [positionKey(columnsAfter(moves)), value])
)

/** 定石表にある局面なら勝敗 (-1 / 0 / 1)、無ければ undefined */
export const bookValue = (key: number): number | undefined => BOOK.get(key)

/** 表に入っている局面数 (左右反転で同一視されるので手順の数より少ない) */
export const BOOK_SIZE = BOOK.size
