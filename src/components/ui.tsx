import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatMoney, type Cents } from '../lib/money'

// Small building blocks shared by every page, so all screens look and behave the same.

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30'

const buttonBase =
  'inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'
export const primaryButton = `${buttonBase} bg-slate-900 text-white hover:bg-slate-700`
export const secondaryButton = `${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`
export const dangerButton = `${buttonBase} border border-red-300 bg-white text-red-700 hover:bg-red-50`

export const thClass = 'whitespace-nowrap px-3 py-2 font-medium text-slate-500'
export const tdClass = 'whitespace-nowrap px-3 py-2'
export const numberClass = 'text-end tabular-nums'

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {title && <h2 className="mb-3 font-semibold">{title}</h2>}
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
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
        {children}
      </label>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
      <table className="w-full text-start text-sm">{children}</table>
    </div>
  )
}

/** A money amount; with `colored`, losses show in red. */
export function Money({ value, colored = false }: { value: Cents; colored?: boolean }) {
  return <span className={colored && value < 0 ? 'text-red-700' : undefined}>{formatMoney(value)}</span>
}

export function Stat({ label, value, colored = false }: { label: string; value: Cents; colored?: boolean }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        <Money value={value} colored={colored} />
      </p>
    </div>
  )
}

export function ErrorMessage({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">{children}</div>
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">{children}</p>
}

export function Loading() {
  return <p className="text-slate-500">جارٍ التحميل…</p>
}

export function NotFound({ what, backTo }: { what: string; backTo: string }) {
  return (
    <EmptyState>
      لم يعد {what} موجوداً.{' '}
      <Link to={backTo} className="font-medium text-slate-900 underline">
        رجوع
      </Link>
    </EmptyState>
  )
}
