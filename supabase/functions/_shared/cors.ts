// Origen permitido para las Edge Functions llamadas desde el navegador.
// FIX: no se usa '*' para no dejar que cualquier sitio dispare estas funciones
// con la sesión del usuario. Configura SPECTER_APP_ORIGIN con el dominio real
// del frontend (ej. https://app.specter.co).
const appOrigin = Deno.env.get('SPECTER_APP_ORIGIN') ?? 'http://localhost:5173'

export const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
