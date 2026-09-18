import {
  bestMove,
  HEIGHT,
  initialState,
  type Move,
  type Player,
  type State,
  WIDTH,
} from "@gamod/connect-four"
import { type Demo, el } from "../demo.js"
import { getLocale, type Locale } from "../i18n.js"

const DISC = "●"

/** パッケージは最善手しか返さないので、対局の進行 (着手・勝敗) はデモ側で持つ */
const LINES: number[][] = (() => {
  const index = (col: number, row: number) => row * WIDTH + col
  const lines: number[][] = []

  for (const [dc, dr] of [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ] as const)
    for (let col = 0; col < WIDTH; col += 1)
      for (let row = 0; row < HEIGHT; row += 1) {
        const cells = Array.from({ length: 4 }, (_, step) => ({
          col: col + dc * step,
          row: row + dr * step,
        }))

        if (
          cells.every(
            (cell) =>
              cell.col >= 0 &&
              cell.col < WIDTH &&
              cell.row >= 0 &&
              cell.row < HEIGHT
          )
        )
          lines.push(cells.map((cell) => index(cell.col, cell.row)))
      }

  return lines
})()

/** 序盤は読みが重いので、この数まで石が置かれてから自動で最善手を出す */
const FAST_STONES = 16

const TEXT = {
  turn: { ja: "の手番", en: " to move" },
  best: {
    ja: " — 枠の付いたマスが最善手",
    en: " — the highlighted cell is the best move",
  },
  win: { ja: "の勝ち", en: " wins" },
  draw: { ja: "引分", en: "Draw" },
  reset: { ja: "最初から", en: "Reset" },
  auto: { ja: "最善手を指させる", en: "Play the best move" },
  show: { ja: "最善手を計算する", en: "Find the best move" },
  thinking: { ja: "読み中…", en: "Thinking…" },
  slow: {
    ja: "序盤は読みが重い (石が少ないほど遅く、数分以上かかることもある)",
    en: "the opening is expensive — with few stones it can take minutes or more",
  },
} as const

const stonesOf = ({ board }: State) =>
  board.filter((cell) => cell !== null).length

/** 定石表が即答する初期局面と、読みが軽い終盤だけ待たずに出せる */
const isFast = (state: State) => {
  const stones = stonesOf(state)

  return stones === 0 || stones >= FAST_STONES
}

const winnerOf = ({ board }: State): Player | null => {
  for (const line of LINES) {
    const head = board[line[0] ?? 0] ?? null

    if (head === null) continue
    if (line.every((index) => board[index] === head)) return head
  }

  return null
}

const isOver = (state: State): boolean =>
  winnerOf(state) !== null || state.board.every((cell) => cell !== null)

/** 列に落とすと止まる段 (下から埋まる)。満杯なら null */
const landing = ({ board }: State, col: Move): number | null => {
  for (let row = HEIGHT - 1; row >= 0; row -= 1)
    if (board[row * WIDTH + col] === null) return row

  return null
}

const place = (state: State, col: Move): State => {
  const row = landing(state, col)

  if (row === null) return state

  return {
    board: state.board.map((cell, index) =>
      index === row * WIDTH + col ? state.turn : cell
    ),
    turn: state.turn === "r" ? "y" : "r",
  }
}

const cellLabel = (col: number, row: number, locale: Locale): string =>
  locale === "ja"
    ? `${col + 1} 列目 ${HEIGHT - row} 段目`
    : `column ${col + 1}, row ${HEIGHT - row}`

// 言語切替で再 mount されても対局を失わないよう、盤面はモジュールに置く
let state = initialState()
let hint: Move | null = null
let thinking = false

export const connectFourDemo: Demo = {
  pkg: "@gamod/connect-four",
  title: { ja: "コネクト4", en: "Connect Four" },
  summary: {
    ja: "定石表 + 完全読み探索で最善手を返す。序盤は読みが重いので、石が少ないうちはボタンを押したときだけ計算する。",
    en: "Returns the best move from an opening book plus exact search. The opening is expensive, so with few stones on the board it only solves on demand.",
  },
  snippet: `import { bestMove, initialState } from "@gamod/connect-four"

bestMove(initialState()) // => 3`,

  mount(root) {
    const locale = getLocale()
    const board = el("div", { class: "board grid7" })
    const status = el("p", { class: "status" })
    const controls = el("div", { class: "controls" })

    const play = (col: Move) => {
      state = place(state, col)
      hint = null
      render()
    }

    /** 読みの間に画面を 1 度描き直してから計算する (同期に走るので固まって見えないように) */
    const solve = (then: (move: Move | null) => void) => {
      thinking = true
      render()
      setTimeout(() => {
        const move = isOver(state) ? null : bestMove(state)

        thinking = false
        then(move)
      }, 30)
    }

    const disc = (player: Player) =>
      el("span", { class: `disc ${player}` }, [DISC])

    const statusNodes = (): (Node | string)[] => {
      const winner = winnerOf(state)

      if (winner !== null) return [disc(winner), TEXT.win[locale]]
      if (isOver(state)) return [TEXT.draw[locale]]
      if (thinking) return [TEXT.thinking[locale]]

      return [
        disc(state.turn),
        `${TEXT.turn[locale]}${hint === null ? "" : TEXT.best[locale]}`,
      ]
    }

    const render = () => {
      const over = isOver(state)

      if (!over && !thinking && hint === null && isFast(state))
        hint = bestMove(state)

      const hinted = hint === null ? null : landing(state, hint)

      board.replaceChildren(
        ...state.board.map((cell, index) => {
          const col = index % WIDTH
          const row = Math.floor(index / WIDTH)
          const best = hinted === row && hint === col
          const button = el(
            "button",
            {
              class: `cell disc${cell === null ? "" : ` ${cell}`}${
                best ? " best" : ""
              }`,
              type: "button",
              "aria-label": cellLabel(col, row, locale),
              ...(over || thinking || landing(state, col) === null
                ? { disabled: "" }
                : {}),
            },
            [cell === null ? "" : DISC]
          )

          button.addEventListener("click", () => play(col))

          return button
        })
      )

      const buttons = [
        el("button", { type: "button" }, [TEXT.reset[locale]]),
        el(
          "button",
          { type: "button", ...(over || thinking ? { disabled: "" } : {}) },
          [TEXT.auto[locale]]
        ),
      ]
      const [reset, auto] = buttons

      reset?.addEventListener("click", () => {
        state = initialState()
        hint = null
        render()
      })
      auto?.addEventListener("click", () => {
        solve((move) => {
          if (move !== null) play(move)
          else render()
        })
      })

      if (!over && !thinking && hint === null) {
        const show = el("button", { type: "button" }, [TEXT.show[locale]])

        show.addEventListener("click", () => {
          solve((move) => {
            hint = move
            render()
          })
        })
        buttons.push(show)
      }

      controls.replaceChildren(
        ...buttons,
        el("span", { class: "note" }, [
          hint === null && !isFast(state) ? TEXT.slow[locale] : "",
        ])
      )
      status.replaceChildren(...statusNodes())
    }

    root.replaceChildren(board, status, controls)
    render()
  },
}
