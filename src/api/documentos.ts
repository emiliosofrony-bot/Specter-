import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/types/database.types'

export type Documento = Tables<'documentos'>

// FIX: pdf_url en la tabla nunca es una URL pública, es la key de un objeto
// en este bucket privado. El acceso siempre pasa por una signed URL de corta
// duración generada aquí, nunca por una URL directa a Storage.
const DOCUMENTOS_BUCKET = 'documentos-privados'
const SIGNED_URL_TTL_SECONDS = 60 * 5

export async function listDocumentosByCaso(casoId: string): Promise<Documento[]> {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getDocumento(id: string): Promise<Documento> {
  const { data, error } = await supabase.from('documentos').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getSignedPdfUrl(pdfPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(pdfPath, SIGNED_URL_TTL_SECONDS)

  if (error) throw error
  return data.signedUrl
}
