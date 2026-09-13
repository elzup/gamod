import { describe, expect, it } from "vitest"
import { applyMove, judge, opponent, winnerOf } from "../reference/rules.js"
import { gameValue, isTerminal, reachableStates } from "../reference/solver.js"
import { initialState, type State } from "../src/schema.js"
import { bestMove } from "../src/strategy.js"
import { fromText, toText } from "./testUtil.js"

const positions = reachableStates()
const openPositions = positions.filter((state) => !isTerminal(state))

const playBest = (state: State): State => {
  const move = bestMove(state)

  if (move === null) throw new Error(`no move in ${toText(state)}`)

  return applyMove(state, move)
}

/** player がマス cell に置くと即座に揃うか */
const completesLine = (state: State, cell: number, player: State["turn"]) =>
  state.board[cell] === null &&
  winnerOf(
    state.board.map((stone, index) => (index === cell ? player : stone))
  ) === player

const immediateWins = (state: State, player: State["turn"]) =>
  state.board.flatMap((_, cell) =>
    completesLine(state, cell, player) ? [cell] : []
  )

describe("bestMove against the exhaustive solver", () => {
  it("is checked on every non-terminal reachable position", () => {
    expect(openPositions).toHaveLength(4520)
  })

  it("always plays an empty cell", () => {
    const illegal = openPositions.filter((state) => {
      const move = bestMove(state)

      return move === null || state.board[move] !== null
    })

    expect(illegal.map(toText)).toEqual([])
  })

  it("keeps the game-theoretic value in every position", () => {
    const wrong = openPositions.filter(
      (state) => -gameValue(playBest(state)) !== gameValue(state)
    )

    expect(wrong.map(toText)).toEqual([])
  })

  it("returns null for every terminal position", () => {
    const terminals = positions.filter(isTerminal)

    expect(terminals).toHaveLength(958)
    expect(terminals.filter((state) => bestMove(state) !== null)).toEqual([])
  })
})

describe("bestMove as a strategy", () => {
  it("takes an immediate win whenever one exists", () => {
    const missed = openPositions
      .filter((state) => immediateWins(state, state.turn).length > 0)
      .filter((state) => {
        const move = bestMove(state)

        return move === null || !completesLine(state, move, state.turn)
      })

    expect(missed.map(toText)).toEqual([])
  })

  it("blocks the opponent's only threat when it cannot win at once", () => {
    const leaked = openPositions
      .filter(
        (state) =>
          immediateWins(state, state.turn).length === 0 &&
          immediateWins(state, opponent(state.turn)).length === 1
      )
      .filter(
        (state) =>
          bestMove(state) !== immediateWins(state, opponent(state.turn))[0]
      )

    expect(leaked.map(toText)).toEqual([])
  })

  it("draws against itself", () => {
    const play = (state: State): State =>
      isTerminal(state) ? state : play(playBest(state))

    expect(judge(play(initialState())).status).toBe("draw")
  })

  it.each(["x", "o"] as const)(
    "never loses as %s against every possible opponent",
    (follower) => {
      const endings = (state: State): State[] => {
        if (isTerminal(state)) return [state]
        if (state.turn === follower) return endings(playBest(state))

        return state.board.flatMap((cell, move) =>
          cell === null ? endings(applyMove(state, move)) : []
        )
      }
      const games = endings(initialState())
      const lost = games.filter(
        (state) => judge(state).winner === opponent(follower)
      )

      expect(games.length).toBeGreaterThan(0)
      expect(lost.map(toText)).toEqual([])
    }
  )
})

describe("bestMove on known positions", () => {
  it("wins at once", () => {
    expect(bestMove(fromText("xx.|oo.|..."))).toBe(2)
  })

  it("blocks a threat", () => {
    expect(bestMove(fromText("oo.|x..|x.."))).toBe(2)
  })

  it("avoids a corner against the double-corner trap", () => {
    // x が対角の隅、o が中央。ここで o が隅を取るとフォークを食らって負ける
    expect([1, 3, 5, 7]).toContain(bestMove(fromText("x..|.o.|..x")))
  })

  it("finds a forcing win the classic strategy misses", () => {
    // 攻略法そのままだと中央を取って引分になる。リーチを続けて両取りに持ち込めば勝てる
    expect([3, 6, 8]).toContain(bestMove(fromText("x.o|...|...")))
  })

  it("stops a forcing win the classic strategy walks into", () => {
    // 攻略法そのままだと中央を取って負ける
    expect([6, 8]).toContain(bestMove(fromText("xo.|...|.x.")))
  })

  it("stops a double fork threat", () => {
    // 隅 0 に置くと、受けた x の石がそのまま両取りの芽 2 つになる
    expect([2, 8]).toContain(bestMove(fromText(".x.|o.x|...")))
  })

  it("returns null on a full board", () => {
    expect(bestMove(fromText("xox|xxo|oxo"))).toBe(null)
  })
})

describe("bestMove input handling", () => {
  it("does not mutate the given state", () => {
    const state = fromText("x..|.o.|..x")
    const frozen = Object.freeze({
      ...state,
      board: Object.freeze([...state.board]),
    }) as State

    expect(() => bestMove(frozen)).not.toThrow()
    expect(frozen.board).toEqual(state.board)
  })

  it("rejects a position that cannot arise in a real game", () => {
    expect(() => bestMove(fromText("xxx|ooo|x.."))).toThrow(
      /cannot arise in a real game/
    )
  })

  it("rejects a malformed state", () => {
    expect(() => bestMove({ board: [], turn: "x" })).toThrow(
      /invalid tic-tac-toe state/
    )
  })
})
