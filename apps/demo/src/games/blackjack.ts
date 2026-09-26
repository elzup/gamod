import {
  bestMove,
  type Card,
  HAND_COUNTS,
  type HandCount,
  type Move,
  totalOf,
} from "@gamod/blackjack"
import { type Demo, el } from "../demo.js"
import { getLocale, type Locale } from "../i18n.js"
import {
  deal,
  type Hand,
  legalMoves,
  payoutOf,
  play,
  type Round,
  totalPayout,
} from "./blackjackRound.js"

const MOVES: readonly Move[] = ["hit", "stand", "double", "split"]

const TEXT = {
  dealer: { ja: "ディーラー", en: "Dealer" },
  player: { ja: "あなた", en: "You" },
  best: {
    ja: "枠の付いたボタンが最善手 (期待値最大)",
    en: "The highlighted button is the best move (highest expected value)",
  },
  result: { ja: "このラウンド", en: "This round" },
  session: { ja: "通算", en: "Session" },
  rounds: { ja: "ラウンド", en: "rounds" },
  deal: { ja: "新しく配る", en: "Deal" },
  auto: { ja: "最善手を打たせる", en: "Play the best move" },
  moves: {
    hit: { ja: "ヒット", en: "Hit" },
    stand: { ja: "スタンド", en: "Stand" },
    double: { ja: "ダブル", en: "Double" },
    split: { ja: "スプリット", en: "Split" },
  },
} as const

// 言語切替で再 mount されてもラウンドと通算成績を失わないよう、モジュールに置く
type Session = { rounds: number; net: number }

let round: Round = deal()
let session: Session = { rounds: 0, net: 0 }

const settled = (current: Session, finished: Round): Session => ({
  rounds: current.rounds + 1,
  net: current.net + totalPayout(finished),
})

// 配った時点でナチュラル / ディーラー BJ なら、そのラウンドはもう終わっている
if (round.isOver) session = settled(session, round)

const formatPayout = (value: number): string =>
  value > 0 ? `+${value}` : value < 0 ? `−${-value}` : "±0"

const cardsRow = (cards: readonly (Card | "?")[]): HTMLElement =>
  el(
    "div",
    { class: "bj-cards" },
    cards.map((card) => el("span", { class: "bj-card" }, [card]))
  )

const totalLabel = (cards: readonly Card[]): string => {
  const { value, isSoft } = totalOf(cards)

  return isSoft ? `soft ${value}` : String(value)
}

const dealerRow = (locale: Locale): HTMLElement => {
  const [up] = round.dealer
  // ラウンド中はホールカードを伏せる (peek 済みなので BJ ではないことだけ分かっている)
  const shown = round.isOver ? round.dealer : [up, "?" as const]
  const total = round.isOver ? totalLabel(round.dealer) : ""

  return el("div", { class: "bj-row" }, [
    el("span", { class: "bj-label" }, [TEXT.dealer[locale]]),
    cardsRow(shown),
    el("span", { class: "bj-total" }, [total]),
  ])
}

const handRow = (hand: Hand, index: number, locale: Locale): HTMLElement => {
  const isActive = !round.isOver && index === round.active
  const label =
    round.hands.length === 1
      ? TEXT.player[locale]
      : `${TEXT.player[locale]} ${index + 1}`
  const note = round.isOver
    ? formatPayout(payoutOf(round, hand))
    : hand.isDoubled
      ? "×2"
      : ""

  return el("div", { class: `bj-row${isActive ? " active" : ""}` }, [
    el("span", { class: "bj-label" }, [label]),
    cardsRow(hand.cards),
    el("span", { class: "bj-total" }, [`${totalLabel(hand.cards)} ${note}`]),
  ])
}

const handCount = (length: number): HandCount => {
  const count = HAND_COUNTS.find((candidate) => candidate === length)

  if (count === undefined) throw new Error(`unexpected hand count: ${length}`)

  return count
}

/** 今打っているハンドの最善手。ラウンドが終わっていれば null */
const currentBest = (): Move | null => {
  const hand = round.hands[round.active]

  if (round.isOver || hand === undefined) return null

  return bestMove({
    dealer: round.dealer[0],
    hand: hand.cards,
    hands: handCount(round.hands.length),
  })
}

const statusText = (locale: Locale): string => {
  const sessionText = `${TEXT.session[locale]} ${formatPayout(session.net)} (${session.rounds} ${TEXT.rounds[locale]})`

  if (!round.isOver) return `${TEXT.best[locale]} — ${sessionText}`

  return `${TEXT.result[locale]} ${formatPayout(totalPayout(round))} — ${sessionText}`
}

/** 打った手でラウンドが終わったら通算に足す */
const advanceTo = (next: Round) => {
  if (!round.isOver && next.isOver) session = settled(session, next)
  round = next
}

/** 新しく配ったラウンドは、配った時点で終わっていても通算に足す */
const startRound = (next: Round) => {
  round = next
  if (next.isOver) session = settled(session, next)
}

export const blackjackDemo: Demo = {
  pkg: "@gamod/blackjack",
  title: { ja: "ブラックジャック", en: "Blackjack" },
  summary: {
    ja: "無限デッキの basic strategy を表引きで返す。4 枚までの全手札で厳密な期待値計算と同じ手になることをテストで保証。",
    en: "Returns infinite-deck basic strategy by table lookup, tested to match exact expected-value play on every hand of up to 4 cards.",
  },
  snippet: `import { bestMove } from "@gamod/blackjack"

bestMove({ dealer: "6", hand: ["8", "8"] }) // => "split"
bestMove({ dealer: "10", hand: ["6", "10"] }) // => "hit"`,

  mount(root) {
    const locale = getLocale()
    const table = el("div", { class: "bj-table" })
    const actions = el("div", { class: "controls" })
    const status = el("p", { class: "status" })
    const controls = el("div", { class: "controls" })

    const act = (move: Move) => {
      advanceTo(play(round, move))
      render()
    }

    const render = () => {
      const legal = legalMoves(round)
      const best = currentBest()

      table.replaceChildren(
        dealerRow(locale),
        ...round.hands.map((hand, index) => handRow(hand, index, locale))
      )
      actions.replaceChildren(
        ...MOVES.map((move) => {
          const button = el(
            "button",
            {
              type: "button",
              class: move === best ? "best" : "",
              ...(legal.includes(move) ? {} : { disabled: "" }),
            },
            [TEXT.moves[move][locale]]
          )

          button.addEventListener("click", () => act(move))

          return button
        })
      )
      status.textContent = statusText(locale)
    }

    const dealButton = el("button", { type: "button" }, [TEXT.deal[locale]])

    dealButton.addEventListener("click", () => {
      startRound(deal())
      render()
    })

    const auto = el("button", { type: "button" }, [TEXT.auto[locale]])

    auto.addEventListener("click", () => {
      const move = currentBest()

      if (move !== null) act(move)
    })

    controls.replaceChildren(dealButton, auto)
    root.replaceChildren(table, actions, status, controls)
    render()
  },
}
