import { calculateStock, type StockData } from '../lib/stock'
import type { Draft, Expense, Part, PartLine, Purchase, Repair, Sale } from '../types'
import { db } from './db'

// Every change that affects stock goes through these functions. Each one replays the stock with the change
// applied and refuses it if any part would go below zero on any date, all inside one database transaction.

/** An error caused by the user's input or a business rule; its message is safe to show on screen. */
export class ValidationError extends Error {}

export async function savePart(part: Draft<Part>): Promise<number> {
  if (!part.name.trim()) throw new ValidationError('اكتب اسم القطعة.')
  checkMoney(part.salePrice, part.openingUnitCost)
  checkWholeNumber(part.minStock, part.openingQuantity)
  return writeWithStockCheck(
    (data) => ({ ...data, parts: replace(data.parts, part) }),
    () => db.parts.put(part),
  )
}

export async function deletePart(id: number): Promise<void> {
  await db.transaction('rw', [db.parts, db.purchases, db.sales, db.repairs], async () => {
    const records = [...(await db.purchases.toArray()), ...(await db.sales.toArray()), ...(await db.repairs.toArray())]
    if (records.some((record) => record.lines.some((line) => line.partId === id))) {
      throw new ValidationError('لا يمكن حذف هذه القطعة لأنها مستعملة في مشتريات أو مبيعات أو تصليحات.')
    }
    await db.parts.delete(id)
  })
}

export async function savePurchase(purchase: Draft<Purchase>): Promise<number> {
  checkDate(purchase.date)
  checkLines(purchase.lines, true)
  return writeWithStockCheck(
    (data) => ({ ...data, purchases: replace(data.purchases, purchase) }),
    () => db.purchases.put(purchase),
  )
}

export async function deletePurchase(id: number): Promise<void> {
  await writeWithStockCheck(
    (data) => ({ ...data, purchases: data.purchases.filter((purchase) => purchase.id !== id) }),
    () => db.purchases.delete(id),
  )
}

export async function saveSale(sale: Draft<Sale>): Promise<number> {
  checkDate(sale.date)
  checkLines(sale.lines, true)
  return writeWithStockCheck(
    (data) => ({ ...data, sales: replace(data.sales, sale) }),
    () => db.sales.put(sale),
  )
}

export async function deleteSale(id: number): Promise<void> {
  await db.sales.delete(id) // removing stock going out can never make stock run short
}

export async function saveRepair(repair: Draft<Repair>): Promise<number> {
  checkDate(repair.date)
  if (!repair.description.trim()) throw new ValidationError('اكتب وصف الشغل.')
  checkLines(repair.lines, false)
  checkMoney(repair.labor)
  return writeWithStockCheck(
    (data) => ({ ...data, repairs: replace(data.repairs, repair) }),
    () => db.repairs.put(repair),
  )
}

export async function deleteRepair(id: number): Promise<void> {
  await db.repairs.delete(id)
}

export async function saveExpense(expense: Draft<Expense>): Promise<number> {
  checkDate(expense.date)
  checkMoney(expense.amount)
  if (expense.amount <= 0) throw new ValidationError('يجب أن يكون المبلغ أكثر من 0.')
  return db.expenses.put(expense)
}

export async function deleteExpense(id: number): Promise<void> {
  await db.expenses.delete(id)
}

async function writeWithStockCheck<T>(change: (data: StockData) => StockData, write: () => Promise<T>): Promise<T> {
  return db.transaction('rw', [db.parts, db.purchases, db.sales, db.repairs], async () => {
    const [parts, purchases, sales, repairs] = await Promise.all([
      db.parts.toArray(),
      db.purchases.toArray(),
      db.sales.toArray(),
      db.repairs.toArray(),
    ])
    const [problem] = calculateStock(change({ parts, purchases, sales, repairs })).problems
    if (problem) {
      throw new ValidationError(
        `لا يوجد مخزون كافٍ من "${problem.partName}" بتاريخ ${problem.date} (ينقص ${problem.shortBy}).`,
      )
    }
    return write()
  })
}

// Returns the list with the record added (new, given a temporary id) or replacing the saved one with the same id.
function replace<T extends { id: number }>(list: T[], record: Draft<T>): T[] {
  if (record.id === undefined) return [...list, { ...record, id: -1 } as T]
  return list.map((item) => (item.id === record.id ? (record as T) : item))
}

function checkDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ValidationError('اختر التاريخ.')
}

function checkLines(lines: PartLine[], required: boolean) {
  if (required && lines.length === 0) throw new ValidationError('أضف قطعة واحدة على الأقل.')
  for (const line of lines) {
    if (!Number.isSafeInteger(line.partId)) throw new ValidationError('اختر قطعة في كل سطر.')
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      throw new ValidationError('يجب أن تكون الكميات أعداداً صحيحة، 1 أو أكثر.')
    }
    checkMoney(line.unitPrice)
  }
}

function checkMoney(...amounts: number[]) {
  if (amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0)) {
    throw new ValidationError('يجب أن تكون المبالغ 0 أو أكثر، مع رقمين بعد الفاصلة كحد أقصى.')
  }
}

function checkWholeNumber(...values: number[]) {
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new ValidationError('يجب أن تكون الكميات أعداداً صحيحة، 0 أو أكثر.')
  }
}
