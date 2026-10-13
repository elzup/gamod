import { type Move, parseState, type StateInput } from "./schema.js"

/**
 * 攻略法 (Bouton 1901)。全ての山の個数の XOR (ニム和) が 0 の局面を相手に渡し続ければ勝てる。
 * - normal: ニム和が 0 でなければ、ある山を減らしてニム和を 0 にできる
 * - misere: 2 個以上の山が 2 つ以上あるうちは normal と同じ手。2 個以上の山が残り 1 つになったら、
 *   その山を 0 個か 1 個にして「1 個の山が奇数個」の形で渡す (相手が最後の 1 個を取ることになる)
 */

const nimSum = (heaps: readonly number[]): number =>
  heaps.reduce((sum, size) => sum ^ size, 0)

const largestHeap = (heaps: readonly number[]): number =>
  heaps.reduce(
    (largest, size, heap) => (size > (heaps[largest] ?? 0) ? heap : largest),
    0
  )

/**
 * 負けが確定している局面で指す手。どう取っても勝敗は同じなので、
 * 最大の山から 1 個だけ取って対局を長引かせる (相手が間違える余地を残す)。
 */
const stall = (heaps: readonly number[]): Move => ({
  heap: largestHeap(heaps),
  take: 1,
})

const normalMove = (heaps: readonly number[]): Move => {
  const sum = nimSum(heaps)

  if (sum === 0) return stall(heaps)

  // ニム和の最上位ビットが立っている山は size ^ sum が必ず size より小さくなる
  const heap = heaps.findIndex((size) => (size ^ sum) < size)
  const size = heaps[heap]

  if (size === undefined) throw new Error("no heap can zero the nim-sum")

  return { heap, take: size - (size ^ sum) }
}

const misereMove = (heaps: readonly number[]): Move => {
  const bigHeaps = heaps.filter((size) => size > 1)

  if (bigHeaps.length >= 2) return normalMove(heaps)
  // 1 個の山しか残っていなければ 1 個ずつ取るしかなく、手の選びようが無い
  if (bigHeaps.length === 0) return stall(heaps)

  const heap = heaps.findIndex((size) => size > 1)
  const size = heaps[heap]

  if (size === undefined) throw new Error("the only big heap is missing")

  const singles = heaps.filter((single) => single === 1).length
  const leave = singles % 2 === 0 ? 1 : 0

  return { heap, take: size - leave }
}

/**
 * 最善手を 1 つ返す。完全読みと同じ勝敗になる手 (勝てる局面は必ず勝ち切る手) を選ぶ。
 * 全ての山が空で指す手が無ければ null。
 */
export const bestMove = (input: StateInput): Move | null => {
  const { heaps, rule } = parseState(input)

  if (heaps.every((size) => size === 0)) return null

  return rule === "normal" ? normalMove(heaps) : misereMove(heaps)
}
