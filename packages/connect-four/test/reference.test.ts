import { describe, expect, it } from "vitest"
import { createRules, type Position } from "../reference/rules.js"
import { createOracle } from "../reference/solver.js"
import { fromMoves, toPosition } from "./testUtil.js"

const rules = createRules({ width: 7, height: 6 })

describe("rules", () => {
  it("lists every column that still has room", () => {
    expect(rules.legalMoves(rules.initial())).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(rules.legalMoves(toPosition(fromMoves([3, 3, 3, 3, 3, 3])))).toEqual(
      [0, 1, 2, 4, 5, 6]
    )
  })

  it("stops the game once someone has 4 in a row", () => {
    const won = toPosition(fromMoves([0, 6, 1, 6, 2, 6, 3]))

    expect(rules.winnerOf(won)).toBe(1)
    expect(rules.legalMoves(won)).toEqual([])
    expect(() => rules.applyMove(won, 0)).toThrow(/already over/)
  })

  it.each([
    ["a column", [3, 0, 3, 1, 3, 2, 3]],
    ["a row", [0, 0, 1, 1, 2, 2, 3]],
    ["a rising diagonal", [0, 1, 1, 2, 2, 3, 2, 3, 3, 0, 3]],
  ] as const)("finds 4 in %s", (_, moves) => {
    expect(rules.winnerOf(toPosition(fromMoves([...moves])))).toBe(1)
  })

  it("rejects a move into a full column", () => {
    expect(() =>
      rules.applyMove(toPosition(fromMoves([3, 3, 3, 3, 3, 3])), 3)
    ).toThrow(/is full/)
  })

  it("does not touch the given position", () => {
    const position = rules.initial()

    rules.applyMove(position, 3)

    expect(position.columns[3]).toEqual([])
  })
})

/**
 * 正解役そのものが正しいことを、実装と独立に知られている数で確かめる。
 * ここが崩れると「探索が正解役と一致する」テストが意味を失う。
 */
describe("reference against known numbers", () => {
  it("reaches the published number of positions for each ply", () => {
    let layer = new Map([[rules.key(rules.initial()), rules.initial()]])
    const counts: number[] = []

    for (let ply = 0; ply <= 7; ply += 1) {
      counts.push(layer.size)

      const next = new Map<string, Position>()

      for (const position of layer.values())
        for (const move of rules.legalMoves(position)) {
          const child = rules.applyMove(position, move)

          next.set(rules.key(child), child)
        }

      layer = next
    }

    // John Tromp が公開している 7x6 の局面数 (合法手だけで辿れる局面、決着済みを含む)
    expect(counts).toEqual([1, 7, 49, 238, 1120, 4263, 16422, 54859])
  })

  it("solves the 4x4 board to a draw", () => {
    // 小さい盤の解析で知られている値 (4x4 は引分) と一致する
    const oracle = createOracle({ width: 4, height: 4 })

    expect(oracle.gameValue(oracle.rules.initial())).toBe(0)
  })

  it("gives left-right mirrored positions the same value", () => {
    const oracle = createOracle({ width: 4, height: 4 })
    const mirror = ({ columns, turn }: Position): Position => ({
      columns: [...columns].reverse(),
      turn,
    })
    const asymmetric = oracle
      .reachableStates()
      .filter(
        (position) =>
          oracle.gameValue(position) !== oracle.gameValue(mirror(position))
      )

    expect(asymmetric).toEqual([])
  })
})
