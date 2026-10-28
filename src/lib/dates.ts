// Dates are stored as "YYYY-MM-DD" text in local time, so they sort and compare correctly as plain text.

export interface DateRange {
  from: string
  to: string
}

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function today(): string {
  return toISODate(new Date())
}

/** First to last day of the month that contains `date`. */
export function monthRange(date = new Date()): DateRange {
  const year = date.getFullYear()
  const month = date.getMonth()
  return {
    from: toISODate(new Date(year, month, 1)),
    to: toISODate(new Date(year, month + 1, 0)),
  }
}

export function lastMonthRange(date = new Date()): DateRange {
  return monthRange(new Date(date.getFullYear(), date.getMonth() - 1, 1))
}

export function yearRange(date = new Date()): DateRange {
  const year = date.getFullYear()
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

/** Sort order for lists: latest date first, and the most recently entered first within a day. */
export function newestFirst(a: { date: string; createdAt: number }, b: { date: string; createdAt: number }): number {
  return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || b.createdAt - a.createdAt
}

/** True when `date` is on or between the first and last day of the range. */
export function isInRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to
}

/** Arabic (Lebanon) month names and date order, with Western digits to match the money amounts. */
export const LOCALE = 'ar-LB-u-nu-latn'
