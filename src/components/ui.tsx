import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatMoney, type Cents } from '../lib/money'

// Small building blocks shared by every page, so all screens look and behave the same.
// Colours: teal is the app's main colour, amber is for warnings, red for problems and losses, green for profit.

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/15'

const buttonBase =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50'
export const primaryButton = `${buttonBase} bg-teal-700 text-white hover:bg-teal-800 hover:shadow-md`
export const secondaryButton = `${buttonBase} border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800`
export const dangerButton = `${buttonBase} border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50`

export const thClass = 'whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-500'
export const tdClass = 'whitespace-nowrap px-4 py-3'
export const numberClass = 'text-end tabular-nums'
/** A clickable table row that opens the record. */
export const rowClass = 'cursor-pointer transition-colors hover:bg-teal-50/70'

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${className}`}>
      {title && <h2 className="mb-4 font-bold text-slate-800">{title}</h2>}
      {children}
    </section>
  )
}

export function Field({ label, hint, children, className = '' }: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
        {children}
      </label>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      <table className="w-full text-start text-sm [&_thead]:bg-slate-50">{children}</table>
    </div>
  )
}

/**
 * A money amount; with `colored`, profit shows in green and losses in red.
 * dir="ltr" keeps the minus sign in front ("-24.00"); in right-to-left Arabic text it would jump to the end.
 */
export function Money({ value, colored = false }: { value: Cents; colored?: boolean }) {
  const color = !colored || value === 0 ? undefined : value < 0 ? 'text-red-600' : 'text-emerald-700'
  return (
    <span dir="ltr" className={color}>
      {formatMoney(value)}
    </span>
  )
}

const TONES = {
  teal: 'bg-teal-50 text-teal-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
  violet: 'bg-violet-50 text-violet-700',
}
export type Tone = keyof typeof TONES

/** A number in a box, with a small coloured icon so each figure is easy to find at a glance. */
export function StatBox({ label, icon, tone = 'teal', children }: { label: string; icon: ReactNode; tone?: Tone; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4 ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={`hidden h-10 w-10 shrink-0 place-items-center rounded-xl min-[400px]:grid ${TONES[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-800 sm:text-2xl">{children}</p>
      </div>
    </div>
  )
}

export function Stat({ label, value, colored = false, icon, tone }: {
  label: string
  value: Cents
  colored?: boolean
  icon: ReactNode
  tone?: Tone
}) {
  return (
    <StatBox label={label} icon={icon} tone={tone}>
      <Money value={value} colored={colored} />
    </StatBox>
  )
}

export function ErrorMessage({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  )
}

/** A green "done" message. */
export function SuccessMessage({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div>{children}</div>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center text-slate-500">
      <Icon name="box" className="mx-auto mb-2 h-8 w-8 text-slate-300" />
      <p>{children}</p>
    </div>
  )
}

export function Loading() {
  return (
    <p className="flex items-center gap-2 text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      جارٍ التحميل…
    </p>
  )
}

export function NotFound({ what, backTo }: { what: string; backTo: string }) {
  return (
    <EmptyState>
      لم يعد {what} موجوداً.{' '}
      <Link to={backTo} className="font-medium text-teal-700 underline">
        رجوع
      </Link>
    </EmptyState>
  )
}

// Simple line icons (24×24, drawn with the text colour), so the app needs no icon library.
const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5h4v5',
  box: 'M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5',
  cart: 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2M9 20.5h.01M17 20.5h.01',
  tag: 'M3 12V4h8l9.5 9.5-8 8L3 12Zm5-4.5h.01',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.4 1.4 0 0 0 2 2l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2-.6-.6-2 2.6-2.6',
  wallet: 'M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11v3M16 13.5h.01',
  chart: 'M4 20V4m0 16h16M8 16v-4m4 4V8m4 8v-6',
  shield: 'M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4',
  plus: 'M12 5v14M5 12h14',
  coins: 'M12 6c4.4 0 8-1.1 8-2.5S16.4 1 12 1 4 2.1 4 3.5 7.6 6 12 6Zm8-2.5v5c0 1.4-3.6 2.5-8 2.5s-8-1.1-8-2.5v-5m16 5v5c0 1.4-3.6 2.5-8 2.5s-8-1.1-8-2.5v-5',
  trend: 'M3 17 9 11l4 4 8-8m0 0h-5m5 0v5',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  check: 'M20 6 9 17l-5-5',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  upload: 'M12 20V9m0 0-4 4m4-4 4 4M5 4h14',
  sheet: 'M5 3h14v18H5V3Zm0 6h14M5 15h14M11 3v18',
}
export type IconName = keyof typeof ICONS

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}
