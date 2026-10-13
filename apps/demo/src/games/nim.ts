import {
  bestMove,
  initialState,
  type Move,
  type Rule,
  type State,
} from "@gamod/nim"
import { type Demo, el } from "../demo.js"
import { getLocale, type Locale } from "../i18n.js"

const TEXT = {
  players: {
    ja: ["先手", "後手"],
    en: ["Player 1", "Player 2"],
  },
  turn: {
    ja: "の手番 — 枠の付いた石が最善手 (石を押すと、その石から右を取る)",
    en: " to move — the highlighted stones are the best move (click a stone to take it and everything to its right)",
  },
  win: { ja: "の勝ち", en: " wins" },
  heap: { ja: "山", en: "Heap" },
  reset: { ja: "最初から", en: "Reset" },
  shuffle: { ja: "ランダムな山", en: "Random heaps" },
  auto: { ja: "最善手を指させる", en: "Play the best move" },
  rule: {
    normal: { ja: "ルール: 最後を取ったら勝ち", en: "Rule: last stone wins" },
    misere: { ja: "ルール: 最後を取ったら負け", en: "Rule: last stone loses" },
  },
} as const

const RANDOM_HEAP_COUNTS = [3, 4] as const
/** 1 行に収まり、かつ手を読むのが面倒にならない程度の大きさ */
const RANDOM_MAX_SIZE = 7

type Player = 0 | 1

type Game = { state: State; mover: Player }

const newGame = (heaps: number[], rule: Rule): Game => ({
  state: { heaps, rule },
  mover: 0,
})

const randomInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1))

const randomHeaps = (): number[] => {
  const count = RANDOM_HEAP_COUNTS[randomInt(0, RANDOM_HEAP_COUNTS.length - 1)]

  return Array.from({ length: count ?? RANDOM_HEAP_COUNTS[0] }, () =>
    randomInt(1, RANDOM_MAX_SIZE)
  )
}

/** パッケージは最善手しか返さないので、対局の進行 (取る・勝敗) はデモ側で持つ */
const isOver = ({ heaps }: State): boolean => heaps.every((size) => size === 0)

const take = ({ state, mover }: Game, { heap, take }: Move): Game => ({
  state: {
    ...state,
    heaps: state.heaps.map((size, index) =>
      index === heap ? size - take : size
    ),
  },
  mover: mover === 0 ? 1 : 0,
})

/** 終局時点の mover は「最後の 1 個を取られた側」 */
const winnerOf = ({ state, mover }: Game): Player => {
  const lastTaker: Player = mover === 0 ? 1 : 0

  return state.rule === "normal" ? lastTaker : mover
}

const statusText = (game: Game, locale: Locale): string =>
  isOver(game.state)
    ? `${TEXT.players[locale][winnerOf(game)]}${TEXT.win[locale]}`
    : `${TEXT.players[locale][game.mover]}${TEXT.turn[locale]}`

const stoneLabel = (heap: number, count: number, locale: Locale): string =>
  locale === "ja"
    ? `${TEXT.heap.ja} ${heap + 1} から ${count} 個取る`
    : `Take ${count} from heap ${heap + 1}`

// 言語切替で再 mount されても対局を失わないよう、対局はモジュールに置く
let game = newGame(initialState().heaps, "normal")

export const nimDemo: Demo = {
  pkg: "@gamod/nim",
  title: { ja: "ニム", en: "Nim" },
  summary: {
    ja: "ニム和 (山の個数の XOR) の攻略法で最善手を返す。最後を取ったら勝ち・負けの両ルールに対応し、完全読みと同じ勝敗になることをテストで保証。",
    en: "Returns the best move via the nim-sum (XOR of heap sizes) strategy for both normal and misère play, tested to match exhaustive search.",
  },
  snippet: `import { bestMove } from "@gamod/nim"

bestMove({ heaps: [3, 4, 5] }) // => { heap: 0, take: 2 }
bestMove({ heaps: [1, 5, 1], rule: "misere" }) // => { heap: 1, take: 4 }`,

  mount(root) {
    const locale = getLocale()
    const heaps = el("div", { class: "nim-heaps" })
    const status = el("p", { class: "status" })
    const controls = el("div", { class: "controls" })
    const ruleButton = el("button", { type: "button" })

    const play = (move: Move) => {
      game = take(game, move)
      render()
    }

    const heapRow = (size: number, heap: number, best: Move | null) => {
      const bestFrom = best?.heap === heap ? size - best.take : size
      const stones = Array.from({ length: size }, (_, index) => {
        const count = size - index
        const stone = el("button", {
          type: "button",
          class: `nim-stone${index >= bestFrom ? " best" : ""}`,
          "aria-label": stoneLabel(heap, count, locale),
        })

        stone.addEventListener("click", () => play({ heap, take: count }))

        return stone
      })

      return el("div", { class: "nim-row" }, [
        el("span", { class: "nim-label" }, [
          `${TEXT.heap[locale]} ${heap + 1}`,
        ]),
        el("div", { class: "nim-stones" }, stones),
        el("span", { class: "nim-count" }, [String(size)]),
      ])
    }

    const render = () => {
      const best = bestMove(game.state)

      heaps.replaceChildren(
        ...game.state.heaps.map((size, heap) => heapRow(size, heap, best))
      )
      status.textContent = statusText(game, locale)
      ruleButton.textContent = TEXT.rule[game.state.rule][locale]
    }

    const reset = el("button", { type: "button" }, [TEXT.reset[locale]])

    reset.addEventListener("click", () => {
      game = newGame(initialState().heaps, game.state.rule)
      render()
    })

    const shuffle = el("button", { type: "button" }, [TEXT.shuffle[locale]])

    shuffle.addEventListener("click", () => {
      game = newGame(randomHeaps(), game.state.rule)
      render()
    })

    const auto = el("button", { type: "button" }, [TEXT.auto[locale]])

    auto.addEventListener("click", () => {
      const move = bestMove(game.state)

      if (move !== null) play(move)
    })

    ruleButton.addEventListener("click", () => {
      const rule: Rule = game.state.rule === "normal" ? "misere" : "normal"

      game = { ...game, state: { ...game.state, rule } }
      render()
    })

    controls.replaceChildren(reset, shuffle, auto, ruleButton)
    root.replaceChildren(heaps, status, controls)
    render()
  },
}
