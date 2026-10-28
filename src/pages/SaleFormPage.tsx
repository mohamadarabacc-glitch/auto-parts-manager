import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import PartLinesEditor, { draftTotal, emptyLine, readLines, toLineDrafts } from '../components/PartLinesEditor'
import { confirmDelete, useFormAction, withId } from '../components/form'
import { Card, ErrorMessage, Field, Loading, NotFound, PageHeader, dangerButton, inputClass, primaryButton, secondaryButton } from '../components/ui'
import { deleteSale, saveSale } from '../db/actions'
import { useAppData, type LoadedData } from '../hooks/useAppData'
import { today } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { linesTotal } from '../lib/reports'
import type { Sale } from '../types'
import { NoPartsYet } from './PurchaseFormPage'

export default function SaleFormPage() {
  const { id } = useParams()
  const data = useAppData()
  if (!data) return <Loading />
  const sale = id ? data.sales.find((s) => s.id === Number(id)) : undefined
  if (id && !sale) return <NotFound what="هذا البيع" backTo="/sales" />
  if (data.parts.length === 0) return <NoPartsYet />
  return <SaleForm key={id ?? 'new'} data={data} sale={sale} />
}

function SaleForm({ data, sale }: { data: LoadedData; sale?: Sale }) {
  const navigate = useNavigate()
  const { error, busy, run } = useFormAction()
  const [date, setDate] = useState(sale?.date ?? today())
  const [customer, setCustomer] = useState(sale?.customer ?? '')
  const [lines, setLines] = useState(sale ? toLineDrafts(sale.lines) : [emptyLine])
  const [notes, setNotes] = useState(sale?.notes ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const record = {
        date,
        customer: customer.trim(),
        lines: readLines(lines),
        notes: notes.trim(),
        createdAt: sale?.createdAt ?? Date.now(),
      }
      await saveSale(withId(record, sale?.id))
      navigate('/sales')
    })
  }

  function handleDelete() {
    if (!sale || !confirmDelete('هذا البيع')) return
    void run(async () => {
      await deleteSale(sale.id)
      navigate('/sales')
    })
  }

  const savedCost = sale ? (data.saleCosts.get(sale.id) ?? 0) : null

  return (
    <>
      <PageHeader title={sale ? 'تعديل بيع' : 'بيع جديد'} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="التاريخ">
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="الزبون">
              <input className={inputClass} value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </Field>
          </div>
        </Card>
        <Card title="القطع المباعة">
          <PartLinesEditor
            parts={data.parts}
            stock={data.stock}
            lines={lines}
            onChange={setLines}
            priceLabel="سعر القطعة"
            suggestPrice={(part) => part.salePrice}
          />
          <p className="mt-4 text-end font-semibold tabular-nums">المجموع: {formatMoney(draftTotal(lines))}</p>
          {sale && savedCost !== null && (
            <p className="mt-1 text-end text-sm text-slate-600 tabular-nums">
              حسب المحفوظ: كلفة القطع {formatMoney(savedCost)} · الربح الإجمالي{' '}
              {formatMoney(linesTotal(sale.lines) - savedCost)}
            </p>
          )}
        </Card>
        <Card>
          <Field label="ملاحظات">
            <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Card>
        <ErrorMessage message={error} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryButton} disabled={busy}>
            حفظ البيع
          </button>
          <Link to="/sales" className={secondaryButton}>
            إلغاء
          </Link>
          {sale && (
            <button type="button" className={`${dangerButton} ms-auto`} onClick={handleDelete} disabled={busy}>
              حذف البيع
            </button>
          )}
        </div>
      </form>
    </>
  )
}
