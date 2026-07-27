import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyProfile, updateWorkspaceConfig, type WorkspaceConfig } from '@/api/profiles'
import { queryKeys } from './queryKeys'

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: getMyProfile,
  })
}

export function useUpdateWorkspaceConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: Partial<WorkspaceConfig>) => updateWorkspaceConfig(patch),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile)
    },
  })
}
