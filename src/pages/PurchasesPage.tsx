import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import MonthPicker from '../components/MonthPicker'
import { EmptyState, Icon, Loading, Money, PageHeader, TableCard, inputClass, numberClass, primaryButton, secondaryButton, rowClass, tdClass, thClass } from '../components/ui'
import { useAppData } from '../hooks/useAppData'
import { newestFirst } from '../lib/dates'
import { linesTotal } from '../lib/reports'
import { matchesRecordSearch } from '../lib/search'
import type { Purchase } from '../types'

export default function PurchasesPage() {
  const data = useAppData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('') // "YYYY-MM", or empty for every month
  if (!data) return <Loading />

  const partNames = new Map(data.parts.map((part) => [part.id, part.name]))
  const namesOf = (purchase: Purchase) => purchase.lines.map((line) => partNames.get(line.partId) ?? '')
  const purchases = data.purchases
    .filter((purchase) => purchase.date.startsWith(month) && matchesRecordSearch(purchase.date, namesOf(purchase), search))
    .sort(newestFirst)

  return (
    <>
      <PageHeader title="المشتريات">
        <Link to="/purchases/new" className={primaryButton}>
          <Icon name="plus" className="h-4 w-4" />
          شراء جديد
        </Link>
      </PageHeader>
      <p className="mb-4 text-sm text-slate-600">
        البضاعة التي تشتريها. كل عملية شراء تزيد المخزون وتحدّث معدل كلفة قطعها.
      </p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          className={inputClass}
          type="search"
          placeholder="ابحث باسم القطعة أو التاريخ (مثلاً كوبلنغ، تشرين الأول، 2026-10)"
          aria-label="البحث في المشتريات"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <MonthPicker month={month} onChange={setMonth} title="اعرض مشتريات شهر واحد فقط" />
        {month && (
          <button type="button" className={`${secondaryButton} shrink-0 whitespace-nowrap`} onClick={() => setMonth('')}>
            كل الأشهر
          </button>
        )}
      </div>

      {data.purchases.length === 0 ? (
        <EmptyState>لا توجد مشتريات بعد.</EmptyState>
      ) : purchases.length === 0 ? (
        <EmptyState>لا توجد مشتريات تطابق بحثك.</EmptyState>
      ) : (
        <>
          <TableCard>
            <thead className="border-b border-slate-200">
              <tr>
                <th className={thClass}>التاريخ</th>
                <th className={thClass}>المورّد</th>
                <th className={thClass}>القطع</th>
                <th className={`${thClass} ${numberClass}`}>العدد</th>
                <th className={`${thClass} ${numberClass}`}>الكلفة الإجمالية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((purchase) => (
                // The whole row opens the purchase (its parts, edit, delete); the date link keeps keyboard access.
                <tr key={purchase.id} className={rowClass} onClick={() => navigate(`/purchases/${purchase.id}`)}>
                  <td className={tdClass}>
                    <Link to={`/purchases/${purchase.id}`} className="font-medium hover:underline">
                      {purchase.date}
                    </Link>
                  </td>
                  <td className={tdClass}>{purchase.supplier || '—'}</td>
                  <td className="min-w-48 px-3 py-2">{namesOf(purchase).join('، ')}</td>
                  <td className={`${tdClass} ${numberClass}`}>{purchase.lines.reduce((sum, line) => sum + line.quantity, 0)}</td>
                  <td className={`${tdClass} ${numberClass}`}>
                    <Money value={linesTotal(purchase.lines)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
          <p className="mt-3 text-sm text-slate-600">
            عدد المشتريات المعروضة: {purchases.length}
          </p>
        </>
      )}
    </>
  )
}
