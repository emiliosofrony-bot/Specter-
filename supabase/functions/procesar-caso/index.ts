/**
 * Specter · Edge Function `procesar-caso`
 *
 * Frontend → (esta función) → Webhook n8n → IA → Supabase (service role) → 200
 *
 * Rol de esta función (§4.1 del diseño): ser el intermediario que firma la
 * petición, para que SPECTER_WEBHOOK_SECRET nunca llegue al bundle del
 * navegador. Además valida — con la sesión del usuario y RLS activo — que el
 * caso que se pide procesar realmente le pertenece, antes de gastar tokens de
 * IA en n8n.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { canonicalize, signHmacSha256 } from '../_shared/canonical.ts'
import { handlePreflight, jsonResponse } from '../_shared/cors.ts'

interface ProcesarCasoRequest {
  caso_id?: string
}

interface N8nResponse {
  document_id?: string
  status?: string
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405)
  }

  const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
  const webhookSecret = Deno.env.get('SPECTER_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!webhookUrl || !webhookSecret || !supabaseUrl || !anonKey) {
    console.error('Faltan variables de entorno para procesar-caso.')
    return jsonResponse({ error: 'Configuración del servidor incompleta.' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'No autorizado.' }, 401)
  }

  // Cliente con la sesión del usuario: RLS sigue activo, así que este cliente
  // solo puede leer casos que el usuario realmente puede ver.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: 'No autorizado.' }, 401)
  }

  let body: ProcesarCasoRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400)
  }

  const casoId = body.caso_id
  if (!casoId) {
    return jsonResponse({ error: 'Falta caso_id.' }, 400)
  }

  // FIX: verificar pertenencia ANTES de invocar la IA. Sin esto, un usuario
  // podría hacer que n8n procese (y sobrescriba el documento de) un caso
  // ajeno: n8n escribe con service role y no vuelve a chequear RLS.
  const { data: caso, error: casoError } = await supabase
    .from('casos')
    .select('id, tenant_id, titulo, descripcion, tipo_documento, status')
    .eq('id', casoId)
    .single()

  if (casoError || !caso) {
    return jsonResponse({ error: 'Caso no encontrado o sin acceso.' }, 404)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('workspace_config')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return jsonResponse({ error: 'No se pudo leer la configuración del workspace.' }, 500)
  }

  const workspaceConfig = (profile.workspace_config ?? {}) as Record<string, unknown>

  // El payload se serializa UNA sola vez de forma canónica y ese mismo string
  // es el cuerpo del POST y el mensaje firmado — nunca se re-serializa.
  const canonicalBody = canonicalize({
    caso_id: caso.id,
    tenant_id: caso.tenant_id,
    user_id: user.id,
    titulo: caso.titulo,
    descripcion: caso.descripcion ?? null,
    tipo_documento: caso.tipo_documento ?? null,
    nivel_investigacion: Number(workspaceConfig.nivel_investigacion ?? 50),
    enfoque: String(workspaceConfig.enfoque ?? 'B2C'),
  })

  const signature = await signHmacSha256(webhookSecret, canonicalBody)

  let n8nResponse: Response
  try {
    n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-specter-signature': signature,
      },
      body: canonicalBody,
    })
  } catch (err) {
    console.error('Error de red al invocar n8n:', err)
    return jsonResponse({ error: 'No se pudo contactar el orquestador de IA.' }, 502)
  }

  if (!n8nResponse.ok) {
    console.error('n8n respondió con error:', n8nResponse.status, await n8nResponse.text())
    return jsonResponse({ error: 'El orquestador de IA rechazó la petición.' }, 502)
  }

  let result: N8nResponse
  try {
    result = await n8nResponse.json()
  } catch {
    return jsonResponse({ error: 'Respuesta inválida del orquestador de IA.' }, 502)
  }

  return jsonResponse({ document_id: result.document_id ?? null, status: result.status ?? 'ok' })
})
