import { describe, expect, it } from 'vitest'
import type { Part, PartLine, Purchase, Repair, Sale } from '../types'
import { averageCost, calculateStock, type StockData } from './stock'

let counter = 0
const next = () => ++counter

function part(id: number, opening = { quantity: 0, unitCost: 0 }): Part {
  return {
    id,
    name: `Part ${id}`,
    partNumber: '',
    condition: 'new',
    vehicle: '',
    salePrice: 0,
    minStock: 0,
    openingQuantity: opening.quantity,
    openingUnitCost: opening.unitCost,
    notes: '',
    createdAt: next(),
  }
}

const line = (partId: number, quantity: number, unitPrice: number): PartLine => ({ partId, quantity, unitPrice })

function purchase(date: string, lines: PartLine[]): Purchase {
  return { id: next(), date, supplier: '', lines, notes: '', createdAt: next() }
}

function sale(date: string, lines: PartLine[]): Sale {
  return { id: next(), date, customer: '', lines, notes: '', createdAt: next() }
}

function repair(date: string, lines: PartLine[]): Repair {
  return { id: next(), date, customer: '', vehicle: '', description: 'Job', lines, labor: 5000, createdAt: next() }
}

function data(partial: Partial<StockData>): StockData {
  return { parts: [], purchases: [], sales: [], repairs: [], ...partial }
}

