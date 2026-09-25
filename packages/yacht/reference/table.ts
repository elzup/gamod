/**
 * DP の結果を packages/yacht/table/ (git 管理外) にキャッシュする。
 * 全局面の DP は数秒かかり、テストファイルごとに解き直すと遅いため。
 *
 * ファイル名に計算に関わるソースのハッシュを入れ、ルールや DP を直したら古いキャッシュを自動で使わなくする
 * (古い表のままテストが通ると、直したつもりの変更を検証できない)。
 */
import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { solveValues } from "./dp.js"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCES = [
  "src/dice.ts",
  "src/scoring.ts",
  "src/turn.ts",
  "reference/dp.ts",
]

const sourceHash = (): string =>
  SOURCES.reduce(
    (hash, file) => hash.update(readFileSync(resolve(packageRoot, file))),
    createHash("sha256")
  )
    .digest("hex")
    .slice(0, 12)

export const tablePath = (): string =>
  resolve(packageRoot, "table", `values-${sourceHash()}.f64`)

const readTable = (path: string): Float64Array => {
  const bytes = readFileSync(path)

  return new Float64Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  )
}

/** キャッシュがあれば読み、無ければ解いて書く。vitest のワーカーが並列に書いても壊れないよう一時ファイル経由で置く */
export const loadValues = (): Float64Array => {
  const path = tablePath()

  if (existsSync(path)) return readTable(path)

  const table = solveValues()
  const temporary = `${path}.${process.pid}.tmp`

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(temporary, new Uint8Array(table.buffer))
  renameSync(temporary, path)

  return table
}
