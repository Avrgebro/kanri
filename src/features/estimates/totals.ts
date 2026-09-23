import type { Estimate, EstimateLine } from '@/types/domain'

export interface LineTotal {
  line: EstimateLine
  amount_cents: number
}

export interface SectionGroup {
  /** null for lines that appear before any section header. */
  section: EstimateLine | null
  lines: LineTotal[]
  subtotal_cents: number
  hours: number
}

export interface EstimateTotals {
  groups: SectionGroup[]
  subtotal_cents: number
  discount_cents: number
  tax_cents: number
  total_cents: number
  total_hours: number
}

export const lineAmount = (l: EstimateLine) =>
  l.kind === 'section' ? 0 : Math.round(l.qty * l.unit_price_cents)

/**
 * Groups lines under their preceding section header and computes totals.
 * Tax applies to the discounted taxable subtotal.
 */
export function computeTotals(
  estimate: Pick<Estimate, 'tax_rate' | 'discount_cents'>,
  lines: EstimateLine[],
): EstimateTotals {
  const ordered = [...lines].sort((a, b) => a.position - b.position)

  const groups: SectionGroup[] = []
  let current: SectionGroup | null = null

  for (const line of ordered) {
    if (line.kind === 'section') {
      current = { section: line, lines: [], subtotal_cents: 0, hours: 0 }
      groups.push(current)
      continue
    }
    if (!current) {
      current = { section: null, lines: [], subtotal_cents: 0, hours: 0 }
      groups.push(current)
    }
    const amount = lineAmount(line)
    current.lines.push({ line, amount_cents: amount })
    current.subtotal_cents += amount
    current.hours += Number(line.hours ?? 0)
  }

  const subtotal = groups.reduce((s, g) => s + g.subtotal_cents, 0)
  const taxableBase = ordered
    .filter((l) => l.kind === 'item' && l.taxable)
    .reduce((s, l) => s + lineAmount(l), 0)

  const discount = Math.min(estimate.discount_cents, subtotal)
  // Apply the discount proportionally to the taxable portion.
  const discountedTaxable =
    subtotal === 0 ? 0 : taxableBase - Math.round((discount * taxableBase) / subtotal)

  const tax = Math.round((discountedTaxable * Number(estimate.tax_rate)) / 100)

  return {
    groups,
    subtotal_cents: subtotal,
    discount_cents: discount,
    tax_cents: tax,
    total_cents: subtotal - discount + tax,
    total_hours: groups.reduce((s, g) => s + g.hours, 0),
  }
}
