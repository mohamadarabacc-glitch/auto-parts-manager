/** Reads a whole number typed by the user ("3" -> 3). Returns null for blanks, decimals, negatives or text. */
export function parseQuantity(input: string): number | null {
  const text = input.trim()
  if (!/^\d+$/.test(text)) return null
  const value = Number(text)
  return Number.isSafeInteger(value) ? value : null
}