describe('calculateStock (weighted-average cost)', () => {
  it('averages the cost across purchases', () => {
    const s = sale('2026-01-03', [line(1, 5, 2000)])
    const result = calculateStock(
      data({
        parts: [part(1)],
        purchases: [purchase('2026-01-01', [line(1, 10, 1000)]), purchase('2026-01-02', [line(1, 10, 1200)])],
        sales: [s],
      }),
    )
    // 10 x 10.00 + 10 x 12.00 = 220.00 for 20 units, so 11.00 each; 5 sold cost 55.00.
    expect(result.saleCosts.get(s.id)).toBe(5500)
    expect(result.stock.get(1)).toEqual({ quantity: 15, value: 16500 })
    expect(averageCost(result.stock.get(1)!)).toBe(1100)
    expect(result.problems).toEqual([])
  })

  it('re-averages when new stock arrives after a sale', () => {
    const first = sale('2026-01-02', [line(1, 5, 0)])
    const second = sale('2026-01-04', [line(1, 10, 0)])
    const result = calculateStock(
      data({
        parts: [part(1)],
        purchases: [purchase('2026-01-01', [line(1, 10, 1000)]), purchase('2026-01-03', [line(1, 5, 1300)])],
        sales: [first, second],
      }),
    )
    expect(result.saleCosts.get(first.id)).toBe(5000)
    // 5 left at 10.00 + 5 at 13.00 = 115.00 for 10 units.
    expect(result.saleCosts.get(second.id)).toBe(11500)
    expect(result.stock.get(1)).toEqual({ quantity: 0, value: 0 })
  })

  it('never gains or loses a cent through rounding', () => {
    const sales = [sale('2026-02-02', [line(1, 1, 0)]), sale('2026-02-03', [line(1, 1, 0)]), sale('2026-02-04', [line(1, 1, 0)])]
    const result = calculateStock(
      data({
        parts: [part(1)],
        purchases: [purchase('2026-02-01', [line(1, 2, 100), line(1, 1, 101)])],
        sales,
      }),
    )
    // 3.01 for 3 units: 1.00 (1.0033 rounded), then 1.01 (2.01 / 2 = 1.005 rounded up), then the last 1.00.
    expect(sales.map((s) => result.saleCosts.get(s.id))).toEqual([100, 101, 100])
    expect(result.stock.get(1)).toEqual({ quantity: 0, value: 0 })
  })

  it('makes total cost of goods equal total purchase cost once everything is sold', () => {
    const sales = [sale('2026-02-02', [line(1, 3, 0)]), sale('2026-02-03', [line(1, 3, 0)]), sale('2026-02-04', [line(1, 4, 0)])]
    const result = calculateStock(
      data({
        parts: [part(1)],
        purchases: [purchase('2026-02-01', [line(1, 7, 333), line(1, 3, 1000)])],
        sales,
      }),
    )
    const totalCost = sales.reduce((sum, s) => sum + result.saleCosts.get(s.id)!, 0)
    expect(totalCost).toBe(7 * 333 + 3 * 1000)
  })

  it('counts opening stock at its cost', () => {
    const s = sale('2026-03-01', [line(1, 1, 4000)])
    const result = calculateStock(data({ parts: [part(1, { quantity: 4, unitCost: 2500 })], sales: [s] }))
    expect(result.saleCosts.get(s.id)).toBe(2500)
    expect(result.stock.get(1)).toEqual({ quantity: 3, value: 7500 })
  })

  it('deducts the parts used in a repair exactly once and gives the repair their cost', () => {
    const job = repair('2026-03-05', [line(1, 2, 900), line(2, 1, 3000)])
    const result = calculateStock(
      data({
        parts: [part(1, { quantity: 10, unitCost: 500 }), part(2, { quantity: 1, unitCost: 2000 })],
        repairs: [job],
      }),
    )
    expect(result.stock.get(1)).toEqual({ quantity: 8, value: 4000 })
    expect(result.stock.get(2)).toEqual({ quantity: 0, value: 0 })
    expect(result.repairCosts.get(job.id)).toBe(2 * 500 + 2000)
    expect(result.saleCosts.size).toBe(0)
  })

  it('counts a same-day purchase before a sale, even if it was entered later', () => {
    const s = sale('2026-03-01', [line(1, 2, 0)])
    const p = purchase('2026-03-01', [line(1, 5, 100)]) // created after the sale
    const result = calculateStock(data({ parts: [part(1)], purchases: [p], sales: [s] }))
    expect(result.problems).toEqual([])
    expect(result.saleCosts.get(s.id)).toBe(200)
    expect(result.stock.get(1)).toEqual({ quantity: 3, value: 300 })
  })

  it('reports selling more than is in stock', () => {
    const result = calculateStock(
      data({ parts: [part(1, { quantity: 1, unitCost: 100 })], sales: [sale('2026-04-02', [line(1, 3, 0)])] }),
    )
    expect(result.problems).toEqual([{ partId: 1, partName: 'Part 1', date: '2026-04-02', shortBy: 2 }])
  })

  it('reports a sale dated before the stock arrived', () => {
    const result = calculateStock(
      data({
        parts: [part(1)],
        purchases: [purchase('2026-04-10', [line(1, 5, 100)])],
        sales: [sale('2026-04-09', [line(1, 1, 0)])],
      }),
    )
    expect(result.problems).toHaveLength(1)
  })

  it('detects when removing a purchase would leave later sales short', () => {
    const p = purchase('2026-05-01', [line(1, 5, 100)])
    const s = sale('2026-05-02', [line(1, 3, 0)])
    expect(calculateStock(data({ parts: [part(1)], purchases: [p], sales: [s] })).problems).toEqual([])
    expect(calculateStock(data({ parts: [part(1)], purchases: [], sales: [s] })).problems).toHaveLength(1)
  })

  it('uses date order, so a backdated purchase changes the cost of later sales', () => {
    const s = sale('2026-01-20', [line(1, 5, 0)])
    const base = data({ parts: [part(1)], purchases: [purchase('2026-01-10', [line(1, 10, 1000)])], sales: [s] })
    expect(calculateStock(base).saleCosts.get(s.id)).toBe(5000)

    const backdated = purchase('2026-01-05', [line(1, 10, 2000)])
    const result = calculateStock({ ...base, purchases: [...base.purchases, backdated] })
    // 10 x 20.00 + 10 x 10.00 = 300.00 for 20 units, so 15.00 each.
    expect(result.saleCosts.get(s.id)).toBe(7500)
  })

  it('keeps each part separate', () => {
    const s = sale('2026-06-02', [line(1, 1, 0)])
    const result = calculateStock(
      data({
        parts: [part(1), part(2)],
        purchases: [purchase('2026-06-01', [line(1, 2, 1000), line(2, 4, 50)])],
        sales: [s],
      }),
    )
    expect(result.stock.get(1)).toEqual({ quantity: 1, value: 1000 })
    expect(result.stock.get(2)).toEqual({ quantity: 4, value: 200 })
  })

  it('has no average cost when nothing is in stock', () => {
    expect(averageCost({ quantity: 0, value: 0 })).toBeNull()
  })
})
