import {
  bestMove,
  initialState,
  type Move,
  type Player,
  type State,
} from "@gamod/tic-tac-toe"
import { type Demo, el } from "../demo.js"

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

const statusText = (state: State): string => {
  const winner = winnerOf(state)

  if (winner !== null) return `${MARK[winner]} の勝ち`
  if (isOver(state)) return "引分"

  return `${MARK[state.turn]} の手番 — 枠の付いたマスが最善手`
}

export const ticTacToeDemo: Demo = {
  pkg: "@gamod/tic-tac-toe",
  title: "三目並べ",
  summary:
    "攻略法 (条件分岐) で最善手を返す。ありうる全 4520 局面で完全読みと同じ勝敗になることをテストで保証。",
  snippet: `import { bestMove } from "@gamod/tic-tac-toe"

bestMove({
  board: ["x", "x", null, "o", "o", null, null, null, null],
  turn: "x",
}) // => 2`,

  mount(root) {
    let state = initialState()

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
              "aria-label": `${index + 1} 番目のマス${cell === null ? "" : `: ${cellText}`}`,
              ...(over || cell !== null ? { disabled: "" } : {}),
            },
            [cellText]
          )

          button.addEventListener("click", () => play(index))

          return button
        })
      )

      status.textContent = statusText(state)
    }

    const reset = el("button", { type: "button" }, ["最初から"])

    reset.addEventListener("click", () => {
      state = initialState()
      render()
    })

    const auto = el("button", { type: "button" }, ["最善手を指させる"])

    auto.addEventListener("click", () => {
      const move = isOver(state) ? null : bestMove(state)

      if (move !== null) play(move)
    })

    controls.replaceChildren(reset, auto)
    root.replaceChildren(board, status, controls)
    render()
  },
}
