import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { EmptyState, Icon, Loading, Money, PageHeader, TableCard, inputClass, numberClass, primaryButton, rowClass, tdClass, thClass } from '../components/ui'
import { useAppData } from '../hooks/useAppData'
import { formatMoney, sumMoney } from '../lib/money'
import { matchesPartSearch } from '../lib/search'
import { averageCost } from '../lib/stock'

export default function InventoryPage() {
  const data = useAppData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  if (!data) return <Loading />

  const parts = data.parts
    .filter((part) => matchesPartSearch(part, search))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  const shownValue = sumMoney(parts.map((part) => data.stock.get(part.id)?.value ?? 0))

  return (
    <>
      <PageHeader title="المخزون">
        <Link to="/inventory/new" className={primaryButton}>
          <Icon name="plus" className="h-4 w-4" />
          إضافة قطعة
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          className={inputClass}
          type="search"
          placeholder="ابحث باسم القطعة أو السيارة (مثلاً Mercedes C200)"
          aria-label="البحث في القطع"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {data.parts.length === 0 ? (
        <EmptyState>لا توجد قطع بعد. أضف أول قطعة لتبدأ بمتابعة المخزون.</EmptyState>
      ) : parts.length === 0 ? (
        <EmptyState>لا توجد قطع تطابق بحثك.</EmptyState>
      ) : (
        <>
          <TableCard>
            <thead className="border-b border-slate-200">
              <tr>
                <th className={thClass}>القطعة</th>
                <th className={thClass}>تركب على</th>
                <th className={`${thClass} ${numberClass}`}>الموجود</th>
                <th className={`${thClass} ${numberClass}`}>معدل الكلفة</th>
                <th className={`${thClass} ${numberClass}`}>سعر البيع</th>
                <th className={`${thClass} ${numberClass}`}>قيمة المخزون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parts.map((part) => {
                const partStock = data.stock.get(part.id) ?? { quantity: 0, value: 0 }
                const cost = averageCost(partStock)
                const low = part.minStock > 0 && partStock.quantity <= part.minStock
                return (
                  // The whole row opens the part (notes, edit, delete); the name link keeps keyboard access.
                  <tr key={part.id} className={partStock.quantity === 0 ? 'cursor-pointer bg-red-50 transition-colors hover:bg-red-100' : rowClass} onClick={() => navigate(`/inventory/${part.id}`)}>
                    <td className={tdClass}>
                      <Link to={`/inventory/${part.id}`} className="font-medium text-slate-900 hover:text-teal-700 hover:underline">
                        {part.name}
                      </Link>
                      {part.partNumber && <span className="block text-xs text-slate-500">{part.partNumber}</span>}
                    </td>
                    <td className={tdClass}>{part.vehicle}</td>
                    <td className={`${tdClass} ${numberClass}`}>
                      {low && <span className="me-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">قليل</span>}
                      {partStock.quantity}
                    </td>
                    <td className={`${tdClass} ${numberClass}`}>{cost === null ? '—' : formatMoney(cost)}</td>
                    <td className={`${tdClass} ${numberClass}`}>
                      <Money value={part.salePrice} />
                    </td>
                    <td className={`${tdClass} ${numberClass}`}>
                      <Money value={partStock.value} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableCard>
          <p className="mt-3 text-sm text-slate-600">
            عدد القطع المعروضة: {parts.length} · قيمة المخزون بسعر الكلفة{' '}
            <span className="font-medium tabular-nums">{formatMoney(shownValue)}</span>
          </p>
        </>
      )}
    </>
  )
}
