import { useState } from 'react'
import { ValidationError } from '../db/actions'
import { parseMoney, type Cents } from '../lib/money'
import { parseQuantity } from '../lib/quantity'

/** Runs a save or delete, showing any error on screen instead of losing it. */
export function useFormAction() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setError('')
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return { error, busy, run }
}

export function errorText(err: unknown): string {
  if (err instanceof ValidationError) return err.message
  return `حدث خطأ: ${err instanceof Error ? err.message : String(err)}`
}

/** Reads a money box; a blank box counts as 0 when `blankIsZero` is set. */
export function readMoney(text: string, label: string, blankIsZero = false): Cents {
  const value = parseMoney(blankIsZero && !text.trim() ? '0' : text)
  if (value === null) throw new ValidationError(`القيمة في خانة "${label}" غير صحيحة. اكتب رقماً مثل 12.50.`)
  return value
}

/** Reads a whole-number box; a blank box counts as 0. */
export function readQuantity(text: string, label: string, minimum = 0): number {
  const value = parseQuantity(text.trim() ? text : '0')
  if (value === null || value < minimum) {
    throw new ValidationError(`اكتب في خانة "${label}" عدداً صحيحاً ${minimum} أو أكثر.`)
  }
  return value
}

/** Adds the saved record's id when editing, so new records never carry an empty id. */
export function withId<T extends object>(record: T, id: number | undefined): T & { id?: number } {
  return id === undefined ? record : { ...record, id }
}

/** Asks before deleting; `what` names the record, e.g. "هذه القطعة". */
export function confirmDelete(what: string): boolean {
  return window.confirm(`هل تريد حذف ${what}؟ لا يمكن التراجع عن الحذف.`)
}
