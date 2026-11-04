import {
  bestMove,
  initialState,
  type Move,
  movesLeft,
  type Peg,
  type State,
} from "@gamod/hanoi"
import { type Demo, el } from "../demo.js"
import { getLocale, type Locale } from "../i18n.js"

const TEXT = {
  hint: {
    ja: "枠の付いた円盤を、枠の付いた棒へ動かすのが最短手 (棒を 2 回押して動かす)",
    en: "Moving the highlighted disk to the highlighted peg is the shortest move (click two pegs to move)",
  },
  selected: {
    ja: "動かす先の棒を押す (同じ棒でキャンセル)",
    en: "Click the peg to move to (the same peg cancels)",
  },
  solved: { ja: "完成", en: "Solved" },
  left: { ja: "最短であと", en: "Shortest:" },
  moves: { ja: "手", en: "moves left" },
  played: { ja: "手数", en: "Moves played" },
  reset: { ja: "最初から", en: "Reset" },
  shuffle: { ja: "ランダムな局面", en: "Random position" },
  auto: { ja: "最善手を指させる", en: "Play the best move" },
  disks: { ja: "枚数", en: "Disks" },
  target: { ja: "目標の棒", en: "Target peg" },
} as const

const PEGS: readonly Peg[] = [0, 1, 2]
const DISK_COUNTS = [3, 4, 5, 6, 7] as const
/** 円盤の幅を枚数によらず同じ範囲に収める (棒の幅に対する %) */
const MIN_WIDTH = 30
const MAX_WIDTH = 95

type Game = { state: State; played: number; selected: Peg | null }

const newGame = (state: State): Game => ({ state, played: 0, selected: null })

const randomPeg = (): Peg => Math.floor(Math.random() * 3) as Peg

const randomState = (disks: number, target: Peg): State => {
  const pegs = Array.from({ length: disks }, randomPeg)

  // 完成済みの局面を引いたら引き直す (遊べないので)
  return pegs.every((peg) => peg === target)
    ? randomState(disks, target)
    : { pegs, target }
}

/** パッケージは最善手しか返さないので、手の合法性と適用はデモ側で持つ */
const topDisk = ({ pegs }: State, peg: Peg): number | null => {
  const disk = pegs.indexOf(peg)

  return disk === -1 ? null : disk
}

const legalMove = (state: State, from: Peg, to: Peg): Move | null => {
  const disk = topDisk(state, from)
  const below = topDisk(state, to)

  if (disk === null || from === to) return null
  if (below !== null && below < disk) return null

  return { disk, from, to }
}

const play = (game: Game, { disk, to }: Move): Game => ({
  state: {
    ...game.state,
    pegs: game.state.pegs.map((peg, index) => (index === disk ? to : peg)),
  },
  played: game.played + 1,
  selected: null,
})

const statusText = (game: Game, locale: Locale): string => {
  const played = `${TEXT.played[locale]}: ${game.played}`
  const left = movesLeft(game.state)

  if (left === 0) return `${TEXT.solved[locale]} — ${played}`

  const guide =
    game.selected === null ? TEXT.hint[locale] : TEXT.selected[locale]
  const remaining =
    locale === "ja"
      ? `${TEXT.left.ja} ${left} ${TEXT.moves.ja}`
      : `${TEXT.left.en} ${left} ${TEXT.moves.en}`

  return `${remaining} / ${played} — ${guide}`
}

const pegLabel = (peg: Peg, locale: Locale): string =>
  locale === "ja" ? `棒 ${peg + 1}` : `Peg ${peg + 1}`

// 言語切替で再 mount されても局面を失わないよう、局面はモジュールに置く
let game = newGame(initialState(3))

