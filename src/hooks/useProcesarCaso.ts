import { useMutation, useQueryClient } from '@tanstack/react-query'
import { procesarCaso } from '@/api/procesarCaso'
import { queryKeys } from './queryKeys'

export function useProcesarCaso(casoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => procesarCaso(casoId),
    // n8n ya escribió el documento antes de responder 200 (nodo Respond to
    // Webhook), así que al resolver basta refrescar el visor.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentosByCaso(casoId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.casos })
    },
  })
}
