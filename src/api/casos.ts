import { supabase } from '@/lib/supabaseClient'
import type { Enums, Tables, TablesInsert } from '@/types/database.types'

export type Caso = Tables<'casos'>
export type EstadoCaso = Enums<'estado_caso'>

export async function listCasos(): Promise<Caso[]> {
  const { data, error } = await supabase
    .from('casos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getCaso(id: string): Promise<Caso> {
  const { data, error } = await supabase.from('casos').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createCaso(input: {
  titulo: string
  descripcion?: string
  tipo_documento?: Tables<'casos'>['tipo_documento']
}): Promise<Caso> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (profileError) throw profileError

  const payload: TablesInsert<'casos'> = {
    tenant_id: profile.tenant_id,
    user_id: user.id,
    titulo: input.titulo,
    descripcion: input.descripcion,
    tipo_documento: input.tipo_documento,
  }

  const { data, error } = await supabase.from('casos').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateCasoStatus(id: string, status: EstadoCaso): Promise<Caso> {
  const { data, error } = await supabase
    .from('casos')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
