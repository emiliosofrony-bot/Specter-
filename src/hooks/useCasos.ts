import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCaso, getCaso, listCasos, updateCasoStatus, type Caso, type EstadoCaso } from '@/api/casos'
import { queryKeys } from './queryKeys'

export function useCasos() {
  return useQuery({
    queryKey: queryKeys.casos,
    queryFn: listCasos,
  })
}

export function useCaso(id: string) {
  return useQuery({
    queryKey: queryKeys.caso(id),
    queryFn: () => getCaso(id),
    enabled: Boolean(id),
  })
}

export function useCreateCaso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCaso,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.casos })
    },
  })
}

export function useUpdateCasoStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EstadoCaso }) => updateCasoStatus(id, status),
    // FIX: actualización optimista para que el drag-and-drop del Kanban se
    // sienta instantáneo; si el backend rechaza el cambio (RLS, red), se
    // revierte al snapshot previo.
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.casos })
      const previous = queryClient.getQueryData<Caso[]>(queryKeys.casos)

      queryClient.setQueryData<Caso[]>(queryKeys.casos, (old) => {
        if (!old) return old
        return old.map((caso) => (caso.id === id ? { ...caso, status } : caso))
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.casos, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.casos })
    },
  })
}
