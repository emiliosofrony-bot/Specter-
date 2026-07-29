# n8n · Orquestación IA de Specter

Flujo completo:

```
Frontend
  │  supabase.functions.invoke('procesar-caso', { caso_id })
  ▼
Edge Function `procesar-caso`          (supabase/functions/procesar-caso)
  │  · valida sesión y pertenencia del caso (RLS activo)
  │  · serializa el payload de forma canónica
  │  · firma HMAC-SHA256 con SPECTER_WEBHOOK_SECRET
  │  · POST con header x-specter-signature
  ▼
n8n Webhook (Raw Body = ON)
  ▼
Code node "Validar firma"              (n8n/validar-firma.js)
  │  · rechaza si la firma no coincide (comparación timing-safe)
  ▼
Nodos de IA (redacción del documento legal)
  ▼
Supabase (service role) → INSERT/UPDATE en public.documentos
  ▼
Respond to Webhook → { document_id, status } + 200 OK
  ▼
Frontend actualiza el visor
```

## Nodos del workflow

### 1. Webhook

- **HTTP Method**: `POST`
- **Path**: p.ej. `specter/procesar-caso`
- **Respond**: `Using 'Respond to Webhook' Node`
- **Options → Raw Body**: `ON` ← **obligatorio**, ver el comentario en
  `validar-firma.js`.

La URL resultante es la que va en el secret `N8N_WEBHOOK_URL` de Supabase.

### 2. Code — "Validar firma"

Pega el contenido de [`validar-firma.js`](./validar-firma.js). Modo: *Run Once for All Items*.

Requiere la variable de entorno `SPECTER_WEBHOOK_SECRET` en n8n, con el mismo
valor que el secret homónimo en Supabase.

### 3. Nodos de IA

Reciben el payload ya validado y parseado:

```json
{
  "caso_id": "uuid",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "titulo": "string",
  "descripcion": "string | null",
  "tipo_documento": "tutela | peticion | demanda | null",
  "nivel_investigacion": 50,
  "enfoque": "B2C | B2B"
}
```

`nivel_investigacion` y `enfoque` vienen de `profiles.workspace_config` (los
sliders del workspace) y deben modular la profundidad de la investigación y el
tono/formato del documento.

### 4. Supabase — escritura del documento

Usa el nodo de Supabase (o un HTTP Request a la REST API) con la
**service_role key**, que bypassa RLS por diseño:

```
UPSERT public.documentos (caso_id, tipo_documento, content_markdown)
```

> La service_role key vive **solo** en las credenciales de n8n. Nunca en el
> frontend, nunca en el repo, nunca en el body de una respuesta.

Si además se genera el PDF, súbelo al bucket privado `documentos-privados`
(ver `supabase/migrations/0007_storage.sql`) con la convención de ruta
`<caso_id>/<documento_id>.pdf`, y guarda esa **key** (no una URL) en
`documentos.pdf_url`.

### 5. Respond to Webhook

Body:

```json
{ "document_id": "{{ $json.id }}", "status": "ok" }
```

Status code: `200`.

## Probar la validación de firma

Una petición **sin firma** o con **firma inválida** debe ser rechazada por el
Code node:

```bash
# Debe fallar
curl -i -X POST "$N8N_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -H 'x-specter-signature: 00' \
  --data '{"caso_id":"..."}'
```

Para generar una firma **válida** a mano (mismo algoritmo que la Edge
Function), el cuerpo debe ser el JSON canónico — claves ordenadas
alfabéticamente y sin espacios:

```bash
BODY='{"caso_id":"...","descripcion":null,"enfoque":"B2C","nivel_investigacion":50,"tipo_documento":"tutela","titulo":"Demo","tenant_id":"...","user_id":"..."}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SPECTER_WEBHOOK_SECRET" -hex | awk '{print $2}')
curl -i -X POST "$N8N_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -H "x-specter-signature: $SIG" \
  --data "$BODY"
```

> En la práctica no necesitas hacerlo a mano: `procesar-caso` produce el cuerpo
> canónico correcto. Este ejemplo existe para depurar la validación.
