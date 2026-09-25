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
 * 無限デッキの basic strategy。各行はディーラーのアップカード 2,3,4,5,6,7,8,9,10,A の順の 10 マス。
 * 無限デッキでは引いたカードで確率が変わらないので、最善手は (合計, ソフトか, アップカード) だけで決まり、
 * この表がそのまま完全読みと一致する (reference/ev.ts との全ハンド照合で保証)。
 *
 * H = ヒット, S = スタンド, D = ダブル (できなければヒット), B = ダブル (できなければスタンド)
 */
type Code = "H" | "S" | "D" | "B"

/** アップカードごとの 10 マス。マス数の過不足はタイプエラーになる */
type Row<T> = readonly [T, T, T, T, T, T, T, T, T, T]
type Column = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

const COLUMN: Record<Card, Column> = {
  "2": 0,
  "3": 1,
  "4": 2,
  "5": 3,
  "6": 4,
  "7": 5,
  "8": 6,
  "9": 7,
  "10": 8,
  J: 8,
  Q: 8,
  K: 8,
  A: 9,
}

/** A を含まない (または A を 1 としか数えられない) 合計。2 枚で最小 4 */
type HardTotal =
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
/** A を 11 と数えている合計。A,A の 12 から */
type SoftTotal = 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21
/** ペアのカードの点数 (A = 1、10/J/Q/K = 10) */
type PairValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

// biome-ignore format: 表として縦横を揃えて読むため
const HARD: Record<HardTotal, Row<Code>> = {
  4:  ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  5:  ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  6:  ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  7:  ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  8:  ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  9:  ["H", "D", "D", "D", "D", "H", "H", "H", "H", "H"],
  10: ["D", "D", "D", "D", "D", "D", "D", "D", "H", "H"],
  11: ["D", "D", "D", "D", "D", "D", "D", "D", "D", "H"],
  12: ["H", "H", "S", "S", "S", "H", "H", "H", "H", "H"],
  13: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
  14: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
  15: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
  16: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
  17: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  18: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  19: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  20: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  21: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
}

/** ソフト 12 は A,A を割れないとき (4 ハンド到達時) にだけ現れる */
// biome-ignore format: 表として縦横を揃えて読むため
const SOFT: Record<SoftTotal, Row<Code>> = {
  12: ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  13: ["H", "H", "H", "H", "D", "H", "H", "H", "H", "H"],
  14: ["H", "H", "H", "D", "D", "H", "H", "H", "H", "H"],
  15: ["H", "H", "H", "D", "D", "H", "H", "H", "H", "H"],
  16: ["H", "H", "D", "D", "D", "H", "H", "H", "H", "H"],
  17: ["H", "D", "D", "D", "D", "H", "H", "H", "H", "H"],
  18: ["S", "B", "B", "B", "B", "S", "S", "H", "H", "H"],
  19: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  20: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  21: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
}

/**
 * ペアを割るか (P = 割る, - = 割らずに HARD / SOFT に従う)。
 * 割るかどうかはハンド数や後に控えるハンド数に依らない (reference で全組み合わせを確認済み)。
 */
// biome-ignore format: 表として縦横を揃えて読むため
const SPLIT: Record<PairValue, Row<"P" | "-">> = {
  1:  ["P", "P", "P", "P", "P", "P", "P", "P", "P", "P"],
  2:  ["P", "P", "P", "P", "P", "P", "-", "-", "-", "-"],
  3:  ["P", "P", "P", "P", "P", "P", "-", "-", "-", "-"],
  4:  ["-", "-", "-", "P", "P", "-", "-", "-", "-", "-"],
  5:  ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
  6:  ["P", "P", "P", "P", "P", "-", "-", "-", "-", "-"],
  7:  ["P", "P", "P", "P", "P", "P", "-", "-", "-", "-"],
  8:  ["P", "P", "P", "P", "P", "P", "P", "P", "P", "P"],
  9:  ["P", "P", "P", "P", "P", "-", "P", "P", "-", "-"],
  10: ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
}

const hasKey = <T extends object>(
  table: T,
  key: number
): key is keyof T & number => Object.hasOwn(table, key)

/** バーストしていない合計は必ずどちらかの表にある (無ければ totalOf か表の欠け = バグ) */
const codeOf = ({ value, isSoft }: Total, column: Column): Code => {
  if (isSoft && hasKey(SOFT, value)) return SOFT[value][column]
  if (!isSoft && hasKey(HARD, value)) return HARD[value][column]

  throw new Error(`no strategy row for ${isSoft ? "soft" : "hard"} ${value}`)
}

const shouldSplit = (pairValue: number, column: Column): boolean =>
  hasKey(SPLIT, pairValue) && SPLIT[pairValue][column] === "P"

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

  const column = COLUMN[dealer]
  const [first, second] = hand
  const isPair = isTwoCards && cardValue(first) === cardValue(second)

  if (isPair && hands < MAX_HANDS && shouldSplit(cardValue(first), column)) {
    return "split"
  }

  return moveOf(codeOf(total, column), isTwoCards)
}
