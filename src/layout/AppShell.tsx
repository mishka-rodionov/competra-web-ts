import { NavLink, Outlet } from 'react-router-dom'
import { DebugErrorBanner } from '../components/DebugErrorBanner'
import { isDebugEnvironment } from '../lib/debugEnv'

interface NavItem {
  to: string
  label: string
  debugOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Соревнования' },
  { to: '/management', label: 'Управление' },
  { to: '/clubs', label: 'Клубы' },
  { to: '/diary', label: 'Дневник', debugOnly: true },
  { to: '/profile', label: 'Профиль' },
]

export function AppShell() {
  const items = NAV_ITEMS.filter((item) => !item.debugOnly || isDebugEnvironment())

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-3xl">
        <DebugErrorBanner />
        <nav className="flex border-t border-outline-variant bg-surface">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex-1 px-2 py-3 text-center text-sm ${
                  isActive ? 'font-medium text-primary' : 'text-on-surface-variant'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
