import type { Hand, Rank } from "../reference/ev.js"

/** Wizard of Odds の表の列順 */
export const UPCARDS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1]

export const handOfLabel = (label: string): Hand => {
  const soft = /^Soft (\d+)$/.exec(label)

  if (soft) return { hard: Number(soft[1]) - 10, hasAce: true }

  return { hard: Number(label.replace(/^Hard /, "")), hasAce: false }
}

export const rankOfPairLabel = (label: string): Rank =>
  (label.startsWith("A") ? 1 : Number(label.split(",")[0])) as Rank