export const hanoiDemo: Demo = {
  pkg: "@gamod/hanoi",
  title: { ja: "ハノイの塔", en: "Tower of Hanoi" },
  summary: {
    ja: "どの局面からでも、目標の棒へ揃える最短手順の次の 1 手を O(n) で返す。決まった手順の何手目かなら O(1)。幅優先探索と全局面で一致することをテストで保証。",
    en: "Returns the next move of the shortest solution from any position in O(n), or the step-th move of the classic solution in O(1), tested against breadth-first search on every position.",
  },
  snippet: `import { bestMove, moveAt } from "@gamod/hanoi"

bestMove({ pegs: [0, 0, 0], target: 2 }) // => { disk: 0, from: 0, to: 2 }
bestMove({ pegs: [1, 1, 0], target: 2 }) // => { disk: 2, from: 0, to: 2 }
moveAt(3, 4) // 3 枚の 4 手目 => { disk: 2, from: 0, to: 2 }`,

  mount(root) {
    const locale = getLocale()
    const board = el("div", { class: "hanoi-board" })
    const status = el("p", { class: "status" })
    const controls = el("div", { class: "controls" })
    const disksButton = el("button", { type: "button" })
    const targetButton = el("button", { type: "button" })

    const clickPeg = (peg: Peg) => {
      if (game.selected === null) {
        if (topDisk(game.state, peg) !== null) game = { ...game, selected: peg }
      } else {
        const move = legalMove(game.state, game.selected, peg)

        game = move === null ? { ...game, selected: null } : play(game, move)
      }
      render()
    }

    const pegColumn = (peg: Peg, best: Move | null) => {
      const disks = game.state.pegs.length
      // 下から大きい順に積む
      const stack = game.state.pegs
        .map((on, disk) => ({ on, disk }))
        .filter(({ on }) => on === peg)
        .map(({ disk }) => disk)
        .reverse()
        .map((disk) => {
          const width =
            MIN_WIDTH +
            ((MAX_WIDTH - MIN_WIDTH) * (disk + 1)) / Math.max(disks, 1)

          return el("div", {
            class: `hanoi-disk${best?.disk === disk ? " best" : ""}`,
            style: `width: ${width}%`,
          })
        })

      const classes = [
        "hanoi-peg",
        best?.to === peg ? "best" : "",
        game.selected === peg ? "selected" : "",
        game.state.target === peg ? "target" : "",
      ].filter(Boolean)
      const column = el(
        "button",
        {
          type: "button",
          class: classes.join(" "),
          "aria-label": pegLabel(peg, locale),
        },
        [
          el("div", { class: "hanoi-stack" }, stack),
          el("span", {}, [pegLabel(peg, locale)]),
        ]
      )

      column.addEventListener("click", () => clickPeg(peg))

      return column
    }

    const render = () => {
      const best = bestMove(game.state)

      board.replaceChildren(...PEGS.map((peg) => pegColumn(peg, best)))
      status.textContent = statusText(game, locale)
      disksButton.textContent = `${TEXT.disks[locale]}: ${game.state.pegs.length}`
      targetButton.textContent = `${TEXT.target[locale]}: ${game.state.target + 1}`
    }

    const reset = el("button", { type: "button" }, [TEXT.reset[locale]])

    reset.addEventListener("click", () => {
      const { pegs, target } = game.state

      game = newGame({ pegs: pegs.map(() => (target === 0 ? 2 : 0)), target })
      render()
    })

    const shuffle = el("button", { type: "button" }, [TEXT.shuffle[locale]])

    shuffle.addEventListener("click", () => {
      game = newGame(randomState(game.state.pegs.length, game.state.target))
      render()
    })

    const auto = el("button", { type: "button" }, [TEXT.auto[locale]])

    auto.addEventListener("click", () => {
      const move = bestMove(game.state)

      if (move !== null) game = play(game, move)
      render()
    })

    disksButton.addEventListener("click", () => {
      const index = DISK_COUNTS.indexOf(
        game.state.pegs.length as (typeof DISK_COUNTS)[number]
      )
      const disks = DISK_COUNTS[(index + 1) % DISK_COUNTS.length] ?? 3
      const { target } = game.state

      game = newGame({
        pegs: Array.from({ length: disks }, () => (target === 0 ? 2 : 0)),
        target,
      })
      render()
    })

    targetButton.addEventListener("click", () => {
      const target = ((game.state.target + 1) % 3) as Peg

      game = { ...game, state: { ...game.state, target }, selected: null }
      render()
    })

    controls.replaceChildren(reset, shuffle, auto, disksButton, targetButton)
    root.replaceChildren(board, status, controls)
    render()
  },
}
