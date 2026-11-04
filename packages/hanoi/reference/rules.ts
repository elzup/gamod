import { type Move, moveSchema, type Peg, type State } from "../src/schema.js"

const PEGS: readonly Peg[] = [0, 1, 2]

/** 棒の一番上 (= その棒にある最小) の円盤。空なら null */
export const topDisk = ({ pegs }: State, peg: Peg): number | null => {
  const disk = pegs.indexOf(peg)

  return disk === -1 ? null : disk
}

export const isSolved = ({ pegs, target }: State): boolean =>
  pegs.every((peg) => peg === target)

/** 一番上の円盤を、空の棒かそれより大きい円盤の上へ動かせる */
export const legalMoves = (state: State): Move[] =>
  PEGS.flatMap((from) => {
    const disk = topDisk(state, from)

    if (disk === null) return []

    return PEGS.filter((to) => {
      if (to === from) return false
      const below = topDisk(state, to)

      return below === null || below > disk
    }).map((to) => ({ disk, from, to }))
  })

export const applyMove = (state: State, move: Move): State => {
  const parsed = moveSchema.safeParse(move)

  if (!parsed.success)
    throw new Error(`invalid hanoi move: ${JSON.stringify(move)}`)

  const legal = legalMoves(state).some(
    ({ disk, from, to }) =>
      disk === parsed.data.disk &&
      from === parsed.data.from &&
      to === parsed.data.to
  )

  if (!legal) throw new Error(`illegal hanoi move: ${JSON.stringify(move)}`)

  return {
    ...state,
    pegs: state.pegs.map((peg, disk) => (disk === move.disk ? move.to : peg)),
  }
}
