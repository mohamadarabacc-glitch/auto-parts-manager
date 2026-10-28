// All money in the app is stored and calculated as whole numbers of cents (12.50 is stored as 1250).
// Whole numbers add and multiply exactly; decimals do not (0.1 + 0.2 gives 0.30000000000000004).

export type Cents = number

const AMOUNT_PATTERN = /^(\d*)(?:\.(\d{0,2}))?$/

/**
 * Converts typed text such as "12", "12.5" or "12.50" to cents.
 * A comma is accepted as the decimal point ("12,50") because some phone keyboards only offer a comma.
 * Returns null for anything else, including negative numbers, more than 2 decimals,
 * and thousands separators ("1,000" is rejected rather than guessed).
 */
export function parseMoney(input: string): Cents | null {
  const match = AMOUNT_PATTERN.exec(input.trim().replace(',', '.'))
  if (!match) return null
  const [, whole, fraction = ''] = match
  if (whole === '' && fraction === '') return null
  const cents = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

/** Formats cents for display: 123450 -> "1,234.50", -500 -> "-5.00". */
export function formatMoney(amount: Cents): string {
  return format(amount, true)
}

/** Formats cents for an input box, without thousands separators: 123450 -> "1234.50". */
export function formatMoneyPlain(amount: Cents): string {
  return format(amount, false)
}

function format(amount: Cents, grouping: boolean): string {
  assertCents(amount)
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  const fraction = abs % 100
  const whole = (abs - fraction) / 100
  return `${sign}${grouping ? whole.toLocaleString('en-US') : whole}.${String(fraction).padStart(2, '0')}`
}

/** Total for a number of items at one price: 3 x 12.50 = 37.50. */
export function multiplyMoney(amount: Cents, quantity: number): Cents {
  assertCents(amount)
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`Invalid quantity: ${quantity}`)
  }
  return assertCents(amount * quantity)
}

/**
 * Divides an amount and rounds to the nearest cent, halves rounding up: 1000 / 3 = 333, 1001 / 2 = 501.
 * Uses whole-number maths only, so the result is exact. Only for amounts of 0 or more.
 */
export function divideMoney(amount: Cents, divisor: number): Cents {
  assertCents(amount)
  if (amount < 0) throw new RangeError(`Cannot divide a negative amount: ${amount}`)
  if (!Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new RangeError(`Invalid divisor: ${divisor}`)
  }
  const remainder = amount % divisor
  const quotient = (amount - remainder) / divisor
  return remainder * 2 >= divisor ? quotient + 1 : quotient
}

/** Adds up a list of amounts. An empty list totals 0. */
export function sumMoney(amounts: readonly Cents[]): Cents {
  return amounts.reduce((total, amount) => assertCents(total + assertCents(amount)), 0)
}

// Fails loudly on fractions of a cent or numbers too large to be exact,
// so a calculation bug shows up as an error instead of a wrong total.
function assertCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Invalid money amount: ${value}`)
  }
  return value
}
