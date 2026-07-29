/**
 * Specter · Edge Function `mercadopago-webhook`
 *
 * Único punto autorizado para mover un pago a 'exitoso' o 'fallido'.
 *
 * IMPORTANTE al desplegar: esta función debe publicarse SIN verificación de
 * JWT, porque quien la llama es Mercado Pago, no un usuario con sesión:
 *
 *   supabase functions deploy mercadopago-webhook --no-verify-jwt
 *
 * Al no haber JWT, la autenticidad se establece con la firma `x-signature`
 * que envía Mercado Pago, verificada abajo en tiempo constante.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { signHmacSha256, timingSafeEqualHex } from '../_shared/canonical.ts'

interface MercadoPagoNotification {
  type?: string
  action?: string
  data?: { id?: string }
}

/**
 * Verifica la firma de Mercado Pago.
 *
 * MP envía:
 *   x-signature: ts=<timestamp>,v1=<hmac_hex>
 *   x-request-id: <uuid>
 *
 * y el manifest a firmar es, literalmente:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 * (Ver "Validar origen de la notificación" en la documentación de webhooks de
 * Mercado Pago. El `id` va en minúsculas tal como llega en data.id.)
 */
async function verifyMercadoPagoSignature(
  req: Request,
  dataId: string,
  secret: string,
): Promise<boolean> {
  const signatureHeader = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')

  if (!signatureHeader || !requestId) return false

  const parts = new Map(
    signatureHeader.split(',').map((part) => {
      const [key, ...rest] = part.trim().split('=')
      return [key?.trim() ?? '', rest.join('=').trim()]
    }),
  )

  const ts = parts.get('ts')
  const v1 = parts.get('v1')
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const computed = await signHmacSha256(secret, manifest)

  // FIX: comparación en tiempo constante, igual criterio que el Code node de
  // n8n. Un `!==` filtraría la firma esperada por tiempo de respuesta.
  return timingSafeEqualHex(computed, v1)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido.' }), { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const mpWebhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET')

  if (!supabaseUrl || !serviceRoleKey || !mpAccessToken || !mpWebhookSecret) {
    console.error('Faltan variables de entorno para mercadopago-webhook.')
    return new Response(JSON.stringify({ error: 'Configuración incompleta.' }), { status: 500 })
  }

  let notification: MercadoPagoNotification
  try {
    notification = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo JSON inválido.' }), { status: 400 })
  }

  const paymentId = notification.data?.id
  if (!paymentId) {
    // Notificación sin payment id (p.ej. un ping de prueba): se acepta para que
    // MP no la reintente indefinidamente, pero no se hace nada.
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  const isValid = await verifyMercadoPagoSignature(req, String(paymentId), mpWebhookSecret)
  if (!isValid) {
    console.warn('Notificación de Mercado Pago con firma inválida. paymentId=', paymentId)
    return new Response(JSON.stringify({ error: 'Firma inválida.' }), { status: 401 })
  }

  // FIX: no se confía en el status que venga en el cuerpo de la notificación.
  // Se consulta el pago directamente a la API de Mercado Pago, que es la
  // fuente de verdad. El cuerpo del webhook solo aporta el id.
  let mpPaymentResponse: Response
  try {
    mpPaymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    })
  } catch (err) {
    console.error('Error consultando el pago en Mercado Pago:', err)
    // 500 para que Mercado Pago reintente la notificación.
    return new Response(JSON.stringify({ error: 'Error consultando la pasarela.' }), { status: 500 })
  }

  if (!mpPaymentResponse.ok) {
    console.error('Mercado Pago no devolvió el pago:', mpPaymentResponse.status)
    return new Response(JSON.stringify({ error: 'Pago no encontrado en la pasarela.' }), { status: 500 })
  }

  const mpPayment = (await mpPaymentResponse.json()) as {
    status?: string
    external_reference?: string
    transaction_amount?: number
  }

  const pagoId = mpPayment.external_reference
  if (!pagoId) {
    console.error('El pago de Mercado Pago no trae external_reference. paymentId=', paymentId)
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  // approved → exitoso; rejected/cancelled → fallido; el resto sigue pendiente.
  let nuevoStatus: 'exitoso' | 'fallido' | null = null
  if (mpPayment.status === 'approved') nuevoStatus = 'exitoso'
  else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') nuevoStatus = 'fallido'

  if (!nuevoStatus) {
    return new Response(JSON.stringify({ received: true, status: mpPayment.status }), { status: 200 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // FIX: solo se actualiza si el pago sigue 'pendiente'. Hace la operación
  // idempotente (Mercado Pago reintenta notificaciones) y evita que una
  // notificación tardía de 'rejected' revierta un pago ya aprobado.
  const { error: updateError } = await adminClient
    .from('pagos')
    .update({ status: nuevoStatus, gateway_reference: String(paymentId) })
    .eq('id', pagoId)
    .eq('status', 'pendiente')

  if (updateError) {
    console.error('No se pudo actualizar el pago:', updateError)
    return new Response(JSON.stringify({ error: 'Error actualizando el pago.' }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true, status: nuevoStatus }), { status: 200 })
})
