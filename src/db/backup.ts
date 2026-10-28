import { calculateStock } from '../lib/stock'
import type { AppData } from '../types'
import { ValidationError } from './actions'
import { db, loadAll } from './db'

// A backup is one JSON file holding every record. Restoring replaces all data on this device.

const APP_ID = 'auto-parts-manager'
const BACKUP_VERSION = 1

export interface Backup {
  app: typeof APP_ID
  version: number
  exportedAt: string
  data: AppData
}

export async function createBackup(): Promise<Backup> {
  return { app: APP_ID, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: await loadAll() }
}

// The fields every record must have, so a damaged or unrelated file is refused before anything is replaced.
const SHAPES: Record<keyof AppData, Record<string, 'string' | 'number' | 'lines'>> = {
  parts: {
    id: 'number', name: 'string', partNumber: 'string', condition: 'string', vehicle: 'string', salePrice: 'number',
    minStock: 'number', openingQuantity: 'number', openingUnitCost: 'number', notes: 'string', createdAt: 'number',
  },
  purchases: { id: 'number', date: 'string', supplier: 'string', lines: 'lines', notes: 'string', createdAt: 'number' },
  sales: { id: 'number', date: 'string', customer: 'string', lines: 'lines', notes: 'string', createdAt: 'number' },
  repairs: {
    id: 'number', date: 'string', customer: 'string', vehicle: 'string', description: 'string', lines: 'lines',
    labor: 'number', createdAt: 'number',
  },
  expenses: { id: 'number', date: 'string', category: 'string', description: 'string', amount: 'number', createdAt: 'number' },
}

const TABLE_NAMES: Record<keyof AppData, string> = {
  parts: 'القطع', purchases: 'المشتريات', sales: 'المبيعات', repairs: 'التصليحات', expenses: 'المصاريف',
}

/** Checks a backup file's text and returns its contents, or throws a ValidationError explaining the problem. */
export function readBackup(text: string): Backup {
  let backup: Backup
  try {
    backup = JSON.parse(text)
  } catch {
    throw new ValidationError('هذا الملف ليس ملف نسخة احتياطية صالحاً.')
  }
  if (backup?.app !== APP_ID) throw new ValidationError('هذا الملف ليس نسخة احتياطية من هذا التطبيق.')
  if (backup.version !== BACKUP_VERSION) throw new ValidationError('هذه النسخة الاحتياطية صادرة عن إصدار مختلف من التطبيق.')

  for (const [table, shape] of Object.entries(SHAPES)) {
    const records: unknown = backup.data?.[table as keyof AppData]
    if (!Array.isArray(records) || !records.every((record) => hasShape(record, shape))) {
      throw new ValidationError(`قسم "${TABLE_NAMES[table as keyof AppData]}" في النسخة الاحتياطية تالف، لذلك لا يمكن استرجاعها.`)
    }
  }
  if (calculateStock(backup.data).problems.length > 0) {
    throw new ValidationError('أرقام المخزون في النسخة الاحتياطية غير متطابقة، لذلك لا يمكن استرجاعها.')
  }
  return backup
}

export async function restoreBackup(data: AppData): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await Promise.all([
      db.parts.bulkAdd(data.parts),
      db.purchases.bulkAdd(data.purchases),
      db.sales.bulkAdd(data.sales),
      db.repairs.bulkAdd(data.repairs),
      db.expenses.bulkAdd(data.expenses),
    ])
  })
}

// When the last backup was saved, remembered in this browser only so the dashboard can remind the user.
const LAST_BACKUP_KEY = 'lastBackupAt'

export function getLastBackupDate(): Date | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY)
    return value ? new Date(value) : null
  } catch {
    return null
  }
}

export function rememberBackup(date = new Date()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, date.toISOString())
  } catch {
    // Storage can be blocked (private browsing); the reminder is only a convenience.
  }
}

function hasShape(record: unknown, shape: Record<string, 'string' | 'number' | 'lines'>): boolean {
  if (typeof record !== 'object' || record === null) return false
  const values = record as Record<string, unknown>
  return Object.entries(shape).every(([key, type]) => {
    const value = values[key]
    if (type === 'lines') {
      return Array.isArray(value) && value.every((line) => hasShape(line, { partId: 'number', quantity: 'number', unitPrice: 'number' }))
    }
    return type === 'number' ? Number.isSafeInteger(value) : typeof value === type
  })
}
