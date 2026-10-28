import type { AppData, PartLine } from '../types'
import { divideMoney, multiplyMoney, type Cents } from './money'

// Stock is never stored. It is worked out by replaying the opening stock and every purchase, sale and
// repair in date order, using weighted-average cost. Because each record is counted exactly once in the
// replay, editing or deleting a record can never deduct stock twice or leave stale totals.

export interface PartStock {
  quantity: number
  value: Cents // total cost of the units on hand
}

export interface StockProblem {
  partId: number
  partName: string
  date: string
  shortBy: number
}

export interface StockResult {
  stock: Map<number, PartStock> // current stock of every part
  saleCosts: Map<number, Cents> // cost of the parts sold, by sale id
  repairCosts: Map<number, Cents> // cost of the parts used, by repair id
  problems: StockProblem[] // every point where more units left than were in stock
}

export type StockData = Pick<AppData, 'parts' | 'purchases' | 'sales' | 'repairs'>

interface Movement {
  kind: 'purchase' | 'sale' | 'repair'
  id: number
  date: string
  createdAt: number
  lines: PartLine[]
}

// On the same day, stock coming in is counted before stock going out, then records are taken in the order entered.
const DAY_ORDER = { purchase: 0, sale: 1, repair: 1 }

export function calculateStock(data: StockData): StockResult {
  const names = new Map(data.parts.map((part) => [part.id, part.name]))
  const stock = new Map<number, PartStock>()
  for (const part of data.parts) {
    stock.set(part.id, {
      quantity: part.openingQuantity,
      value: multiplyMoney(part.openingUnitCost, part.openingQuantity),
    })
  }

  const movements: Movement[] = [
    ...data.purchases.map((record) => ({ ...record, kind: 'purchase' as const })),
    ...data.sales.map((record) => ({ ...record, kind: 'sale' as const })),
    ...data.repairs.map((record) => ({ ...record, kind: 'repair' as const })),
  ].sort(
    (a, b) =>
      compareText(a.date, b.date) ||
      DAY_ORDER[a.kind] - DAY_ORDER[b.kind] ||
      a.createdAt - b.createdAt ||
      compareText(a.kind, b.kind) ||
      a.id - b.id,
  )

  const saleCosts = new Map<number, Cents>()
  const repairCosts = new Map<number, Cents>()
  const problems: StockProblem[] = []

  for (const movement of movements) {
    let cost = 0
    for (const line of movement.lines) {
      const current = stock.get(line.partId) ?? { quantity: 0, value: 0 }
      if (movement.kind === 'purchase') {
        stock.set(line.partId, {
          quantity: current.quantity + line.quantity,
          value: current.value + multiplyMoney(line.unitPrice, line.quantity),
        })
      } else if (line.quantity > current.quantity) {
        // Should not happen: saves that cause this are refused. Count what was there and report it.
        problems.push({
          partId: line.partId,
          partName: names.get(line.partId) ?? 'قطعة غير معروفة',
          date: movement.date,
          shortBy: line.quantity - current.quantity,
        })
        cost += current.value
        stock.set(line.partId, { quantity: 0, value: 0 })
      } else if (line.quantity > 0) {
        // Weighted average: these units cost their share of the value on hand. Taking the last unit
        // takes exactly the remaining value, so rounding never builds up.
        const lineCost = divideMoney(multiplyMoney(current.value, line.quantity), current.quantity)
        cost += lineCost
        stock.set(line.partId, {
          quantity: current.quantity - line.quantity,
          value: current.value - lineCost,
        })
      }
    }
    if (movement.kind === 'sale') saleCosts.set(movement.id, cost)
    if (movement.kind === 'repair') repairCosts.set(movement.id, cost)
  }

  return { stock, saleCosts, repairCosts, problems }
}

/** Average cost of one unit on hand, or null when there is no stock. */
export function averageCost(partStock: PartStock): Cents | null {
  return partStock.quantity > 0 ? divideMoney(partStock.value, partStock.quantity) : null
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
