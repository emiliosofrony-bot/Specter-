import { AppShell } from '@/components/layout/AppShell'
import { InvitarAbogadoForm } from '@/features/invitaciones/InvitarAbogadoForm'
import { InvitacionesTable } from '@/features/invitaciones/InvitacionesTable'
import { useProfile } from '@/hooks/useProfile'

export function EquipoPage() {
  const { data: profile, isLoading } = useProfile()

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-margin-desktop">
        <h1 className="text-headline-lg-mobile text-surface">Equipo</h1>

        {isLoading ? (
          <p className="text-body-md text-surface-variant">Cargando…</p>
        ) : profile?.role === 'abogado_premium' ? (
          <>
            <InvitarAbogadoForm />
            <InvitacionesTable />
          </>
        ) : (
          <p className="max-w-content text-body-md text-surface-variant">
            La gestión de equipo está disponible para firmas con plan B2B. Un abogado premium puede
            invitar miembros a su firma desde acá.
          </p>
        )}
      </div>
    </AppShell>
  )
}
