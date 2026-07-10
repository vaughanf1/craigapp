import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useStore } from '../../lib/store'

const TABS = [
  { to: '/app', label: 'Today', icon: '☀️', end: true },
  { to: '/app/coach', label: 'Coach', icon: '💬', end: false },
  { to: '/app/goal', label: 'Goal', icon: '🎯', end: false },
  { to: '/app/settings', label: 'Settings', icon: '⚙️', end: false },
]

export default function AppShell() {
  const { state } = useStore()
  if (!state.profile) return <Navigate to="/start" replace />

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-fog">
      <main className="flex-1 px-5 pb-28 pt-8">
        <Outlet />
      </main>
      <nav className="glass fixed inset-x-0 bottom-0 z-50 border-t border-black/5 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-2xl px-5 py-1.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-ink-secondary hover:text-ink'
                }`
              }
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
