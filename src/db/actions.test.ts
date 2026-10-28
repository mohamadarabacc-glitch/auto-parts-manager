import { describe, expect, it } from 'vitest'
import { calculateStock } from '../lib/stock'
import type { Draft, Part, PartLine } from '../types'
import {
  ValidationError,
  deletePart,
  deletePurchase,
  saveExpense,
  savePart,
  savePurchase,
  saveRepair,
  saveSale,
} from './actions'
import { db, loadAll } from './db'

const filter = (overrides: Partial<Draft<Part>> = {}): Draft<Part> => ({
  name: 'Oil filter',
  partNumber: 'OF-1',
  condition: 'new',
  vehicle: 'Corolla 2015',
  salePrice: 1500,
  minStock: 0,
  openingQuantity: 0,
  openingUnitCost: 0,
  notes: '',
  createdAt: 1,
  ...overrides,
})

const lines = (partId: number, quantity: number, unitPrice = 1500): PartLine[] => [{ partId, quantity, unitPrice }]
const purchase = (partId: number, quantity: number, unitCost: number, date = '2026-10-01') => ({
  date, supplier: 'Parts Co', lines: lines(partId, quantity, unitCost), notes: '', createdAt: 2,
})
const sale = (partId: number, quantity: number, date = '2026-10-02') => ({
  date, customer: '', lines: lines(partId, quantity), notes: '', createdAt: 3,
})
const repair = (partId: number, quantity: number) => ({
  date: '2026-10-03', customer: 'A. Driver', vehicle: 'Corolla', description: 'Oil change',
  lines: lines(partId, quantity, 2000), labor: 3000, createdAt: 4,
})

async function stockOf(partId: number) {
  return calculateStock(await loadAll()).stock.get(partId)
}

describe('saving and reading data', () => {
  it('stores a part and reads it back from the database', async () => {
    const id = await savePart(filter({ openingQuantity: 4, openingUnitCost: 900 }))
    expect(await db.parts.get(id)).toMatchObject({ name: 'Oil filter', openingQuantity: 4, openingUnitCost: 900 })
    expect(await stockOf(id)).toEqual({ quantity: 4, value: 3600 })
  })

  it('adds purchased stock at its cost', async () => {
    const id = await savePart(filter())
    await savePurchase(purchase(id, 5, 800))
    expect(await stockOf(id)).toEqual({ quantity: 5, value: 4000 })
  })
})

describe('stock rules', () => {
  it('refuses a sale larger than the stock and saves nothing', async () => {
    const id = await savePart(filter({ openingQuantity: 2, openingUnitCost: 900 }))
    const attempt = saveSale(sale(id, 3))
    await expect(attempt).rejects.toThrow(ValidationError)
    await expect(attempt).rejects.toThrow('لا يوجد مخزون كافٍ من "Oil filter" بتاريخ 2026-10-02 (ينقص 1).')
    expect(await db.sales.count()).toBe(0)
    expect(await stockOf(id)).toEqual({ quantity: 2, value: 1800 })
  })

  it('deducts repair parts once, also when the repair is edited', async () => {
    const id = await savePart(filter({ openingQuantity: 5, openingUnitCost: 100 }))
    const repairId = await saveRepair(repair(id, 2))
    expect(await stockOf(id)).toEqual({ quantity: 3, value: 300 })

    await saveRepair({ ...repair(id, 3), id: repairId })
    expect(await db.repairs.count()).toBe(1)
    expect(await stockOf(id)).toEqual({ quantity: 2, value: 200 })
  })

  it('refuses deleting a purchase whose stock was already sold', async () => {
    const id = await savePart(filter())
    const purchaseId = await savePurchase(purchase(id, 5, 800))
    await saveSale(sale(id, 3))
    await expect(deletePurchase(purchaseId)).rejects.toThrow(ValidationError)
    expect(await db.purchases.count()).toBe(1)
  })

  it('allows deleting a purchase whose stock is unused', async () => {
    const id = await savePart(filter())
    const purchaseId = await savePurchase(purchase(id, 5, 800))
    await deletePurchase(purchaseId)
    expect(await stockOf(id)).toEqual({ quantity: 0, value: 0 })
  })

  it('refuses lowering opening stock below what was already sold', async () => {
    const id = await savePart(filter({ openingQuantity: 5, openingUnitCost: 100 }))
    await saveSale(sale(id, 4))
    await expect(savePart(filter({ id, openingQuantity: 3, openingUnitCost: 100 }))).rejects.toThrow(ValidationError)
    expect((await db.parts.get(id))?.openingQuantity).toBe(5)
  })

  it('refuses deleting a part that is in use, but deletes an unused one', async () => {
    const used = await savePart(filter())
    const unused = await savePart(filter({ name: 'Air filter' }))
    await savePurchase(purchase(used, 1, 500))
    await expect(deletePart(used)).rejects.toThrow(ValidationError)
    await deletePart(unused)
    expect(await db.parts.count()).toBe(1)
  })
})

describe('input checks', () => {
  it('refuses incomplete or invalid records', async () => {
    const id = await savePart(filter({ openingQuantity: 1 }))
    await expect(saveSale({ ...sale(id, 1), lines: [] })).rejects.toThrow('أضف قطعة واحدة على الأقل.')
    await expect(saveSale({ ...sale(id, 1), date: '' })).rejects.toThrow('اختر التاريخ.')
    await expect(saveSale(sale(id, 0))).rejects.toThrow(ValidationError)
    await expect(savePart(filter({ name: ' ' }))).rejects.toThrow('اكتب اسم القطعة.')
    await expect(
      saveExpense({ date: '2026-10-01', category: 'Rent', description: '', amount: 0, createdAt: 1 }),
    ).rejects.toThrow(ValidationError)
    expect(await db.sales.count()).toBe(0)
    expect(await db.expenses.count()).toBe(0)
  })
})
