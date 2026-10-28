import { NavLink, Outlet } from 'react-router'

export const navItems = [
  { to: '/', label: 'الرئيسية' },
  { to: '/inventory', label: 'المخزون' },
  { to: '/purchases', label: 'المشتريات' },
  { to: '/sales', label: 'المبيعات' },
  { to: '/repairs', label: 'التصليحات' },
  { to: '/expenses', label: 'المصاريف' },
  { to: '/reports', label: 'التقارير' },
  { to: '/backup', label: 'النسخ الاحتياطي' },
]

// Phones: title bar with a horizontally scrolling menu on top.
// Wider screens (md and up): fixed menu down the side (the right side, since the app is Arabic, right to left).
export default function Layout() {
  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 md:flex">
      <aside className="bg-slate-900 text-white md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0">
        <div className="px-4 py-3 text-lg font-semibold md:py-5">إدارة قطع السيارات</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
