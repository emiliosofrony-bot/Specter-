/**
 * Specter · n8n · Code node "Validar firma"
 *
 * Colócalo como PRIMER nodo después del Webhook, antes de cualquier nodo de
 * IA. Si la firma no coincide, lanza y el flujo se detiene sin gastar tokens
 * ni escribir en Supabase.
 *
 * ── Configuración obligatoria del nodo Webhook ──────────────────────────────
 * En el nodo Webhook, Options → "Raw Body" = ON.
 *
 * FIX (crítico): sin raw body, n8n te entrega el JSON ya parseado y tendrías
 * que re-serializarlo para verificar el HMAC. Esa re-serialización no está
 * garantizada byte-a-byte igual a la que firmó la Edge Function (orden de
 * claves, espaciado), así que la validación fallaría de forma intermitente
 * para peticiones legítimas. La Edge Function envía un cuerpo canónico y
 * aquí se verifica EXACTAMENTE ese string, sin tocarlo.
 *
 * ── Variable de entorno obligatoria en n8n ──────────────────────────────────
 *   SPECTER_WEBHOOK_SECRET   (el mismo valor que el secret de Supabase)
 *
 * FIX: el secreto se lee de $env, nunca hardcodeado en el nodo. Un secreto
 * escrito en el workflow queda en los backups/exports del workflow y en el
 * historial de ejecuciones.
 */
const crypto = require('crypto');

const input = $input.first();

// Con "Raw Body" activo, n8n expone el cuerpo sin parsear. Según la versión
// puede llegar como string o como Buffer en `body`.
const rawBody = Buffer.isBuffer(input.binary?.data?.data)
  ? input.binary.data.data.toString('utf8')
  : typeof input.json.body === 'string'
    ? input.json.body
    : null;

if (rawBody === null) {
  throw new Error(
    'El webhook no está entregando el raw body. Activa Options → "Raw Body" en el nodo Webhook.',
  );
}

const secret = $env.SPECTER_WEBHOOK_SECRET;
if (!secret) {
  throw new Error('Falta la variable de entorno SPECTER_WEBHOOK_SECRET en n8n.');
}

const incoming = input.json.headers['x-specter-signature'] || '';
const computed = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

const a = Buffer.from(computed, 'utf8');
const b = Buffer.from(incoming, 'utf8');

// FIX: comparación en tiempo constante. Un `!==` filtra información por
// tiempo de respuesta y permite reconstruir la firma byte a byte.
// timingSafeEqual exige buffers del mismo largo, así que el chequeo de
// longitud va primero y con cortocircuito.
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
  throw new Error('Acceso denegado: firma criptográfica no coincide.');
}

// Firma válida: se devuelve el payload YA PARSEADO para los nodos siguientes,
// que sí necesitan los campos como objeto.
return [{ json: JSON.parse(rawBody) }];
