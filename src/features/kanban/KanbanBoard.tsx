import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useCasos, useUpdateCasoStatus } from '@/hooks/useCasos'
import type { EstadoCaso } from '@/api/casos'
import { KanbanColumn } from './KanbanColumn'
import { CreateCasoDialog } from './CreateCasoDialog'

const COLUMNS: { status: EstadoCaso; title: string }[] = [
  { status: 'draft', title: 'Borrador' },
  { status: 'in_progress', title: 'En progreso' },
  { status: 'review', title: 'En revisión' },
  { status: 'done', title: 'Completado' },
]

export function KanbanBoard() {
  const { data: casos, isLoading, error } = useCasos()
  const updateStatus = useUpdateCasoStatus()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const casoId = String(active.id)
    const newStatus = over.id as EstadoCaso
    const caso = casos?.find((c) => c.id === casoId)

    if (caso && caso.status !== newStatus) {
      updateStatus.mutate({ id: casoId, status: newStatus })
    }
  }

  if (isLoading) {
    return <div className="p-margin-desktop text-body-md text-surface-variant">Cargando casos…</div>
  }

  if (error) {
    return (
      <div className="p-margin-desktop text-body-md text-error">
        No se pudieron cargar los casos: {error.message}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 p-margin-desktop">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg-mobile text-surface">Casos</h1>
        <CreateCasoDialog />
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-gutter overflow-x-auto pb-4">
          {COLUMNS.map(({ status, title }) => (
            <KanbanColumn
              key={status}
              status={status}
              title={title}
              casos={(casos ?? []).filter((caso) => caso.status === status)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
