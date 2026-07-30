import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invitarAbogado, listInvitaciones } from '@/api/invitaciones'
import { queryKeys } from './queryKeys'

export function useInvitaciones() {
  return useQuery({
    queryKey: queryKeys.invitaciones,
    queryFn: listInvitaciones,
  })
}

export function useInvitarAbogado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) => invitarAbogado(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitaciones })
    },
  })
}
