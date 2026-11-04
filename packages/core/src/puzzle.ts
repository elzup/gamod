/**
 * 1 人用パズルの最短路探索。engine.ts の完全読み (2 人用・メモ付き深さ優先) は局面が循環すると止まらないので、
 * 循環のあるパズルは幅優先探索で「ゴールまでの最短手数」を全局面について求める。
 *
 * ゴールから逆向きに広げるので、全ての手が可逆 (A→B が合法なら B→A も合法) なパズルに限る。
 * ここにもゲーム固有の語彙は入れない。
 */

export type Puzzle<S, M> = {
  legalMoves: (state: S) => M[]
  applyMove: (state: S, move: M) => S
  /** 同一局面が同一キーになること */
  key: (state: S) => string
}

/** goal から到達できる全局面について、goal までの最短手数を返す (キーは puzzle.key) */
export const distancesTo = <S, M>(
  puzzle: Puzzle<S, M>,
  goal: S
): Map<string, number> => {
  const distances = new Map<string, number>([[puzzle.key(goal), 0]])
  const queue: S[] = [goal]

  for (let head = 0; head < queue.length; head++) {
    const state = queue[head] as S
    const distance = distances.get(puzzle.key(state)) as number

    for (const move of puzzle.legalMoves(state)) {
      const next = puzzle.applyMove(state, move)
      const key = puzzle.key(next)

      if (distances.has(key)) continue
      distances.set(key, distance + 1)
      queue.push(next)
    }
  }

  return distances
}

/** 最短手数を 1 減らす手 (= 最短手順の次の 1 手) を全て返す。ゴールでは空配列 */
export const optimalMoves = <S, M>(
  puzzle: Puzzle<S, M>,
  state: S,
  distances: ReadonlyMap<string, number>
): M[] => {
  const distance = distances.get(puzzle.key(state))

  if (distance === undefined)
    throw new Error(`state is not connected to the goal: ${puzzle.key(state)}`)

  return puzzle
    .legalMoves(state)
    .filter(
      (move) =>
        distances.get(puzzle.key(puzzle.applyMove(state, move))) ===
        distance - 1
    )
}
