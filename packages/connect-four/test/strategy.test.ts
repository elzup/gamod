import { describe, expect, it } from "vitest"
import type { Position } from "../reference/rules.js"
import { createOracle } from "../reference/solver.js"
import { initialState, type State } from "../src/schema.js"
import { bestMove } from "../src/strategy.js"
import {
  createRandom,
  deepPositions,
  fromMoves,
  fromText,
  toState,
} from "./testUtil.js"

const oracle = createOracle({ width: 7, height: 6 })

describe("bestMove on known positions", () => {
  it("opens in the middle", () => {
    expect(bestMove(initialState())).toBe(3)
  })

  it("wins at once", () => {
    // 下段に r が 3 つ並んでいる。2 列目に落とせば 4 連
    expect(bestMove(fromMoves([3, 3, 4, 4, 5, 5]))).toBe(2)
  })

  it("returns null once someone has won", () => {
    expect(bestMove(fromMoves([3, 0, 4, 1, 5, 2, 6]))).toBe(null)
  })

  it("returns null on a full board", () => {
    const [drawn] = deepPositions(oracle.rules, createRandom(7), {
      stones: 42,
      samples: 1,
    })

    if (drawn === undefined) throw new Error("no drawn position")

    expect(oracle.rules.winnerOf(drawn)).toBe(null)
    expect(bestMove(toState(drawn))).toBe(null)
  })
})

describe("bestMove against exhaustive search", () => {
  const positions = deepPositions(oracle.rules, createRandom(4), {
    stones: 34,
    samples: 40,
  })

  it("collects endgame positions", () => {
    expect(positions.length).toBeGreaterThan(20)
  })

  it("keeps the game-theoretic value in every position", () => {
    const wrong = positions.filter((position) => {
      const move = bestMove(toState(position))

      return move === null || !oracle.bestMoves(position).includes(move)
    })

    expect(wrong.map(oracle.rules.key)).toEqual([])
  })

  it("plays out to the result the exhaustive search promises", () => {
    const outcome = (start: Position): number => {
      let position = start
      let sign = 1

      while (oracle.rules.legalMoves(position).length > 0) {
        const move = bestMove(toState(position))

        if (move === null) throw new Error("no move in an open position")

        position = oracle.rules.applyMove(position, move)
        sign = -sign
      }

      // 決着済みなら直前に指した側の勝ち
      return oracle.rules.winnerOf(position) === null ? 0 : -sign
    }
    const wrong = positions.filter(
      (position) => outcome(position) !== oracle.gameValue(position)
    )

    expect(wrong.map(oracle.rules.key)).toEqual([])
  })
})

describe("bestMove input handling", () => {
  it("does not mutate the given state", () => {
    const state = fromMoves([3, 3, 4, 4, 5, 5])
    const frozen = Object.freeze({
      ...state,
      board: Object.freeze([...state.board]),
    }) as State

    expect(() => bestMove(frozen)).not.toThrow()
    expect(frozen.board).toEqual(state.board)
  })

  it("rejects a position that cannot arise in a real game", () => {
    expect(() =>
      bestMove(fromText(".......|.......|.......|...r...|.......|...y..."))
    ).toThrow(/cannot arise in a real game/)
  })

  it("rejects a malformed state", () => {
    expect(() =>
      bestMove({ board: [], turn: "r" } as unknown as State)
    ).toThrow(/invalid connect four state/)
  })
})
