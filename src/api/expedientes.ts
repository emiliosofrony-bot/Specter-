import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/types/database.types'

export type ExpedienteJudicial = Tables<'expedientes_judiciales'>

export async function listExpedientes(): Promise<ExpedienteJudicial[]> {
  const { data, error } = await supabase
    .from('expedientes_judiciales')
    .select('*')
    .order('fecha_actuacion', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data
}
