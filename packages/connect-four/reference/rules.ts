/**
 * テスト専用のルール実装。src/solver.ts とは別の書き方 (列ごとの配列をそのまま走査する素直な実装)
 * にしてあるので、突き合わせると探索側の作り込み (ビット演算・枝刈り・置換表) を検算できる。
 *
 * 盤の大きさを変えられる。7x6 の全探索は無理なので、小さい盤での全局面比較に使う。
 */

/** 1 = 先手, 2 = 後手 */
export type Stone = 1 | 2

export type Size = { width: number; height: number; connect?: number }

/** 列ごとに下から積んだ石と手番 */
export type Position = { columns: readonly (readonly Stone[])[]; turn: Stone }

export const other = (stone: Stone): Stone => (stone === 1 ? 2 : 1)

export type Rules = {
  size: Required<Size>
  initial: () => Position
  stoneAt: (position: Position, col: number, row: number) => Stone | null
  winnerOf: (position: Position) => Stone | null
  isFull: (position: Position) => boolean
  legalMoves: (position: Position) => number[]
  applyMove: (position: Position, move: number) => Position
  key: (position: Position) => string
}

export const createRules = ({ width, height, connect = 4 }: Size): Rules => {
  const size = { width, height, connect }
  const stoneAt = ({ columns }: Position, col: number, row: number) =>
    columns[col]?.[row] ?? null

  // 4 連になるマスの並びを (col, row) のまま先に作っておく
  const lines: [number, number][][] = []

  for (const [dc, dr] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const) {
    for (let col = 0; col < width; col += 1) {
      for (let row = 0; row < height; row += 1) {
        const line = Array.from(
          { length: connect },
          (_, step): [number, number] => [col + dc * step, row + dr * step]
        )

        if (line.every(([c, r]) => c >= 0 && c < width && r >= 0 && r < height))
          lines.push(line)
      }
    }
  }

  const winnerOf = (position: Position): Stone | null => {
    for (const line of lines) {
      const [head] = line
      const stone =
        head === undefined ? null : stoneAt(position, head[0], head[1])

      if (stone === null) continue
      if (line.every(([col, row]) => stoneAt(position, col, row) === stone))
        return stone
    }

    return null
  }

  const isFull = ({ columns }: Position) =>
    columns.every((column) => column.length >= height)

  const legalMoves = (position: Position): number[] => {
    if (winnerOf(position) !== null) return []

    return position.columns.flatMap((column, col) =>
      column.length < height ? [col] : []
    )
  }

  const applyMove = (position: Position, move: number): Position => {
    const column = position.columns[move]

    if (column === undefined) throw new Error(`invalid column: ${move}`)
    if (column.length >= height) throw new Error(`column ${move} is full`)
    if (winnerOf(position) !== null) throw new Error("the game is already over")

    return {
      columns: position.columns.map((current, col) =>
        col === move ? [...current, position.turn] : current
      ),
      turn: other(position.turn),
    }
  }

  return {
    size,
    initial: () => ({
      columns: Array.from({ length: width }, () => []),
      turn: 1,
    }),
    stoneAt,
    winnerOf,
    isFull,
    legalMoves,
    applyMove,
    key: ({ columns, turn }) =>
      `${columns.map((column) => column.join("")).join("/")}:${turn}`,
  }
}
