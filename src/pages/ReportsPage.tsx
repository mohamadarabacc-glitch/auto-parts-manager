import { useState, type ReactNode } from 'react'
import { Card, ErrorMessage, Field, Loading, Money, PageHeader, inputClass, secondaryButton } from '../components/ui'
import { useAppData } from '../hooks/useAppData'
import { lastMonthRange, monthRange, yearRange, type DateRange } from '../lib/dates'
import type { Cents } from '../lib/money'
import { buildReport } from '../lib/reports'
import { categoryLabel } from '../types'

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: 'هذا الشهر', range: () => monthRange() },
  { label: 'الشهر الماضي', range: () => lastMonthRange() },
  { label: 'هذه السنة', range: () => yearRange() },
]

export default function ReportsPage() {
  const data = useAppData()
  const [range, setRange] = useState(monthRange)
  if (!data) return <Loading />

  const valid = Boolean(range.from && range.to && range.from <= range.to)
  const report = valid ? buildReport(data, data, range) : null

  return (
    <>
      <PageHeader title="التقارير" />
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="من">
            <input type="date" className={inputClass} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </Field>
          <Field label="إلى">
            <input type="date" className={inputClass} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </Field>
          {PRESETS.map((preset) => (
            <button key={preset.label} type="button" className={secondaryButton} onClick={() => setRange(preset.range())}>
              {preset.label}
            </button>
          ))}
        </div>
      </Card>

      {!report ? (
        <ErrorMessage message="اختر تاريخ بداية قبل تاريخ النهاية أو بنفس اليوم." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="ملخص الأرباح" className="lg:col-span-2">
            <Rows>
              <Row label="المدخول (مبيعات + تصليحات)" value={report.totalRevenue} />
              <Row label="كلفة القطع المباعة والمستعملة" value={-report.totalCost} />
              <Row label="الربح الإجمالي" value={report.grossProfit} strong />
              <Row label="مصاريف التشغيل" value={-report.expensesTotal} />
              <Row label="الربح الصافي (تقديري)" value={report.netProfit} strong />
            </Rows>
          </Card>

          <Card title={`المبيعات (${report.salesCount})`}>
            <Rows>
              <Row label="مدخول المبيعات" value={report.salesRevenue} />
              <Row label="كلفة القطع المباعة" value={-report.salesCost} />
              <Row label="الربح الإجمالي من المبيعات" value={report.salesProfit} strong />
            </Rows>
          </Card>

          <Card title={`التصليحات (${report.repairsCount})`}>
            <Rows>
              <Row label="ثمن القطع على الزبائن" value={report.repairPartsRevenue} />
              <Row label="أجرة اليد" value={report.repairLabor} />
              <Row label="مدخول التصليحات" value={report.repairRevenue} />
              <Row label="كلفة القطع المستعملة" value={-report.repairCost} />
              <Row label="الربح الإجمالي من التصليحات" value={report.repairProfit} strong />
            </Rows>
          </Card>

          <Card title="مصاريف التشغيل">
            {report.expensesByCategory.length === 0 ? (
              <p className="text-sm text-slate-500">لا مصاريف في هذه الفترة.</p>
            ) : (
              <Rows>
                {report.expensesByCategory.map((item) => (
                  <Row key={item.category} label={categoryLabel(item.category)} value={item.amount} />
                ))}
                <Row label="مجموع المصاريف" value={report.expensesTotal} strong />
              </Rows>
            )}
          </Card>

          <Card title={`بضاعة مشتراة (${report.purchasesCount})`}>
            <Rows>
              <Row label="المدفوع على البضاعة" value={report.purchasesTotal} />
            </Rows>
            <p className="mt-2 text-xs text-slate-500">
              للمعلومة فقط. شراء البضاعة ليس مصروفاً: كلفتها محسوبة فوق عندما تُباع القطع أو تُستعمل.
            </p>
          </Card>
        </div>
      )}
    </>
  )
}

function Rows({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-slate-100 text-sm">{children}</dl>
}

function Row({ label, value, strong = false }: { label: string; value: Cents; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-2 ${strong ? 'font-semibold' : ''}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">
        <Money value={value} colored={strong} />
      </dd>
    </div>
  )
}
