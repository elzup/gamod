/**
 * ブラックジャック 1 ラウンドの進行。パッケージは最善手しか返さないので、配札・ディーラーの手番・精算はデモ側で持つ。
 * パッケージと同じ前提: 無限デッキ / S17 / peek / BJ 3:2 / DAS / 4 ハンドまでスプリット / A スプリットは 1 枚ずつ。
 */
import {
  type Card,
  cardSchema,
  cardValue,
  MAX_HANDS,
  type Move,
  type StateInput,
  totalOf,
} from "@gamod/blackjack"

export type Cards = StateInput["hand"]

export type Hand = {
  cards: Cards
  /** ダブルしたハンドは賭け金が 2 倍 */
  isDoubled: boolean
  isDone: boolean
}

export type Round = {
  dealer: Cards
  hands: Hand[]
  active: number
  isOver: boolean
}

const DEALER_STANDS_AT = 17
const NATURAL_PAYOUT = 1.5

/** 無限デッキなので毎回 13 ランクから一様に引く */
const draw = (): Card => {
  const ranks = cardSchema.options

  return ranks[Math.floor(Math.random() * ranks.length)] ?? "A"
}

const isNatural = (cards: readonly Card[]): boolean =>
  cards.length === 2 && totalOf(cards).value === 21

const isBust = (cards: readonly Card[]): boolean => totalOf(cards).value > 21

const newHand = (cards: Cards): Hand => ({
  cards,
  isDoubled: false,
  isDone: isBust(cards),
})

export const deal = (): Round => {
  const dealer: Cards = [draw(), draw()]
  const player: Cards = [draw(), draw()]
  // peek でディーラー BJ なら即終了。プレイヤーのナチュラルも打つ手が無いので終了
  const isOver = isNatural(dealer) || isNatural(player)

  return { dealer, hands: [newHand(player)], active: 0, isOver }
}

const playDealer = (dealer: Cards): Cards =>
  totalOf(dealer).value >= DEALER_STANDS_AT
    ? dealer
    : playDealer([...dealer, draw()])

/** 次の未完了ハンドへ進む。全部終わっていて、バーストしていないハンドがあればディーラーが引く */
const advance = (round: Round): Round => {
  const next = round.hands.findIndex((hand) => !hand.isDone)

  if (next !== -1) return { ...round, active: next }

  const needsDealer = round.hands.some((hand) => !isBust(hand.cards))

  return {
    ...round,
    dealer: needsDealer ? playDealer(round.dealer) : round.dealer,
    isOver: true,
  }
}

const splitHand = ([first, second]: Cards): Hand[] => {
  const isAces = first === "A"
  const hands = [newHand([first, draw()]), newHand([second, draw()])]

  // A スプリットは 1 枚ずつ配って終わり
  return isAces ? hands.map((hand) => ({ ...hand, isDone: true })) : hands
}

const applyToHand = (hand: Hand, move: Exclude<Move, "split">): Hand => {
  if (move === "stand") return { ...hand, isDone: true }

  const cards: Cards = [...hand.cards, draw()]

  if (move === "double") return { cards, isDoubled: true, isDone: true }

  return { ...hand, cards, isDone: isBust(cards) }
}

export const play = (round: Round, move: Move): Round => {
  const hand = round.hands[round.active]

  if (round.isOver || hand === undefined) return round

  const replaced =
    move === "split" ? splitHand(hand.cards) : [applyToHand(hand, move)]
  const hands = [
    ...round.hands.slice(0, round.active),
    ...replaced,
    ...round.hands.slice(round.active + 1),
  ]

  return advance({ ...round, hands })
}

export const legalMoves = (round: Round): Move[] => {
  const hand = round.hands[round.active]

  if (round.isOver || hand === undefined) return []

  const [first, second, ...rest] = hand.cards
  const isTwoCards = rest.length === 0
  const isPair = isTwoCards && cardValue(first) === cardValue(second)
  const canSplit = isPair && round.hands.length < MAX_HANDS

  return [
    "hit",
    "stand",
    ...(isTwoCards ? (["double"] as const) : []),
    ...(canSplit ? (["split"] as const) : []),
  ]
}

/** 賭け金 1 あたりの損益。ナチュラルは 1 ハンドのときだけ (スプリット後の 21 は普通の 21) */
export const payoutOf = (round: Round, hand: Hand): number => {
  const bet = hand.isDoubled ? 2 : 1
  const player = totalOf(hand.cards).value
  const dealer = totalOf(round.dealer).value
  const isPlayerNatural = round.hands.length === 1 && isNatural(hand.cards)

  if (isNatural(round.dealer)) return isPlayerNatural ? 0 : -1
  if (isPlayerNatural) return NATURAL_PAYOUT
  if (player > 21) return -bet
  if (dealer > 21 || player > dealer) return bet

  return player === dealer ? 0 : -bet
}

export const totalPayout = (round: Round): number =>
  round.hands.reduce((sum, hand) => sum + payoutOf(round, hand), 0)
