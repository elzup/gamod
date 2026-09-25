import { z } from "zod"
import { DICE_COUNT, FACES } from "./dice.js"
import { CATEGORIES, POSSIBLE_SCORES } from "./scoring.js"

/** 1 手番で振れるのは最初の 1 回 + 振り直し 2 回 */
export const MAX_REROLLS = 2

export const categorySchema = z.enum(CATEGORIES)
export const dieSchema = z.number().int().min(1).max(FACES)
export const diceSchema = z.array(dieSchema).length(DICE_COUNT)
/** 記入済みの役だけキーを持つ。未記入の役はキーごと無い */
export const sheetSchema = z.partialRecord(
  categorySchema,
  z.number().int().min(0)
)

export type Category = z.infer<typeof categorySchema>
export type Dice = z.infer<typeof diceSchema>
export type Sheet = z.infer<typeof sheetSchema>

/**
 * 記入済みの点がどれも「その役で実際に出せる点」であれば、その記入表は実戦で現れる
 * (役ごとに独立に記入でき、上段合計はそこから決まるだけなので、他に矛盾の生まれようが無い)。
 */
const hasPossibleScores = ({ sheet }: { sheet: Sheet }): boolean =>
  CATEGORIES.every((category, index) => {
    const score = sheet[category]

    return score === undefined || POSSIBLE_SCORES[index]?.has(score) === true
  })

export const stateSchema = z
  .object({
    dice: diceSchema,
    /** この手番で残っている振り直しの回数 (0..2) */
    rerollsLeft: z.number().int().min(0).max(MAX_REROLLS),
    sheet: sheetSchema,
  })
  .refine(hasPossibleScores, {
    message: "sheet has a score that no roll can make",
    path: ["sheet"],
  })

export type State = z.infer<typeof stateSchema>

export const moveSchema = z.discriminatedUnion("type", [
  /** 残す (振り直さない) サイコロの位置 (dice の添字、昇順)。残りを振り直す */
  z.object({
    type: z.literal("reroll"),
    keep: z.array(
      z
        .number()
        .int()
        .min(0)
        .max(DICE_COUNT - 1)
    ),
  }),
  z.object({ type: z.literal("score"), category: categorySchema }),
])

export type Move = z.infer<typeof moveSchema>

export const emptySheet = (): Sheet => ({})

/** ゲーム開始直後 (1 投目を振った直後) の局面。出目はパッケージが振らないので呼び出し側が渡す */
export const initialState = (dice: Dice): State => ({
  dice,
  rerollsLeft: MAX_REROLLS,
  sheet: emptySheet(),
})

export const parseState = (input: unknown): State => {
  const parsed = stateSchema.safeParse(input)

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join(", ")

    throw new Error(`invalid yacht state: ${detail}`)
  }

  return parsed.data
}
