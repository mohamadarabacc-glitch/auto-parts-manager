import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import MonthPicker from '../components/MonthPicker'
import { EmptyState, Icon, Loading, Money, PageHeader, TableCard, inputClass, numberClass, primaryButton, secondaryButton, rowClass, tdClass, thClass } from '../components/ui'
import { useAppData } from '../hooks/useAppData'
import { newestFirst } from '../lib/dates'
import { linesTotal } from '../lib/reports'
import { matchesRecordSearch } from '../lib/search'
import type { Sale } from '../types'

export default function SalesPage() {
  const data = useAppData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('') // "YYYY-MM", or empty for every month
  if (!data) return <Loading />

  const partNames = new Map(data.parts.map((part) => [part.id, part.name]))
  const namesOf = (sale: Sale) => sale.lines.map((line) => partNames.get(line.partId) ?? '')
  const sales = data.sales
    .filter((sale) => sale.date.startsWith(month) && matchesRecordSearch(sale.date, namesOf(sale), search))
    .sort(newestFirst)

  return (
    <>
      <PageHeader title="المبيعات">
        <Link to="/sales/new" className={primaryButton}>
          <Icon name="plus" className="h-4 w-4" />
          بيع جديد
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          className={inputClass}
          type="search"
          placeholder="ابحث باسم القطعة أو التاريخ (مثلاً كوبلنغ، تشرين الأول، 2026-10)"
          aria-label="البحث في المبيعات"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <MonthPicker month={month} onChange={setMonth} title="اعرض مبيعات شهر واحد فقط" />
        {month && (
          <button type="button" className={`${secondaryButton} shrink-0 whitespace-nowrap`} onClick={() => setMonth('')}>
            كل الأشهر
          </button>
        )}
      </div>

      {data.sales.length === 0 ? (
        <EmptyState>لا توجد مبيعات بعد.</EmptyState>
      ) : sales.length === 0 ? (
        <EmptyState>لا توجد مبيعات تطابق بحثك.</EmptyState>
      ) : (
        <>
          <TableCard>
            <thead className="border-b border-slate-200">
              <tr>
                <th className={thClass}>التاريخ</th>
                <th className={thClass}>الزبون</th>
                <th className={thClass}>القطع</th>
                <th className={`${thClass} ${numberClass}`}>المجموع</th>
                <th className={`${thClass} ${numberClass}`}>كلفة القطع</th>
                <th className={`${thClass} ${numberClass}`}>الربح الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((sale) => {
                const total = linesTotal(sale.lines)
                const cost = data.saleCosts.get(sale.id) ?? 0
                return (
                  // The whole row opens the sale (its parts, edit, delete); the date link keeps keyboard access.
                  <tr key={sale.id} className={rowClass} onClick={() => navigate(`/sales/${sale.id}`)}>
                    <td className={tdClass}>
                      <Link to={`/sales/${sale.id}`} className="font-medium hover:underline">
                        {sale.date}
                      </Link>
                    </td>
                    <td className={tdClass}>{sale.customer || '—'}</td>
                    <td className="min-w-48 px-3 py-2">
                      {namesOf(sale).join('، ')}
                    </td>
                    <td className={`${tdClass} ${numberClass}`}>
                      <Money value={total} />
                    </td>
                    <td className={`${tdClass} ${numberClass}`}>
                      <Money value={cost} />
                    </td>
                    <td className={`${tdClass} ${numberClass}`}>
                      <Money value={total - cost} colored />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableCard>
          <p className="mt-3 text-sm text-slate-600">
            عدد المبيعات المعروضة: {sales.length}
          </p>
        </>
      )}
    </>
  )
}
