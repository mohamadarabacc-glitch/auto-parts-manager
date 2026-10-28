import { describe, expect, it } from 'vitest'
import type { AppData, Part } from '../types'
import { buildReport, linesTotal, repairTotal } from './reports'
import { calculateStock } from './stock'

const brakePads: Part = {
  id: 1,
  name: 'Brake pads',
  partNumber: 'BP-1',
  condition: 'new',
  vehicle: '',
  salePrice: 4000,
  minStock: 0,
  openingQuantity: 0,
  openingUnitCost: 0,
  notes: '',
  createdAt: 1,
}

// October: buy 10 pads at 25.00, sell 3 at 40.00, use 2 in a repair charged at 45.00 each plus 60.00 labor,
// pay 500.00 rent and 30.50 electricity. A November sale and a September expense must not count.
const data: AppData = {
  parts: [brakePads],
  purchases: [
    { id: 1, date: '2026-10-01', supplier: 'Supplier', lines: [{ partId: 1, quantity: 10, unitPrice: 2500 }], notes: '', createdAt: 2 },
  ],
  sales: [
    { id: 1, date: '2026-10-05', customer: '', lines: [{ partId: 1, quantity: 3, unitPrice: 4000 }], notes: '', createdAt: 3 },
    { id: 2, date: '2026-10-31', customer: '', lines: [{ partId: 1, quantity: 1, unitPrice: 4000 }], notes: '', createdAt: 4 },
    { id: 3, date: '2026-11-01', customer: '', lines: [{ partId: 1, quantity: 1, unitPrice: 4000 }], notes: '', createdAt: 5 },
  ],
  repairs: [
    {
      id: 1,
      date: '2026-10-10',
      customer: 'A. Driver',
      vehicle: 'Corolla',
      description: 'Front brakes',
      lines: [{ partId: 1, quantity: 2, unitPrice: 4500 }],
      labor: 6000,
      createdAt: 6,
    },
  ],
  expenses: [
    { id: 1, date: '2026-10-01', category: 'Rent', description: '', amount: 50000, createdAt: 7 },
    { id: 2, date: '2026-10-15', category: 'Utilities', description: 'Electricity', amount: 3050, createdAt: 8 },
    { id: 3, date: '2026-09-30', category: 'Rent', description: '', amount: 50000, createdAt: 9 },
  ],
}

const october = { from: '2026-10-01', to: '2026-10-31' }

describe('buildReport', () => {
  const report = buildReport(data, calculateStock(data), october)

  it('counts only sales inside the date range, including the last day', () => {
    expect(report.salesCount).toBe(2)
    expect(report.salesRevenue).toBe(4 * 4000)
    expect(report.salesCost).toBe(4 * 2500)
    expect(report.salesProfit).toBe(4 * 1500)
  })

  it('includes labor and parts charged in repair revenue, and parts cost in repair cost', () => {
    expect(report.repairsCount).toBe(1)
    expect(report.repairPartsRevenue).toBe(9000)
    expect(report.repairLabor).toBe(6000)
    expect(report.repairRevenue).toBe(15000)
    expect(report.repairCost).toBe(5000)
    expect(report.repairProfit).toBe(10000)
  })

  it('works out gross and net profit', () => {
    expect(report.totalRevenue).toBe(16000 + 15000)
    expect(report.totalCost).toBe(10000 + 5000)
    expect(report.grossProfit).toBe(16000)
    expect(report.expensesTotal).toBe(53050)
    expect(report.netProfit).toBe(16000 - 53050)
  })

  it('groups expenses by category, largest first', () => {
    expect(report.expensesByCategory).toEqual([
      { category: 'Rent', amount: 50000 },
      { category: 'Utilities', amount: 3050 },
    ])
  })

  it('shows stock purchased without counting it as an expense', () => {
    expect(report.purchasesCount).toBe(1)
    expect(report.purchasesTotal).toBe(25000)
    // Net profit only subtracts operating expenses and the cost of parts actually sold or used.
    expect(report.netProfit).toBe(report.grossProfit - report.expensesTotal)
  })

  it('is all zero for a period with no activity', () => {
    const empty = buildReport(data, calculateStock(data), { from: '2025-01-01', to: '2025-01-31' })
    expect(empty.totalRevenue).toBe(0)
    expect(empty.netProfit).toBe(0)
    expect(empty.expensesByCategory).toEqual([])
  })
})

describe('totals', () => {
  it('adds up lines and repair labor exactly', () => {
    expect(linesTotal([{ partId: 1, quantity: 3, unitPrice: 10 }, { partId: 2, quantity: 1, unitPrice: 20 }])).toBe(50)
    expect(repairTotal(data.repairs[0])).toBe(15000)
  })
})
