import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import PartLinesEditor, { draftTotal, readLines, toLineDrafts } from '../components/PartLinesEditor'
import { confirmDelete, readMoney, useFormAction, withId } from '../components/form'
import { Card, ErrorMessage, Field, Loading, NotFound, PageHeader, dangerButton, inputClass, primaryButton, secondaryButton } from '../components/ui'
import { deleteRepair, saveRepair } from '../db/actions'
import { useAppData, type LoadedData } from '../hooks/useAppData'
import { today } from '../lib/dates'
import { formatMoney, formatMoneyPlain, parseMoney } from '../lib/money'
import { repairTotal } from '../lib/reports'
import type { Repair } from '../types'

export default function RepairFormPage() {
  const { id } = useParams()
  const data = useAppData()
  if (!data) return <Loading />
  const repair = id ? data.repairs.find((r) => r.id === Number(id)) : undefined
  if (id && !repair) return <NotFound what="هذا التصليح" backTo="/repairs" />
  return <RepairForm key={id ?? 'new'} data={data} repair={repair} />
}

function RepairForm({ data, repair }: { data: LoadedData; repair?: Repair }) {
  const navigate = useNavigate()
  const { error, busy, run } = useFormAction()
  const [date, setDate] = useState(repair?.date ?? today())
  const [customer, setCustomer] = useState(repair?.customer ?? '')
  const [vehicle, setVehicle] = useState(repair?.vehicle ?? '')
  const [description, setDescription] = useState(repair?.description ?? '')
  const [lines, setLines] = useState(repair ? toLineDrafts(repair.lines) : [])
  const [labor, setLabor] = useState(repair ? formatMoneyPlain(repair.labor) : '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const record = {
        date,
        customer: customer.trim(),
        vehicle: vehicle.trim(),
        description: description.trim(),
        lines: readLines(lines),
        labor: readMoney(labor, 'أجرة اليد', true),
        createdAt: repair?.createdAt ?? Date.now(),
      }
      await saveRepair(withId(record, repair?.id))
      navigate('/repairs')
    })
  }

  function handleDelete() {
    if (!repair || !confirmDelete('هذا التصليح')) return
    void run(async () => {
      await deleteRepair(repair.id)
      navigate('/repairs')
    })
  }

  const partsTotal = draftTotal(lines)
  const laborTotal = parseMoney(labor.trim() || '0') ?? 0
  const savedCost = repair ? (data.repairCosts.get(repair.id) ?? 0) : null

  return (
    <>
      <PageHeader title={repair ? 'تعديل تصليح' : 'تصليح جديد'} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="التاريخ">
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="الزبون">
              <input className={inputClass} value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </Field>
            <Field label="السيارة" hint="النوع، الموديل، رقم اللوحة.">
              <input className={inputClass} value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            </Field>
            <Field label="وصف الشغل">
              <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </Field>
          </div>
        </Card>
        <Card title="القطع المستعملة">
          <p className="mb-3 text-sm text-slate-600">
            القطع المذكورة هنا تُخصم من المخزون مرة واحدة، بتاريخ الشغل. اتركها فارغة إذا كان الشغل أجرة يد فقط.
          </p>
          <PartLinesEditor
            parts={data.parts}
            stock={data.stock}
            lines={lines}
            onChange={setLines}
            priceLabel="السعر على الزبون"
            suggestPrice={(part) => part.salePrice}
          />
        </Card>
        <Card>
          <Field label="أجرة اليد" className="sm:max-w-xs">
            <input className={inputClass} inputMode="decimal" placeholder="0.00" value={labor} onChange={(e) => setLabor(e.target.value)} />
          </Field>
          <div className="mt-4 space-y-1 text-end tabular-nums">
            <p className="text-sm text-slate-600">
              القطع {formatMoney(partsTotal)} + أجرة اليد {formatMoney(laborTotal)}
            </p>
            <p className="font-semibold">المجموع المطلوب من الزبون: {formatMoney(partsTotal + laborTotal)}</p>
            {repair && savedCost !== null && (
              <p className="text-sm text-slate-600">
                حسب المحفوظ: كلفة القطع {formatMoney(savedCost)} · الربح الإجمالي {formatMoney(repairTotal(repair) - savedCost)}
              </p>
            )}
          </div>
        </Card>
        <ErrorMessage message={error} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryButton} disabled={busy}>
            حفظ التصليح
          </button>
          <Link to="/repairs" className={secondaryButton}>
            إلغاء
          </Link>
          {repair && (
            <button type="button" className={`${dangerButton} ms-auto`} onClick={handleDelete} disabled={busy}>
              حذف التصليح
            </button>
          )}
        </div>
      </form>
    </>
  )
}
