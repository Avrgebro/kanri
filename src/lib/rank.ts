/**
 * Fractional ranking for drag-and-drop ordering: dropping between two rows is
 * a single UPDATE instead of reindexing the whole column.
 *
 * Positions drift toward float precision after ~50 consecutive inserts in the
 * same gap; `needsRebalance` flags when a column should be renumbered.
 */
const STEP = 1024

export function rankBetween(before?: number | null, after?: number | null): number {
  if (before == null && after == null) return STEP
  if (before == null) return after! - STEP
  if (after == null) return before + STEP
  return (before + after) / 2
}

export function needsRebalance(positions: number[]): boolean {
  const sorted = [...positions].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i] - sorted[i - 1]) < 0.0001) return true
  }
  return false
}

export function rebalance<T>(rows: T[], set: (row: T, pos: number) => T): T[] {
  return rows.map((row, i) => set(row, (i + 1) * STEP))
}
