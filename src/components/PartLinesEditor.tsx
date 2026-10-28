import { ValidationError } from '../db/actions'
import { formatMoney, formatMoneyPlain, multiplyMoney, parseMoney, type Cents } from '../lib/money'
import { parseQuantity } from '../lib/quantity'
import type { PartStock } from '../lib/stock'
import type { Part, PartLine } from '../types'
import { readMoney } from './form'
import { Field, inputClass, secondaryButton } from './ui'

// The list of parts on a purchase, sale or repair. Lines are kept as typed text until the form is saved.

export interface LineDraft {
  partId: string
  quantity: string
  unitPrice: string
}

export const emptyLine: LineDraft = { partId: '', quantity: '1', unitPrice: '' }

export function toLineDrafts(lines: PartLine[]): LineDraft[] {
  return lines.map((line) => ({
    partId: String(line.partId),
    quantity: String(line.quantity),
    unitPrice: formatMoneyPlain(line.unitPrice),
  }))
}

/** Turns the typed lines into saved lines, skipping lines left completely empty. */
export function readLines(drafts: LineDraft[]): PartLine[] {
  return drafts
    .filter((draft) => draft.partId || draft.unitPrice.trim())
    .map((draft, index) => {
      if (!draft.partId) throw new ValidationError(`اختر قطعة في السطر ${index + 1}.`)
      const quantity = parseQuantity(draft.quantity)
      if (quantity === null || quantity < 1) {
        throw new ValidationError(`اكتب كمية 1 أو أكثر في السطر ${index + 1}.`)
      }
      return { partId: Number(draft.partId), quantity, unitPrice: readMoney(draft.unitPrice, `السعر في السطر ${index + 1}`) }
    })
}

/** Total of the lines that are filled in correctly so far, for showing while typing. */
export function draftTotal(drafts: LineDraft[]): Cents {
  return drafts.reduce((total, draft) => total + (draftLineTotal(draft) ?? 0), 0)
}

function draftLineTotal(draft: LineDraft): Cents | null {
  const quantity = parseQuantity(draft.quantity)
  const price = parseMoney(draft.unitPrice)
  return quantity === null || price === null ? null : multiplyMoney(price, quantity)
}

interface Props {
  parts: Part[]
  stock: Map<number, PartStock>
  lines: LineDraft[]
  onChange: (lines: LineDraft[]) => void
  priceLabel: string
  suggestPrice?: (part: Part) => Cents // filled in when a part is chosen and the price is still empty
}

export default function PartLinesEditor({ parts, stock, lines, onChange, priceLabel, suggestPrice }: Props) {
  const sortedParts = [...parts].sort((a, b) => a.name.localeCompare(b.name, 'ar'))

  function update(index: number, change: Partial<LineDraft>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...change } : line)))
  }

  function choosePart(index: number, partId: string) {
    const part = parts.find((p) => String(p.id) === partId)
    const change: Partial<LineDraft> = { partId }
    if (part && suggestPrice && !lines[index].unitPrice.trim()) {
      change.unitPrice = formatMoneyPlain(suggestPrice(part))
    }
    update(index, change)
  }

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const total = draftLineTotal(line)
        return (
          <div
            key={index}
            className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_8rem_7rem_auto] sm:items-end"
          >
            <Field label="القطعة" className="col-span-2 sm:col-span-1">
              <select className={inputClass} value={line.partId} onChange={(e) => choosePart(index, e.target.value)}>
                <option value="">اختر قطعة…</option>
                {sortedParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {partLabel(part, stock.get(part.id))}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الكمية">
              <input
                className={inputClass}
                inputMode="numeric"
                value={line.quantity}
                onChange={(e) => update(index, { quantity: e.target.value })}
              />
            </Field>
            <Field label={priceLabel}>
              <input
                className={inputClass}
                inputMode="decimal"
                placeholder="0.00"
                value={line.unitPrice}
                onChange={(e) => update(index, { unitPrice: e.target.value })}
              />
            </Field>
            <div className="text-sm">
              <span className="block text-slate-500">مجموع السطر</span>
              <span className="tabular-nums">{total === null ? '—' : formatMoney(total)}</span>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm text-red-600 transition hover:bg-red-50 hover:text-red-700 sm:mb-1.5"
              onClick={() => onChange(lines.filter((_, i) => i !== index))}
            >
              إزالة
            </button>
          </div>
        )
      })}
      <button type="button" className={secondaryButton} onClick={() => onChange([...lines, emptyLine])}>
        + إضافة قطعة
      </button>
    </div>
  )
}

function partLabel(part: Part, partStock: PartStock | undefined): string {
  const number = part.partNumber ? ` (${part.partNumber})` : ''
  const fits = part.vehicle.trim() ? ` · ${part.vehicle.trim()}` : ''
  return `${part.name}${number}${fits} · الموجود: ${partStock?.quantity ?? 0}`
}
