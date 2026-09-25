/**
 * テスト専用の正解役。無限デッキのブラックジャックで各アクションの厳密な期待値を計算する。パッケージには含めない。
 * ルール: S17 / ディーラー peek 済み (ディーラー BJ でない条件付き) / 最初の 2 枚ならダブル可 / DAS /
 * A 以外は 4 ハンドまでリスプリット / A スプリットは 1 枚ずつ / サレンダーなし。
 * 攻略表 (src/strategy.ts) が正しいかは、ここと全ハンドで突き合わせて保証する。
 */

/** 1 = A、10 = 10/J/Q/K */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** 無限デッキなので引いたカードで確率は変わらない。10 点札は 10/J/Q/K の 4 ランク分 */
export const rankProb = (rank: Rank): number => (rank === 10 ? 4 / 13 : 1 / 13)

export const MAX_HANDS = 4

/** A を 1 として数えた合計と、A を含むか。値 (value) はここから決まる */
export type Hand = { hard: number; hasAce: boolean }

export const handValue = ({ hard, hasAce }: Hand): number =>
  hasAce && hard + 10 <= 21 ? hard + 10 : hard

export const isSoft = (hand: Hand): boolean => handValue(hand) !== hand.hard

export const addCard = (hand: Hand, rank: Rank): Hand => ({
  hard: hand.hard + rank,
  hasAce: hand.hasAce || rank === 1,
})

export const handOf = (ranks: readonly Rank[]): Hand =>
  ranks.reduce<Hand>(addCard, { hard: 0, hasAce: false })

// --- ディーラー ---

/** ディーラーの最終結果の確率。添字 0..4 = 17..21、5 = バースト */
export type DealerDist = readonly number[]

const BUST = 5
const dealerMemo = new Map<string, DealerDist>()

const dealerFrom = (hand: Hand): DealerDist => {
  const value = handValue(hand)

  if (hand.hard > 21) return [0, 0, 0, 0, 0, 1]
  // S17: ソフト 17 でも止まる
  if (value >= 17) return [0, 1, 2, 3, 4].map((i) => (i === value - 17 ? 1 : 0))

  const key = `${hand.hard}:${hand.hasAce}`
  const cached = dealerMemo.get(key)

  if (cached) return cached

  const dist = RANKS.reduce<number[]>(
    (acc, rank) => {
      const next = dealerFrom(addCard(hand, rank))

      return acc.map((p, i) => p + rankProb(rank) * (next[i] ?? 0))
    },
    [0, 0, 0, 0, 0, 0]
  )

  dealerMemo.set(key, dist)

  return dist
}

/** peek でディーラー BJ が無いと分かっているので、ホールカードは BJ を完成させないランクに条件付ける */
export const dealerDist = (upcard: Rank): DealerDist => {
  const forbidden: Rank | null = upcard === 1 ? 10 : upcard === 10 ? 1 : null
  const allowed = RANKS.filter((rank) => rank !== forbidden)
  const total = allowed.reduce((sum, rank) => sum + rankProb(rank), 0)
  const up = handOf([upcard])

  return allowed.reduce<number[]>(
    (acc, hole) => {
      const next = dealerFrom(addCard(up, hole))

      return acc.map((p, i) => p + (rankProb(hole) / total) * (next[i] ?? 0))
    },
    [0, 0, 0, 0, 0, 0]
  )
}

// --- プレイヤー (1 ハンド) ---

/** バーストしていない value でスタンドしたときの期待値 (賭け金 1 あたり) */
export const standEv = (value: number, upcard: Rank): number => {
  const dist = dealerDist(upcard)
  const bust = dist[BUST] ?? 0

  return [17, 18, 19, 20, 21].reduce((ev, dealerValue, i) => {
    const p = dist[i] ?? 0

    if (value > dealerValue) return ev + p
    if (value < dealerValue) return ev - p

    return ev
  }, bust)
}

const drawEv = (hand: Hand, evAfter: (next: Hand) => number): number =>
  RANKS.reduce((sum, rank) => {
    const next = addCard(hand, rank)

    return sum + rankProb(rank) * (next.hard > 21 ? -1 : evAfter(next))
  }, 0)

