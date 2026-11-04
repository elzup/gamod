import {
  MAX_DISKS,
  type Move,
  type Peg,
  parseState,
  type StateInput,
} from "./schema.js"

/**
 * 攻略法。大きい円盤から順に「その円盤を最終的に置くべき棒」t[k] を決める。
 * - 円盤 k が t[k] にあれば、小さい円盤も同じ棒を目指す
 * - 無ければ、小さい円盤を k の今の棒でも t[k] でもない第 3 の棒へ逃がしてから k を動かす
 * 棒を 0, 1, 2 とすると両方とも t[k-1] = -(t[k] + pegs[k]) mod 3 の 1 式にまとまる
 * (第 3 の棒は 3 - a - b、同じ棒なら -2t ≡ t)。
 *
 * 目標に無い円盤のうち最小のものは、それより小さい円盤が全て第 3 の棒に揃っているので今すぐ動かせる。
 * それを目標へ動かす手が、最短手順の次の 1 手になる (最短手順は一意)。
 */

const nextTarget = (target: Peg, peg: Peg): Peg =>
  ((6 - target - peg) % 3) as Peg

/** 最短手順の次の 1 手。全円盤が目標の棒に揃っていれば null。円盤の枚数 n に対して O(n) */
export const bestMove = (input: StateInput): Move | null => {
  const { pegs, target } = parseState(input)
  let goal: Peg = target
  let move: Move | null = null

  for (let disk = pegs.length - 1; disk >= 0; disk--) {
    const peg = pegs[disk] as Peg

    if (peg !== goal) move = { disk, from: peg, to: goal }
    goal = nextTarget(goal, peg)
  }

  return move
}

/**
 * 目標の棒に揃うまでの最短手数。目標に無い円盤 k ごとに 2^k 手かかる
 * (k 自身を動かす 1 手と、そのあと小さい k 枚の塔を k の上へ運ぶ 2^k - 1 手。小さい円盤を逃がす手は、小さい円盤の側で数える)。
 */
export const movesLeft = (input: StateInput): number => {
  const { pegs, target } = parseState(input)
  let goal: Peg = target
  let left = 0

  for (let disk = pegs.length - 1; disk >= 0; disk--) {
    const peg = pegs[disk] as Peg

    if (peg !== goal) left += 2 ** disk
    goal = nextTarget(goal, peg)
  }

  return left
}

/** 棒 1 と棒 2 を入れ替える */
const mirror = (peg: number): Peg => (peg === 0 ? 0 : 3 - peg) as Peg

/**
 * disks 枚を棒 0 から棒 2 へ移す最短手順の step 手目 (1 始まり)。局面を持たずに O(1) で求める。
 * - 動く円盤は step の最下位の立っているビットの位置 (1, 2, 1, 3, 1, 2, 1, ...)
 * - 棒は step のビット演算で決まる。この式は奇数枚なら棒 2 へ、偶数枚なら棒 1 へ移す手順になるので、
 *   偶数枚では棒 1 と棒 2 を入れ替える
 */
export const moveAt = (disks: number, step: number): Move => {
  if (!Number.isInteger(disks) || disks < 1 || disks > MAX_DISKS)
    throw new Error(`disks must be an integer in 1..${MAX_DISKS}: ${disks}`)

  const total = 2 ** disks - 1

  if (!Number.isInteger(step) || step < 1 || step > total)
    throw new Error(`step must be an integer in 1..${total}: ${step}`)

  const disk = 31 - Math.clz32(step & -step)
  const from = (step & (step - 1)) % 3
  const to = ((step | (step - 1)) + 1) % 3

  return disks % 2 === 1
    ? { disk, from: from as Peg, to: to as Peg }
    : { disk, from: mirror(from), to: mirror(to) }
}
