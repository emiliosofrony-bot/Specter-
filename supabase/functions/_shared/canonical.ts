/**
 * Serialización canónica del payload firmado.
 *
 * FIX (crítico): el borrador original re-serializaba el objeto en n8n antes de
 * comparar el HMAC. `JSON.stringify` NO garantiza el mismo orden de claves ni
 * el mismo espaciado entre runtimes (Deno vs Node) ni entre versiones, así que
 * una re-serialización puede producir un string distinto al firmado y hacer
 * fallar la validación de peticiones legítimas — o, peor, empujar a alguien a
 * "arreglarlo" relajando la verificación.
 *
 * Solución: un único punto que produce el string canónico (claves ordenadas
 * alfabéticamente, sin espacios), y ese MISMO string se envía como cuerpo raw
 * del POST. n8n verifica el HMAC sobre el raw body recibido, sin volver a
 * serializar nada.
 */

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * JSON con claves ordenadas de forma determinista y recursiva.
 * No incluye espacios ni saltos de línea.
 */
export function canonicalize(value: JsonValue): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`
  }

  const entries = Object.keys(value)
    .sort()
    .filter((key) => value[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key] as JsonValue)}`)

  return `{${entries.join(',')}}`
}

/** HMAC-SHA256 en hex sobre el string exacto recibido. */
export async function signHmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Comparación en tiempo constante. Se usa en el webhook de Mercado Pago
 * (mercadopago-webhook) para verificar su firma; el mismo criterio que aplica
 * el Code node de n8n con crypto.timingSafeEqual.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
