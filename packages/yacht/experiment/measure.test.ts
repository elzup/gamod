/**
 * V テーブル (手番開始局面の期待値) をどこまで小さくできるかの計測。結果は table/measure.md (git 管理外) に書く。
 *   pnpm --filter @gamod/yacht measure
 *
 * サイズは「出荷するならこう詰める」という素朴な符号化 (整数化 → 上段合計方向の差分 → brotli) での目安。
 * 損失は evaluatePolicy による厳密な値で、近似した表で手を選び続けたときの初手からの期待値の差。
 */
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { brotliCompressSync, constants } from "node:zlib"
import { expect, it } from "vitest"
import {
  FILLED_STATES,
  reachableUppers,
  tableIndex,
  tableValueFn,
} from "../reference/dp.js"
import { evaluatePolicy } from "../reference/policy.js"
import { loadValues, tablePath } from "../reference/table.js"
import { UPPER_CATEGORY_COUNT } from "../src/scoring.js"
import type { ValueFn } from "../src/turn.js"

type Entry = { filled: number; upper: number; value: number }
type Row = { model: string; entries: number; bytes: number; loss: number }

const values = loadValues()
const exact = tableValueFn(values)
const optimum = exact(0, 0)
const UPPER_MASK = (1 << UPPER_CATEGORY_COUNT) - 1

const entries: Entry[] = Array.from({ length: FILLED_STATES }, (_, filled) =>
  reachableUppers(filled).map((upper) => ({
    filled,
    upper,
    value: values[tableIndex(filled, upper)] ?? Number.NaN,
  }))
).flat()

const brotli = (bytes: Uint8Array): number =>
  brotliCompressSync(bytes, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).byteLength

/** 同じ filled の中で上段合計方向に差分を取る (ボーナスが決まった範囲は同値が続き 0 になる) */
const deltaEncoded = (ints: readonly number[], rows: readonly Entry[]) =>
  Int32Array.from(
    ints.map((n, i) =>
      i > 0 && rows[i - 1]?.filled === rows[i]?.filled
        ? n - (ints[i - 1] ?? 0)
        : n
    )
  )

const stepLabel = (step: number) =>
  step < 1 ? `1/${1 / step} 点刻み` : `${step} 点刻み`

const lossOf = (approx: ValueFn): number =>
  optimum - (evaluatePolicy(approx)[tableIndex(0, 0)] ?? Number.NaN)

const quantized = (step: number): Row => {
  const ints = entries.map(({ value }) => Math.round(value / step))
  const table = new Float64Array(values.length).fill(Number.NaN)

  entries.forEach(({ filled, upper }, i) => {
    table[tableIndex(filled, upper)] = (ints[i] ?? 0) * step
  })

  return {
    model: `厳密表を ${stepLabel(step)}に丸める`,
    entries: entries.length,
    bytes: brotli(new Uint8Array(deltaEncoded(ints, entries).buffer)),
    loss: lossOf(tableValueFn(table)),
  }
}

type LowerKey = { label: string; size: number; of: (filled: number) => number }

const openUpperCount = (filled: number) =>
  UPPER_CATEGORY_COUNT - popcount(filled & UPPER_MASK)

const popcount = (mask: number): number =>
  mask === 0 ? 0 : (mask & 1) + popcount(mask >> 1)

const LOWER_ONLY: LowerKey = {
  label: "L[下段]",
  size: 64,
  of: (filled) => filled >> UPPER_CATEGORY_COUNT,
}

const LOWER_AND_UPPER_COUNT: LowerKey = {
  label: "L[下段, 上段の残り役数]",
  size: 64 * (UPPER_CATEGORY_COUNT + 1),
  of: (filled) =>
    (filled >> UPPER_CATEGORY_COUNT) * (UPPER_CATEGORY_COUNT + 1) +
    openUpperCount(filled),
}

