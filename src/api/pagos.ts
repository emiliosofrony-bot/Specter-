import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/types/database.types'

export type Pago = Tables<'pagos'>

export const TARIFA_FIJA_B2C_COP = 14900

export async function listMyPagos(): Promise<Pago[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getPago(id: string): Promise<Pago> {
  const { data, error } = await supabase.from('pagos').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// FIX: el cliente NO tiene INSERT/UPDATE sobre pagos (0005_rls.sql) por
// diseño. Crear un pago 'pendiente' y confirmarlo a 'exitoso' es exclusivo
// del backend con service role. Este helper invoca la Edge Function que hace
// ese trabajo (implementada en Fase 4, junto con el webhook de Mercado
// Pago) — nunca escribe directo a la tabla.
export async function iniciarPagoDescarga(casoId: string): Promise<{ checkoutUrl: string }> {
  const { data, error } = await supabase.functions.invoke<{ checkoutUrl: string }>('crear-pago', {
    body: { caso_id: casoId },
  })

  if (error) throw error
  if (!data) throw new Error('La función crear-pago no devolvió una URL de checkout.')
  return data
}
