import type { AppData, PartLine, Repair } from '../types'
import { isInRange, type DateRange } from './dates'
import { multiplyMoney, sumMoney, type Cents } from './money'
import type { StockResult } from './stock'

export interface Report {
  salesCount: number
  salesRevenue: Cents
  salesCost: Cents
  salesProfit: Cents
  repairsCount: number
  repairPartsRevenue: Cents
  repairLabor: Cents
  repairRevenue: Cents
  repairCost: Cents
  repairProfit: Cents
  totalRevenue: Cents
  totalCost: Cents
  grossProfit: Cents
  expensesTotal: Cents
  expensesByCategory: { category: string; amount: Cents }[]
  netProfit: Cents
  // Shown for information only. Stock bought is not an expense: its cost counts when the parts are sold or used.
  purchasesCount: number
  purchasesTotal: Cents
}

export function linesTotal(lines: PartLine[]): Cents {
  return sumMoney(lines.map((line) => multiplyMoney(line.unitPrice, line.quantity)))
}

export function repairTotal(repair: Repair): Cents {
  return linesTotal(repair.lines) + repair.labor
}

export function buildReport(data: AppData, stock: StockResult, range: DateRange): Report {
  const sales = data.sales.filter((sale) => isInRange(sale.date, range))
  const repairs = data.repairs.filter((repair) => isInRange(repair.date, range))
  const expenses = data.expenses.filter((expense) => isInRange(expense.date, range))
  const purchases = data.purchases.filter((purchase) => isInRange(purchase.date, range))

  const salesRevenue = sumMoney(sales.map((sale) => linesTotal(sale.lines)))
  const salesCost = sumMoney(sales.map((sale) => stock.saleCosts.get(sale.id) ?? 0))

  const repairPartsRevenue = sumMoney(repairs.map((repair) => linesTotal(repair.lines)))
  const repairLabor = sumMoney(repairs.map((repair) => repair.labor))
  const repairRevenue = repairPartsRevenue + repairLabor
  const repairCost = sumMoney(repairs.map((repair) => stock.repairCosts.get(repair.id) ?? 0))

  const byCategory = new Map<string, Cents>()
  for (const expense of expenses) {
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount)
  }
  const expensesTotal = sumMoney(expenses.map((expense) => expense.amount))

  const totalRevenue = salesRevenue + repairRevenue
  const totalCost = salesCost + repairCost
  const grossProfit = totalRevenue - totalCost

  return {
    salesCount: sales.length,
    salesRevenue,
    salesCost,
    salesProfit: salesRevenue - salesCost,
    repairsCount: repairs.length,
    repairPartsRevenue,
    repairLabor,
    repairRevenue,
    repairCost,
    repairProfit: repairRevenue - repairCost,
    totalRevenue,
    totalCost,
    grossProfit,
    expensesTotal,
    expensesByCategory: [...byCategory]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    netProfit: grossProfit - expensesTotal,
    purchasesCount: purchases.length,
    purchasesTotal: sumMoney(purchases.map((purchase) => linesTotal(purchase.lines))),
  }
}
