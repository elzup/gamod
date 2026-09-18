import { HEIGHT } from "./board.js"
import { bookValue } from "./book.js"
import {
  hasLine,
  type Move,
  parseState,
  type State,
  stacksOf,
} from "./schema.js"
import { createSolver, type Solver } from "./solver.js"

/** 置換表を使い回したいので solver は 1 つだけ。最初に呼ばれるまで表は確保しない */
let shared: Solver | null = null

const solver = (): Solver => {
  shared ??= createSolver({ book: bookValue })

  return shared
}

/**
 * 最善手 (落とす列) を 1 つ返す。完全読みと同じ勝敗になる手のうち、最も中央に近いものを選ぶ。
 * 決着済み・満杯で指す手が無ければ null。実戦で現れない局面は例外を投げる。
 *
 * 終盤は一瞬で返るが、序盤 (定石表に無く、石が十数個以下) は読みが重く時間がかかる。
 */
export const bestMove = (input: State): Move | null => {
  const { board, turn } = parseState(input)

  if (hasLine(board, "r") || hasLine(board, "y")) return null

  const stacks = stacksOf(board)

  // parseState を通っているので stacks は必ず取れる
  if (stacks === null)
    throw new Error("invalid connect four state: floating stone")
  if (stacks.every((stack) => stack.length === HEIGHT)) return null

  return solver().bestMove(
    stacks.map((stack) => stack.map((stone) => (stone === turn ? 1 : 2)))
  )
}
