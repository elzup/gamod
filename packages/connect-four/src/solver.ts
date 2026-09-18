/**
 * 厳密解を返す探索。Pascal Pons の Connect 4 solver と同じ組み立てで、
 * αβ + 置換表 + 反復深化 (null window) に コネクト4 固有の枝刈りを足したもの。
 *
 * - 自分が次の 1 手で 4 連を作れるならそこで打ち切る
 * - 相手のリーチが 2 つあれば受け切れないので負け確定
 * - 相手のリーチが 1 つならそこを埋めるしかない (合法手が 1 つに縮む)
 * - 相手のリーチの真下には置かない (置いた瞬間に上を取られる)
 * - 新しくリーチを作る数が多い手から見る (並べ替えの良し悪しがそのまま枝刈りの効きになる)
 *
 * スコアは Pons と同じで決着の早さを含む。勝ちが正、負けが負、引分が 0 で、
 * 絶対値が大きいほど早い決着 (勝ちなら最短、負けなら最長を選べる)。
 *
 * 内部表現は「列ごとに下から積んだ石」。マス番号は col * height + row (row 0 が最下段)。
 * 探索中の添字は必ず範囲内なので、noUncheckedIndexedAccess の undefined は as number で落とす。
 */
import { CONNECT, HEIGHT, lineSquares, WIDTH } from "./board.js"

export type SolverConfig = {
  width?: number
  height?: number
  connect?: number
  /** 置換表のサイズ。2^tableBits エントリ (1 エントリ 10 byte) */
  tableBits?: number
  /** 定石表。局面キーに対する厳密スコアを返す。未知なら undefined */
  book?: (key: number) => number | undefined
}

/** 列ごとに下から並べた石。1 = 手番側、2 = 相手 */
export type Columns = readonly (readonly number[])[]

export type Solver = {
  /**
   * 手番側から見た厳密スコア。weak なら勝敗だけを見る (-1 / 0 / 1) ので数倍速い。
   * 定石表は勝敗しか持たないので weak のときだけ引く。
   */
  solve: (columns: Columns, weak?: boolean) => number
  /** 完全読みと同じ勝敗になる手 (複数あれば中央に近いもの)。指す手が無ければ null */
  bestMove: (columns: Columns) => number | null
  /** 局面キー。(手番側の石, 全体の石) と 1 対 1 に対応する値 (左右反転した局面とは同じ値) */
  key: (columns: Columns) => number
  /** 直近の solve / bestMove で展開した局面数 */
  readonly nodes: number
}

const ME = 1

