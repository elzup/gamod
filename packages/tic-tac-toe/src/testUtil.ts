import type { Board, Cell, Player, State } from "./schema.js"

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
