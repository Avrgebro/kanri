/**
 * `date` columns are calendar days with no timezone ("2026-09-23"). Parse and
 * format them from local parts: `new Date("2026-09-23")` is UTC midnight,
 * which lands on the previous day anywhere west of Greenwich.
 */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function formatDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, n: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + n)
  return next
}

/** Whole calendar days from `from` to `to`, ignoring the time of day. */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })

/** "Sep 7". */
export const shortDate = (date: Date) => SHORT.format(date)
