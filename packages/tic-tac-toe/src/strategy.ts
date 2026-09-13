import {
  bit,
  cellsOf,
  emptyMask,
  forkCells,
  hasLine,
  lowestCell,
  maskOf,
  popcount,
  winningCells,
} from "./bitboard.js"
import { type Move, parseState, type State } from "./schema.js"

/**
 * 攻略法 (Newell & Simon の 8 ルール) だけでは、相手が定石を外した後の局面で最善を逃す
 * (全 4520 局面中 49 局面)。そこで次の補正を入れてある:
 * - 「連続リーチ」: 相手が受けるしかない手を続けて両取りに持ち込む (五目並べの VCF と同じ考え方)
 * - 「両取りの芽」: 両取りできるマスを 2 つ作り、どちらも受け切れなくする
 * - 守りは「その手の後に相手の上記の勝ち筋が残らない手」から、中央・対角の隅・隅・辺の順で選ぶ
 *
 * いずれも受けが 1 通りに決まる手順と、芽が 2 つある局面での受けしか辿らないので、全幅探索にはならない。
 */

const CENTER = 4
const CORNERS = [0, 2, 6, 8] as const
const OPPOSITE_CORNER = 8

/** me の手番で、連続リーチまたは両取りの芽によって勝ちが確定しているか */
const hasForcedWin = (me: number, you: number): boolean => {
  if (hasLine(you)) return false
  if (hasLine(me) || winningCells(me, you) !== 0) return true

  const yourThreats = winningCells(you, me)

  // 相手のリーチが 2 つあれば受け切れない
  if (popcount(yourThreats) >= 2) return false
  if (yourThreats !== 0) return moveForcesWin(me, you, yourThreats)

  return cellsOf(emptyMask(me, you)).some((cell) =>
    moveForcesWin(me, you, bit(cell))
  )
}

/** me が move (1bit のマスク) に置くと勝ちが確定するか */
const moveForcesWin = (me: number, you: number, move: number): boolean => {
  const next = me | move

  // 置いても相手に即勝ちが残るなら、こちらのリーチは間に合わない
  if (winningCells(you, next) !== 0) return false

  const threats = winningCells(next, you)

  if (popcount(threats) >= 2) return true
  // リーチ 1 つ: 相手はそこを受けるしかないので、受けた後にまた自分の手番で続きを見る
  if (threats !== 0) return hasForcedWin(next, you | threats)
  if (popcount(forkCells(next, you)) < 2) return false

  // 両取りの芽が 2 つ: 相手のどの受けに対しても勝ちが残るか
  return cellsOf(emptyMask(next, you)).every((cell) =>
    hasForcedWin(next, you | bit(cell))
  )
}

/** 攻略法の優先順: 中央 → 相手の隅の対角 → 隅 → 辺 */
const preferred = (cells: readonly number[], you: number): number => {
  if (cells.includes(CENTER)) return CENTER

  const opposite = CORNERS.map((corner) => OPPOSITE_CORNER - corner).find(
    (corner) =>
      cells.includes(corner) && (you & bit(OPPOSITE_CORNER - corner)) !== 0
  )

  if (opposite !== undefined) return opposite

  const corner = CORNERS.find((cell) => cells.includes(cell))

  if (corner !== undefined) return corner

  const [first] = cells

  if (first === undefined) throw new Error("no empty cell to choose from")

  return first
}

const chooseMove = (me: number, you: number): number => {
  const wins = winningCells(me, you)

  if (wins !== 0) return lowestCell(wins)

  const blocks = winningCells(you, me)

  if (blocks !== 0) return lowestCell(blocks)

  const empties = cellsOf(emptyMask(me, you))
  const attack = empties.find((cell) => moveForcesWin(me, you, bit(cell)))

  if (attack !== undefined) return attack

  const safe = empties.filter((cell) => !hasForcedWin(you, me | bit(cell)))

  // 安全な手が無い = 既に負けている局面。どこに置いても結果は同じなので攻略法の優先順で選ぶ
  return preferred(safe.length > 0 ? safe : empties, you)
}

/**
 * 最善手を 1 つ返す。完全読みと同じ勝敗 (勝てる局面は勝ち切り、引分の局面は負けない) になる手を選ぶ。
 * 終局していて指す手が無ければ null。実戦で現れない局面は例外を投げる。
 */
export const bestMove = (input: State): Move | null => {
  const { board, turn } = parseState(input)
  const me = maskOf(board, turn)
  const you = maskOf(board, turn === "x" ? "o" : "x")

  if (hasLine(me) || hasLine(you) || emptyMask(me, you) === 0) return null

  return chooseMove(me, you)
}
