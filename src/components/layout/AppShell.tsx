import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Briefcase, LogOut, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/api/auth'

const navItems = [
  { to: '/', label: 'Casos', icon: Briefcase },
  { to: '/expedientes', label: 'Expedientes', icon: ScrollText },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar: Level 1 elevation, colapsable en mobile (prosa §Components) */}
      <aside className="flex w-sidebar flex-col border-r border-border bg-panel px-3 py-6">
        <div className="mb-8 px-3 text-headline-md text-surface">Specter</div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2 text-label-md text-surface-variant transition-colors hover:bg-white/5 hover:text-surface',
                  isActive && 'bg-white/5 text-surface',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-copper" />
                  ) : null}
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-label-md text-surface-variant transition-colors hover:bg-white/5 hover:text-surface"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
