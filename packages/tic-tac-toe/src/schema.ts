import { z } from "zod"
import { hasLine, maskOf } from "./bitboard.js"

/** 盤面は左上から右下へ 0..8 の 1 次元配列で表す (3x3 を row-major に潰したもの) */
export const BOARD_LENGTH = 9

export const playerSchema = z.enum(["x", "o"])
/** 空きマスは null */
export const cellSchema = z.union([playerSchema, z.null()])
export const boardSchema = z.array(cellSchema).length(BOARD_LENGTH)
export const moveSchema = z
  .number()
  .int()
  .min(0)
  .max(BOARD_LENGTH - 1)

export type Player = z.infer<typeof playerSchema>
export type Cell = z.infer<typeof cellSchema>
export type Board = z.infer<typeof boardSchema>
export type Move = z.infer<typeof moveSchema>

const countOf = (board: Board, player: Player): number =>
  board.filter((cell) => cell === player).length

/**
 * x が先手なので、石数と手番は連動する。ずれている state は
 * 「実際には到達しない局面」であり、呼び出し側のバグを黙って解くと嘘の最善手を返す。
 */
const hasConsistentStoneCount = ({
  board,
  turn,
}: {
  board: Board
  turn: Player
}): boolean => {
  const diff = countOf(board, "x") - countOf(board, "o")

  return turn === "x" ? diff === 0 : diff === 1
}

/**
 * 石数が合っていても実戦で現れない局面を弾く。三目並べではこの 3 条件で到達可能局面と完全に一致する
 * (全 19683 盤面 x 手番で総当たりしたテストで保証)。
 * - 両者とも揃っている局面は無い (揃った時点で終局)
 * - x が揃っているなら最後に指したのは x なので手番は o
 * - o が揃っているなら最後に指したのは o なので手番は x
 */
const isReachable = ({
  board,
  turn,
}: {
  board: Board
  turn: Player
}): boolean => {
  const xHasLine = hasLine(maskOf(board, "x"))
  const oHasLine = hasLine(maskOf(board, "o"))

  if (xHasLine && oHasLine) return false
  if (xHasLine) return turn === "o"
  if (oHasLine) return turn === "x"

  return true
}

export const stateSchema = z
  .object({
    board: boardSchema,
    turn: playerSchema,
  })
  .refine(hasConsistentStoneCount, {
    message: "stone count does not match the turn (x moves first)",
    abort: true,
  })
  .refine(isReachable, {
    message: "position cannot arise in a real game",
  })

export type State = z.infer<typeof stateSchema>

export const emptyBoard = (): Board => Array<Cell>(BOARD_LENGTH).fill(null)

export const initialState = (): State => ({ board: emptyBoard(), turn: "x" })

export const parseState = (input: unknown): State => {
  const parsed = stateSchema.safeParse(input)

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join(", ")

    throw new Error(`invalid tic-tac-toe state: ${detail}`)
  }

  return parsed.data
}
