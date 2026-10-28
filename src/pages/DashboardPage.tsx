import { Link } from 'react-router'
import { Card, Loading, Notice, PageHeader, Stat, primaryButton, secondaryButton } from '../components/ui'
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
          بيع جديد
        </Link>
        <Link to="/repairs/new" className={primaryButton}>
          تصليح جديد
        </Link>
        <Link to="/purchases/new" className={secondaryButton}>
          شراء جديد
        </Link>
        <Link to="/expenses/new" className={secondaryButton}>
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

      <h2 className="mb-3 font-semibold text-slate-700">{monthName}</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="المدخول" value={report.totalRevenue} />
        <Stat label="الربح الإجمالي" value={report.grossProfit} colored />
        <Stat label="المصاريف" value={report.expensesTotal} />
        <Stat label="الربح الصافي (تقديري)" value={report.netProfit} colored />
      </div>

      <h2 className="mb-3 font-semibold text-slate-700">المخزون</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="قيمة المخزون بسعر الكلفة" value={stockValue} />
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">عدد القطع بالمخزون</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{unitsInStock}</p>
        </div>
      </div>

      <Card title="قطع قاربت على النفاد">
        {lowStock.length === 0 ? (
          <p className="text-sm text-slate-500">لا شيء قارب على النفاد.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {lowStock.map((part) => (
              <li key={part.id} className="flex justify-between gap-3 py-2">
                <Link to={`/inventory/${part.id}`} className="font-medium hover:underline">
                  {part.name}
                </Link>
                <span className="tabular-nums text-amber-800">
                  باقي {data.stock.get(part.id)?.quantity ?? 0} (التنبيه عند {part.minStock})
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-4 text-sm">
        <Link to="/reports" className="font-medium underline">
          شاهد التقارير الكاملة لأي فترة
        </Link>
      </p>
    </>
  )
}
