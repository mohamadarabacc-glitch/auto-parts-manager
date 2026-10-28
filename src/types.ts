import type { Cents } from './lib/money'

// Records saved in the database. Money is always in cents; dates are "YYYY-MM-DD".
// Stock levels and costs are never stored: they are calculated from these records (see lib/stock.ts).

export type Condition = 'new' | 'used'

export interface Part {
  id: number
  name: string
  partNumber: string
  condition: Condition
  vehicle: string // which cars the part fits
  salePrice: Cents // usual selling price, suggested on sales and repairs
  minStock: number // warn when stock is at or below this (0 = no warning)
  openingQuantity: number // stock already on hand when the part was added to the app
  openingUnitCost: Cents
  notes: string
  createdAt: number
}

/** One part on a purchase, sale or repair. On a purchase, unitPrice is the cost paid per unit. */
export interface PartLine {
  partId: number
  quantity: number
  unitPrice: Cents
}

export interface Purchase {
  id: number
  date: string
  supplier: string
  lines: PartLine[]
  notes: string
  createdAt: number
}

export interface Sale {
  id: number
  date: string
  customer: string
  lines: PartLine[]
  notes: string
  createdAt: number
}

export interface Repair {
  id: number
  date: string
  customer: string
  vehicle: string
  description: string
  lines: PartLine[] // parts used, at the price charged to the customer
  labor: Cents
  createdAt: number
}

// Buying parts for stock is a purchase, not an expense, so there is deliberately no category for it.
export const EXPENSE_CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Transport', 'Tools & equipment', 'Other']

export interface Expense {
  id: number
  date: string
  category: string
  description: string
  amount: Cents
  createdAt: number
}

export interface AppData {
  parts: Part[]
  purchases: Purchase[]
  sales: Sale[]
  repairs: Repair[]
  expenses: Expense[]
}

/** A record that may not be saved yet: new records have no id until the database assigns one. */
export type Draft<T extends { id: number }> = Omit<T, 'id'> & { id?: number }

// What the screens show for the saved values above. The saved values stay in English so older data and backups still load.
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  Rent: 'إيجار',
  Salaries: 'رواتب',
  Utilities: 'كهرباء وماء وخدمات',
  Transport: 'نقل',
  'Tools & equipment': 'عدّة ومعدّات',
  Other: 'أخرى',
}

export function categoryLabel(category: string): string {
  return EXPENSE_CATEGORY_LABELS[category] ?? category
}

export const CONDITION_LABELS: Record<Condition, string> = { new: 'جديد', used: 'مستعمل' }
