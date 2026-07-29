# Specter · Modelo de seguridad

Documento de referencia sobre las tres decisiones de seguridad que sostienen la
plataforma: el modelo RLS, el manejo de secretos y el flujo de firma HMAC.

---

## 1. Modelo RLS (Row Level Security)

RLS está habilitado en las seis tablas de negocio (`0005_rls.sql`) y en el
bucket privado de Storage (`0007_storage.sql`). El principio es que **el cliente
solo puede hacer lo que ninguna operación privilegiada requiere**.

### Aislamiento multi-tenant

Se resuelve con `public.current_tenant_id()` (`0004_functions_triggers.sql`),
una función `SECURITY DEFINER STABLE` que lee `profiles.tenant_id` a partir de
`auth.uid()`.

Se descartó el enfoque de claim JWT personalizado (`supabase_tenant_id`) porque
exige mantener un Auth Hook sincronizado con `profiles` y forzar refresh de
sesión cuando el tenant cambia; si se desincroniza, el aislamiento falla en
silencio. Resolver el tenant desde la tabla es marginalmente más costoso pero
siempre refleja el estado real. `0006_auth_hook.sql` queda como no-op
documentado.

### Toda política de escritura lleva `WITH CHECK`

Una política `FOR ALL` con solo `USING` **no restringe la escritura**: `USING`
filtra qué filas existentes son visibles/afectables, mientras que `WITH CHECK`
valida la fila *resultante* de un `INSERT`/`UPDATE`. Sin `WITH CHECK`, un
cliente autenticado podía insertar filas con `tenant_id`/`user_id` ajenos.

Patrón aplicado (ejemplo, `casos`):

```sql
CREATE POLICY casos_select ON public.casos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY casos_write ON public.casos FOR ALL TO authenticated
  USING     (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id() AND user_id = (SELECT auth.uid()));
```

`documentos` no tiene `tenant_id` propio: se acota vía el caso al que pertenece,
con el mismo criterio (lectura por tenant, escritura además por dueño del caso).

### Tablas sin política de escritura (denegación por defecto)

Cuando RLS está activo y no existe política para una operación, esa operación
queda **denegada**. Se usa deliberadamente en:

| Tabla / recurso | Cliente | Quién escribe |
|---|---|---|
| `pagos` | solo `SELECT` del propio | Edge Functions `crear-pago` / `mercadopago-webhook` (service role) |
| `tenants` | solo `SELECT` del propio | backend (signup trigger, facturación) |
| `expedientes_judiciales` | solo `SELECT` por tenant | backend (integración de monitoreo judicial) |
| `storage.objects` (bucket privado) | solo `SELECT` por caso accesible | n8n / Edge Functions (service role) |

El caso de `pagos` es el crítico: si el cliente pudiera insertar o actualizar,
podría crear un pago ya marcado como `exitoso` y descargar sin pagar. La
creación del registro `pendiente` y la transición a `exitoso`/`fallido` son
exclusivas del backend confiable.

### Escalación de privilegios en `profiles`

El cliente necesita `UPDATE` sobre su propia fila de `profiles` para persistir
`workspace_config` (los sliders del workspace). Esa misma política le permitiría
cambiarse `role` a `abogado_premium` o moverse a otro `tenant_id`.

El trigger `prevent_profile_privilege_escalation` (`0004`) cierra ese hueco:
rechaza cualquier `UPDATE` hecho por el rol `authenticated` que modifique `role`
o `tenant_id`. El backend (service role) no pasa por esa restricción.

### Storage privado

`documentos.pdf_url` **no guarda una URL pública**: guarda la *key* de un objeto
en el bucket privado `documentos-privados`. El acceso siempre se hace con una
signed URL de 5 minutos generada server-side (`src/api/documentos.ts`). El
bucket se crea con `public = false`; un bucket público haría legible cualquier
documento legal con solo conocer (o adivinar) la key.

La convención de rutas es `<caso_id>/<documento_id>.pdf`, lo que permite acotar
el acceso por tenant con `storage.foldername(name)[1]` reutilizando el criterio
de `documentos_select`.

### Estado de verificación

Verificado contra un PostgreSQL 16 real (con un stub mínimo de los esquemas
`auth` y `storage` de Supabase, porque este entorno no tiene Docker para
`supabase start`):

- Dos usuarios de tenants distintos solo ven sus propios `casos`.
- Un usuario no puede insertar un `caso` con `tenant_id`/`user_id` ajeno.
- Un usuario no puede insertar un `pago` (RLS lo deniega).
- Un usuario no puede cambiar su propio `role` ni `tenant_id`, pero sí su
  `workspace_config`.
- Cada usuario solo lista el PDF de su propio caso en el bucket privado, y no
  puede subir objetos.

Pendiente de re-verificar contra un proyecto Supabase real antes de producción.

---

## 2. Manejo de secretos

Regla base: **el bundle del frontend es público**. Cualquier valor que llegue a
`import.meta.env.VITE_*` es legible por cualquiera que abra las DevTools.

| Secreto | Dónde vive | Nunca en |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | bundle del frontend (son públicos por diseño; la seguridad la da RLS) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | secrets de Supabase (inyectado en Edge Functions) + credenciales de n8n | frontend, repo, respuestas HTTP |
| `SPECTER_WEBHOOK_SECRET` | secret de Supabase + variable de entorno de n8n | frontend, workflow de n8n hardcodeado |
| `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` | secrets de Supabase | frontend, repo |

Prácticas aplicadas:

- `.env` está en `.gitignore`; solo se commitea `.env.example` sin valores.
- El Code node de n8n lee el secreto de `$env.SPECTER_WEBHOOK_SECRET`, **nunca
  hardcodeado**: un secreto escrito en el workflow queda en los exports y en el
  historial de ejecuciones.
