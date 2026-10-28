import type { Part } from '../types'

/** Splits text into lowercase words, ignoring spaces and punctuation ("Mercedes C200, 2012" -> mercedes, c200, 2012). */
function wordsOf(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

/** True when every searched word is the start of some word in the text ("merc c200" is found in "Mercedes C200 2012"). */
function hasAllWords(text: string, searched: string[]): boolean {
  const words = wordsOf(text)
  return searched.every((s) => words.some((word) => word.startsWith(s)))
}

/**
 * Inventory search: a part matches when all the typed words are found anywhere in its name,
 * or all of them start a word in its "Fits" text. So "Mercedes" finds every Mercedes part,
 * "C300" finds C300 parts but not C200 ones, and "Mercedes C200" needs both words in Fits.
 * An empty search matches every part.
 */
export function matchesPartSearch(part: Pick<Part, 'name' | 'vehicle'>, search: string): boolean {
  const searched = wordsOf(search)
  if (searched.length === 0) return true
  const name = part.name.toLowerCase()
  return searched.every((s) => name.includes(s)) || hasAllWords(part.vehicle, searched)
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

// Arabic month names: the Lebanese names first, then the other common ones (يناير، فبراير…).
const ARABIC_MONTHS = [
  'كانون الثاني يناير', 'شباط فبراير', 'آذار مارس', 'نيسان أبريل', 'أيار مايو', 'حزيران يونيو',
  'تموز يوليو', 'آب أغسطس', 'أيلول سبتمبر', 'تشرين الأول أكتوبر', 'تشرين الثاني نوفمبر', 'كانون الأول ديسمبر',
].map((names) => wordsOf(withPlainAlef(names)))

/** Treats أ إ آ as ا, since people often type Arabic without them ("اذار" finds "آذار"). */
function withPlainAlef(text: string): string {
  return text.replace(/[أإآ]/g, 'ا')
}

/**
 * True when one typed word fits a sale date ("YYYY-MM-DD"):
 * a month name or its first 3+ letters ("oct"), an Arabic month name or its start ("تشرين"), a month number ("10"), a year ("2026"),
 * or the start of a full date ("2026-10" or "2026-10-05").
 */
function matchesDate(date: string, word: string): boolean {
  const [year, month] = date.split('-').map(Number)
  if (/^\p{Script=Arabic}{2,}$/u.test(word)) return ARABIC_MONTHS[month - 1].some((name) => name.startsWith(withPlainAlef(word)))
  if (/^\p{L}{3,}$/u.test(word)) return MONTHS[month - 1].startsWith(word)
  if (/^\d{1,2}$/.test(word)) return Number(word) === month
  if (/^\d{4}$/.test(word)) return Number(word) === year
  const full = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(word)
  if (!full) return false
  const typed = [full[1], full[2].padStart(2, '0'), full[3]?.padStart(2, '0')].filter(Boolean).join('-')
  return date.startsWith(typed)
}

/**
 * Sales and purchases search: a record matches when every typed word is found in the name of one of its parts
 * or fits its date. So "coupling" finds every sale (or purchase) with a coupling, "october" (or "10") every one
 * made in October, and "coupling oct 2026" the couplings sold in October 2026.
 * An empty search matches every record.
 */
export function matchesRecordSearch(date: string, partNames: string[], search: string): boolean {
  const names = partNames.join(' ').toLowerCase()
  return search
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)
    .every((word) => names.includes(word) || matchesDate(date, word))
}
