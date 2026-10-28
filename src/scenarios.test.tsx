import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { saveExpense, savePart, savePurchase, saveRepair, saveSale } from './db/actions'
import { createBackup, rememberBackup } from './db/backup'
import { db, loadAll } from './db/db'
import { today } from './lib/dates'
import { calculateStock } from './lib/stock'
import type { Draft, Part } from './types'

// Everyday situations in the shop, tried through the screens the way the owner uses them.
// App.test.tsx covers the main flows; these cover editing, deleting, wrong input and the less common pages.

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const part = (overrides: Partial<Draft<Part>>): Draft<Part> => ({
  name: 'Part', partNumber: '', condition: 'new', vehicle: 'Civic', salePrice: 0, minStock: 0,
  openingQuantity: 0, openingUnitCost: 0, notes: '', createdAt: 1, ...overrides,
})

const stockOf = async (partId: number) => calculateStock(await loadAll()).stock.get(partId)
const alertText = async () => (await screen.findByRole('alert')).textContent

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('parts', () => {
  it('refuses a part with no car, a wrong price or a fractional quantity, and saves nothing', async () => {
    renderAt('/inventory/new')
    fireEvent.change(await screen.findByLabelText('الاسم'), { target: { value: 'Coupling' } })
    fireEvent.change(screen.getByLabelText(/^تركب على/), { target: { value: 'Civic' } })
    const save = () => fireEvent.click(screen.getByRole('button', { name: 'حفظ القطعة' }))

    fireEvent.change(screen.getByLabelText('سعر البيع'), { target: { value: '12.345' } })
    save()
    expect(await alertText()).toContain('سعر البيع')
    fireEvent.change(screen.getByLabelText('سعر البيع'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('الكمية الأولية'), { target: { value: '1.5' } })
    save()
    expect(await alertText()).toContain('الكمية الأولية')
    fireEvent.change(screen.getByLabelText('الكمية الأولية'), { target: { value: '-2' } })
    save()
    expect(await alertText()).toContain('الكمية الأولية')
    expect(await db.parts.count()).toBe(0)
  })

  it('accepts a comma as the decimal point, as some phone keyboards only have a comma', async () => {
    renderAt('/inventory/new')
    fireEvent.change(await screen.findByLabelText('الاسم'), { target: { value: 'Coupling' } })
    fireEvent.change(screen.getByLabelText(/^تركب على/), { target: { value: 'Civic' } })
    fireEvent.change(screen.getByLabelText('سعر البيع'), { target: { value: '12,50' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ القطعة' }))
    await screen.findByRole('heading', { name: 'المخزون' })
    expect((await db.parts.toArray())[0].salePrice).toBe(1250)
  })

  it('edits a part and keeps its sales, then refuses deleting it while it is used', async () => {
    const id = await savePart(part({ name: 'Coupling', openingQuantity: 5, openingUnitCost: 1000 }))
    await saveSale({ date: '2026-10-02', customer: '', lines: [{ partId: id, quantity: 1, unitPrice: 2000 }], notes: '', createdAt: 2 })
    renderAt(`/inventory/${id}`)
    fireEvent.change(await screen.findByLabelText('الاسم'), { target: { value: 'Coupling kit' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ القطعة' }))
    expect(await screen.findByRole('link', { name: 'Coupling kit' })).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'Coupling kit' }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(await screen.findByRole('button', { name: 'حذف القطعة' }))
    expect(await alertText()).toContain('لا يمكن حذف هذه القطعة')
    expect(await db.parts.count()).toBe(1)
    expect(await db.sales.count()).toBe(1)
  })

  it('deletes an unused part only after the owner confirms', async () => {
    const id = await savePart(part({ name: 'Spare bulb' }))
    renderAt(`/inventory/${id}`)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(await screen.findByRole('button', { name: 'حذف القطعة' }))
    expect(confirm).toHaveBeenCalled()
    expect(await db.parts.count()).toBe(1) // "Cancel" keeps it

    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'حذف القطعة' }))
    await screen.findByRole('heading', { name: 'المخزون' })
    expect(await db.parts.count()).toBe(0)
  })

  it('marks parts that are low or sold out', async () => {
    await savePart(part({ name: 'Low part', minStock: 3, openingQuantity: 2 }))
    await savePart(part({ name: 'Empty part', openingQuantity: 0 }))
    await savePart(part({ name: 'Plenty part', minStock: 3, openingQuantity: 10 }))
    renderAt('/inventory')
    const row = async (name: string) => (await screen.findByRole('link', { name })).closest('tr')!
    expect(within(await row('Low part')).getByText('قليل')).toBeTruthy()
    expect((await row('Empty part')).className).toContain('bg-red-50')
    expect(within(await row('Plenty part')).queryByText('قليل')).toBeNull()
  })
})

describe('purchases, sales and repairs', () => {
  it('refuses deleting a purchase whose parts were already sold', async () => {
    const id = await savePart(part({ name: 'Coupling' }))
    const purchaseId = await savePurchase({ date: '2026-10-01', supplier: 'Co', lines: [{ partId: id, quantity: 2, unitPrice: 1000 }], notes: '', createdAt: 1 })
    await saveSale({ date: '2026-10-02', customer: '', lines: [{ partId: id, quantity: 2, unitPrice: 2000 }], notes: '', createdAt: 2 })
    renderAt(`/purchases/${purchaseId}`)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(await screen.findByRole('button', { name: 'حذف الشراء' }))
    expect(await alertText()).toContain('لا يوجد مخزون كافٍ من "Coupling"')
    expect(await db.purchases.count()).toBe(1)
  })

  it('refuses a sale dated before the stock was bought', async () => {
    const id = await savePart(part({ name: 'Coupling' }))
    await savePurchase({ date: '2026-10-10', supplier: '', lines: [{ partId: id, quantity: 5, unitPrice: 1000 }], notes: '', createdAt: 1 })
    renderAt('/sales/new')
    fireEvent.change(await screen.findByLabelText('التاريخ'), { target: { value: '2026-10-05' } })
    fireEvent.change(screen.getByLabelText('القطعة'), { target: { value: String(id) } })
    fireEvent.change(screen.getByLabelText('سعر القطعة'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ البيع' }))
    expect(await alertText()).toContain('بتاريخ 2026-10-05')
    expect(await db.sales.count()).toBe(0)
  })

  it('refuses a sale with no parts, or a part with no price', async () => {
    const id = await savePart(part({ name: 'Coupling', openingQuantity: 5 }))
    renderAt('/sales/new')
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ البيع' }))
    expect(await alertText()).toContain('أضف قطعة واحدة على الأقل')
    fireEvent.change(screen.getByLabelText('القطعة'), { target: { value: String(id) } }) // usual price is 0.00
    fireEvent.change(screen.getByLabelText('سعر القطعة'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ البيع' }))
    expect(await alertText()).toContain('السعر في السطر 1')
    expect(await db.sales.count()).toBe(0)
  })

  it('sells two lines of the same part and counts both against the stock', async () => {
    const id = await savePart(part({ name: 'Coupling', salePrice: 2000, openingQuantity: 3 }))
    renderAt('/sales/new')
    fireEvent.change(await screen.findByLabelText('القطعة'), { target: { value: String(id) } })
    fireEvent.change(screen.getByLabelText('الكمية'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '+ إضافة قطعة' }))
    fireEvent.change(screen.getAllByLabelText('القطعة')[1], { target: { value: String(id) } })
    fireEvent.change(screen.getAllByLabelText('الكمية')[1], { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ البيع' }))
    expect(await alertText()).toContain('ينقص 1') // 4 asked for, 3 in stock

    fireEvent.change(screen.getAllByLabelText('الكمية')[1], { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ البيع' }))
    await screen.findByRole('heading', { name: 'المبيعات' })
    expect(await stockOf(id)).toEqual({ quantity: 0, value: 0 })
  })

  it('edits a sale and puts the stock back when the sale is deleted', async () => {
    const id = await savePart(part({ name: 'Coupling', openingQuantity: 5, openingUnitCost: 1000 }))
    const saleId = await saveSale({ date: '2026-10-02', customer: 'Ali', lines: [{ partId: id, quantity: 2, unitPrice: 2000 }], notes: '', createdAt: 2 })
    renderAt(`/sales/${saleId}`)
    fireEvent.change(await screen.findByLabelText('الكمية'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ البيع' }))
    await screen.findByRole('heading', { name: 'المبيعات' })
    expect((await stockOf(id))?.quantity).toBe(1)

    fireEvent.click(screen.getByText('Ali'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(await screen.findByRole('button', { name: 'حذف البيع' }))
    await screen.findByText('لا توجد مبيعات بعد.')
    expect((await stockOf(id))?.quantity).toBe(5)
  })

  it('saves a labour-only repair, and needs a job description', async () => {
    renderAt('/repairs/new')
    fireEvent.change(await screen.findByLabelText('أجرة اليد'), { target: { value: '30' } })
    expect(screen.getByText('المجموع المطلوب من الزبون: 30.00')).toBeTruthy()
    expect(screen.queryByLabelText('القطعة')).toBeNull() // a new repair starts with no part lines
    fireEvent.change(screen.getByLabelText('وصف الشغل'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التصليح' }))
    expect(await alertText()).toContain('اكتب وصف الشغل')

    fireEvent.change(screen.getByLabelText('وصف الشغل'), { target: { value: 'Brake check' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التصليح' }))
    await screen.findByRole('heading', { name: 'التصليحات' })
    expect(await screen.findByText('Brake check')).toBeTruthy()
    expect((await db.repairs.toArray())[0]).toMatchObject({ labor: 3000, lines: [] })
  })

  it('shows a clear message for a record that no longer exists', async () => {
    renderAt('/sales/999')
    expect(await screen.findByText(/لم يعد هذا البيع موجوداً/)).toBeTruthy()
  })
})

describe('expenses', () => {
  it('refuses a zero amount, saves a valid one and shows its category in Arabic', async () => {
    renderAt('/expenses/new')
    fireEvent.change(await screen.findByLabelText('المبلغ'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ المصروف' }))
    expect(await alertText()).toContain('أكثر من 0')

    fireEvent.change(screen.getByLabelText('النوع'), { target: { value: 'Utilities' } })
    fireEvent.change(screen.getByLabelText('المبلغ'), { target: { value: '45.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ المصروف' }))
    await screen.findByRole('heading', { name: 'المصاريف' })
    expect(await screen.findByText('كهرباء وماء وخدمات')).toBeTruthy()
    expect((await db.expenses.toArray())[0]).toMatchObject({ category: 'Utilities', amount: 4550 }) // saved in English
  })

  it('finds an expense by its Arabic category name', async () => {
    await saveExpense({ date: '2026-10-01', category: 'Rent', description: 'Shop', amount: 5000, createdAt: 1 })
    await saveExpense({ date: '2026-10-02', category: 'Transport', description: 'Taxi', amount: 500, createdAt: 2 })
    renderAt('/expenses')
    fireEvent.change(await screen.findByLabelText('البحث في المصاريف'), { target: { value: 'إيجار' } })
    expect(screen.getByText('Shop')).toBeTruthy()
    expect(screen.queryByText('Taxi')).toBeNull()
  })
})

describe('reports and dashboard', () => {
  it('shows the profit summary for a period and refuses an end date before the start', async () => {
    const id = await savePart(part({ name: 'Coupling', openingQuantity: 2, openingUnitCost: 1000 }))
    await savePurchase({ date: '2026-10-01', supplier: '', lines: [{ partId: id, quantity: 2, unitPrice: 1400 }], notes: '', createdAt: 1 })
    await saveSale({ date: '2026-10-02', customer: '', lines: [{ partId: id, quantity: 1, unitPrice: 2000 }], notes: '', createdAt: 2 })
    await saveRepair({ date: '2026-10-03', customer: '', vehicle: '', description: 'Fix', lines: [{ partId: id, quantity: 1, unitPrice: 2000 }], labor: 3000, createdAt: 3 })
    await saveExpense({ date: '2026-10-04', category: 'Rent', description: '', amount: 1500, createdAt: 4 })
    renderAt('/reports')
    fireEvent.change(await screen.findByLabelText('من'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('إلى'), { target: { value: '2026-10-31' } })
    const summary = screen.getByRole('heading', { name: 'ملخص الأرباح' }).closest('section')!
    const value = (label: string) => within(summary).getByText(label).nextElementSibling?.textContent
    expect(value('المدخول (مبيعات + تصليحات)')).toBe('70.00') // the coupling example: 20 + 20 + 30
    expect(value('كلفة القطع المباعة والمستعملة')).toBe('-24.00') // 2 × 12.00 average cost
    expect(value('الربح الإجمالي')).toBe('46.00')
    expect(value('الربح الصافي (تقديري)')).toBe('31.00') // after 15.00 rent; the 28.00 purchase is not an expense

    fireEvent.change(screen.getByLabelText('إلى'), { target: { value: '2026-09-01' } })
    expect(screen.getByRole('alert').textContent).toContain('اختر تاريخ بداية')
  })

  it('reminds about a backup only when one is due, and lists low parts', async () => {
    await savePart(part({ name: 'Low part', minStock: 2, openingQuantity: 2 }))
    renderAt('/')
    expect(await screen.findByText(/لم تعمل نسخة احتياطية بعد/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Low part/ })).toBeTruthy() // at the warning level counts as low
    cleanupAndRender('/', () => rememberBackup())
    await screen.findByRole('heading', { name: 'الرئيسية' })
    expect(screen.queryByText(/نسخة احتياطية/)).toBeNull()
  })
})

describe('backup page', () => {
  it('restores a backup file chosen on the page, after the owner confirms', async () => {
    const id = await savePart(part({ name: 'Coupling', openingQuantity: 3 }))
    const text = JSON.stringify(await createBackup())
    await db.parts.delete(id) // as if on a new phone with no data
    renderAt('/backup')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const input = (await screen.findByText('اختر ملف النسخة الاحتياطية…')).querySelector('input')!
    fireEvent.change(input, { target: { files: [new File([text], 'backup.json', { type: 'application/json' })] } })
    expect(await screen.findByText(/تم استرجاع النسخة الاحتياطية/)).toBeTruthy()
    expect(confirm.mock.calls[0][0]).toContain('القطع: 1')
    expect((await db.parts.toArray()).map((p) => p.name)).toEqual(['Coupling'])
  })

  it('refuses a file that is not a backup and keeps the data', async () => {
    await savePart(part({ name: 'Coupling' }))
    renderAt('/backup')
    const input = (await screen.findByText('اختر ملف النسخة الاحتياطية…')).querySelector('input')!
    fireEvent.change(input, { target: { files: [new File(['hello'], 'notes.json')] } })
    expect(await alertText()).toContain('ليس ملف نسخة احتياطية صالحاً')
    expect(await db.parts.count()).toBe(1)
  })

  it('downloads the backup and the Excel file with today’s date in the name', async () => {
    await savePart(part({ name: 'Coupling' }))
    const names: string[] = []
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download)
    })
    renderAt('/backup')
    fireEvent.click(await screen.findByRole('button', { name: 'تنزيل ملف النسخة الاحتياطية' }))
    expect(await screen.findByText(/تم حفظ ملف النسخة الاحتياطية/)).toBeTruthy()
    expect(screen.getByText(/آخر نسخة احتياطية:/).textContent).not.toContain('لا يوجد')
    fireEvent.click(screen.getByRole('button', { name: 'تنزيل ملف Excel' }))
    expect(await screen.findByText(/تم حفظ ملف Excel/)).toBeTruthy()
    expect(names).toEqual([`auto-parts-backup-${today()}.json`, `auto-parts-data-${today()}.xlsx`])
  })
})

/** Clears the screen, runs `before`, then shows the page again (for checks that need a fresh start). */
function cleanupAndRender(path: string, before: () => void) {
  document.body.innerHTML = ''
  before()
  renderAt(path)
}
