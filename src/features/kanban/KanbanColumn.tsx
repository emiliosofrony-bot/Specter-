import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { Caso, EstadoCaso } from '@/api/casos'
import { CasoCard } from './CasoCard'

export function KanbanColumn({
  status,
  title,
  casos,
}: {
  status: EstadoCaso
  title: string
  casos: Caso[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-label-md uppercase tracking-wide text-surface-variant">{title}</h2>
        <span className="text-label-sm text-surface-variant/70">{casos.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-40 flex-1 flex-col gap-3 rounded-xl border border-dashed border-border p-2 transition-colors',
          isOver && 'border-copper/60 bg-copper/5',
        )}
      >
        {casos.map((caso) => (
          <CasoCard key={caso.id} caso={caso} />
        ))}
      </div>
    </div>
  )
}
