import { z } from "zod"

/** スートは結果に関係しないのでランクだけを持つ */
export const cardSchema = z.enum([
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
])

export const moveSchema = z.enum(["hit", "stand", "double", "split"])

export type Card = z.infer<typeof cardSchema>
export type Move = z.infer<typeof moveSchema>

/** リスプリットで持てるハンド数の上限 (A 以外は 3 回まで割れる) */
export const MAX_HANDS = 4

/** A は 1 として数える (ソフトかどうかは合計側で判定する) */
export const cardValue = (card: Card): number => {
  if (card === "A") return 1
  if (card === "J" || card === "Q" || card === "K") return 10

  return Number(card)
}

export type Total = { value: number; isSoft: boolean }

export const totalOf = (cards: readonly Card[]): Total => {
  const hard = cards.reduce((sum, card) => sum + cardValue(card), 0)
  const hasAce = cards.includes("A")
  const isSoft = hasAce && hard + 10 <= 21

  return { value: isSoft ? hard + 10 : hard, isSoft }
}

export const isSplitHand = ({ hands }: Pick<State, "hands">): boolean =>
  hands > 1

export const isSplitAces = ({
  hand,
  hands,
}: Pick<State, "hand" | "hands">): boolean =>
  isSplitHand({ hands }) && hand[0] === "A"

/**
 * プレイヤーは 21 を超えた時点で引けなくなるので、最後の 1 枚より前でバーストしている手札は実戦に現れない。
 * A スプリットのハンドは 1 枚ずつしか配られないので 3 枚目は無い。
 */
const isReachable = ({
  hand,
  hands,
}: {
  hand: Card[]
  hands: number
}): boolean => {
  if (totalOf(hand.slice(0, -1)).value > 21) return false
  if (isSplitAces({ hand, hands }) && hand.length > 2) return false

  return true
}

export const stateSchema = z
  .object({
    /** ディーラーのアップカード。peek 済みでディーラー BJ ではない前提 */
    dealer: cardSchema,
    /** 今打っているハンド。スプリット後なら 1 枚目が割ったカード */
    hand: z.array(cardSchema).min(2),
    /** 今持っているハンドの数。2 以上ならこのハンドはスプリットで生まれたもの */
    hands: z.number().int().min(1).max(MAX_HANDS).default(1),
  })
  .refine(isReachable, {
    message: "hand cannot arise in a real game",
  })

export type State = z.infer<typeof stateSchema>
export type StateInput = z.input<typeof stateSchema>

export const parseState = (input: unknown): State => {
  const parsed = stateSchema.safeParse(input)

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join(", ")

    throw new Error(`invalid blackjack state: ${detail}`)
  }

  return parsed.data
}
