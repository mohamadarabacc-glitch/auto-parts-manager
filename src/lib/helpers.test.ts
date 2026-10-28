import { describe, expect, it } from 'vitest'
import { isInRange, lastMonthRange, monthRange, toISODate, yearRange } from './dates'
import { parseQuantity } from './quantity'

describe('parseQuantity', () => {
  it.each([
    ['0', 0],
    ['3', 3],
    [' 12 ', 12],
    ['007', 7],
  ])('reads "%s" as %i', (input, expected) => {
    expect(parseQuantity(input)).toBe(expected)
  })

  it.each(['', ' ', '1.5', '-2', 'abc', '1e3', '1,000', '99999999999999999999'])('rejects "%s"', (input) => {
    expect(parseQuantity(input)).toBeNull()
  })
})

describe('dates', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('finds the first and last day of a month, including leap years', () => {
    expect(monthRange(new Date(2026, 9, 21))).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(monthRange(new Date(2028, 1, 10))).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(monthRange(new Date(2026, 1, 10))).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('finds last month across a year boundary', () => {
    expect(lastMonthRange(new Date(2026, 0, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })

  it('finds the whole year', () => {
    expect(yearRange(new Date(2026, 5, 1))).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })

  it('includes both the first and last day of a range', () => {
    const range = { from: '2026-10-01', to: '2026-10-31' }
    expect(isInRange('2026-10-01', range)).toBe(true)
    expect(isInRange('2026-10-31', range)).toBe(true)
    expect(isInRange('2026-09-30', range)).toBe(false)
    expect(isInRange('2026-11-01', range)).toBe(false)
  })
})
