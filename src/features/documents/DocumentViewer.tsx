import ReactMarkdown from 'react-markdown'
import { Download } from 'lucide-react'
import { useDocumentosByCaso } from '@/hooks/useDocumentos'
import { useSignedPdfUrl } from '@/hooks/useDocumentos'
import { Button } from '@/components/ui/button'
import { PagoDescargaCTA } from '@/features/payments/PagoDescargaCTA'

export function DocumentViewer({ casoId }: { casoId: string }) {
  const { data: documentos, isLoading } = useDocumentosByCaso(casoId)
  const documento = documentos?.[0]
  const { data: signedUrl } = useSignedPdfUrl(documento?.pdf_url)

  if (isLoading) {
    return <div className="flex-1 p-margin-desktop text-body-md text-surface-variant">Cargando documento…</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-margin-desktop">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg-mobile text-surface">Documento en vivo</h1>
        {signedUrl ? (
          <Button asChild variant="secondary">
            <a href={signedUrl} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" strokeWidth={1.5} />
              Descargar PDF
            </a>
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-panel p-margin-mobile">
        {documento?.content_markdown ? (
          <article className="prose prose-invert max-w-none text-body-md text-surface">
            <ReactMarkdown>{documento.content_markdown}</ReactMarkdown>
          </article>
        ) : (
          <p className="text-body-md text-surface-variant">
            Aún no hay contenido generado para este caso. Envíalo a procesar desde el chat para que Specter
            redacte el documento.
          </p>
        )}
      </div>

      {documento ? <PagoDescargaCTA casoId={casoId} /> : null}
    </div>
  )
}
