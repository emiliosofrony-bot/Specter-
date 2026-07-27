import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Caso } from '@/api/casos'

const TIPO_LABEL: Record<NonNullable<Caso['tipo_documento']>, string> = {
  tutela: 'Tutela',
  peticion: 'Derecho de petición',
  demanda: 'Demanda',
}

export function CasoCard({ caso }: { caso: Caso }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: caso.id,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => navigate(`/casos/${caso.id}`)}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <CardHeader className="gap-2">
        {caso.tipo_documento ? <Badge variant="copper">{TIPO_LABEL[caso.tipo_documento]}</Badge> : null}
        <CardTitle className="text-body-lg">{caso.titulo}</CardTitle>
      </CardHeader>
      {caso.descripcion ? (
        <CardContent>
          <p className="line-clamp-2 text-body-md text-surface-variant">{caso.descripcion}</p>
        </CardContent>
      ) : null}
    </Card>
  )
}
