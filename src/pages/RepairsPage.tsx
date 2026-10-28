import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import MonthPicker from '../components/MonthPicker'
import { EmptyState, Icon, Loading, Money, PageHeader, TableCard, inputClass, numberClass, primaryButton, secondaryButton, rowClass, tdClass, thClass } from '../components/ui'
import { useAppData } from '../hooks/useAppData'
import { newestFirst } from '../lib/dates'
import { repairTotal } from '../lib/reports'
import { matchesRecordSearch } from '../lib/search'
import type { Repair } from '../types'

export default function RepairsPage() {
  const data = useAppData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('') // "YYYY-MM", or empty for every month
  if (!data) return <Loading />

  const partNames = new Map(data.parts.map((part) => [part.id, part.name]))
  const namesOf = (repair: Repair) => repair.lines.map((line) => partNames.get(line.partId) ?? '')
  // The search also looks in the customer and the car, since a repair is usually found by who brought which car.
  const searchedText = (repair: Repair) => [...namesOf(repair), repair.customer, repair.vehicle]
  const repairs = data.repairs
    .filter((repair) => repair.date.startsWith(month) && matchesRecordSearch(repair.date, searchedText(repair), search))
    .sort(newestFirst)

  return (
    <>
      <PageHeader title="التصليحات">
        <Link to="/repairs/new" className={primaryButton}>
          <Icon name="plus" className="h-4 w-4" />
          تصليح جديد
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          className={inputClass}
          type="search"
          placeholder="ابحث بالقطعة أو الزبون أو السيارة أو التاريخ (مثلاً بوجي، علي، C200، تشرين الأول)"
          aria-label="البحث في التصليحات"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <MonthPicker month={month} onChange={setMonth} title="اعرض تصليحات شهر واحد فقط" />
        {month && (
          <button type="button" className={`${secondaryButton} shrink-0 whitespace-nowrap`} onClick={() => setMonth('')}>
            كل الأشهر
          </button>
        )}
      </div>

      {data.repairs.length === 0 ? (
        <EmptyState>لا توجد تصليحات بعد.</EmptyState>
      ) : repairs.length === 0 ? (
        <EmptyState>لا توجد تصليحات تطابق بحثك.</EmptyState>
      ) : (
        <>
          <TableCard>
            <thead className="border-b border-slate-200">
              <tr>
                <th className={thClass}>التاريخ</th>
                <th className={thClass}>الزبون</th>
                <th className={thClass}>السيارة</th>
                <th className={thClass}>الشغل</th>
                <th className={thClass}>القطع</th>
                <th className={`${thClass} ${numberClass}`}>أجرة اليد</th>
                <th className={`${thClass} ${numberClass}`}>المجموع</th>
                <th className={`${thClass} ${numberClass}`}>الربح الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {repairs.map((repair) => {
                const total = repairTotal(repair)
                const cost = data.repairCosts.get(repair.id) ?? 0
                return (
                  // The whole row opens the repair (its parts, edit, delete); the date link keeps keyboard access.
                  <tr key={repair.id} className={rowClass} onClick={() => navigate(`/repairs/${repair.id}`)}>
                    <td className={tdClass}>
                      <Link to={`/repairs/${repair.id}`} className="font-medium hover:underline">
                        {repair.date}
                      </Link>
                    </td>
                    <td className={tdClass}>{repair.customer || '—'}</td>
                    <td className={tdClass}>{repair.vehicle || '—'}</td>
                    <td className={`${tdClass} max-w-64 truncate`}>{repair.description}</td>
                    <td className="min-w-48 px-3 py-2">
                      {namesOf(repair).join('، ')}
                    </td>
                    <td className={`${tdClass} ${numberClass}`}>
                      <Money value={repair.labor} />
                    </td>
                    <td className={`${tdClass} ${numberClass}`}>
                      <Money value={total} />
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
            عدد التصليحات المعروضة: {repairs.length}
          </p>
        </>
      )}
    </>
  )
}