const hitMemo = new Map<string, number>()

/** 1 枚引いて、その後は hit / stand の良い方を続けたときの期待値 (ダブルは 2 枚目以降できない) */
export const hitEv = (hand: Hand, upcard: Rank): number => {
  const key = `${hand.hard}:${hand.hasAce}:${upcard}`
  const cached = hitMemo.get(key)

  if (cached !== undefined) return cached

  const ev = drawEv(hand, (next) => afterHitEv(next, upcard))

  hitMemo.set(key, ev)

  return ev
}

const afterHitEv = (hand: Hand, upcard: Rank): number =>
  Math.max(standEv(handValue(hand), upcard), hitEv(hand, upcard))

export const doubleEv = (hand: Hand, upcard: Rank): number =>
  2 * drawEv(hand, (next) => standEv(handValue(next), upcard))

/** 2 枚のハンドをスプリットせずに最善に打ったときの期待値 */
export const unsplitEv = (hand: Hand, upcard: Rank): number =>
  Math.max(
    standEv(handValue(hand), upcard),
    hitEv(hand, upcard),
    doubleEv(hand, upcard)
  )

// --- スプリット ---

/**
 * pair が出たときにリスプリットするか。optimal = 割る / 割らないの良い方 (正解役の既定)、
 * always = 枠がある限り必ず割る (Wizard of Odds の公開表がこの前提で、照合に使う)
 */
export type ResplitPolicy = "optimal" | "always"

export type SplitContext = {
  /** 割る前の全ハンド数 (リスプリットの上限 MAX_HANDS と比べる) */
  hands: number
  /** このハンドより後に控えている、pair 1 枚だけの未処理ハンド数。上限を共有するので期待値に効く */
  laterPending: number
  resplit: ResplitPolicy
}

const FIRST_SPLIT: SplitContext = {
  hands: 1,
  laterPending: 0,
  resplit: "optimal",
}

/**
 * pair 1 枚だけの未処理ハンドが pending 個、全ハンド数が hands のときの、それら全部の期待値の和。
 * 無限デッキでは各ハンドの期待値が他のハンドのカードに依存しないので、ハンドごとの和に分解できる。
 */
const pendingEv = (
  pair: Rank,
  upcard: Rank,
  pending: number,
  hands: number,
  resplit: ResplitPolicy
): number => {
  if (pending === 0) return 0

  const base = handOf([pair])
  const rest = pendingEv(pair, upcard, pending - 1, hands, resplit)

  if (pair === 1) {
    // A スプリットは 1 枚ずつ配って終わり (リスプリットもダブルも不可)
    return drawEv(base, (next) => standEv(handValue(next), upcard)) + rest
  }

  return RANKS.reduce((sum, rank) => {
    const keep = unsplitEv(addCard(base, rank), upcard) + rest

    if (rank !== pair || hands >= MAX_HANDS) return sum + rankProb(rank) * keep

    const again = pendingEv(pair, upcard, pending + 1, hands + 1, resplit)
    const ev = resplit === "always" ? again : Math.max(keep, again)

    return sum + rankProb(rank) * ev
  }, 0)
}

/**
 * 手元の pair を割ったときの期待値。割った 2 ハンドと、後続の未処理ハンドの期待値の和。
 * 後続ハンドを含むので、比較相手は同じ context の keepEv。
 */
export const splitEv = (
  pair: Rank,
  upcard: Rank,
  { hands, laterPending, resplit }: SplitContext = FIRST_SPLIT
): number => pendingEv(pair, upcard, laterPending + 2, hands + 1, resplit)

/** splitEv と比較するための「割らない」側の期待値 (後続ハンドを含む) */
export const keepEv = (
  pair: Rank,
  upcard: Rank,
  { hands, laterPending, resplit }: SplitContext = FIRST_SPLIT
): number =>
  unsplitEv(handOf([pair, pair]), upcard) +
  pendingEv(pair, upcard, laterPending, hands, resplit)
