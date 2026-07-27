import { useQuery } from '@tanstack/react-query'
import { getDocumento, getSignedPdfUrl, listDocumentosByCaso } from '@/api/documentos'
import { queryKeys } from './queryKeys'

export function useDocumentosByCaso(casoId: string) {
  return useQuery({
    queryKey: queryKeys.documentosByCaso(casoId),
    queryFn: () => listDocumentosByCaso(casoId),
    enabled: Boolean(casoId),
  })
}

export function useDocumento(id: string) {
  return useQuery({
    queryKey: queryKeys.documento(id),
    queryFn: () => getDocumento(id),
    enabled: Boolean(id),
  })
}

export function useSignedPdfUrl(pdfPath: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.signedPdfUrl(pdfPath ?? ''),
    queryFn: () => getSignedPdfUrl(pdfPath as string),
    enabled: Boolean(pdfPath),
    // Las signed URLs expiran a los 5 min (ver documentos.ts) — no las
    // cacheamos más tiempo del que son válidas.
    staleTime: 4 * 60 * 1000,
  })
}
