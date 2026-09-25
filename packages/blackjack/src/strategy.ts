import {
  type Card,
  cardValue,
  isSplitAces,
  MAX_HANDS,
  type Move,
  parseState,
  type StateInput,
  type Total,
  totalOf,
} from "./schema.js"

/**
 * 無限デッキの basic strategy。各文字列はディーラーのアップカード 2,3,4,5,6,7,8,9,10,A の順。
 * 無限デッキでは引いたカードで確率が変わらないので、最善手は (合計, ソフトか, アップカード) だけで決まり、
 * この表がそのまま完全読みと一致する (reference/ev.ts との全ハンド照合で保証)。
 *
 * H = ヒット, S = スタンド, D = ダブル (できなければヒット), B = ダブル (できなければスタンド)
 */
type Code = "H" | "S" | "D" | "B"

/** 8 以下は常にヒット、17 以上は常にスタンド */
const HARD: Record<number, string> = {
  9: "HDDDDHHHHH",
  10: "DDDDDDDDHH",
  11: "DDDDDDDDDH",
  12: "HHSSSHHHHH",
  13: "SSSSSHHHHH",
  14: "SSSSSHHHHH",
  15: "SSSSSHHHHH",
  16: "SSSSSHHHHH",
}

/** ソフト 12 (A,A を割れないとき) は常にヒット、19 以上は常にスタンド */
const SOFT: Record<number, string> = {
  13: "HHHHDHHHHH",
  14: "HHHDDHHHHH",
  15: "HHHDDHHHHH",
  16: "HHDDDHHHHH",
  17: "HDDDDHHHHH",
  18: "SBBBBSSHHH",
}

/**
 * ペアを割るか (P = 割る)。キーはカードの点数 (A = 1)。
 * 割るかどうかはハンド数や後に控えるハンド数に依らない (reference で全組み合わせを確認済み)。
 */
const SPLIT: Record<number, string> = {
  1: "PPPPPPPPPP",
  2: "PPPPPP----",
  3: "PPPPPP----",
  4: "---PP-----",
  6: "PPPPP-----",
  7: "PPPPPP----",
  8: "PPPPPPPPPP",
  9: "PPPPP-PP--",
}

const upcardIndex = (dealer: Card): number => {
  const value = cardValue(dealer)

  return value === 1 ? 9 : value - 2
}

const codeOf = ({ value, isSoft }: Total, column: number): Code => {
  const row = isSoft ? SOFT[value] : HARD[value]

  if (row) return row[column] as Code
  if (isSoft) return value >= 19 ? "S" : "H"

  return value >= 17 ? "S" : "H"
}

const moveOf = (code: Code, canDouble: boolean): Move => {
  if (code === "D") return canDouble ? "double" : "hit"
  if (code === "B") return canDouble ? "double" : "stand"

  return code === "H" ? "hit" : "stand"
}

/**
 * 今のハンドの最善手 (期待値最大)。打つ手が無い (バースト / ナチュラル BJ / A スプリット後) なら null。
 * ありえない state は throw する。
 */
export const bestMove = (input: StateInput): Move | null => {
  const state = parseState(input)
  const { dealer, hand, hands } = state
  const total = totalOf(hand)
  const isTwoCards = hand.length === 2

  if (total.value > 21) return null
  if (hands === 1 && isTwoCards && total.value === 21) return null
  if (isSplitAces(state)) return null

  const column = upcardIndex(dealer)
  const [first, second] = hand
  const pairValue =
    isTwoCards && first && second && cardValue(first) === cardValue(second)
      ? cardValue(first)
      : null

  if (pairValue !== null && hands < MAX_HANDS) {
    if (SPLIT[pairValue]?.[column] === "P") return "split"
  }

  return moveOf(codeOf(total, column), isTwoCards)
}