- Las Edge Functions no devuelven detalles internos en los errores; los detalles
  van a `console.error` (logs del servidor) y el cliente recibe un mensaje
  genérico.
- CORS de las Edge Functions restringido a `SPECTER_APP_ORIGIN`, no `*`, para
  que otro sitio no pueda dispararlas con la sesión del usuario.

### Rotación

Si `SPECTER_WEBHOOK_SECRET` se compromete, hay que actualizarlo **en los dos
lados a la vez** (secret de Supabase y env de n8n); mientras estén
desincronizados, toda petición legítima será rechazada. Lo mismo aplica a la
`service_role` key: rotarla en Supabase invalida las credenciales de n8n hasta
que se actualicen ahí.

---

## 3. Flujo de firma HMAC

```
Frontend
  │  supabase.functions.invoke('procesar-caso', { caso_id })
  │  (solo lleva la sesión del usuario; no conoce ningún secreto)
  ▼
Edge Function `procesar-caso`
  │  1. valida la sesión (auth.getUser)
  │  2. valida que el caso pertenezca al usuario, con RLS activo
  │  3. serializa el payload de forma CANÓNICA (claves ordenadas, sin espacios)
  │  4. firma ese string exacto con HMAC-SHA256 + SPECTER_WEBHOOK_SECRET
  │  5. POST a n8n con el string canónico como body y la firma en
  │     el header x-specter-signature
  ▼
n8n Webhook (Raw Body = ON)
  ▼
Code node "Validar firma"
  │  recalcula el HMAC sobre el RAW BODY y compara en tiempo constante
  │  → si no coincide, lanza y el flujo se detiene (sin gastar tokens de IA)
  ▼
Nodos de IA → escritura en public.documentos con service role
  ▼
Respond to Webhook → { document_id, status } + 200 OK
```

### Por qué la firma se hace en una Edge Function y no en el navegador

Firmar en el cliente exigiría que `SPECTER_WEBHOOK_SECRET` estuviera en el
bundle. Cualquiera podría extraerlo y forjar peticiones válidas al webhook,
haciendo que la firma dejara de probar nada. La Edge Function actúa como el
único lugar que conoce el secreto, y además es el punto donde se valida — con
RLS activo — que el usuario tenga derecho sobre el caso, **antes** de gastar
tokens de IA.

### Por qué el payload se serializa de forma canónica

`JSON.stringify` no garantiza el mismo orden de claves ni el mismo espaciado
entre runtimes (Deno vs Node) ni entre versiones. Si n8n re-serializara el
objeto ya parseado para verificar el HMAC, podría obtener un string distinto al
firmado y rechazar peticiones legítimas de forma intermitente — lo que empuja a
"arreglarlo" relajando la verificación.

Solución: `supabase/functions/_shared/canonical.ts` produce **un único** string
determinista (claves ordenadas alfabéticamente y recursivamente, sin espacios),
y ese mismo string es el cuerpo del POST. n8n verifica sobre el raw body, sin
volver a serializar nada. Por eso el nodo Webhook **requiere** `Raw Body = ON`.

### Por qué la comparación es en tiempo constante

Un `!==` sobre la firma termina en el primer byte distinto, así que el tiempo de
respuesta filtra cuántos bytes acertó el atacante y permite reconstruir la firma
byte a byte. Se usa `crypto.timingSafeEqual` en n8n y `timingSafeEqualHex` en
las Edge Functions. `timingSafeEqual` exige buffers de igual longitud, así que
el chequeo de longitud va primero y con cortocircuito.

### Webhook de Mercado Pago

`mercadopago-webhook` se despliega **sin verificación de JWT**
(`--no-verify-jwt`), porque quien lo llama es Mercado Pago y no un usuario con
sesión. La autenticidad se establece de otra forma:

1. Se verifica el header `x-signature` (`ts=…,v1=…`) recalculando el HMAC-SHA256
   del manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` con
   `MERCADOPAGO_WEBHOOK_SECRET`, comparado en tiempo constante. Esto ata la
   firma al id del pago y al timestamp, así que no se puede reusar una firma
   válida apuntando a otro pago.
2. **No se confía en el `status` del cuerpo de la notificación.** Se consulta el
   pago a la API de Mercado Pago, que es la fuente de verdad.
3. El `UPDATE` exige `status = 'pendiente'`, lo que hace la operación idempotente
   (Mercado Pago reintenta notificaciones) y evita que una notificación tardía
   de `rejected` revierta un pago ya aprobado.

### Estado de verificación

Probado con la implementación real de `canonical.ts` ejecutada sobre WebCrypto
(la misma API que usa Deno en las Edge Functions), comparada contra
`crypto.createHmac` de Node (la que usa n8n):

- Ambas producen **firmas idénticas** para el mismo payload canónico, incluyendo
  caracteres UTF-8 multibyte (`ñ á é í ó ú —`).
- `canonicalize` es determinista frente a distinto orden de inserción de claves.
- La validación de n8n acepta la firma legítima y rechaza: firma vacía, firma
  truncada, firma de igual longitud pero incorrecta, body alterado con la firma
  original (tampering), y firma calculada con otro secreto.
- La verificación de Mercado Pago acepta la firma válida (incluido el formato con
  espacios que envía MP) y rechaza: `v1` incorrecto, headers faltantes, `ts`
  alterado, `data.id` alterado, otro secreto, y header malformado.

Pendiente de una prueba end-to-end contra una instancia real de n8n y el entorno
sandbox de Mercado Pago.

---

## Reportar una vulnerabilidad

Escribe a los mantenedores del repositorio antes de divulgar públicamente
cualquier hallazgo. Dado que la plataforma maneja información legal de
ciudadanos, cualquier fuga de datos entre tenants debe tratarse como incidente
crítico.
