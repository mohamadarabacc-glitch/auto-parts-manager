import { useState } from 'react'
import { LOCALE } from '../lib/dates'
import { secondaryButton } from './ui'

/** "2026-10" -> "تشرين الأول 2026", shown on the calendar button while a month is picked. */
function monthName(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1).toLocaleString(LOCALE, { month: 'long', year: 'numeric' })
}

const SHORT_MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول']

/**
 * A small calendar button that opens a list of the 12 months of a year (the arrows change the year; in right-to-left the previous year is on the right, so it points right).
 * Picking a month shows only that month's records; it is our own list, so it works in every browser.
 */
export default function MonthPicker({ month, onChange, title }: { month: string; onChange: (month: string) => void; title: string }) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number((month || new Date().toISOString()).slice(0, 4)))

  function pick(monthNumber: number) {
    onChange(`${year}-${String(monthNumber).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className={`${secondaryButton} gap-2 whitespace-nowrap`}
        title={title}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        {month ? monthName(month) : <span className="sr-only">اختر شهراً</span>}
      </button>
      {open && (
        <>
          {/* Clicking anywhere outside the list closes it. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-20 mt-1 w-64 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" className="rounded px-2 py-1 hover:bg-slate-100" aria-label="السنة السابقة" onClick={() => setYear(year - 1)}>
                ›
              </button>
              <span className="font-medium tabular-nums">{year}</span>
              <button type="button" className="rounded px-2 py-1 hover:bg-slate-100" aria-label="السنة التالية" onClick={() => setYear(year + 1)}>
                ‹
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {SHORT_MONTHS.map((name, index) => {
                const picked = month === `${year}-${String(index + 1).padStart(2, '0')}`
                return (
                  <button
                    key={name}
                    type="button"
                    className={`rounded px-1 py-2 text-xs ${picked ? 'bg-slate-900 text-white' : 'hover:bg-green-100'}`}
                    onClick={() => pick(index + 1)}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
