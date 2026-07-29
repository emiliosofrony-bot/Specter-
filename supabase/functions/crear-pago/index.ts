/**
 * Specter · Edge Function `crear-pago`
 *
 * Crea el registro de pago en estado 'pendiente' y la preferencia de checkout
 * en Mercado Pago. Devuelve la URL a la que el frontend redirige al usuario.
 *
 * Por qué existe (§RLS de 0005): el cliente NO tiene INSERT sobre `pagos`.
 * Solo esta función (service role) puede crear el registro, y solo el webhook
 * puede moverlo a 'exitoso'. Si el cliente pudiera insertar, podría crear un
 * pago ya marcado como exitoso y descargar sin pagar.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { handlePreflight, jsonResponse } from '../_shared/cors.ts'

const TARIFA_FIJA_B2C_COP = 14900

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const appOrigin = Deno.env.get('SPECTER_APP_ORIGIN') ?? 'http://localhost:5173'

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !mpAccessToken) {
    console.error('Faltan variables de entorno para crear-pago.')
    return jsonResponse({ error: 'Configuración del servidor incompleta.' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'No autorizado.' }, 401)

  // Cliente con la sesión del usuario (RLS activo) para validar identidad y
  // pertenencia del caso.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) return jsonResponse({ error: 'No autorizado.' }, 401)

  let casoId: string | undefined
  try {
    const body = await req.json()
    casoId = body.caso_id
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400)
  }

  if (!casoId) return jsonResponse({ error: 'Falta caso_id.' }, 400)

  // El caso debe ser visible para el usuario (RLS lo garantiza).
  const { data: caso, error: casoError } = await userClient
    .from('casos')
    .select('id, titulo')
    .eq('id', casoId)
    .single()

  if (casoError || !caso) return jsonResponse({ error: 'Caso no encontrado o sin acceso.' }, 404)

  // Cliente privilegiado: solo a partir de acá, y solo para escribir el pago.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Si ya hay un pago exitoso para este caso, no se cobra de nuevo.
  const { data: existente } = await adminClient
    .from('pagos')
    .select('id, status')
    .eq('caso_id', casoId)
    .eq('user_id', user.id)
    .eq('status', 'exitoso')
    .maybeSingle()

  if (existente) {
    return jsonResponse({ error: 'Este documento ya fue pagado.' }, 409)
  }

  const { data: pago, error: pagoError } = await adminClient
    .from('pagos')
    .insert({
      user_id: user.id,
      caso_id: casoId,
      monto_cop: TARIFA_FIJA_B2C_COP,
      status: 'pendiente',
      gateway: 'mercadopago',
    })
    .select('id')
    .single()

  if (pagoError || !pago) {
    console.error('No se pudo crear el pago:', pagoError)
    return jsonResponse({ error: 'No se pudo registrar el pago.' }, 500)
  }

  // Preferencia de checkout en Mercado Pago.
  // `external_reference` es el puente entre MP y nuestra tabla: el webhook lo
  // usa para saber qué pago confirmar.
  const preferenceBody = {
    items: [
      {
        title: `Specter · ${caso.titulo}`,
        quantity: 1,
        unit_price: TARIFA_FIJA_B2C_COP,
        currency_id: 'COP',
      },
    ],
    external_reference: pago.id,
    back_urls: {
      success: `${appOrigin}/casos/${casoId}?pago=exitoso`,
      failure: `${appOrigin}/casos/${casoId}?pago=fallido`,
      pending: `${appOrigin}/casos/${casoId}?pago=pendiente`,
    },
    auto_return: 'approved',
    notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
  }

  let mpResponse: Response
  try {
    mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceBody),
    })
  } catch (err) {
    console.error('Error de red con Mercado Pago:', err)
    await adminClient.from('pagos').update({ status: 'fallido' }).eq('id', pago.id)
    return jsonResponse({ error: 'No se pudo contactar la pasarela de pagos.' }, 502)
  }

  if (!mpResponse.ok) {
    console.error('Mercado Pago rechazó la preferencia:', mpResponse.status, await mpResponse.text())
    await adminClient.from('pagos').update({ status: 'fallido' }).eq('id', pago.id)
    return jsonResponse({ error: 'La pasarela de pagos rechazó la solicitud.' }, 502)
  }

  const preference = (await mpResponse.json()) as { id?: string; init_point?: string }

  if (!preference.init_point) {
    await adminClient.from('pagos').update({ status: 'fallido' }).eq('id', pago.id)
    return jsonResponse({ error: 'La pasarela no devolvió una URL de checkout.' }, 502)
  }

  await adminClient
    .from('pagos')
    .update({ gateway_reference: preference.id ?? null })
    .eq('id', pago.id)

  return jsonResponse({ checkoutUrl: preference.init_point, pago_id: pago.id })
})
