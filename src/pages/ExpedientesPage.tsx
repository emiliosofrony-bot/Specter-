import { AppShell } from '@/components/layout/AppShell'
import { ExpedientesTable } from '@/features/expedientes/ExpedientesTable'

export function ExpedientesPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-margin-desktop">
        <h1 className="text-headline-lg-mobile text-surface">Vigilancia de expedientes</h1>
        <ExpedientesTable />
      </div>
    </AppShell>
  )
}
