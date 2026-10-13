import { type Move, moveSchema, type State } from "../src/schema.js"

export const isOver = ({ heaps }: State): boolean =>
  heaps.every((size) => size === 0)

/** 1 つの山から 1 個以上、好きなだけ取れる */
export const legalMoves = ({ heaps }: State): Move[] =>
  heaps.flatMap((size, heap) =>
    Array.from({ length: size }, (_, index) => ({ heap, take: index + 1 }))
  )

export const applyMove = (state: State, move: Move): State => {
  const parsed = moveSchema.safeParse(move)

  if (!parsed.success)
    throw new Error(`invalid nim move: ${JSON.stringify(move)}`)

  const { heap, take } = parsed.data
  const size = state.heaps[heap]

  if (size === undefined) throw new Error(`heap ${heap} does not exist`)
  if (take > size)
    throw new Error(`cannot take ${take} from heap ${heap} of size ${size}`)

  return {
    ...state,
    heaps: state.heaps.map((other, index) =>
      index === heap ? other - take : other
    ),
  }
}