/** V ≈ L[下段側のキー] + U[上段の記入状況, 上段合計]。交互に平均を取って最小二乗に寄せる */
const additive = (step: number, key: LowerKey): Row => {
  const lowerOf = key.of
  const upperKey = (filled: number, upper: number) =>
    (filled & UPPER_MASK) * 64 + upper
  const lower = new Float64Array(key.size)
  const upperPart = new Float64Array(64 * 64)
  const refit = (
    target: Float64Array,
    keyOf: (e: Entry) => number,
    residual: (e: Entry) => number
  ) => {
    const sum = new Float64Array(target.length)
    const count = new Float64Array(target.length)

    for (const e of entries) {
      const k = keyOf(e)

      sum[k] = (sum[k] ?? 0) + residual(e)
      count[k] = (count[k] ?? 0) + 1
    }
    target.forEach((_, k) => {
      target[k] = (count[k] ?? 0) > 0 ? (sum[k] ?? 0) / (count[k] ?? 1) : 0
    })
  }
  const lowerKey = (e: Entry) => lowerOf(e.filled)
  const upperEntryKey = (e: Entry) => upperKey(e.filled, e.upper)

  for (let round = 0; round < 50; round += 1) {
    refit(upperPart, upperEntryKey, (e) => e.value - (lower[lowerKey(e)] ?? 0))
    refit(lower, lowerKey, (e) => e.value - (upperPart[upperEntryKey(e)] ?? 0))
  }

  const used = new Set(entries.map(upperEntryKey))
  const round = (n: number) => Math.round(n / step) * step
  const approx: ValueFn = (filled, upper) =>
    round(lower[lowerOf(filled)] ?? 0) +
    round(upperPart[upperKey(filled, upper)] ?? 0)
  const params = [
    ...lower,
    ...[...used].sort((a, b) => a - b).map((k) => upperPart[k] ?? 0),
  ]
  const rmse = Math.sqrt(
    entries.reduce(
      (s, e) => s + (approx(e.filled, e.upper) - e.value) ** 2,
      0
    ) / entries.length
  )

  return {
    model: `加法近似 ${key.label} + U[上段, 合計] (${stepLabel(step)}, RMSE ${rmse.toFixed(2)})`,
    entries: params.length,
    bytes: brotli(
      new Uint8Array(
        Int32Array.from(params.map((p) => Math.round(p / step))).buffer
      )
    ),
    loss: lossOf(approx),
  }
}

it("measures table size against expected-score loss", () => {
  const distinctPerFilled = Array.from(
    { length: FILLED_STATES },
    (_, filled) =>
      new Set(reachableUppers(filled).map((u) => exact(filled, u).toFixed(9)))
        .size
  ).reduce((a, b) => a + b, 0)
  const rawValues = Float64Array.from(entries.map((e) => e.value))
  const rows: Row[] = [
    {
      model: "厳密表 float64 そのまま (到達局面のみ)",
      entries: entries.length,
      bytes: brotli(new Uint8Array(rawValues.buffer)),
      loss: lossOf(exact),
    },
    {
      model: "厳密表から同値を畳む (ボーナス確定 / 到達不能)",
      entries: distinctPerFilled,
      bytes: Number.NaN,
      loss: 0,
    },
    ...[1 / 4096, 1 / 1024, 1 / 256, 1 / 16, 1, 4].map(quantized),
    additive(1 / 16, LOWER_ONLY),
    additive(1 / 16, LOWER_AND_UPPER_COUNT),
  ]
  const table = [
    `最適期待値: ${optimum.toFixed(5)} / 生成: ${new Date().toISOString()} / 表: ${tablePath()}`,
    "",
    "| model | entries | brotli bytes | loss (点/ゲーム) |",
    "| --- | ---: | ---: | ---: |",
    ...rows.map(
      (r) =>
        `| ${r.model} | ${r.entries} | ${Number.isNaN(r.bytes) ? "-" : r.bytes} | ${r.loss.toExponential(3)} |`
    ),
  ].join("\n")

  writeFileSync(
    resolve(import.meta.dirname, "../table/measure.md"),
    `${table}\n`
  )
  // 近似の評価器そのものが正しいか: 厳密表で手を選べば損失は 0
  expect(Math.abs(rows[0]?.loss ?? 1)).toBeLessThan(1e-9)
})
