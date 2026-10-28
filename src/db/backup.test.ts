import { describe, expect, it } from 'vitest'
import { saveExpense, savePart, savePurchase, saveRepair, saveSale } from './actions'
import { createBackup, readBackup, restoreBackup } from './backup'
import { loadAll } from './db'

async function addSampleData() {
  const partId = await savePart({
    name: 'Spark plug', partNumber: 'SP-4', condition: 'used', vehicle: 'Civic', salePrice: 800,
    minStock: 2, openingQuantity: 3, openingUnitCost: 300, notes: 'Tested', createdAt: 1,
  })
  await savePurchase({ date: '2026-10-01', supplier: 'Parts Co', lines: [{ partId, quantity: 8, unitPrice: 350 }], notes: '', createdAt: 2 })
  await saveSale({ date: '2026-10-02', customer: 'Walk-in', lines: [{ partId, quantity: 4, unitPrice: 800 }], notes: '', createdAt: 3 })
  await saveRepair({
    date: '2026-10-03', customer: 'B. Owner', vehicle: 'Civic', description: 'Tune-up',
    lines: [{ partId, quantity: 4, unitPrice: 900 }], labor: 4500, createdAt: 4,
  })
  await saveExpense({ date: '2026-10-04', category: 'Rent', description: 'October', amount: 60000, createdAt: 5 })
}

describe('backup and restore', () => {
  it('restores exactly what was exported, replacing newer changes', async () => {
    await addSampleData()
    const before = await loadAll()
    const text = JSON.stringify(await createBackup())

    await saveExpense({ date: '2026-10-05', category: 'Other', description: 'After backup', amount: 100, createdAt: 6 })
    await restoreBackup(readBackup(text).data)

    expect(await loadAll()).toEqual(before)
  })

  it('keeps giving new records fresh ids after a restore', async () => {
    await addSampleData()
    const backup = readBackup(JSON.stringify(await createBackup()))
    await restoreBackup(backup.data)
    const id = await saveExpense({ date: '2026-10-06', category: 'Other', description: '', amount: 100, createdAt: 7 })
    expect(backup.data.expenses.every((expense) => expense.id < id)).toBe(true)
  })

  it('refuses files that are not valid backups', () => {
    expect(() => readBackup('not json')).toThrow('ليس ملف نسخة احتياطية صالحاً')
    expect(() => readBackup(JSON.stringify({ app: 'something-else' }))).toThrow('ليس نسخة احتياطية من هذا التطبيق')
    expect(() => readBackup(JSON.stringify({ app: 'auto-parts-manager', version: 99 }))).toThrow('إصدار مختلف')
  })

  it('refuses a backup with damaged records', async () => {
    await addSampleData()
    const backup = await createBackup()
    const damaged = { ...backup, data: { ...backup.data, sales: [{ ...backup.data.sales[0], lines: 'oops' }] } }
    expect(() => readBackup(JSON.stringify(damaged))).toThrow('قسم "المبيعات" في النسخة الاحتياطية تالف')
  })

  it('refuses a backup whose stock does not add up', async () => {
    await addSampleData()
    const backup = await createBackup()
    const broken = { ...backup, data: { ...backup.data, purchases: [] } } // sales and repairs now exceed stock
    expect(() => readBackup(JSON.stringify(broken))).toThrow('غير متطابقة')
  })
})
