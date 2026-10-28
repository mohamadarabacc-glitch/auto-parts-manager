import { describe, expect, it } from 'vitest'
import { divideMoney, formatMoney, formatMoneyPlain, multiplyMoney, parseMoney, sumMoney } from './money'

describe('parseMoney', () => {
  it.each([
    ['0', 0],
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['12.05', 1205],
    ['0.01', 1],
    ['.5', 50],
    ['12.', 1200],
    [' 7.25 ', 725],
    ['12,50', 1250],
    ['007', 700],
  ])('reads "%s" as %i cents', (input, expected) => {
    expect(parseMoney(input)).toBe(expected)
  })

  it('is exact where decimal maths is not', () => {
    // 0.29 * 100 = 28.999999999999996 and 1.15 * 100 = 114.99999999999999 with plain numbers.
    expect(parseMoney('0.29')).toBe(29)
    expect(parseMoney('1.15')).toBe(115)
    expect(parseMoney('19.99')).toBe(1999)
  })

  it.each(['', ' ', '.', 'abc', '-5', '+5', '1.234', '1,000', '1,234.50', '12.5.0', '1e3', 'Infinity'])(
    'rejects "%s"',
    (input) => {
      expect(parseMoney(input)).toBeNull()
    },
  )

  it('rejects amounts too large to store exactly', () => {
    expect(parseMoney('999999999999999999')).toBeNull()
  })
})

describe('formatMoney', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [150, '1.50'],
    [123450, '1,234.50'],
    [100000000, '1,000,000.00'],
    [-500, '-5.00'],
    [-5, '-0.05'],
  ])('shows %i cents as "%s"', (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected)
  })

  it('round-trips with parseMoney', () => {
    expect(formatMoney(parseMoney('1234.5')!)).toBe('1,234.50')
  })

  it('has a plain form for input boxes that parseMoney reads back', () => {
    expect(formatMoneyPlain(123450)).toBe('1234.50')
    expect(formatMoneyPlain(5)).toBe('0.05')
    expect(parseMoney(formatMoneyPlain(98765432))).toBe(98765432)
  })

  it('refuses fractions of a cent', () => {
    expect(() => formatMoney(1.5)).toThrow(RangeError)
  })
})

describe('multiplyMoney', () => {
  it('multiplies a price by a quantity', () => {
    expect(multiplyMoney(1250, 3)).toBe(3750)
    expect(multiplyMoney(10, 3)).toBe(30) // 0.10 x 3 = 0.30 exactly
    expect(multiplyMoney(1999, 0)).toBe(0)
  })

  it('refuses invalid quantities', () => {
    expect(() => multiplyMoney(1000, 1.5)).toThrow(RangeError)
    expect(() => multiplyMoney(1000, -1)).toThrow(RangeError)
  })

  it('refuses results too large to be exact', () => {
    expect(() => multiplyMoney(Number.MAX_SAFE_INTEGER, 2)).toThrow(RangeError)
  })
})

describe('divideMoney', () => {
  it.each([
    [1000, 4, 250], // exact
    [1000, 3, 333], // 333.33 rounds down
    [2000, 3, 667], // 666.67 rounds up
    [1001, 2, 501], // 500.5 rounds half up
    [1, 2, 1],
    [1, 3, 0],
    [0, 7, 0],
  ])('%i / %i = %i', (amount, divisor, expected) => {
    expect(divideMoney(amount, divisor)).toBe(expected)
  })

  it('refuses zero, negative or fractional divisors and negative amounts', () => {
    expect(() => divideMoney(100, 0)).toThrow(RangeError)
    expect(() => divideMoney(100, -2)).toThrow(RangeError)
    expect(() => divideMoney(100, 1.5)).toThrow(RangeError)
    expect(() => divideMoney(-100, 2)).toThrow(RangeError)
  })
})

describe('sumMoney', () => {
  it('adds amounts exactly', () => {
    expect(sumMoney([10, 20])).toBe(30) // 0.10 + 0.20 = 0.30 exactly
    expect(sumMoney([1999, 2999, -500])).toBe(4498)
  })

  it('totals an empty list as 0', () => {
    expect(sumMoney([])).toBe(0)
  })

  it('refuses fractions of a cent', () => {
    expect(() => sumMoney([100, 1.5])).toThrow(RangeError)
  })
})
