import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import MonthPicker from '../components/MonthPicker'
import { EmptyState, Icon, Loading, Money, PageHeader, TableCard, inputClass, numberClass, primaryButton, secondaryButton, rowClass, tdClass, thClass } from '../components/ui'
import { useAppData } from '../hooks/useAppData'
import { isInRange, monthRange, newestFirst } from '../lib/dates'
import { formatMoney, sumMoney } from '../lib/money'
import { matchesRecordSearch } from '../lib/search'
import { categoryLabel } from '../types'

export default function ExpensesPage() {
  const data = useAppData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('') // "YYYY-MM", or empty for every month
  if (!data) return <Loading />

  const thisMonth = monthRange()
  const monthTotal = sumMoney(data.expenses.filter((e) => isInRange(e.date, thisMonth)).map((e) => e.amount))
  // Expenses have no parts, so the same search looks in the category (English and Arabic) and description instead of part names.
  const expenses = data.expenses
    .filter((expense) => expense.date.startsWith(month) && matchesRecordSearch(expense.date, [expense.category, categoryLabel(expense.category), expense.description], search))
    .sort(newestFirst)

  return (
    <>
      <PageHeader title="المصاريف">
        <Link to="/expenses/new" className={primaryButton}>
          <Icon name="plus" className="h-4 w-4" />
          مصروف جديد
        </Link>
      </PageHeader>
      <p className="mb-4 text-sm text-slate-600">
        مصاريف التشغيل مثل الإيجار والرواتب والكهرباء. هذا الشهر:{' '}
        <span className="font-medium tabular-nums">{formatMoney(monthTotal)}</span>
      </p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          className={inputClass}
          type="search"
          placeholder="ابحث بالنوع أو الوصف أو التاريخ (مثلاً إيجار، كهرباء، تشرين الأول)"
          aria-label="البحث في المصاريف"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <MonthPicker month={month} onChange={setMonth} title="اعرض مصاريف شهر واحد فقط" />
        {month && (
          <button type="button" className={`${secondaryButton} shrink-0 whitespace-nowrap`} onClick={() => setMonth('')}>
            كل الأشهر
          </button>
        )}
      </div>

      {data.expenses.length === 0 ? (
        <EmptyState>لا توجد مصاريف بعد.</EmptyState>
      ) : expenses.length === 0 ? (
        <EmptyState>لا توجد مصاريف تطابق بحثك.</EmptyState>
      ) : (
        <>
          <TableCard>
            <thead className="border-b border-slate-200">
              <tr>
                <th className={thClass}>التاريخ</th>
                <th className={thClass}>النوع</th>
                <th className={thClass}>الوصف</th>
                <th className={`${thClass} ${numberClass}`}>المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                // The whole row opens the expense (edit, delete); the date link keeps keyboard access.
                <tr key={expense.id} className={rowClass} onClick={() => navigate(`/expenses/${expense.id}`)}>
                  <td className={tdClass}>
                    <Link to={`/expenses/${expense.id}`} className="font-medium hover:underline">
                      {expense.date}
                    </Link>
                  </td>
                  <td className={tdClass}>{categoryLabel(expense.category)}</td>
                  <td className={`${tdClass} max-w-72 truncate`}>{expense.description || '—'}</td>
                  <td className={`${tdClass} ${numberClass}`}>
                    <Money value={expense.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
          <p className="mt-3 text-sm text-slate-600">
            عدد المصاريف المعروضة: {expenses.length}
          </p>
        </>
      )}
    </>
  )
}
