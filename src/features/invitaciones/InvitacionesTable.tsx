import { Badge } from '@/components/ui/badge'
import { useInvitaciones } from '@/hooks/useInvitaciones'
import type { Invitacion } from '@/api/invitaciones'

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

function estadoDeInvitacion(invitacion: Invitacion) {
  if (invitacion.accepted_at) return { label: 'Aceptada', variant: 'default' as const }
  if (new Date(invitacion.expires_at) < new Date()) return { label: 'Expirada', variant: 'outline' as const }
  return { label: 'Pendiente', variant: 'copper' as const }
}

export function InvitacionesTable() {
  const { data: invitaciones, isLoading, error } = useInvitaciones()

  if (isLoading) {
    return <p className="text-body-md text-surface-variant">Cargando invitaciones…</p>
  }

  if (error) {
    return <p className="text-body-md text-error">No se pudieron cargar las invitaciones: {error.message}</p>
  }

  if (!invitaciones || invitaciones.length === 0) {
    return <p className="text-body-md text-surface-variant">Aún no has invitado a nadie.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-body-md">
        <thead>
          <tr className="border-b border-border text-label-sm uppercase text-surface-variant">
            <th className="px-4 py-3 font-medium">Correo</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Expira</th>
          </tr>
        </thead>
        <tbody>
          {invitaciones.map((invitacion) => {
            const estado = estadoDeInvitacion(invitacion)
            return (
              <tr key={invitacion.id} className="border-b border-border last:border-0 hover:bg-white/5">
                <td className="px-4 py-3 text-surface">{invitacion.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={estado.variant}>{estado.label}</Badge>
                </td>
                <td className="px-4 py-3 text-surface-variant">
                  {dateFormatter.format(new Date(invitacion.expires_at))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
