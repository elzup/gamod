import type { Outcome } from "@gamod/core"
import type { Position, Rules, Stone } from "../reference/rules.js"
import { boardIndex, HEIGHT, WIDTH } from "../src/board.js"
import {
  BOARD_LENGTH,
  type Board,
  type Cell,
  type Player,
  type State,
} from "../src/schema.js"

const toCell = (char: string): Cell =>
  char === "r" ? "r" : char === "y" ? "y" : null

/**
 * 見た目そのままの記法から state を作る。上の段から順に 7 文字ずつ書く。
 * 例: ".......|.......|.......|.......|...y...|...rr.." (手番は石数から決まる)
 */
export const fromText = (text: string): State => {
  const board: Board = [...text.replace(/[^ry.]/g, "")].map(toCell)
  const count = (player: Player) =>
    board.filter((cell) => cell === player).length

  return { board, turn: count("r") === count("y") ? "r" : "y" }
}

export const toText = ({ board, turn }: State): string =>
  `${Array.from({ length: HEIGHT }, (_, row) =>
    board
      .slice(row * WIDTH, (row + 1) * WIDTH)
      .map((cell) => cell ?? ".")
      .join("")
  ).join("|")} ${turn}`

/** 列番号 (0 origin) の並びから局面を作る */
export const fromMoves = (moves: readonly number[]): State => {
  const board: Board = Array<Cell>(BOARD_LENGTH).fill(null)
  const heights = Array<number>(WIDTH).fill(0)

  moves.forEach((col, ply) => {
    const row = heights[col] ?? 0

    board[boardIndex(col, row)] = ply % 2 === 0 ? "r" : "y"
    heights[col] = row + 1
  })

  return { board, turn: moves.length % 2 === 0 ? "r" : "y" }
}

/** 公開している state を reference の局面に直す */
export const toPosition = ({ board, turn }: State): Position => ({
  columns: Array.from({ length: WIDTH }, (_, col) =>
    Array.from({ length: HEIGHT }, (_, row) => board[boardIndex(col, row)])
      .filter((cell) => cell !== null)
      .map((cell): Stone => (cell === "r" ? 1 : 2))
  ),
  turn: turn === "r" ? 1 : 2,
})

/** reference の局面を公開している state に直す */
export const toState = ({ columns, turn }: Position): State => {
  const board: Board = Array<Cell>(BOARD_LENGTH).fill(null)

  columns.forEach((column, col) => {
    column.forEach((stone, row) => {
      board[boardIndex(col, row)] = stone === 1 ? "r" : "y"
    })
  })

  return { board, turn: turn === 1 ? "r" : "y" }
}

/** reference の局面を src の solver に渡す形 (1 = 手番側, 2 = 相手) に直す */
export const solverColumns = ({ columns, turn }: Position): number[][] =>
  columns.map((column) => column.map((stone) => (stone === turn ? 1 : 2)))

/**
 * 完全読みの結果 (勝敗 + 決着までの手数) から、src/solver.ts が返すはずの厳密スコアを作る。
 * solver のスコアは「決着が早いほど絶対値が大きい」形なので、盤の広さと現在の石数から換算できる。
 */
export const expectedScore = (
  size: number,
  played: number,
  { score, depth }: Outcome
): number =>
  score === 0 ? 0 : Math.sign(score) * ((size + 2 - played - depth) >> 1)

/** 局面に置かれている石の数 */
export const stoneCount = ({ columns }: Position): number =>
  columns.reduce((sum, column) => sum + column.length, 0)

/** テストを毎回同じ結果にしたいので乱数は自前で持つ (mulberry32) */
export const createRandom = (seed: number): (() => number) => {
  let state = seed

  return () => {
    state = (state + 0x6d2b79f5) | 0

    let value = Math.imul(state ^ (state >>> 15), 1 | state)

    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 4 連を作らない手だけを選んでランダムに進め、石が stones 個の非終局局面を集める。
 * 終盤の局面なら reference の全探索でも解けるので、7x6 でも突き合わせができる。
 */
export const deepPositions = (
  rules: Rules,
  random: () => number,
  { stones, samples }: { stones: number; samples: number }
): Position[] => {
  const found = new Map<string, Position>()

  for (
    let tries = 0;
    tries < samples * 50 && found.size < samples;
    tries += 1
  ) {
    let position = rules.initial()
    let stuck = false

    while (stoneCount(position) < stones) {
      const moves = rules
        .legalMoves(position)
        .filter(
          (move) => rules.winnerOf(rules.applyMove(position, move)) === null
        )
      const move = moves[Math.floor(random() * moves.length)]

      if (move === undefined) {
        stuck = true
        break
      }

      position = rules.applyMove(position, move)
    }

    if (!stuck) found.set(rules.key(position), position)
  }

  return [...found.values()]
}
