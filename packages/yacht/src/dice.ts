/**
 * 出目は並び順を区別しない多重集合として扱う。目ごとの個数 [1 の個数, ..., 6 の個数] を 1 つの添字に潰し、
 * 「保持する 0〜5 個」も「振り終えた 5 個」も同じ添字空間 (462 通り) に載せる。
 * 1 個足す / 1 個除く遷移を表で持っておくと、振り直しの期待値が「1 個振るごとの平均」の繰り返しで計算できる。
 */

export const FACES = 6
export const DICE_COUNT = 5

/** 目ごとの個数。counts[0] が 1 の目の個数 */
export type Counts = readonly number[]

const sizeOf = (counts: Counts): number =>
  counts.reduce((total, count) => total + count, 0)

const enumerateCounts = (): Counts[] => {
  const visit = (face: number, rest: number, prefix: Counts): Counts[] =>
    face === FACES
      ? [prefix]
      : Array.from({ length: rest + 1 }, (_, count) =>
          visit(face + 1, rest - count, [...prefix, count])
        ).flat()

  return visit(0, DICE_COUNT, [])
}

/** 個数の小さい順。添字の昇順 = 保持数の昇順になるので、DP を添字順のループで回せる */
export const KEEPS: readonly Counts[] = enumerateCounts().sort(
  (a, b) => sizeOf(a) - sizeOf(b)
)
export const KEEP_COUNT = KEEPS.length
export const EMPTY_KEEP = 0

/** 個数は 0..5 なので 6 進数 6 桁に収まる */
const codeOf = (counts: Counts): number =>
  counts.reduce((code, count, face) => code + count * 6 ** face, 0)

const indexByCode = new Map(
  KEEPS.map((counts, index) => [codeOf(counts), index])
)

export const keepIndex = (counts: Counts): number => {
  const index = indexByCode.get(codeOf(counts))

  if (index === undefined) throw new Error(`not a dice multiset: ${counts}`)

  return index
}

export const KEEP_SIZE = Uint8Array.from(KEEPS.map(sizeOf))

/** 5 個揃った (振り終えた) 出目 252 通りの添字 */
export const ROLLS = Int16Array.from(
  KEEPS.flatMap((counts, index) =>
    sizeOf(counts) === DICE_COUNT ? [index] : []
  )
)

const shifted = (counts: Counts, face: number, delta: number): Counts =>
  counts.map((count, f) => (f === face ? count + delta : count))

/** ADD[k * FACES + f]: k に目 f+1 を 1 個足した添字。既に 5 個なら -1 */
export const ADD = Int16Array.from(
  KEEPS.flatMap((counts) =>
    Array.from({ length: FACES }, (_, face) =>
      sizeOf(counts) === DICE_COUNT ? -1 : keepIndex(shifted(counts, face, 1))
    )
  )
)

/** REMOVE[k * FACES + f]: k から目 f+1 を 1 個除いた添字。その目が無ければ -1 */
export const REMOVE = Int16Array.from(
  KEEPS.flatMap((counts) =>
    counts.map((count, face) =>
      count === 0 ? -1 : keepIndex(shifted(counts, face, -1))
    )
  )
)

export const countsOf = (dice: readonly number[]): Counts =>
  Array.from(
    { length: FACES },
    (_, face) => dice.filter((die) => die === face + 1).length
  )

export const keepCounts = (index: number): Counts => {
  const counts = KEEPS[index]

  if (counts === undefined) throw new Error(`keep index out of range: ${index}`)

  return counts
}
