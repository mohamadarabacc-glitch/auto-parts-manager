import { categoryLabel, type AppData, type PartLine } from '../types'
import { linesTotal, repairTotal } from './reports'
import { averageCost, type StockResult } from './stock'
import type { Sheet } from './xlsx'

// The Excel export is for reading and checking the data in a spreadsheet. It cannot be restored:
// the JSON backup is the only file the app reads back, because Excel can change values when edited.

export function buildExportSheets(data: AppData, stock: StockResult): Sheet[] {
  const parts = new Map(data.parts.map((part) => [part.id, part]))
  const describe = (lines: PartLine[]) =>
    lines.map((line) => `${parts.get(line.partId)?.name ?? 'قطعة غير معروفة'} ×${line.quantity}`).join('، ')
  const byDate = <T extends { date: string; createdAt: number }>(records: T[]) =>
    [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))

  return [
    {
      name: 'القطع',
      columns: [
        { header: 'الاسم', format: 'text', width: 28 },
        { header: 'تركب على', format: 'text', width: 20 },
        { header: 'الموجود', format: 'number', width: 10 },
        { header: 'معدل الكلفة', format: 'money', width: 13 },
        { header: 'قيمة المخزون', format: 'money', width: 13 },
        { header: 'سعر البيع', format: 'money', width: 12 },
        { header: 'التنبيه عند', format: 'number', width: 14 },
        { header: 'ملاحظات', format: 'text', width: 30 },
      ],
      rows: [...data.parts]
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
        .map((part) => {
          const onHand = stock.stock.get(part.id) ?? { quantity: 0, value: 0 }
          return [part.name, part.vehicle, onHand.quantity, averageCost(onHand),
            onHand.value, part.salePrice, part.minStock, part.notes]
        }),
    },
    {
      name: 'المبيعات',
      columns: [
        { header: 'التاريخ', format: 'date', width: 12 },
        { header: 'الزبون', format: 'text', width: 20 },
        { header: 'القطع', format: 'text', width: 40 },
        { header: 'المجموع', format: 'money', width: 12 },
        { header: 'كلفة القطع', format: 'money', width: 13 },
        { header: 'الربح', format: 'money', width: 12 },
        { header: 'ملاحظات', format: 'text', width: 30 },
      ],
      rows: byDate(data.sales).map((sale) => {
        const total = linesTotal(sale.lines)
        const cost = stock.saleCosts.get(sale.id) ?? 0
        return [sale.date, sale.customer, describe(sale.lines), total, cost, total - cost, sale.notes]
      }),
    },
    {
      name: 'التصليحات',
      columns: [
        { header: 'التاريخ', format: 'date', width: 12 },
        { header: 'الزبون', format: 'text', width: 20 },
        { header: 'السيارة', format: 'text', width: 16 },
        { header: 'الشغل', format: 'text', width: 30 },
        { header: 'القطع', format: 'text', width: 40 },
        { header: 'ثمن القطع', format: 'money', width: 13 },
        { header: 'أجرة اليد', format: 'money', width: 12 },
        { header: 'المجموع', format: 'money', width: 12 },
        { header: 'كلفة القطع', format: 'money', width: 13 },
        { header: 'الربح', format: 'money', width: 12 },
      ],
      rows: byDate(data.repairs).map((repair) => {
        const total = repairTotal(repair)
        const cost = stock.repairCosts.get(repair.id) ?? 0
        return [repair.date, repair.customer, repair.vehicle, repair.description, describe(repair.lines),
          linesTotal(repair.lines), repair.labor, total, cost, total - cost]
      }),
    },
    {
      name: 'المشتريات',
      columns: [
        { header: 'التاريخ', format: 'date', width: 12 },
        { header: 'المورّد', format: 'text', width: 20 },
        { header: 'القطع', format: 'text', width: 40 },
        { header: 'المجموع', format: 'money', width: 12 },
        { header: 'ملاحظات', format: 'text', width: 30 },
      ],
      rows: byDate(data.purchases).map((purchase) => [purchase.date, purchase.supplier, describe(purchase.lines),
        linesTotal(purchase.lines), purchase.notes]),
    },
    {
      name: 'المصاريف',
      columns: [
        { header: 'التاريخ', format: 'date', width: 12 },
        { header: 'النوع', format: 'text', width: 18 },
        { header: 'الوصف', format: 'text', width: 30 },
        { header: 'المبلغ', format: 'money', width: 12 },
      ],
      rows: byDate(data.expenses).map((expense) => [expense.date, categoryLabel(expense.category), expense.description, expense.amount]),
    },
  ]
}
