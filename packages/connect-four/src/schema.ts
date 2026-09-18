import { z } from "zod"
import { BOARD_LENGTH, boardIndex, HEIGHT, LINES, WIDTH } from "./board.js"

export { BOARD_LENGTH, HEIGHT, WIDTH }

/** r (赤) が先手 */
export const playerSchema = z.enum(["r", "y"])
/** 空きマスは null */
export const cellSchema = z.union([playerSchema, z.null()])
/** 盤面は左上から右下へ 0..41 の 1 次元配列 (7x6 を row-major に潰したもの) */
export const boardSchema = z.array(cellSchema).length(BOARD_LENGTH)
/** 指す手は「どの列に落とすか」なので列番号 (左端が 0) */
export const moveSchema = z
  .number()
  .int()
  .min(0)
  .max(WIDTH - 1)

export type Player = z.infer<typeof playerSchema>
export type Cell = z.infer<typeof cellSchema>
export type Board = z.infer<typeof boardSchema>
export type Move = z.infer<typeof moveSchema>

export const opponent = (player: Player): Player => (player === "r" ? "y" : "r")

const countOf = (board: Board, player: Player): number =>
  board.filter((cell) => cell === player).length

export const hasLine = (board: Board, player: Player): boolean =>
  LINES.some((line) => line.every((index) => board[index] === player))

/** 列ごとの石を下から並べ直す。宙に浮いた石があれば null (重力に反するので盤面として無効) */
export const stacksOf = (board: Board): Player[][] | null => {
  const stacks: Player[][] = []

  for (let col = 0; col < WIDTH; col += 1) {
    const column = Array.from(
      { length: HEIGHT },
      (_, row) => board[boardIndex(col, row)] ?? null
    )
    const stones = column.filter((cell): cell is Player => cell !== null)

    if (column.slice(0, stones.length).some((cell) => cell === null))
      return null

    stacks.push(stones)
  }

  return stacks
}

const boardOf = (stacks: readonly (readonly Player[])[]): Board => {
  const board: Board = Array<Cell>(BOARD_LENGTH).fill(null)

  stacks.forEach((stack, col) => {
    stack.forEach((stone, row) => {
      board[boardIndex(col, row)] = stone
    })
  })

  return board
}

/**
 * 石を 1 つずつ置いていく順番が作れるか。置けるのは各列の一番上だけなので、
 * 「各列を下から何個置いたか」を状態にして深さ優先で探す (手番の色は置いた総数で決まる)。
 * 貪欲では足りない: 同じ色でもどの列に置くかで、その上に載る石が置けるかどうかが変わる。
 *
 * 状態は列ごとの個数の組だけなので、高々 (HEIGHT + 1)^WIDTH 通りしかない。
 */
const isOrderable = (stacks: readonly (readonly Player[])[]): boolean => {
  const total = stacks.reduce((sum, stack) => sum + stack.length, 0)
  const placed = stacks.map(() => 0)
  const failed = new Set<number>()
  const codeOf = () =>
    placed.reduce((code, count, col) => code + count * (HEIGHT + 1) ** col, 0)

  const visit = (ply: number): boolean => {
    if (ply === total) return true

    const code = codeOf()

    if (failed.has(code)) return false

    const need: Player = ply % 2 === 0 ? "r" : "y"

    for (let col = 0; col < stacks.length; col += 1) {
      if (stacks[col]?.[placed[col] ?? 0] !== need) continue

      placed[col] = (placed[col] ?? 0) + 1

      if (visit(ply + 1)) return true

      placed[col] = (placed[col] ?? 0) - 1
    }

    failed.add(code)

    return false
  }

  return visit(0)
}

/** refine のコールバックは stateSchema より前に書くので、State ではなくこの形で受ける */
type Position = { board: Board; turn: Player }

/** r が先手なので、石数と手番は連動する */
const hasConsistentStoneCount = ({ board, turn }: Position): boolean => {
  const diff = countOf(board, "r") - countOf(board, "y")

  return turn === "r" ? diff === 0 : diff === 1
}

/**
 * 実戦で現れない局面を弾く (stateSchema から使う。テストからも直接呼ぶ)。三目並べと違って重力と着手順の制約があるので、次の 4 つを見る。
 * - 宙に浮いた石が無い
 * - 両者とも 4 連を持つ局面は無い (揃った時点で終局)
 * - 4 連があるなら、それを作ったのは直前に指した側。その 1 手を取り除ける形でなければならない
 * - 残りの石を下から順に、赤・黄と交互に置いていける並びが存在する
 */
export const isReachable = ({ board, turn }: Position): boolean => {
  const stacks = stacksOf(board)

  if (stacks === null) return false

  const winners = (["r", "y"] as const).filter((player) =>
    hasLine(board, player)
  )

  if (winners.length > 1) return false

  const [winner] = winners

  if (winner === undefined) return isOrderable(stacks)
  // 揃えた側に手番は回らない
  if (turn === winner) return false

  // 最後の 1 手 (= どこかの列の一番上にある winner の石) を戻すと 4 連が消える形か
  return stacks.some((stack, col) => {
    if (stack.at(-1) !== winner) return false

    const removed = stacks.map((other, index) =>
      index === col ? other.slice(0, -1) : other
    )

    return !hasLine(boardOf(removed), winner) && isOrderable(removed)
  })
}

export const stateSchema = z
  .object({
    board: boardSchema,
    turn: playerSchema,
  })
  .refine(hasConsistentStoneCount, {
    message: "stone count does not match the turn (r moves first)",
    abort: true,
  })
  .refine(isReachable, {
    message: "position cannot arise in a real game",
  })

export type State = z.infer<typeof stateSchema>

export const emptyBoard = (): Board => Array<Cell>(BOARD_LENGTH).fill(null)

export const initialState = (): State => ({ board: emptyBoard(), turn: "r" })

export const parseState = (input: unknown): State => {
  const parsed = stateSchema.safeParse(input)

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join(", ")

    throw new Error(`invalid connect four state: ${detail}`)
  }

  return parsed.data
}
