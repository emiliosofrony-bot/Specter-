import { supabase } from '@/lib/supabaseClient'

export interface ProcesarCasoResult {
  document_id: string | null
  status: string
}

// El frontend NUNCA llama al webhook de n8n directamente ni conoce
// SPECTER_WEBHOOK_SECRET: invoca esta Edge Function, que valida la sesión,
// firma el payload canónico con HMAC-SHA256 y hace el POST a n8n.
export async function procesarCaso(casoId: string): Promise<ProcesarCasoResult> {
  const { data, error } = await supabase.functions.invoke<ProcesarCasoResult>('procesar-caso', {
    body: { caso_id: casoId },
  })

  if (error) throw error
  if (!data) throw new Error('La función procesar-caso no devolvió respuesta.')
  return data
}
