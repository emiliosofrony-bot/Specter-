import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { iniciarPagoDescarga, listMyPagos } from '@/api/pagos'
import { queryKeys } from './queryKeys'

export function usePagos() {
  return useQuery({
    queryKey: queryKeys.pagos,
    queryFn: listMyPagos,
  })
}

export function useIniciarPago() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (casoId: string) => iniciarPagoDescarga(casoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pagos })
    },
  })
}
