export type { Move, Peg, State, StateInput } from "./schema.js"
export {
  initialState,
  MAX_DISKS,
  moveSchema,
  parseState,
  pegSchema,
  stateSchema,
} from "./schema.js"
export { bestMove, moveAt, movesLeft } from "./strategy.js"
