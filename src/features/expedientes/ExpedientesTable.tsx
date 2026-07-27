import { useExpedientes } from '@/hooks/useExpedientes'

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

export function ExpedientesTable() {
  const { data: expedientes, isLoading, error } = useExpedientes()

  if (isLoading) {
    return <p className="text-body-md text-surface-variant">Cargando expedientes…</p>
  }

  if (error) {
    return <p className="text-body-md text-error">No se pudieron cargar los expedientes: {error.message}</p>
  }

  if (!expedientes || expedientes.length === 0) {
    return <p className="text-body-md text-surface-variant">Aún no hay expedientes en vigilancia.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-body-md">
        <thead>
          <tr className="border-b border-border text-label-sm uppercase text-surface-variant">
            <th className="px-4 py-3 font-medium">Radicado</th>
            <th className="px-4 py-3 font-medium">Despacho</th>
            <th className="px-4 py-3 font-medium">Última actuación</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {expedientes.map((expediente) => (
            <tr key={expediente.id} className="border-b border-border last:border-0 hover:bg-white/5">
              <td className="px-4 py-3 font-mono text-surface">{expediente.radicado_23_digitos}</td>
              <td className="px-4 py-3 text-surface-variant">{expediente.despacho_judicial ?? '—'}</td>
              <td className="px-4 py-3 text-surface-variant">{expediente.ultima_actuacion ?? '—'}</td>
              <td className="px-4 py-3 text-surface-variant">
                {expediente.fecha_actuacion ? dateFormatter.format(new Date(expediente.fecha_actuacion)) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
