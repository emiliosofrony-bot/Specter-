import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Download, Sparkles } from 'lucide-react'
import { useDocumentosByCaso, useSignedPdfUrl } from '@/hooks/useDocumentos'
import { useProcesarCaso } from '@/hooks/useProcesarCaso'
import { Button } from '@/components/ui/button'
import { PagoDescargaCTA } from '@/features/payments/PagoDescargaCTA'

export function DocumentViewer({ casoId }: { casoId: string }) {
  const { data: documentos, isLoading } = useDocumentosByCaso(casoId)
  const documento = documentos?.[0]
  const { data: signedUrl } = useSignedPdfUrl(documento?.pdf_url)
  const procesarCaso = useProcesarCaso(casoId)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleGenerar() {
    setErrorMessage(null)
    try {
      await procesarCaso.mutateAsync()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo generar el documento.')
    }
  }

  if (isLoading) {
    return <div className="flex-1 p-margin-desktop text-body-md text-surface-variant">Cargando documento…</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-margin-desktop">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-headline-lg-mobile text-surface">Documento en vivo</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleGenerar} disabled={procesarCaso.isPending}>
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            {procesarCaso.isPending ? 'Generando…' : 'Generar documento'}
          </Button>
          {signedUrl ? (
            <Button asChild variant="secondary">
              <a href={signedUrl} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" strokeWidth={1.5} />
                Descargar PDF
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p className="text-label-md text-error">{errorMessage}</p> : null}

      <div className="rounded-xl border border-border bg-panel p-margin-mobile">
        {documento?.content_markdown ? (
          <article className="prose prose-invert max-w-none text-body-md text-surface">
            <ReactMarkdown>{documento.content_markdown}</ReactMarkdown>
          </article>
        ) : (
          <p className="text-body-md text-surface-variant">
            Aún no hay contenido generado para este caso. Usa «Generar documento» para que Specter lo
            redacte.
          </p>
        )}
      </div>

      {documento ? <PagoDescargaCTA casoId={casoId} /> : null}
    </div>
  )
}
