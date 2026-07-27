import { AppShell } from '@/components/layout/AppShell'
import { KanbanBoard } from '@/features/kanban/KanbanBoard'

export function KanbanPage() {
  return (
    <AppShell>
      <KanbanBoard />
    </AppShell>
  )
}