export const createSolver = ({
  width = WIDTH,
  height = HEIGHT,
  connect = CONNECT,
  tableBits = 21,
  book,
}: SolverConfig = {}): Solver => {
  const size = width * height
  const cellAt = (col: number, row: number) => col * height + row

  if ((height + 1) * width > 52)
    throw new Error("board is too large for an exact position key")

  // マス i を含む 4 連から i を除いた (connect - 1) マスの組を、平坦な配列に詰めておく
  const groups: number[][][] = Array.from({ length: size }, () => [])

  for (const line of lineSquares(width, height, connect)) {
    const cells = line.map(({ col, row }) => cellAt(col, row))

    for (const cell of cells)
      groups[cell]?.push(cells.filter((other) => other !== cell))
  }

  const groupStart = new Int32Array(size + 1)

  for (let cell = 0; cell < size; cell += 1)
    groupStart[cell + 1] =
      (groupStart[cell] as number) + (groups[cell]?.length ?? 0) * (connect - 1)

  const groupCells = new Int32Array(groupStart[size] as number)

  {
    let at = 0

    for (const cellGroups of groups)
      for (const group of cellGroups)
        for (const cell of group) {
          groupCells[at] = cell
          at += 1
        }
  }

  const stones = new Int8Array(size)
  const heights = new Int8Array(width)
  /** キーの列ごとの重み (1 列 = height + 1 bit) と段ごとの重み */
  const columnWeight = Float64Array.from(
    { length: width },
    (_, col) => 2 ** ((height + 1) * col)
  )
  const rowWeight = Float64Array.from({ length: height }, (_, row) => 2 ** row)
  const emptyKey = columnWeight.reduce((sum, weight) => sum + weight, 0)
  /** keys[p] = p から見た局面キー。着手のたびに差分だけ足し引きする */
  const keys = new Float64Array(3)
  /** 左右反転した盤面のキー。左右対称な局面は同じ値なので、小さい方を置換表のキーにする */
  const mirrorKeys = new Float64Array(3)
  let played = 0
  let mover = ME

  const tableSize = 2 ** tableBits
  const tableKey = new Float64Array(tableSize)
  const tableValue = new Int8Array(tableSize)
  /** 0 = 空, 1 = 上界, 2 = 下界 */
  const tableFlag = new Int8Array(tableSize)

  let nodes = 0
  let weakSearch = false

  /** cell に player が置いたら 4 連が完成するか (cell 自身は見ないので、空きのまま呼べる) */
  const winsAt = (cell: number, player: number): boolean => {
    const end = groupStart[cell + 1] as number

    for (let at = groupStart[cell] as number; at < end; at += connect - 1) {
      let filled = 0

      while (
        filled < connect - 1 &&
        stones[groupCells[at + filled] as number] === player
      )
        filled += 1

      if (filled === connect - 1) return true
    }

    return false
  }

  /** cell に player が置くと新しくできるリーチ (残り 1 マスで 4 連) の数 */
  const threatsAt = (cell: number, player: number): number => {
    const end = groupStart[cell + 1] as number
    let count = 0

    for (let at = groupStart[cell] as number; at < end; at += connect - 1) {
      let mine = 0
      let empty = 0

      for (let step = 0; step < connect - 1; step += 1) {
        const stone = stones[groupCells[at + step] as number]

        if (stone === player) mine += 1
        else if (stone === 0) empty += 1
      }

      if (mine === connect - 2 && empty === 1) count += 1
    }

    return count
  }

  const place = (col: number, row: number, player: number) => {
    const weight = rowWeight[row] as number
    const delta = weight * (columnWeight[col] as number)
    const mirrored = weight * (columnWeight[width - 1 - col] as number)

    stones[cellAt(col, row)] = player
    keys[player] = (keys[player] as number) + 2 * delta
    keys[3 - player] = (keys[3 - player] as number) + delta
    mirrorKeys[player] = (mirrorKeys[player] as number) + 2 * mirrored
    mirrorKeys[3 - player] = (mirrorKeys[3 - player] as number) + mirrored
  }

  const play = (col: number) => {
    const row = heights[col] as number

    place(col, row, mover)
    heights[col] = row + 1
    mover = 3 - mover
    played += 1
  }

  const undo = (col: number) => {
    mover = 3 - mover
    played -= 1

    const row = (heights[col] as number) - 1
    const weight = rowWeight[row] as number
    const delta = weight * (columnWeight[col] as number)
    const mirrored = weight * (columnWeight[width - 1 - col] as number)

    stones[cellAt(col, row)] = 0
    heights[col] = row
    keys[mover] = (keys[mover] as number) - 2 * delta
    keys[3 - mover] = (keys[3 - mover] as number) - delta
    mirrorKeys[mover] = (mirrorKeys[mover] as number) - 2 * mirrored
    mirrorKeys[3 - mover] = (mirrorKeys[3 - mover] as number) - mirrored
  }

  const load = (columns: Columns) => {
    stones.fill(0)
    heights.fill(0)
    keys[ME] = emptyKey
    keys[3 - ME] = emptyKey
    mirrorKeys[ME] = emptyKey
    mirrorKeys[3 - ME] = emptyKey
    played = 0
    mover = ME

    columns.forEach((column, col) => {
      column.forEach((stone, row) => {
        place(col, row, stone)
        played += 1
      })
      heights[col] = column.length
    })
  }

  /** 中央に近い列から見る。序盤はこの順が圧倒的に当たりやすい */
  const columnOrder = Int8Array.from(
    Array.from({ length: width }, (_, col) => col).sort(
      (a, b) => Math.abs(a - (width - 1) / 2) - Math.abs(b - (width - 1) / 2)
    )
  )

  // 深さごとの着手候補。探索中に配列を作らないよう先に確保しておく
  const moveBuffer = new Int8Array((size + 1) * width)
  const scoreBuffer = new Int32Array((size + 1) * width)

  const negamax = (alphaIn: number, betaIn: number): number => {
    nodes += 1

    const offset = played * width
    const opponent = 3 - mover
    let count = 0
    let forced = -1
    let forcedCount = 0

    for (let index = 0; index < width; index += 1) {
      const col = columnOrder[index] as number
      const row = heights[col] as number

      if (row >= height) continue

      const cell = cellAt(col, row)

      if (winsAt(cell, mover)) return (size + 1 - played) >> 1
      if (winsAt(cell, opponent)) {
        forced = col
        forcedCount += 1
      }

      moveBuffer[offset + count] = col
      count += 1
    }

    // 盤面が埋まっている
    if (count === 0) return 0
    // 相手のリーチが 2 つ: 片方しか受けられない
    if (forcedCount >= 2) return -((size - played) >> 1)

    if (forcedCount === 1) {
      moveBuffer[offset] = forced
      count = 1
    }

    // 相手のリーチの真下は指さない
    let kept = 0

    for (let at = 0; at < count; at += 1) {
      const col = moveBuffer[offset + at] as number
      const above = (heights[col] as number) + 1

      if (above < height && winsAt(cellAt(col, above), opponent)) continue

      moveBuffer[offset + kept] = col
      kept += 1
    }

    if (kept === 0) return -((size - played) >> 1)
    count = kept

    if (count > 1) {
      for (let at = 0; at < count; at += 1) {
        const col = moveBuffer[offset + at] as number

        scoreBuffer[offset + at] = threatsAt(
          cellAt(col, heights[col] as number),
          mover
        )
      }

      // 作るリーチが多い手から (挿入ソート。同点なら columnOrder の順が残る)
      for (let at = 1; at < count; at += 1) {
        const col = moveBuffer[offset + at] as number
        const score = scoreBuffer[offset + at] as number
        let slot = at

        while (slot > 0 && (scoreBuffer[offset + slot - 1] as number) < score) {
          moveBuffer[offset + slot] = moveBuffer[offset + slot - 1] as number
          scoreBuffer[offset + slot] = scoreBuffer[offset + slot - 1] as number
          slot -= 1
        }

        moveBuffer[offset + slot] = col
        scoreBuffer[offset + slot] = score
      }
    }

    // 残り 2 マスで、どちらにも勝ちが無いことが分かっている
    if (played >= size - 2) return 0

    let alpha = alphaIn
    let beta = betaIn
    const ceiling = (size - 1 - played) >> 1

    if (beta > ceiling) {
      beta = ceiling
      if (alpha >= beta) return beta
    }

    const floor = -((size - 2 - played) >> 1)

    if (alpha < floor) {
      alpha = floor
      if (alpha >= beta) return alpha
    }

    const own = keys[mover] as number
    const mirror = mirrorKeys[mover] as number
    const key = own < mirror ? own : mirror
    // 定石表は勝敗しか持たないので、weak のときだけ引く
    const known = weakSearch ? book?.(key) : undefined

    if (known !== undefined) return known

    const slot = (key % tableSize) | 0

    if (tableKey[slot] === key) {
      const value = tableValue[slot] as number

      if (tableFlag[slot] === 1) {
        if (beta > value) {
          beta = value
          if (alpha >= beta) return beta
        }
      } else if (tableFlag[slot] === 2) {
        if (alpha < value) {
          alpha = value
          if (alpha >= beta) return alpha
        }
      }
    }

    for (let at = 0; at < count; at += 1) {
      const col = moveBuffer[offset + at] as number

      play(col)

      const score = -negamax(-beta, -alpha)

      undo(col)

      if (score >= beta) {
        tableKey[slot] = key
        tableValue[slot] = score
        tableFlag[slot] = 2

        return score
      }

      if (score > alpha) alpha = score
    }

    tableKey[slot] = key
    tableValue[slot] = alpha
    tableFlag[slot] = 1

    return alpha
  }

  /** 反復深化 + null window。「このスコア以上か」だけを判定して範囲を詰めていく */
  const search = (weak: boolean): number => {
    weakSearch = weak

    let min = weak ? -1 : -((size - played) >> 1)
    let max = weak ? 1 : (size + 1 - played) >> 1

    while (min < max) {
      let median = min + ((max - min) >> 1)

      if (median <= 0 && min / 2 < median) median = (min / 2) | 0
      else if (median >= 0 && max / 2 > median) median = (max / 2) | 0

      const score = negamax(median, median + 1)

      if (score <= median) max = score
      else min = score
    }

    // weak のときは窓の外の値がそのまま返ることがあるので、勝敗だけに丸める
    return weak ? Math.sign(min) : min
  }

  const solve: Solver["solve"] = (columns, weak = false) => {
    load(columns)
    nodes = 0

    return search(weak)
  }

  const bestMove: Solver["bestMove"] = (columns) => {
    load(columns)
    nodes = 0

    const playable = columnOrder.filter(
      (col) => (heights[col] as number) < height
    )

    // 4 連が完成する手があるならそれが最善 (探索は決着済みの局面を読めないので先に返す)
    for (const col of playable)
      if (winsAt(cellAt(col, heights[col] as number), mover)) return col

    const value = search(true)

    for (const col of playable) {
      play(col)

      const score = -search(true)

      undo(col)
      if (score === value) return col
    }

    return null
  }

  return {
    solve,
    bestMove,
    key: (columns) => {
      load(columns)

      const own = keys[ME] as number
      const mirror = mirrorKeys[ME] as number

      return own < mirror ? own : mirror
    },
    get nodes() {
      return nodes
    },
  }
}
