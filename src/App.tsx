import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from '@/pages/AuthPage'
import { KanbanPage } from '@/pages/KanbanPage'
import { WorkspacePage } from '@/pages/WorkspacePage'
import { ExpedientesPage } from '@/pages/ExpedientesPage'
import { EquipoPage } from '@/pages/EquipoPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { DarkModeSync } from '@/features/workspace/DarkModeSync'
import { useSession } from '@/features/auth/AuthProvider'

export default function App() {
  const { session } = useSession()

  return (
    <>
      {session ? <DarkModeSync /> : null}
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <KanbanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/casos/:casoId"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expedientes"
          element={
            <ProtectedRoute>
              <ExpedientesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipo"
          element={
            <ProtectedRoute>
              <EquipoPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
