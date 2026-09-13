import type { Board, Cell, Player, State } from "../src/schema.js"

const toCell = (char: string): Cell =>
  char === "x" ? "x" : char === "o" ? "o" : null

/** "xo.|...|..x" のような見た目そのままの記法から state を作る (手番は石数から決まる) */
export const fromText = (text: string): State => {
  const board: Board = [...text.replace(/[^xo.]/g, "")].map(toCell)
  const count = (player: Player) =>
    board.filter((cell) => cell === player).length
  const turn: Player = count("x") === count("o") ? "x" : "o"

  return { board, turn }
}

export const toText = ({ board, turn }: State): string =>
  `${[0, 3, 6]
    .map((row) =>
      board
        .slice(row, row + 3)
        .map((cell) => cell ?? ".")
        .join("")
    )
    .join("|")} ${turn}`

/**
 * 盤面の対称変換 8 通り (回転 4 + 鏡映 4)。変換後のマス i には元の盤面の perm[i] が来る。
 * 正しい対称変換になっているかはテスト側で「勝ち筋を勝ち筋に写す」ことを確認している。
 */
export const SYMMETRIES: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  [6, 3, 0, 7, 4, 1, 8, 5, 2],
  [8, 7, 6, 5, 4, 3, 2, 1, 0],
  [2, 5, 8, 1, 4, 7, 0, 3, 6],
  [2, 1, 0, 5, 4, 3, 8, 7, 6],
  [6, 7, 8, 3, 4, 5, 0, 1, 2],
  [0, 3, 6, 1, 4, 7, 2, 5, 8],
  [8, 5, 2, 7, 4, 1, 6, 3, 0],
]

export const transformState = (
  state: State,
  perm: readonly number[]
): State => ({
  board: perm.map((from) => state.board[from] ?? null),
  turn: state.turn,
})
