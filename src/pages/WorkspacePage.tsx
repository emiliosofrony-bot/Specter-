import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { WorkspaceSliders } from '@/features/workspace/WorkspaceSliders'
import { DocumentViewer } from '@/features/documents/DocumentViewer'

export function WorkspacePage() {
  const { casoId } = useParams<{ casoId: string }>()

  if (!casoId) return null

  return (
    <AppShell>
      <div className="flex h-full">
        <WorkspaceSliders />
        <DocumentViewer casoId={casoId} />
      </div>
    </AppShell>
  )
}
