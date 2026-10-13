import { z } from "zod"

/** ニム和を 32bit のビット演算 (XOR) で求めるので、符号ビットに届かない大きさまでに限る */
export const MAX_HEAP_SIZE = 2 ** 31 - 1

/** 取り尽くした山は 0 のまま残す (対局中に山の番号がずれないようにするため) */
export const heapSchema = z.number().int().min(0).max(MAX_HEAP_SIZE)

/** normal = 最後の 1 個を取った側の勝ち / misere = 最後の 1 個を取った側の負け */
export const ruleSchema = z.enum(["normal", "misere"])

export const moveSchema = z.object({
  /** 取る山の番号 (heaps のインデックス) */
  heap: z.number().int().min(0),
  /** その山から取る個数 */
  take: z.number().int().min(1).max(MAX_HEAP_SIZE),
})

/**
 * 手番は持たない。ニムはどちらの手番でも打てる手が同じ (不偏ゲーム) なので、最善手は山だけで決まる。
 * また、どの山の並びもそれ自身を初期配置にすれば実戦に現れるので、到達不能として弾く局面は無い。
 */
export const stateSchema = z.object({
  heaps: z.array(heapSchema).min(1),
  rule: ruleSchema.default("normal"),
})

export type Rule = z.infer<typeof ruleSchema>
export type Move = z.infer<typeof moveSchema>
export type State = z.infer<typeof stateSchema>
export type StateInput = z.input<typeof stateSchema>

/** ニムに決まった初期配置は無いので、よく使われる 3・4・5 個の 3 山にしてある */
export const initialState = (): State => ({ heaps: [3, 4, 5], rule: "normal" })

export const parseState = (input: unknown): State => {
  const parsed = stateSchema.safeParse(input)

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join(", ")

    throw new Error(`invalid nim state: ${detail}`)
  }

  return parsed.data
}
