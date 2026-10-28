import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { confirmDelete, readMoney, useFormAction, withId } from '../components/form'
import { Card, ErrorMessage, Field, Loading, NotFound, Notice, PageHeader, dangerButton, inputClass, primaryButton, secondaryButton } from '../components/ui'
import { deleteExpense, saveExpense } from '../db/actions'
import { useAppData } from '../hooks/useAppData'
import { today } from '../lib/dates'
import { formatMoneyPlain } from '../lib/money'
import { EXPENSE_CATEGORIES, categoryLabel, type Expense } from '../types'

export default function ExpenseFormPage() {
  const { id } = useParams()
  const data = useAppData()
  if (!data) return <Loading />
  const expense = id ? data.expenses.find((e) => e.id === Number(id)) : undefined
  if (id && !expense) return <NotFound what="هذا المصروف" backTo="/expenses" />
  return <ExpenseForm key={id ?? 'new'} expense={expense} />
}

function ExpenseForm({ expense }: { expense?: Expense }) {
  const navigate = useNavigate()
  const { error, busy, run } = useFormAction()
  const [date, setDate] = useState(expense?.date ?? today())
  const [category, setCategory] = useState(expense?.category ?? EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense ? formatMoneyPlain(expense.amount) : '')

  // Keep a category from an older backup selectable even if it is no longer in the list.
  const categories = EXPENSE_CATEGORIES.includes(category) ? EXPENSE_CATEGORIES : [...EXPENSE_CATEGORIES, category]

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const record = {
        date,
        category,
        description: description.trim(),
        amount: readMoney(amount, 'المبلغ'),
        createdAt: expense?.createdAt ?? Date.now(),
      }
      await saveExpense(withId(record, expense?.id))
      navigate('/expenses')
    })
  }

  function handleDelete() {
    if (!expense || !confirmDelete('هذا المصروف')) return
    void run(async () => {
      await deleteExpense(expense.id)
      navigate('/expenses')
    })
  }

  return (
    <>
      <PageHeader title={expense ? 'تعديل مصروف' : 'مصروف جديد'} />
      <Notice>
        هل تشتري قطعاً للمخزون؟ سجّلها في{' '}
        <Link to="/purchases/new" className="font-medium underline">
          المشتريات
        </Link>{' '}
        بدلاً من هنا. كلفتها تُحسب في الربح عندما تُباع القطع أو تُستعمل، لذلك لا يجب إدخالها هنا أيضاً.
      </Notice>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="التاريخ">
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="النوع">
              <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((name) => (
                  <option key={name} value={name}>
                    {categoryLabel(name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الوصف">
              <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="المبلغ">
              <input className={inputClass} inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
          </div>
        </Card>
        <ErrorMessage message={error} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryButton} disabled={busy}>
            حفظ المصروف
          </button>
          <Link to="/expenses" className={secondaryButton}>
            إلغاء
          </Link>
          {expense && (
            <button type="button" className={`${dangerButton} ms-auto`} onClick={handleDelete} disabled={busy}>
              حذف المصروف
            </button>
          )}
        </div>
      </form>
    </>
  )
}
