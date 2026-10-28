import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import PartLinesEditor, { draftTotal, emptyLine, readLines, toLineDrafts, type LineDraft } from '../components/PartLinesEditor'
import { confirmDelete, useFormAction, withId } from '../components/form'
import { Card, EmptyState, ErrorMessage, Field, Loading, NotFound, PageHeader, dangerButton, inputClass, primaryButton, secondaryButton } from '../components/ui'
import { ValidationError, deletePurchase, savePart, savePurchase } from '../db/actions'
import { useAppData, type LoadedData } from '../hooks/useAppData'
import { today } from '../lib/dates'
import { formatMoney } from '../lib/money'
import type { Purchase } from '../types'

export default function PurchaseFormPage() {
  const { id } = useParams()
  const data = useAppData()
  if (!data) return <Loading />
  const purchase = id ? data.purchases.find((p) => p.id === Number(id)) : undefined
  if (id && !purchase) return <NotFound what="هذا الشراء" backTo="/purchases" />
  // No "add parts first" page here: a new part can be added right on the purchase.
  return <PurchaseForm key={id ?? 'new'} data={data} purchase={purchase} />
}

function PurchaseForm({ data, purchase }: { data: LoadedData; purchase?: Purchase }) {
  const navigate = useNavigate()
  const { error, busy, run } = useFormAction()
  const [date, setDate] = useState(purchase?.date ?? today())
  const [supplier, setSupplier] = useState(purchase?.supplier ?? '')
  const [lines, setLines] = useState(purchase ? toLineDrafts(purchase.lines) : [emptyLine])
  const [notes, setNotes] = useState(purchase?.notes ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const record = {
        date,
        supplier: supplier.trim(),
        lines: readLines(lines),
        notes: notes.trim(),
        createdAt: purchase?.createdAt ?? Date.now(),
      }
      await savePurchase(withId(record, purchase?.id))
      navigate('/purchases')
    })
  }

  function handleDelete() {
    if (!purchase || !confirmDelete('هذا الشراء')) return
    void run(async () => {
      await deletePurchase(purchase.id)
      navigate('/purchases')
    })
  }

  return (
    <>
      <PageHeader title={purchase ? 'تعديل شراء' : 'شراء جديد'} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="التاريخ">
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="المورّد">
              <input className={inputClass} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </Field>
          </div>
        </Card>
        <Card title="القطع المشتراة">
          <PartLinesEditor parts={data.parts} stock={data.stock} lines={lines} onChange={setLines} priceLabel="كلفة القطعة" />
          <NewPart onAdded={(partId) => setLines(withNewPart(lines, partId))} />
          <p className="mt-4 text-end font-semibold tabular-nums">الكلفة الإجمالية: {formatMoney(draftTotal(lines))}</p>
        </Card>
        <Card>
          <Field label="ملاحظات" hint="مثلاً رقم فاتورة المورّد.">
            <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Card>
        <ErrorMessage message={error} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryButton} disabled={busy}>
            حفظ الشراء
          </button>
          <Link to="/purchases" className={secondaryButton}>
            إلغاء
          </Link>
          {purchase && (
            <button type="button" className={`${dangerButton} ms-auto`} onClick={handleDelete} disabled={busy}>
              حذف الشراء
            </button>
          )}
        </div>
      </form>
    </>
  )
}

/** Puts a just-added part on the first empty line, or on a new line when every line is in use. */
function withNewPart(lines: LineDraft[], partId: number): LineDraft[] {
  const line = { ...emptyLine, partId: String(partId) }
  const empty = lines.findIndex((l) => !l.partId && !l.unitPrice.trim())
  return empty === -1 ? [...lines, line] : lines.map((l, i) => (i === empty ? { ...l, partId: line.partId } : l))
}

/**
 * A small box for buying a part that is not in the inventory yet. Like the Add part form it needs a name
 * and the car it fits. The part is saved to the inventory straight away with no opening stock, so its
 * stock and average cost come only from this purchase. It is not a nested <form>, which HTML does not allow.
 */
function NewPart({ onAdded }: { onAdded: (partId: number) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [vehicle, setVehicle] = useState('')
  const { error, busy, run } = useFormAction()

  function add() {
    void run(async () => {
      if (!name.trim()) throw new ValidationError('اكتب اسم القطعة الجديدة.')
      if (!vehicle.trim()) throw new ValidationError('اكتب على أي سيارة تركب القطعة الجديدة. هذا يُستعمل في البحث.')
      const partId = await savePart({
        name: name.trim(),
        partNumber: '',
        condition: 'new',
        vehicle: vehicle.trim(),
        salePrice: 0,
        minStock: 0,
        openingQuantity: 0,
        openingUnitCost: 0,
        notes: '',
        createdAt: Date.now(),
      })
      onAdded(partId)
      setName('')
      setVehicle('')
      setOpen(false)
    })
  }

  // Enter in these boxes adds the part instead of saving the whole purchase.
  function onEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    add()
  }

  if (!open) {
    return (
      <button type="button" className={`${secondaryButton} mt-3`} onClick={() => setOpen(true)}>
        + قطعة جديدة (غير موجودة بالمخزون بعد)
      </button>
    )
  }
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
      <p className="text-sm font-medium">قطعة جديدة</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم القطعة الجديدة">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onEnter} autoFocus />
        </Field>
        <Field label="تركب على (نوع السيارة، الموديل، السنوات)">
          <input className={inputClass} value={vehicle} onChange={(e) => setVehicle(e.target.value)} onKeyDown={onEnter} />
        </Field>
      </div>
      <ErrorMessage message={error} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButton} onClick={add} disabled={busy}>
          أضف القطعة إلى هذا الشراء
        </button>
        <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>
          إلغاء
        </button>
      </div>
    </div>
  )
}

export function NoPartsYet() {
  return (
    <EmptyState>
      أضف قطعاً إلى المخزون أولاً.{' '}
      <Link to="/inventory/new" className="font-medium text-teal-700 underline">
        إضافة قطعة
      </Link>
    </EmptyState>
  )
}
