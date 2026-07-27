import { supabase } from '@/lib/supabaseClient'
import type { Json, Tables, TablesUpdate } from '@/types/database.types'

export interface WorkspaceConfig {
  is_dark_mode: boolean
  nivel_investigacion: number
  enfoque: 'B2C' | 'B2B'
}

export type Profile = Tables<'profiles'>

export function parseWorkspaceConfig(raw: Profile['workspace_config']): WorkspaceConfig {
  const value = (raw ?? {}) as Partial<WorkspaceConfig>
  return {
    is_dark_mode: value.is_dark_mode ?? true,
    nivel_investigacion: value.nivel_investigacion ?? 50,
    enfoque: value.enfoque ?? 'B2C',
  }
}

export async function getMyProfile(): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No hay sesión activa.')

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (error) throw error
  return data
}

export async function updateWorkspaceConfig(patch: Partial<WorkspaceConfig>): Promise<Profile> {
  const current = await getMyProfile()
  const nextConfig: WorkspaceConfig = { ...parseWorkspaceConfig(current.workspace_config), ...patch }

  const update: TablesUpdate<'profiles'> = { workspace_config: nextConfig as unknown as Json }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', current.id)
    .select()
    .single()

  if (error) throw error
  return data
}
