import Dexie, { type EntityTable } from 'dexie'
import type { AppData, Expense, Part, Purchase, Repair, Sale } from '../types'

// All data lives in the browser's IndexedDB on this device. Use Backup to copy it elsewhere.
export const db = new Dexie('auto-parts-manager') as Dexie & {
  parts: EntityTable<Part, 'id'>
  purchases: EntityTable<Purchase, 'id'>
  sales: EntityTable<Sale, 'id'>
  repairs: EntityTable<Repair, 'id'>
  expenses: EntityTable<Expense, 'id'>
}

db.version(1).stores({
  parts: '++id',
  purchases: '++id, date',
  sales: '++id, date',
  repairs: '++id, date',
  expenses: '++id, date',
})

export async function loadAll(): Promise<AppData> {
  const [parts, purchases, sales, repairs, expenses] = await Promise.all([
    db.parts.toArray(),
    db.purchases.toArray(),
    db.sales.toArray(),
    db.repairs.toArray(),
    db.expenses.toArray(),
  ])
  return { parts, purchases, sales, repairs, expenses }
}
