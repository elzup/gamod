import { describe, expect, it } from "vitest"
import { applyMove, isSolved } from "../reference/rules.js"
import { allStates, distance, shortestNextMoves } from "../reference/solver.js"
import { initialState, MAX_DISKS, type State } from "../src/schema.js"
import { bestMove, moveAt, movesLeft } from "../src/strategy.js"
import { TARGETS, toText } from "./testUtil.js"

/** 1..8 枚・目標 3 通りの全局面。攻略法は枚数に依らない式なので、ここで合えばそれより多い枚数でも同じ計算になる */
const DISK_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const

const positions = DISK_COUNTS.flatMap((disks) =>
  TARGETS.flatMap((target) => allStates(disks, target))
)
const unsolved = positions.filter((position) => !isSolved(position))

describe("bestMove against the breadth-first solver", () => {
  it("is checked on every position", () => {
    // 3 通りの目標それぞれで 3 + 9 + ... + 3^8 局面
    expect(positions).toHaveLength(3 * ((3 ** 9 - 3) / 2))
  })

  it("plays the unique shortest next move", () => {
    const wrong = unsolved.filter((position) => {
      const move = bestMove(position)
      const [expected] = shortestNextMoves(position)

      return JSON.stringify(move) !== JSON.stringify(expected)
    })

    expect(wrong.map(toText)).toEqual([])
  })

  it("returns null once the tower is on the target", () => {
    const solved = positions.filter(isSolved)

    expect(solved).toHaveLength(DISK_COUNTS.length * TARGETS.length)
    expect(solved.filter((position) => bestMove(position) !== null)).toEqual([])
  })
})

describe("movesLeft", () => {
  it("matches the shortest distance on every position", () => {
    const wrong = positions.filter(
      (position) => movesLeft(position) !== distance(position)
    )

    expect(wrong.map(toText)).toEqual([])
  })

  it("solves the tower in exactly movesLeft moves by following bestMove", () => {
    const start: State = { pegs: [2, 0, 1, 1, 0, 2, 0], target: 1 }
    let position = start
    let moves = 0

    for (
      let move = bestMove(position);
      move !== null;
      move = bestMove(position)
    ) {
      position = applyMove(position, move)
      moves++
    }

    expect(isSolved(position)).toBe(true)
    expect(moves).toBe(movesLeft(start))
  })

  it("handles the largest tower", () => {
    expect(movesLeft(initialState(MAX_DISKS))).toBe(2 ** MAX_DISKS - 1)
  })
})

describe("moveAt", () => {
  it.each(Array.from({ length: 20 }, (_, index) => index + 1))(
    "replays the classic solution of %i disks",
    (disks) => {
      // 規則違反の手が 1 つでもあれば applyMove より安い自前の検査で拾う
      const pegs = Array.from({ length: disks }, () => 0)

      for (let step = 1; step < 2 ** disks; step++) {
        const { disk, from, to } = moveAt(disks, step)
        const blocked = pegs.findIndex((peg) => peg === from || peg === to)

        if (pegs[disk] !== from || blocked < disk)
          throw new Error(`illegal move at step ${step} of ${disks} disks`)
        pegs[disk] = to
      }

      expect(pegs.every((peg) => peg === 2)).toBe(true)
    }
  )

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
    "agrees with bestMove along the classic solution of %i disks",
    (disks) => {
      let position = initialState(disks)

      for (let step = 1; step < 2 ** disks; step++) {
        const move = moveAt(disks, step)

        expect(bestMove(position)).toEqual(move)
        position = applyMove(position, move)
      }

      expect(bestMove(position)).toBeNull()
    }
  )

  it("handles the last step of the largest tower", () => {
    // 最後の手は最小の円盤を目標の棒へ載せる手。31 枚は奇数なので目標は棒 2
    expect(moveAt(MAX_DISKS, 2 ** MAX_DISKS - 1)).toEqual({
      disk: 0,
      from: 0,
      to: 2,
    })
    // ちょうど真ん中で最大の円盤が動く
    expect(moveAt(MAX_DISKS, 2 ** (MAX_DISKS - 1))).toEqual({
      disk: MAX_DISKS - 1,
      from: 0,
      to: 2,
    })
  })

  it.each([
    [3, 0],
    [3, 8],
    [3, 1.5],
    [0, 1],
    [MAX_DISKS + 1, 1],
  ])("rejects %i disks at step %d", (disks, step) => {
    expect(() => moveAt(disks, step)).toThrow(/must be an integer/)
  })
})

describe("bestMove on known positions", () => {
  it("starts the 3-disk tower by moving the smallest disk to the target", () => {
    expect(bestMove(initialState())).toEqual({ disk: 0, from: 0, to: 2 })
  })

  it("starts an even tower by moving the smallest disk to the spare peg", () => {
    expect(bestMove(initialState(4))).toEqual({ disk: 0, from: 0, to: 1 })
  })

  it("moves the largest misplaced disk once the smaller ones are out of the way", () => {
    // 円盤 0, 1 は棒 1 に逃がしてあり、円盤 2 は棒 2 に動かせる
    expect(bestMove({ pegs: [1, 1, 0] })).toEqual({ disk: 2, from: 0, to: 2 })
  })

  it("does not mutate the given state", () => {
    const pegs = Object.freeze([0, 0, 0]) as State["pegs"]
    const frozen = Object.freeze({ pegs, target: 2 as const })

    expect(() => bestMove(frozen)).not.toThrow()
    expect(frozen.pegs).toEqual([0, 0, 0])
  })

  it("rejects a malformed state", () => {
    expect(() => bestMove({ pegs: [] })).toThrow(/invalid hanoi state/)
  })
})
