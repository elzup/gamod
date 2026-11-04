import { z } from "zod"

/**
 * moveAt が手数を 32bit のビット演算で扱うので、手数 2^n - 1 が符号ビットに届かない枚数までに限る。
 * 31 枚でも最短 21 億手あり、実際に遊べる枚数より十分大きい。
 */
export const MAX_DISKS = 31

/** 棒は左から 0, 1, 2 */
export const pegSchema = z.union([z.literal(0), z.literal(1), z.literal(2)])

export const moveSchema = z.object({
  /** 動かす円盤 (0 が最小) */
  disk: z
    .number()
    .int()
    .min(0)
    .max(MAX_DISKS - 1),
  from: pegSchema,
  to: pegSchema,
})

/**
 * 円盤ごとに乗っている棒を持つ。同じ棒の上では大きい円盤が必ず下になるので、棒の中の順番は持たなくてよい。
 * この表し方では「小さい円盤の上に大きい円盤」が書けず、どの並びも初期局面から到達できる
 * (3^n 局面が全て 1 つにつながっている) ので、到達不能として弾く局面は無い。
 */
export const stateSchema = z.object({
  /** pegs[k] = 円盤 k (0 が最小) が乗っている棒 */
  pegs: z.array(pegSchema).min(1).max(MAX_DISKS),
  /** 全円盤を集める棒 */
  target: pegSchema.default(2),
})

export type Peg = z.infer<typeof pegSchema>
export type Move = z.infer<typeof moveSchema>
export type State = z.infer<typeof stateSchema>
export type StateInput = z.input<typeof stateSchema>

/** よく知られた形: disks 枚を左端の棒に積み、右端の棒へ移す */
export const initialState = (disks = 3): State =>
  parseState({ pegs: Array.from({ length: disks }, () => 0), target: 2 })

export const parseState = (input: unknown): State => {
  const parsed = stateSchema.safeParse(input)

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join(", ")

    throw new Error(`invalid hanoi state: ${detail}`)
  }

  return parsed.data
}
