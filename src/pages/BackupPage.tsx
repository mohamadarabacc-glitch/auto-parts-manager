import { useState, type ChangeEvent } from 'react'
import { errorText } from '../components/form'
import { Card, ErrorMessage, PageHeader, primaryButton, secondaryButton } from '../components/ui'
import { createBackup, getLastBackupDate, readBackup, rememberBackup, restoreBackup } from '../db/backup'
import { loadAll } from '../db/db'
import { LOCALE, today } from '../lib/dates'
import { buildExportSheets } from '../lib/excelExport'
import { calculateStock } from '../lib/stock'
import { createXlsx } from '../lib/xlsx'

export default function BackupPage() {
  const [lastBackup, setLastBackup] = useState(getLastBackupDate)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleExport() {
    setError('')
    try {
      const backup = await createBackup()
      downloadFile(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `auto-parts-backup-${today()}.json`)
      rememberBackup()
      setLastBackup(getLastBackupDate())
      setMessage('تم حفظ ملف النسخة الاحتياطية. احفظه في مكان آمن، مثل USB أو التخزين السحابي.')
    } catch (err) {
      setError(errorText(err))
    }
  }

  async function handleExcelExport() {
    setError('')
    setMessage('')
    try {
      const data = await loadAll()
      const file = createXlsx(buildExportSheets(data, calculateStock(data)))
      const type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      downloadFile(new Blob([file], { type }), `auto-parts-data-${today()}.xlsx`)
      setMessage('تم حفظ ملف Excel. افتحه لقراءة بياناتك أو مراجعتها. هذا الملف ليس نسخة احتياطية ولا يمكن الاسترجاع منه.')
    } catch (err) {
      setError(errorText(err))
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again
    if (!file) return
    setError('')
    setMessage('')
    try {
      const backup = readBackup(await file.text())
      const { parts, purchases, sales, repairs, expenses } = backup.data
      const summary = `القطع: ${parts.length}، المشتريات: ${purchases.length}، المبيعات: ${sales.length}، التصليحات: ${repairs.length}، المصاريف: ${expenses.length}`
      const made = new Date(backup.exportedAt).toLocaleString(LOCALE)
      if (!window.confirm(`هل تريد استبدال كل البيانات على هذا الجهاز بالنسخة الاحتياطية من ${made} (${summary})؟ لا يمكن التراجع عن ذلك.`)) {
        return
      }
      await restoreBackup(backup.data)
      setMessage(`تم استرجاع النسخة الاحتياطية: ${summary}.`)
    } catch (err) {
      setError(errorText(err))
    }
  }

  return (
    <>
      <PageHeader title="النسخ الاحتياطي" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="حفظ نسخة احتياطية">
          <p className="mb-3 text-sm text-slate-600">
            بياناتك محفوظة فقط في هذا المتصفح على هذا الجهاز. احفظ نسخة احتياطية بشكل منتظم، وقبل مسح بيانات المتصفح أو
            تغيير الجهاز.
          </p>
          <button type="button" className={primaryButton} onClick={handleExport}>
            تنزيل ملف النسخة الاحتياطية
          </button>
          <p className="mt-3 text-sm text-slate-500">
            آخر نسخة احتياطية: {lastBackup ? lastBackup.toLocaleString(LOCALE) : 'لا يوجد'}
          </p>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm text-slate-600">
              لقراءة بياناتك أو مراجعتها، نزّلها كملف Excel: القطع والمبيعات والتصليحات والمشتريات والمصاريف، كل قسم في
              صفحة. هذا الملف للقراءة فقط ولا يمكن الاسترجاع منه.
            </p>
            <button type="button" className={secondaryButton} onClick={handleExcelExport}>
              تنزيل ملف Excel
            </button>
          </div>
        </Card>
        <Card title="استرجاع من نسخة احتياطية">
          <p className="mb-3 text-sm text-slate-600">
            يستبدل كل شيء على هذا الجهاز بمحتوى ملف النسخة الاحتياطية. استعمله لاسترجاع البيانات أو لنقلها إلى جهاز
            آخر.
          </p>
          <label className={`${secondaryButton} cursor-pointer`}>
            اختر ملف النسخة الاحتياطية…
            <input type="file" accept="application/json,.json" className="sr-only" onChange={handleImport} />
          </label>
        </Card>
      </div>
      <div className="mt-4 space-y-2">
        {message && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>}
        <ErrorMessage message={error} />
      </div>
    </>
  )
}

function downloadFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000) // give the browser time to start the download
}
