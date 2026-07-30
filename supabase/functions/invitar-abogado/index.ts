/**
 * Specter · Edge Function `invitar-abogado`
 *
 * Crea una invitación para que un abogado se una al tenant (firma) de quien
 * invita, con rol `abogado_premium`.
 *
 * Por qué es una Edge Function y no un INSERT del cliente: `invitaciones` no
 * tiene política de escritura (0008), porque quien invita debe ser validado
 * (rol + tenant B2B + suscripción activa) y porque el token debe generarse
 * server-side con un CSPRNG. Un cliente capaz de insertar podría invitarse a
 * sí mismo al tenant de otra firma.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { handlePreflight, jsonResponse } from '../_shared/cors.ts'

/** Token aleatorio de 32 bytes en base64url (sin padding). */
function generateInviteToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * SHA-256 en hex. Debe coincidir EXACTAMENTE con
 * public.hash_invitacion_token() (0008), que es quien lo verifica en el
 * trigger de alta.
 */
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const appOrigin = Deno.env.get('SPECTER_APP_ORIGIN') ?? 'http://localhost:5173'

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Faltan variables de entorno para invitar-abogado.')
    return jsonResponse({ error: 'Configuración del servidor incompleta.' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'No autorizado.' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) return jsonResponse({ error: 'No autorizado.' }, 401)

  let email: string | undefined
  try {
    const body = await req.json()
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400)
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Correo inválido.' }, 400)
  }

  // Perfil de quien invita, leído con su propia sesión (RLS activo).
  const { data: inviter, error: inviterError } = await userClient
    .from('profiles')
    .select('id, tenant_id, role')
    .eq('id', user.id)
    .single()

  if (inviterError || !inviter) {
    return jsonResponse({ error: 'No se pudo leer tu perfil.' }, 500)
  }

  // FIX: solo un abogado_premium puede invitar. Un ciudadano B2C no tiene
  // firma a la que sumar gente.
  if (inviter.role !== 'abogado_premium') {
    return jsonResponse({ error: 'Solo un abogado premium puede invitar miembros.' }, 403)
  }

  const { data: tenant, error: tenantError } = await userClient
    .from('tenants')
    .select('id, is_b2b, is_active')
    .eq('id', inviter.tenant_id)
    .single()

  if (tenantError || !tenant) {
    return jsonResponse({ error: 'No se pudo leer la firma.' }, 500)
  }

  if (!tenant.is_b2b) {
    return jsonResponse({ error: 'Esta cuenta no es una firma B2B.' }, 403)
  }

  if (!tenant.is_active) {
    return jsonResponse({ error: 'La suscripción de la firma no está activa.' }, 403)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Si ese correo ya es miembro de la firma, no se emite otra invitación.
  const { data: yaMiembro } = await adminClient
    .from('profiles')
    .select('id')
    .eq('tenant_id', inviter.tenant_id)
    .ilike('email', email)
    .maybeSingle()

  if (yaMiembro) {
    return jsonResponse({ error: 'Ese correo ya pertenece a la firma.' }, 409)
  }

  const token = generateInviteToken()
  const tokenHash = await sha256Hex(token)

  // Invalida invitaciones previas pendientes para el mismo correo/tenant, para
  // que solo el último enlace enviado funcione.
  await adminClient
    .from('invitaciones')
    .delete()
    .eq('tenant_id', inviter.tenant_id)
    .ilike('email', email)
    .is('accepted_at', null)

  const { data: invitacion, error: insertError } = await adminClient
    .from('invitaciones')
    .insert({
      tenant_id: inviter.tenant_id,
      email,
      role: 'abogado_premium',
      token_hash: tokenHash,
      invited_by: inviter.id,
    })
    .select('id, email, expires_at')
    .single()

  if (insertError || !invitacion) {
    console.error('No se pudo crear la invitación:', insertError)
    return jsonResponse({ error: 'No se pudo crear la invitación.' }, 500)
  }

  // El token en claro se devuelve UNA sola vez: no queda almacenado en ningún
  // lado (la tabla solo tiene su hash), así que si se pierde hay que reinvitar.
  //
  // TODO(email): enviar este enlace por correo desde el servidor (p.ej. Resend)
  // en vez de devolverlo al cliente. Mientras no exista ese envío, quien
  // invita debe compartir el enlace por un canal seguro — y el token queda
  // expuesto a quien tenga acceso a ese canal.
  return jsonResponse({
    invitacion_id: invitacion.id,
    email: invitacion.email,
    expires_at: invitacion.expires_at,
    invite_url: `${appOrigin}/auth?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
  })
})
