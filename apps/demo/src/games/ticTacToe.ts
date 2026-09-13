import {
  bestMove,
  initialState,
  type Move,
  type Player,
  type State,
} from "@gamod/tic-tac-toe"
import { type Demo, el } from "../demo.js"
import { getLocale, type Locale } from "../i18n.js"

const MARK = { x: "×", o: "○" } as const

/** パッケージは最善手しか返さないので、対局の進行 (着手・勝敗) はデモ側で持つ */
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const

const TEXT = {
  turn: {
    ja: "の手番 — 枠の付いたマスが最善手",
    en: " to move — the highlighted cell is the best move",
  },
  win: { ja: "の勝ち", en: " wins" },
  draw: { ja: "引分", en: "Draw" },
  reset: { ja: "最初から", en: "Reset" },
  auto: { ja: "最善手を指させる", en: "Play the best move" },
} as const

const cellLabel = (index: number, cellText: string, locale: Locale): string =>
  locale === "ja"
    ? `${index + 1} 番目のマス${cellText === "" ? "" : `: ${cellText}`}`
    : `Cell ${index + 1}${cellText === "" ? "" : `: ${cellText}`}`

const winnerOf = ({ board }: State): Player | null =>
  LINES.map(([a, b, c]) =>
    board[a] !== null && board[a] === board[b] && board[a] === board[c]
      ? board[a]
      : null
  ).find((player) => player !== null) ?? null

const isOver = (state: State): boolean =>
  winnerOf(state) !== null || state.board.every((cell) => cell !== null)

const place = (state: State, move: Move): State => ({
  board: state.board.map((cell, index) => (index === move ? state.turn : cell)),
  turn: state.turn === "x" ? "o" : "x",
})

const statusText = (state: State, locale: Locale): string => {
  const winner = winnerOf(state)

  if (winner !== null) return `${MARK[winner]}${TEXT.win[locale]}`
  if (isOver(state)) return TEXT.draw[locale]

  return `${MARK[state.turn]}${TEXT.turn[locale]}`
}

// 言語切替で再 mount されても対局を失わないよう、盤面はモジュールに置く
let state = initialState()

export const ticTacToeDemo: Demo = {
  pkg: "@gamod/tic-tac-toe",
  title: { ja: "三目並べ", en: "Tic-Tac-Toe" },
  summary: {
    ja: "攻略法 (条件分岐) で最善手を返す。ありうる全 4520 局面で完全読みと同じ勝敗になることをテストで保証。",
    en: "Returns the best move via a rule-based strategy (conditionals), tested to match exhaustive search on all 4520 reachable positions.",
  },
  snippet: `import { bestMove } from "@gamod/tic-tac-toe"

bestMove({
  board: ["x", "x", null, "o", "o", null, null, null, null],
  turn: "x",
}) // => 2`,

  mount(root) {
    const locale = getLocale()
    const board = el("div", { class: "board" })
    const status = el("p", { class: "status" })
    const controls = el("div", { class: "controls" })

    const play = (move: Move) => {
      state = place(state, move)
      render()
    }

    const render = () => {
      const over = isOver(state)
      const best = over ? null : bestMove(state)

      board.replaceChildren(
        ...state.board.map((cell, index) => {
          const cellText = cell === null ? "" : MARK[cell]
          const button = el(
            "button",
            {
              class: `cell${index === best ? " best" : ""}`,
              type: "button",
              "aria-label": cellLabel(index, cellText, locale),
              ...(over || cell !== null ? { disabled: "" } : {}),
            },
            [cellText]
          )

          button.addEventListener("click", () => play(index))

          return button
        })
      )

      status.textContent = statusText(state, locale)
    }

    const reset = el("button", { type: "button" }, [TEXT.reset[locale]])

    reset.addEventListener("click", () => {
      state = initialState()
      render()
    })

    const auto = el("button", { type: "button" }, [TEXT.auto[locale]])

    auto.addEventListener("click", () => {
      const move = isOver(state) ? null : bestMove(state)

      if (move !== null) play(move)
    })

    controls.replaceChildren(reset, auto)
    root.replaceChildren(board, status, controls)
    render()
  },
}
