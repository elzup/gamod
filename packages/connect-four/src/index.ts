export type { Board, Cell, Move, Player, State } from "./schema.js"
export {
  BOARD_LENGTH,
  boardSchema,
  cellSchema,
  emptyBoard,
  HEIGHT,
  initialState,
  moveSchema,
  opponent,
  parseState,
  playerSchema,
  stateSchema,
  WIDTH,
} from "./schema.js"
export { bestMove } from "./strategy.js"
