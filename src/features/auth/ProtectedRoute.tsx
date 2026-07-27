import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from './AuthProvider'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas text-surface-variant">Cargando…</div>
  }

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
