import { Link } from 'react-router'
import { Card, Icon, Loading, Notice, PageHeader, Stat, StatBox, primaryButton, secondaryButton } from '../components/ui'
import { getLastBackupDate } from '../db/backup'
import { useAppData } from '../hooks/useAppData'
import { LOCALE, monthRange } from '../lib/dates'
import { sumMoney } from '../lib/money'
import { buildReport } from '../lib/reports'

const BACKUP_REMINDER_DAYS = 7

export default function DashboardPage() {
  const data = useAppData()
  if (!data) return <Loading />

  const report = buildReport(data, data, monthRange())
  const monthName = new Date().toLocaleString(LOCALE, { month: 'long', year: 'numeric' })
  const stockValue = sumMoney([...data.stock.values()].map((s) => s.value))
  const unitsInStock = [...data.stock.values()].reduce((sum, s) => sum + s.quantity, 0)
  const lowStock = data.parts
    .filter((part) => part.minStock > 0 && (data.stock.get(part.id)?.quantity ?? 0) <= part.minStock)
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))

  const hasData = data.parts.length + data.sales.length + data.repairs.length + data.expenses.length > 0
  const lastBackup = getLastBackupDate()
  const backupDue = hasData && (!lastBackup || Date.now() - lastBackup.getTime() > BACKUP_REMINDER_DAYS * 86_400_000)

  return (
    <>
      <PageHeader title="الرئيسية">
        <Link to="/sales/new" className={primaryButton}>
          <Icon name="plus" className="h-4 w-4" />
          بيع جديد
        </Link>
        <Link to="/repairs/new" className={primaryButton}>
          <Icon name="plus" className="h-4 w-4" />
          تصليح جديد
        </Link>
        <Link to="/purchases/new" className={secondaryButton}>
          <Icon name="plus" className="h-4 w-4" />
          شراء جديد
        </Link>
        <Link to="/expenses/new" className={secondaryButton}>
          <Icon name="plus" className="h-4 w-4" />
          مصروف جديد
        </Link>
      </PageHeader>

      {backupDue && (
        <Notice>
          {lastBackup ? `آخر نسخة احتياطية كانت بتاريخ ${lastBackup.toLocaleDateString(LOCALE)}.` : 'لم تعمل نسخة احتياطية بعد.'}{' '}
          بياناتك محفوظة على هذا الجهاز فقط.{' '}
          <Link to="/backup" className="font-medium underline">
            اعمل نسخة احتياطية الآن
          </Link>
        </Notice>
      )}
      {data.problems.length > 0 && (
        <Notice>
          بعض أرقام المخزون غير متطابقة (مثلاً "{data.problems[0].partName}" بتاريخ {data.problems[0].date}). راجع
          المشتريات والمبيعات والتصليحات لهذه القطعة.
        </Notice>
      )}

      <h2 className="mb-3 font-bold text-slate-700">{monthName}</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="المدخول" value={report.totalRevenue} icon={<Icon name="coins" />} tone="sky" />
        <Stat label="الربح الإجمالي" value={report.grossProfit} colored icon={<Icon name="trend" />} tone="green" />
        <Stat label="المصاريف" value={report.expensesTotal} icon={<Icon name="receipt" />} tone="rose" />
        <Stat label="الربح الصافي (تقديري)" value={report.netProfit} colored icon={<Icon name="wallet" />} tone="teal" />
      </div>

      <h2 className="mb-3 font-bold text-slate-700">المخزون</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="قيمة المخزون بسعر الكلفة" value={stockValue} icon={<Icon name="box" />} tone="violet" />
        <StatBox label="عدد القطع بالمخزون" icon={<Icon name="tag" />} tone="amber">
          {unitsInStock}
        </StatBox>
      </div>

      <Card title="قطع قاربت على النفاد">
        {lowStock.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <Icon name="check" className="h-4 w-4" />
            لا شيء قارب على النفاد.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {lowStock.map((part) => (
              <li key={part.id}>
                <Link
                  to={`/inventory/${part.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/60 px-3 py-2.5 ring-1 ring-amber-100 transition hover:bg-amber-50 hover:ring-amber-200"
                >
                  <span className="font-medium text-slate-800">{part.name}</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-amber-800">
                    باقي {data.stock.get(part.id)?.quantity ?? 0} (التنبيه عند {part.minStock})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-5 text-sm">
        <Link to="/reports" className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:text-teal-900 hover:underline">
          <Icon name="chart" className="h-4 w-4" />
          شاهد التقارير الكاملة لأي فترة
        </Link>
      </p>
    </>
  )
}
