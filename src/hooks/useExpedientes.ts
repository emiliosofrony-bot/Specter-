import { useQuery } from '@tanstack/react-query'
import { listExpedientes } from '@/api/expedientes'
import { queryKeys } from './queryKeys'

export function useExpedientes() {
  return useQuery({
    queryKey: queryKeys.expedientes,
    queryFn: listExpedientes,
  })
}
