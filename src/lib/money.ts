/**
 * All money is integer cents. Nothing in this app multiplies floats by prices.
 */
export const cents = (dollars: number) => Math.round(dollars * 100)
export const toDollars = (c: number) => c / 100

export function formatMoney(c: number, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(c / 100)
}

export function formatHours(h: number | null | undefined) {
  if (h == null) return '—'
  return `${Number(h) % 1 === 0 ? h : Number(h).toFixed(2)}h`
}
