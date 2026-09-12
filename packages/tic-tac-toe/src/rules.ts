import {
  type Board,
  type Move,
  moveSchema,
  type Player,
  type State,
} from "./schema.js"

/** 勝ち筋 8 本 (横 3 / 縦 3 / 斜め 2) を盤面インデックスで表したもの */
export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export const opponent = (player: Player): Player => (player === "x" ? "o" : "x")

export const winnerOf = (board: Board): Player | null => {
  for (const [a, b, c] of LINES) {
    const head = board[a]

    if (head === null || head === undefined) continue
    if (head === board[b] && head === board[c]) return head
  }

  return null
}

export const legalMoves = ({ board }: State): Move[] => {
  if (winnerOf(board) !== null) return []

  return board.flatMap((cell, index) => (cell === null ? [index] : []))
}

export const applyMove = (state: State, move: Move): State => {
  const parsed = moveSchema.safeParse(move)

  if (!parsed.success) throw new Error(`invalid tic-tac-toe move: ${move}`)
  if (state.board[parsed.data] !== null)
    throw new Error(`cell ${parsed.data} is already taken`)
  if (winnerOf(state.board) !== null)
    throw new Error("the game is already over")

  return {
    board: state.board.map((cell, index) =>
      index === parsed.data ? state.turn : cell
    ),
    turn: opponent(state.turn),
  }
}

export type Judgement =
  | { status: "playing"; winner: null }
  | { status: "win"; winner: Player }
  | { status: "draw"; winner: null }

export const judge = ({ board }: State): Judgement => {
  const winner = winnerOf(board)

  if (winner !== null) return { status: "win", winner }
  if (board.every((cell) => cell !== null))
    return { status: "draw", winner: null }

  return { status: "playing", winner: null }
}
