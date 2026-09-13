export type { Board, Cell, Move, Player, State } from "./schema.js"
export {
  BOARD_LENGTH,
  boardSchema,
  cellSchema,
  emptyBoard,
  initialState,
  moveSchema,
  parseState,
  playerSchema,
  stateSchema,
} from "./schema.js"
export { bestMove } from "./strategy.js"
