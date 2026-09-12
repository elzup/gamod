import {
  applyMove,
  bestMove,
  bestMoves,
  evaluate,
  initialState,
  judge,
  legalMoves,
  type Move,
  type State,
} from "@gamod/tic-tac-toe"
import { type Demo, el } from "../demo.js"

const MARK = { x: "×", o: "○" } as const

const scoreLabel = (score: number): string =>
  score > 0 ? "勝ち" : score < 0 ? "負け" : "引分"

const statusText = (state: State): string => {
  const judgement = judge(state)

  if (judgement.status === "win") return `${MARK[judgement.winner]} の勝ち`
  if (judgement.status === "draw") return "引分"

  const [best] = evaluate(state)

  if (best === undefined) return "終局"

  return `${MARK[state.turn]} の手番 — 最善手はこの局面を ${scoreLabel(best.score)} にする (残り ${best.depth} 手)`
}

export const ticTacToeDemo: Demo = {
  pkg: "@gamod/tic-tac-toe",
  title: "三目並べ",
  summary:
    "全 5478 局面を厳密に解く。最善手と、全合法手の評価 (勝敗 + 決着までの手数) を返す。",
  snippet: `import { bestMove, evaluate } from "@gamod/tic-tac-toe"

const state = {
  board: ["x", "x", null, "o", "o", null, null, null, null],
  turn: "x",
} as const

bestMove(state) // => 2
evaluate(state)[0] // => { move: 2, score: 1, depth: 1 }`,

  mount(root) {
    let state = initialState()

    const board = el("div", { class: "board" })
    const status = el("p", { class: "status" })
    const table = el("div", { class: "evals" })
    const controls = el("div", { class: "controls" })

    const play = (move: Move) => {
      state = applyMove(state, move)
      render()
    }

    const render = () => {
      const best = new Set(bestMoves(state))
      const playable = new Set(legalMoves(state))

      board.replaceChildren(
        ...state.board.map((cell, index) => {
          const cellText = cell === null ? "" : MARK[cell]
          const button = el(
            "button",
            {
              class: `cell${best.has(index) ? " best" : ""}`,
              type: "button",
              "aria-label": `${index + 1} 番目のマス${cell === null ? "" : `: ${cellText}`}`,
              ...(playable.has(index) ? {} : { disabled: "" }),
            },
            [cellText]
          )

          button.addEventListener("click", () => play(index))

          return button
        })
      )

      status.textContent = statusText(state)

      table.replaceChildren(
        ...evaluate(state).map((item) =>
          el("div", { class: "eval" }, [
            el("span", { class: "eval-move" }, [`${item.move}`]),
            el("span", { class: `eval-score s${item.score}` }, [
              scoreLabel(item.score),
            ]),
            el("span", { class: "eval-depth" }, [`${item.depth} 手`]),
          ])
        )
      )
    }

    const reset = el("button", { type: "button" }, ["最初から"])

    reset.addEventListener("click", () => {
      state = initialState()
      render()
    })

    const auto = el("button", { type: "button" }, ["最善手を指させる"])

    auto.addEventListener("click", () => {
      const move = bestMove(state)

      if (move !== null) play(move)
    })

    controls.replaceChildren(reset, auto)
    root.replaceChildren(board, status, table, controls)
    render()
  },
}
