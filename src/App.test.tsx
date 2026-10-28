import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'
import { navItems } from './components/Layout'
import { saveExpense, savePart, savePurchase, saveRepair, saveSale } from './db/actions'
import { db, loadAll } from './db/db'
import { calculateStock } from './lib/stock'
import type { Draft, Part } from './types'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const part = (overrides: Partial<Draft<Part>>): Draft<Part> => ({
  name: 'Part', partNumber: '', condition: 'new', vehicle: '', salePrice: 0, minStock: 0,
  openingQuantity: 0, openingUnitCost: 0, notes: '', createdAt: 1, ...overrides,
})

describe('App shell', () => {
  it('shows the dashboard on the home page', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'الرئيسية' })).toBeTruthy()
  })

  it.each(navItems.map((item) => item.label))('opens %s from the menu', async (label) => {
    renderAt('/reports')
    await screen.findByRole('heading', { name: 'التقارير' })
    fireEvent.click(screen.getByRole('link', { name: label }))
    expect(await screen.findByRole('heading', { name: label })).toBeTruthy()
  })

  it('sends unknown addresses to the dashboard', async () => {
    renderAt('/no-such-page')
    expect(await screen.findByRole('heading', { name: 'الرئيسية' })).toBeTruthy()
  })
})

describe('working with data', () => {
  it('adds a part and shows it in the inventory with its stock value', async () => {
    renderAt('/inventory/new')
    fireEvent.change(await screen.findByLabelText('الاسم'), { target: { value: 'Oil filter' } })
    expect((screen.getByLabelText('الكمية الأولية') as HTMLInputElement).value).toBe('1') // new parts start at 1
    expect((screen.getByLabelText(/^تركب على/) as HTMLInputElement).validity.valueMissing).toBe(true) // "Fits" is required
    fireEvent.change(screen.getByLabelText(/^تركب على/), { target: { value: 'Toyota Corolla' } })
    fireEvent.change(screen.getByLabelText('سعر البيع'), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText('الكمية الأولية'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('كلفة القطعة الأولية'), { target: { value: '10.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ القطعة' }))

    const row = (await screen.findByRole('link', { name: 'Oil filter' })).closest('tr')!
    expect(within(row).getByText('3')).toBeTruthy()
    expect(within(row).getByText('10.50')).toBeTruthy() // average cost
    expect(within(row).getByText('15.00')).toBeTruthy() // sale price
    expect(within(row).getByText('31.50')).toBeTruthy() // stock value
    expect(await db.parts.count()).toBe(1)
  })

  it('refuses selling more than is in stock, then records a sale with the right gross profit', async () => {
    const partId = await savePart(part({ name: 'Brake pads', salePrice: 4000, openingQuantity: 5, openingUnitCost: 2500 }))
    renderAt('/sales/new')
    fireEvent.change(await screen.findByLabelText('القطعة'), { target: { value: String(partId) } })
    expect((screen.getByLabelText('سعر القطعة') as HTMLInputElement).value).toBe('40.00') // usual price filled in

    fireEvent.change(screen.getByLabelText('الكمية'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ البيع' }))
    expect((await screen.findByRole('alert')).textContent).toContain('لا يوجد مخزون كافٍ من "Brake pads"')
    expect(await db.sales.count()).toBe(0)

    fireEvent.change(screen.getByLabelText('الكمية'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ البيع' }))
    await screen.findByRole('heading', { name: 'المبيعات' })
    expect(await screen.findByText('80.00')).toBeTruthy() // 2 x 40.00
    expect(screen.getByText('50.00')).toBeTruthy() // cost: 2 x 25.00
    expect(screen.getByText('30.00')).toBeTruthy() // gross profit
  })

  it('records a repair job, adds labor and takes its parts out of stock once', async () => {
    const partId = await savePart(part({ name: 'Spark plug', salePrice: 800, openingQuantity: 10, openingUnitCost: 300 }))
    renderAt('/repairs/new')
    fireEvent.change(await screen.findByLabelText('وصف الشغل'), { target: { value: 'Tune-up' } })
    fireEvent.click(screen.getByRole('button', { name: '+ إضافة قطعة' }))
    fireEvent.change(screen.getByLabelText('القطعة'), { target: { value: String(partId) } })
    fireEvent.change(screen.getByLabelText('الكمية'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('أجرة اليد'), { target: { value: '45' } })
    expect(screen.getByText('المجموع المطلوب من الزبون: 77.00')).toBeTruthy() // 4 x 8.00 + 45.00
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التصليح' }))

    await screen.findByRole('heading', { name: 'التصليحات' })
    expect(await screen.findByText('65.00')).toBeTruthy() // gross profit: 77.00 - 4 x 3.00
    expect(calculateStock(await loadAll()).stock.get(partId)).toEqual({ quantity: 6, value: 1800 })
  })

  it('searches the inventory by part name or car, ignoring part numbers and showing new and used parts', async () => {
    await savePart(part({ name: 'Brake pads', partNumber: 'BP-1', condition: 'new', vehicle: 'Mercedes C200' }))
    await savePart(part({ name: 'Oil filter', condition: 'used', vehicle: 'Mercedes E300' }))
    await savePart(part({ name: 'Air filter', vehicle: 'Toyota Corolla' }))
    renderAt('/inventory')
    const search = await screen.findByLabelText('البحث في القطع')
    const shown = () => screen.queryAllByRole('link').map((link) => link.textContent).filter((name) => /pads|filter/.test(name ?? ''))

    expect(shown()).toEqual(['Air filter', 'Brake pads', 'Oil filter']) // new and used together
    expect(screen.queryByLabelText('الحالة')).toBeNull()

    fireEvent.change(search, { target: { value: 'filter' } })
    expect(shown()).toEqual(['Air filter', 'Oil filter'])
    fireEvent.change(search, { target: { value: 'mercedes' } })
    expect(shown()).toEqual(['Brake pads', 'Oil filter'])
    fireEvent.change(search, { target: { value: 'Mercedes C200' } })
    expect(shown()).toEqual(['Brake pads'])
    fireEvent.change(search, { target: { value: 'E300' } })
    expect(shown()).toEqual(['Oil filter'])
    fireEvent.change(search, { target: { value: 'BP-1' } })
    expect(screen.getByText('لا توجد قطع تطابق بحثك.')).toBeTruthy()
  })

  it('searches sales by part name or month, and opens a sale by clicking its row', async () => {
    const coupling = await savePart(part({ name: 'Coupling', vehicle: 'Mercedes C200', openingQuantity: 10 }))
    const filter = await savePart(part({ name: 'Oil filter', openingQuantity: 10 }))
    const sale = (date: string, partId: number, customer: string) =>
      saveSale({ date, customer, lines: [{ partId, quantity: 1, unitPrice: 1000 }], notes: '', createdAt: 1 })
    await sale('2026-10-05', coupling, 'Ali')
    await sale('2026-09-20', coupling, 'Sami')
    await sale('2026-10-10', filter, 'Rami')
    renderAt('/sales')
    const search = await screen.findByLabelText('البحث في المبيعات')
    const shown = () => screen.queryAllByRole('link').map((link) => link.textContent).filter((text) => /^\d{4}-/.test(text ?? ''))

    expect(shown()).toEqual(['2026-10-10', '2026-10-05', '2026-09-20'])
    expect(within(screen.getByText('Rami').closest('tr')!).getByText('Oil filter')).toBeTruthy() // Parts column
    fireEvent.change(search, { target: { value: 'coupling' } })
    expect(shown()).toEqual(['2026-10-05', '2026-09-20'])
    fireEvent.change(search, { target: { value: 'October' } })
    expect(shown()).toEqual(['2026-10-10', '2026-10-05'])
    fireEvent.change(search, { target: { value: 'coupling 10' } })
    expect(shown()).toEqual(['2026-10-05'])
    fireEvent.change(search, { target: { value: 'brake' } })
    expect(screen.getByText('لا توجد مبيعات تطابق بحثك.')).toBeTruthy()

    // The month picker shows one month; the search then works inside that month only.
    fireEvent.change(search, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'اختر شهراً' }))
    while (!screen.queryByText('2026')) fireEvent.click(screen.getByRole('button', { name: 'السنة السابقة' })) // opens on this year
    fireEvent.click(screen.getByRole('button', { name: 'تشرين الأول' }))
    expect(screen.queryByRole('button', { name: 'تشرين الثاني' })).toBeNull() // the month list closed
    expect(shown()).toEqual(['2026-10-10', '2026-10-05'])
    expect(screen.getByRole('button', { name: 'تشرين الأول 2026' })).toBeTruthy() // the calendar button shows the picked month
    fireEvent.change(search, { target: { value: 'coupling' } })
    expect(shown()).toEqual(['2026-10-05'])
    fireEvent.click(screen.getByRole('button', { name: 'كل الأشهر' }))
    expect(shown()).toEqual(['2026-10-05', '2026-09-20'])

    fireEvent.change(search, { target: { value: '' } })
    fireEvent.click(screen.getByText('Sami')) // a cell, not the date link
    expect(await screen.findByDisplayValue('Sami')).toBeTruthy() // the sale opened with its details
    expect(screen.getByRole('option', { name: 'Coupling · Mercedes C200 · الموجود: 8' })).toBeTruthy() // the car it fits, no New/Used
    expect(screen.getByRole('option', { name: 'Oil filter · الموجود: 9' })).toBeTruthy() // no car typed in Fits
  })

  it('searches purchases by part name or month, and opens a purchase by clicking its row', async () => {
    const coupling = await savePart(part({ name: 'Coupling', vehicle: 'Mercedes C200' }))
    const filter = await savePart(part({ name: 'Oil filter' }))
    const purchase = (date: string, partId: number, supplier: string) =>
      savePurchase({ date, supplier, lines: [{ partId, quantity: 2, unitPrice: 500 }], notes: '', createdAt: 1 })
    await purchase('2026-10-05', coupling, 'Ali')
    await purchase('2026-09-20', coupling, 'Sami')
    await purchase('2026-10-10', filter, 'Rami')
    renderAt('/purchases')
    const search = await screen.findByLabelText('البحث في المشتريات')
    const shown = () => screen.queryAllByRole('link').map((link) => link.textContent).filter((text) => /^\d{4}-/.test(text ?? ''))

    expect(shown()).toEqual(['2026-10-10', '2026-10-05', '2026-09-20'])
    expect(within(screen.getByText('Rami').closest('tr')!).getByText('Oil filter')).toBeTruthy() // Parts column
    fireEvent.change(search, { target: { value: 'coupling' } })
    expect(shown()).toEqual(['2026-10-05', '2026-09-20'])
    fireEvent.change(search, { target: { value: 'brake' } })
    expect(screen.getByText('لا توجد مشتريات تطابق بحثك.')).toBeTruthy()

    fireEvent.change(search, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'اختر شهراً' }))
    while (!screen.queryByText('2026')) fireEvent.click(screen.getByRole('button', { name: 'السنة السابقة' }))
    fireEvent.click(screen.getByRole('button', { name: 'تشرين الأول' }))
    expect(shown()).toEqual(['2026-10-10', '2026-10-05'])
    fireEvent.click(screen.getByRole('button', { name: 'كل الأشهر' }))
    expect(shown()).toHaveLength(3)

    fireEvent.click(screen.getByText('Sami')) // a cell, not the date link
    expect(await screen.findByDisplayValue('Sami')).toBeTruthy() // the purchase opened with its details
  })

  it('searches repairs by part, customer, car or month, and opens a repair by clicking its row', async () => {
    const plug = await savePart(part({ name: 'Spark plug', openingQuantity: 10 }))
    const filter = await savePart(part({ name: 'Oil filter', openingQuantity: 10 }))
    const repair = (date: string, partId: number, customer: string, vehicle: string) =>
      saveRepair({ date, customer, vehicle, description: 'Service', lines: [{ partId, quantity: 1, unitPrice: 1000 }], labor: 2000, createdAt: 1 })
    await repair('2026-10-05', plug, 'Ali', 'Mercedes C200')
    await repair('2026-09-20', plug, 'Sami', 'BMW 320')
    await repair('2026-10-10', filter, 'Rami', 'Mercedes C300')
    renderAt('/repairs')
    const search = await screen.findByLabelText('البحث في التصليحات')
    const shown = () => screen.queryAllByRole('link').map((link) => link.textContent).filter((text) => /^\d{4}-/.test(text ?? ''))

    expect(shown()).toEqual(['2026-10-10', '2026-10-05', '2026-09-20'])
    expect(within(screen.getByText('Rami').closest('tr')!).getByText('Oil filter')).toBeTruthy() // Parts column
    fireEvent.change(search, { target: { value: 'spark' } })
    expect(shown()).toEqual(['2026-10-05', '2026-09-20'])
    fireEvent.change(search, { target: { value: 'sami' } }) // customer
    expect(shown()).toEqual(['2026-09-20'])
    fireEvent.change(search, { target: { value: 'mercedes' } }) // car
    expect(shown()).toEqual(['2026-10-10', '2026-10-05'])
    fireEvent.change(search, { target: { value: 'spark october' } })
    expect(shown()).toEqual(['2026-10-05'])
    fireEvent.change(search, { target: { value: 'brake' } })
    expect(screen.getByText('لا توجد تصليحات تطابق بحثك.')).toBeTruthy()

    fireEvent.change(search, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'اختر شهراً' }))
    while (!screen.queryByText('2026')) fireEvent.click(screen.getByRole('button', { name: 'السنة السابقة' }))
    fireEvent.click(screen.getByRole('button', { name: 'أيلول' }))
    expect(shown()).toEqual(['2026-09-20'])
    fireEvent.click(screen.getByRole('button', { name: 'كل الأشهر' }))
    expect(shown()).toHaveLength(3)

    fireEvent.click(screen.getByText('Sami')) // a cell, not the date link
    expect(await screen.findByDisplayValue('Sami')).toBeTruthy() // the repair opened with its details
  })

  it('searches expenses by category, description or month, and opens an expense by clicking its row', async () => {
    const expense = (date: string, category: string, description: string) =>
      saveExpense({ date, category, description, amount: 5000, createdAt: 1 })
    await expense('2026-10-01', 'Rent', 'Shop rent')
    await expense('2026-09-15', 'Utilities', 'Electricity bill')
    await expense('2026-10-12', 'Utilities', 'Water')
    renderAt('/expenses')
    const search = await screen.findByLabelText('البحث في المصاريف')
    const shown = () => screen.queryAllByRole('link').map((link) => link.textContent).filter((text) => /^\d{4}-/.test(text ?? ''))

    expect(shown()).toEqual(['2026-10-12', '2026-10-01', '2026-09-15'])
    fireEvent.change(search, { target: { value: 'utilities' } }) // category
    expect(shown()).toEqual(['2026-10-12', '2026-09-15'])
    fireEvent.change(search, { target: { value: 'electricity' } }) // description
    expect(shown()).toEqual(['2026-09-15'])
    fireEvent.change(search, { target: { value: 'utilities october' } })
    expect(shown()).toEqual(['2026-10-12'])
    fireEvent.change(search, { target: { value: 'salary' } })
    expect(screen.getByText('لا توجد مصاريف تطابق بحثك.')).toBeTruthy()

    fireEvent.change(search, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'اختر شهراً' }))
    while (!screen.queryByText('2026')) fireEvent.click(screen.getByRole('button', { name: 'السنة السابقة' }))
    fireEvent.click(screen.getByRole('button', { name: 'تشرين الأول' }))
    expect(shown()).toEqual(['2026-10-12', '2026-10-01'])
    fireEvent.click(screen.getByRole('button', { name: 'كل الأشهر' }))
    expect(shown()).toHaveLength(3)

    fireEvent.click(screen.getByText('Electricity bill')) // a cell, not the date link
    expect(await screen.findByDisplayValue('Electricity bill')).toBeTruthy() // the expense opened with its details
  })

  it('buys a part that is not in the inventory yet, straight from a new purchase', async () => {
    renderAt('/purchases/new') // works even with an empty inventory
    fireEvent.click(await screen.findByRole('button', { name: '+ قطعة جديدة (غير موجودة بالمخزون بعد)' }))
    fireEvent.change(screen.getByLabelText('اسم القطعة الجديدة'), { target: { value: 'Coupling' } })
    fireEvent.click(screen.getByRole('button', { name: 'أضف القطعة إلى هذا الشراء' }))
    expect(await screen.findByText(/على أي سيارة تركب القطعة الجديدة/)).toBeTruthy() // "Fits" is required, as on Add part
    expect(await db.parts.count()).toBe(0)

    fireEvent.change(screen.getByLabelText(/^تركب على/), { target: { value: 'Mercedes C200' } })
    fireEvent.click(screen.getByRole('button', { name: 'أضف القطعة إلى هذا الشراء' }))
    await screen.findByRole('option', { name: 'Coupling · Mercedes C200 · الموجود: 0' })
    const partId = (await db.parts.toArray())[0].id
    expect((screen.getByLabelText('القطعة') as HTMLSelectElement).value).toBe(String(partId)) // put on the empty line
    fireEvent.change(screen.getByLabelText('الكمية'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('كلفة القطعة'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الشراء' }))

    await screen.findByRole('heading', { name: 'المشتريات' })
    expect(calculateStock(await loadAll()).stock.get(partId)).toEqual({ quantity: 3, value: 6000 })
  })
})
