import { NavLink, Outlet, useLocation } from 'react-router'
import { Icon, type IconName } from './ui'

export const navItems: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'الرئيسية', icon: 'home' },
  { to: '/inventory', label: 'المخزون', icon: 'box' },
  { to: '/purchases', label: 'المشتريات', icon: 'cart' },
  { to: '/sales', label: 'المبيعات', icon: 'tag' },
  { to: '/repairs', label: 'التصليحات', icon: 'wrench' },
  { to: '/expenses', label: 'المصاريف', icon: 'wallet' },
  { to: '/reports', label: 'التقارير', icon: 'chart' },
  { to: '/backup', label: 'النسخ الاحتياطي', icon: 'shield' },
]

// Phones: title bar with the menu as a 4 × 2 grid of icons on top, so every page is one tap away.
// Wider screens (md and up): fixed menu down the side (the right side, since the app is Arabic, right to left).
export default function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 md:flex">
      <aside className="bg-gradient-to-b from-teal-800 to-teal-950 text-white shadow-lg md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-3 md:px-5 md:py-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-teal-950 shadow">
            <Icon name="wrench" />
          </span>
          <span className="text-lg font-bold">إدارة قطع السيارات</span>
        </div>
        <nav className="grid grid-cols-4 gap-1 px-2 pb-3 md:flex md:flex-col md:px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-medium leading-tight transition md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-start md:text-sm ${
                  isActive
                    ? 'bg-white text-teal-900 shadow-sm'
                    : 'text-teal-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        {/* A new key on every page change replays the gentle fade-in. */}
        <div key={pathname} className="page-in mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
