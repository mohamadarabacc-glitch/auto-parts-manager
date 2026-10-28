import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { confirmDelete, readMoney, readQuantity, useFormAction, withId } from '../components/form'
import { Card, ErrorMessage, Field, Loading, NotFound, PageHeader, dangerButton, inputClass, primaryButton, secondaryButton } from '../components/ui'
import { ValidationError, deletePart, savePart } from '../db/actions'
import { useAppData, type LoadedData } from '../hooks/useAppData'
import { formatMoney, formatMoneyPlain } from '../lib/money'
import { averageCost } from '../lib/stock'
import type { Part } from '../types'

export default function PartFormPage() {
  const { id } = useParams()
  const data = useAppData()
  if (!data) return <Loading />
  const part = id ? data.parts.find((p) => p.id === Number(id)) : undefined
  if (id && !part) return <NotFound what="هذا الصنف" backTo="/inventory" />
  return <PartForm key={id ?? 'new'} data={data} part={part} />
}

function PartForm({ data, part }: { data: LoadedData; part?: Part }) {
  const navigate = useNavigate()
  const { error, busy, run } = useFormAction()
  const [name, setName] = useState(part?.name ?? '')
  const [vehicle, setVehicle] = useState(part?.vehicle ?? '')
  const [salePrice, setSalePrice] = useState(part ? formatMoneyPlain(part.salePrice) : '')
  const [minStock, setMinStock] = useState(part ? String(part.minStock) : '0')
  // A new part is usually being added because you have at least one of it.
  const [openingQuantity, setOpeningQuantity] = useState(part ? String(part.openingQuantity) : '1')
  const [openingUnitCost, setOpeningUnitCost] = useState(part ? formatMoneyPlain(part.openingUnitCost) : '')
  const [notes, setNotes] = useState(part?.notes ?? '')

  const partStock = part ? (data.stock.get(part.id) ?? { quantity: 0, value: 0 }) : undefined
  const cost = partStock ? averageCost(partStock) : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      // Required here, not in savePart, so old parts and backups without a car still load and restore.
      if (!vehicle.trim()) throw new ValidationError('اكتب على أي سيارة تركب هذه القطعة. هذا يُستعمل في البحث.')
      const record = {
        name: name.trim(),
        // Not on the form any more, but kept so editing a part never wipes old data.
        partNumber: part?.partNumber ?? '',
        condition: part?.condition ?? 'new',
        vehicle: vehicle.trim(),
        salePrice: readMoney(salePrice, 'سعر البيع', true),
        minStock: readQuantity(minStock, 'التنبيه عند'),
        openingQuantity: readQuantity(openingQuantity, 'الكمية الأولية'),
        openingUnitCost: readMoney(openingUnitCost, 'كلفة القطعة الأولية', true),
        notes: notes.trim(),
        createdAt: part?.createdAt ?? Date.now(),
      }
      await savePart(withId(record, part?.id))
      navigate('/inventory')
    })
  }

  function handleDelete() {
    if (!part || !confirmDelete('هذا الصنف')) return
    void run(async () => {
      await deletePart(part.id)
      navigate('/inventory')
    })
  }

  return (
    <>
      <PageHeader title={part ? 'تعديل قطعة' : 'إضافة قطعة'} />
      {partStock && (
        <Card className="mb-4">
          <p className="text-sm text-slate-700">
            الموجود: <strong>{partStock.quantity}</strong> · معدل الكلفة:{' '}
            <strong>{cost === null ? '—' : formatMoney(cost)}</strong> · قيمة المخزون:{' '}
            <strong>{formatMoney(partStock.value)}</strong>
          </p>
        </Card>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="تركب على (نوع السيارة، الموديل، السنوات)">
              <input className={inputClass} value={vehicle} onChange={(e) => setVehicle(e.target.value)} required />
            </Field>
            <Field label="سعر البيع" hint="سعر البيع المعتاد. يُكتب تلقائياً في المبيعات والتصليحات.">
              <input className={inputClass} inputMode="decimal" placeholder="0.00" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </Field>
            <Field label="التنبيه عند" hint="تنبيه في الصفحة الرئيسية عندما تصبح الكمية بهذا العدد أو أقل. 0 = بلا تنبيه.">
              <input className={inputClass} inputMode="numeric" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="المخزون الأولي">
          <p className="mb-3 text-sm text-slate-600">
            البضاعة التي كانت عندك قبل استعمال هذا التطبيق. البضاعة الجديدة تُسجَّل في المشتريات.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الكمية الأولية">
              <input className={inputClass} inputMode="numeric" value={openingQuantity} onChange={(e) => setOpeningQuantity(e.target.value)} />
            </Field>
            <Field label="كلفة القطعة الأولية" hint="كم كلّفتك كل قطعة من هذه القطع.">
              <input className={inputClass} inputMode="decimal" placeholder="0.00" value={openingUnitCost} onChange={(e) => setOpeningUnitCost(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <Field label="ملاحظات">
            <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Card>

        <ErrorMessage message={error} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryButton} disabled={busy}>
            حفظ القطعة
          </button>
          <Link to="/inventory" className={secondaryButton}>
            إلغاء
          </Link>
          {part && (
            <button type="button" className={`${dangerButton} ms-auto`} onClick={handleDelete} disabled={busy}>
              حذف القطعة
            </button>
          )}
        </div>
      </form>
    </>
  )
}
