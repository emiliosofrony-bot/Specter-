import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/types/database.types'

// token_hash no está en este tipo a propósito: 0008 revoca esa columna para el
// rol `authenticated`, así que el cliente nunca la recibe.
export type Invitacion = Omit<Tables<'invitaciones'>, 'token_hash'>

export interface InvitacionCreada {
  invitacion_id: string
  email: string
  expires_at: string
  invite_url: string
}

const SELECT_COLUMNS =
  'id, tenant_id, email, role, invited_by, expires_at, accepted_at, created_at, updated_at'

export async function listInvitaciones(): Promise<Invitacion[]> {
  const { data, error } = await supabase
    .from('invitaciones')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// El cliente no tiene INSERT sobre invitaciones (0008): la creación pasa por
// la Edge Function, que valida rol/tenant y genera el token server-side.
export async function invitarAbogado(email: string): Promise<InvitacionCreada> {
  const { data, error } = await supabase.functions.invoke<InvitacionCreada>('invitar-abogado', {
    body: { email },
  })

  if (error) throw error
  if (!data) throw new Error('La función invitar-abogado no devolvió respuesta.')
  return data
}
