/**
 * テスト専用。state に対して期待値が最大になる手の集合を reference/ev.ts から求める。
 */
import type { Card, Move } from "../src/schema.js"
import {
  doubleEv,
  handOf,
  handValue,
  hitEv,
  keepEv,
  MAX_HANDS,
  type Rank,
  splitEv,
  standEv,
} from "./ev.js"

/** 同点とみなす幅。浮動小数の丸めで差が出る程度 */
const TIE_EPSILON = 1e-12

export const rankOf = (card: Card): Rank => {
  if (card === "A") return 1
  if (card === "J" || card === "Q" || card === "K") return 10

  return Number(card) as Rank
}

/**
 * 打てる手ごとの期待値。split は後続ハンドを含む値になるので、
 * 他の手には同じ後続ハンドの期待値を足した keepEv 基準で比べる (差だけが意味を持つ)。
 * laterPending はこのハンドの後に控えている未処理ハンド数 (0 .. hands - 1)。
 */
export const moveEvs = (
  hand: readonly Card[],
  dealer: Card,
  hands: number,
  laterPending: number
): Partial<Record<Move, number>> => {
  const ranks = hand.map(rankOf)
  const upcard = rankOf(dealer)
  const h = handOf(ranks)
  const isTwoCards = ranks.length === 2
  const evs: Partial<Record<Move, number>> = {
    stand: standEv(handValue(h), upcard),
    hit: hitEv(h, upcard),
    ...(isTwoCards ? { double: doubleEv(h, upcard) } : {}),
  }
  const [first, second] = ranks

  if (!isTwoCards || first !== second || hands >= MAX_HANDS || !first) {
    return evs
  }

  const context = { hands, laterPending, resplit: "optimal" as const }
  const keepBest = Math.max(...Object.values(evs))

  // 割らない側の最善 (keepBest) と keepEv の差は後続ハンド分の定数なので、split も同じ基準に揃える
  return {
    ...evs,
    split:
      keepBest +
      splitEv(first, upcard, context) -
      keepEv(first, upcard, context),
  }
}

export const optimalMoves = (
  hand: readonly Card[],
  dealer: Card,
  hands: number,
  laterPending: number
): Move[] => {
  const evs = Object.entries(moveEvs(hand, dealer, hands, laterPending)) as [
    Move,
    number,
  ][]
  const best = Math.max(...evs.map(([, ev]) => ev))

  return evs.filter(([, ev]) => ev >= best - TIE_EPSILON).map(([move]) => move)
}
