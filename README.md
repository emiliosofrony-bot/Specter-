# Specter

Plataforma LegalTech colombiana con IA. Modelo dual:

- **B2C**: ciudadanos generan documentos legales (tutelas, derechos de petición, demandas) por
  tarifa fija de $14.900 COP por descarga, vía interfaz conversacional/visual.
- **B2B**: firmas boutique y litigantes de élite bajo suscripción mensual multi-tenant.

Stack: Vite + React + TypeScript + Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage) ·
n8n (orquestación IA) · TanStack Query.

## Estado del proyecto

- ✅ **Fase 1 — Base de datos (Supabase)**: migraciones, funciones/triggers, RLS.
- ✅ **Fase 2 — Frontend**: scaffold Vite+React+TS+Tailwind, capa de datos tipada, Kanban,
  workspace conversacional, flujo de pago, panel de expedientes. Logo y pantalla "Workspace"
  de Stitch aún pendientes (ver Design System).
- ✅ **Fase 3 — Integración n8n + pagos**: Edge Functions (firma HMAC, checkout y webhook de
  Mercado Pago), Code node de validación para n8n, bucket privado de Storage.

Seguridad: ver [`SECURITY.md`](./SECURITY.md) — modelo RLS, manejo de secretos y flujo HMAC.

## Fase 1 · Base de datos

### Esquema

Migraciones en `supabase/migrations/`, en orden:

1. `0001_enums.sql` — `estado_caso`, `rol_usuario`, `tipo_documento`, `estado_pago`.
2. `0002_tables.sql` — `tenants`, `profiles`, `casos`, `documentos`, `pagos`,
   `expedientes_judiciales`.
3. `0003_indexes.sql` — índices por `tenant_id`/`user_id`/`caso_id`.
4. `0004_functions_triggers.sql` — `current_tenant_id()`, `verificar_suscripcion_activa()`,
   trigger de alta de perfil (`handle_new_user`, con TODO para invitación B2B), trigger
   anti-escalación de privilegios sobre `profiles`, triggers de `updated_at`.
5. `0005_rls.sql` — políticas RLS (lectura y escritura) de las seis tablas.
6. `0006_auth_hook.sql` — no-op documentado: el aislamiento de tenant se resuelve con
   `current_tenant_id()`, no con un claim JWT personalizado.
7. `0007_storage.sql` — bucket privado `documentos-privados` + políticas de `storage.objects`
   acotadas por caso/tenant (solo lectura para el cliente).
8. `0008_invitaciones.sql` — onboarding B2B por invitación: tabla `invitaciones` con token
   hasheado y `handle_new_user` que une al invitado al tenant de su firma como
   `abogado_premium`.

### Decisiones clave (ver comentarios `-- FIX:` en las migraciones)

- **Aislamiento de tenant** vía `public.current_tenant_id()` (resuelve `tenant_id` desde
  `profiles` con `auth.uid()`), no vía un claim custom en el JWT.
- **Toda política de escritura tiene `WITH CHECK`** además de `USING` — una política `FOR ALL`
  con solo `USING` no restringe `INSERT`/`UPDATE`.
- **`pagos`** solo expone `SELECT` al dueño. No hay política de `INSERT`/`UPDATE`, así que el
  cliente no puede crear pagos ni marcarlos `exitoso`; eso lo hace el backend (webhook de
  Mercado Pago) con la `service_role` key, que bypassa RLS.
- **Cada ciudadano (B2C) recibe un tenant personal** al registrarse (trigger
  `handle_new_user`). Los abogados B2B se unen al tenant de su firma mediante una invitación
  con token (`0008_invitaciones.sql`), no creando un tenant propio.
- Un trigger (`prevent_profile_privilege_escalation`) impide que un usuario autenticado cambie
  su propio `role` o `tenant_id` desde el cliente, incluso teniendo permiso de `UPDATE` sobre su
  fila de `profiles`.

### Setup local

Requiere [Supabase CLI](https://supabase.com/docs/guides/cli) y Docker (para el stack local de
Supabase — Postgres, Auth, Storage, etc).

```bash
supabase start          # levanta el stack local (requiere Docker)
supabase db reset        # aplica todas las migraciones desde cero
```

Para regenerar los tipos TypeScript desde el esquema real:

```bash
# Contra un proyecto remoto ya enlazado:
supabase gen types typescript --project-id <project-ref> > src/types/database.types.ts

# Contra el stack local:
supabase gen types typescript --local > src/types/database.types.ts
```

> `src/types/database.types.ts` en este commit fue escrito a mano reflejando el esquema exacto
> de las migraciones (validado contra un PostgreSQL 16 real), porque este entorno de ejecución
> no tiene Docker disponible para correr el generador oficial. Regenéralo con el comando de
> arriba en cuanto tengas un proyecto Supabase (local o remoto) accesible.

### Verificación manual del RLS

Sin Docker disponible en este entorno, la Fase 1 se validó con un Postgres 16 plano + un stub
mínimo del esquema `auth` de Supabase (`auth.users`, `auth.uid()`, `auth.role()`). Se confirmó:

- Dos usuarios de tenants distintos solo ven/escriben sus propios `casos`.
- Un usuario no puede insertar un `caso` con `tenant_id`/`user_id` ajeno.
- Un usuario no puede insertar un `pago` (sin política de `INSERT`, RLS lo deniega).
- Un usuario no puede cambiar su propio `role` a `abogado_premium` ni su `tenant_id`.
- Un usuario sí puede actualizar su propio `workspace_config` (sliders del workspace).

## .env

Copia `.env.example` a `.env` y completa las variables. Nunca commitees `.env` con valores
reales; `SUPABASE_SERVICE_ROLE_KEY` y `SPECTER_WEBHOOK_SECRET` en particular nunca deben llegar
al bundle del frontend.

## Fase 2 · Frontend

Stack: Vite + React + TypeScript (estricto) + Tailwind + componentes estilo shadcn/ui (Radix +
CVA, escritos a mano — ver nota abajo) + Supabase JS + TanStack Query + react-router-dom + dnd-kit
(drag-and-drop del Kanban).

### Estructura

- `src/lib/supabaseClient.ts` — único punto de creación del cliente Supabase (anon key).
- `src/api/*` — capa de acceso a datos tipada con `database.types.ts`. Ningún componente llama a
  `supabase.from(...)` directamente.
- `src/hooks/*` — hooks de TanStack Query envolviendo `src/api/*` (`useCasos`,
  `useUpdateCasoStatus` con actualización optimista, `useProfile`, `usePagos`, `useExpedientes`,
  `useDocumentosByCaso`, `useSignedPdfUrl`).
- `src/components/ui/*` — primitivos (Button, Card, Input, Slider, Switch, Badge, Dialog) estilo
  shadcn/ui, montados sobre Radix UI y estilizados con los tokens de `styles/tokens.css`.
- `src/features/*` — `auth` (login/registro + `AuthProvider`/`ProtectedRoute`), `kanban` (tablero
  drag-and-drop), `workspace` (sliders + sincronización de dark mode), `documents` (visor
  Markdown + descarga de PDF vía signed URL), `payments` (CTA de tarifa fija), `expedientes`
  (tabla de vigilancia B2B).
- `src/styles/tokens.css` — tokens extraídos de `design/design-system.md` (real, exportado de
  Stitch). Ver el comentario en ese archivo sobre la superposición YAML/prosa del asset y el
  TODO de light mode (la prosa no trae hex para modo claro, así que no se inventó ninguno).

### Nota sobre shadcn/ui

Este entorno no tiene acceso interactivo a la CLI de `shadcn-ui` (requiere prompts + red al
registro de componentes). Los primitivos en `src/components/ui/` están escritos a mano siguiendo
exactamente el mismo patrón que genera esa CLI (Radix UI + `class-variance-authority` + `cn()`),
así que son intercambiables 1:1 si más adelante corres `npx shadcn-ui add <componente>`.

### Setup

```bash
cp .env.example .env   # completa VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

`npm run build` corre `tsc -b` (estricto) + `vite build`; ambos pasan limpios en este commit.

### Validación manual (sin Supabase real disponible en este entorno)

Sin Docker no se pudo levantar `supabase start` para probar contra un backend real. Se validó en
su lugar, con Playwright headless contra `npm run dev` y credenciales de Supabase dummy:

- `/auth` renderiza login y registro, sin errores de consola.
- Una sesión inyectada en `localStorage` atraviesa `ProtectedRoute` y monta el `AppShell`
  (sidebar con indicador copper de ruta activa, Kanban, "Cargando casos…" mientras el fetch real
  falla contra el host dummy — comportamiento esperado sin backend).

**Pendiente de una validación real contra Supabase**: crear dos usuarios, confirmar que el
Kanban solo muestra sus propios casos, que el drag-and-drop persiste `status`, que los sliders
sobreviven a un refresh, y que el flujo de pago (una vez exista la Edge Function `crear-pago` de
la Fase 3) redirige a Mercado Pago.

## Fase 3 · Integración n8n + Mercado Pago

Flujo completo documentado en [`n8n/README.md`](./n8n/README.md) y
[`SECURITY.md`](./SECURITY.md).

### Edge Functions (`supabase/functions/`)

| Función | Qué hace | JWT |
|---|---|---|
| `procesar-caso` | Valida sesión y pertenencia del caso, serializa el payload de forma canónica, lo firma con HMAC-SHA256 y hace el POST a n8n. Existe para que `SPECTER_WEBHOOK_SECRET` nunca llegue al navegador. | requerido |
| `crear-pago` | Crea el registro `pagos` en `pendiente` (service role) y la preferencia de checkout de Mercado Pago. Devuelve `checkoutUrl`. | requerido |
| `mercadopago-webhook` | Único punto que mueve un pago a `exitoso`/`fallido`. Verifica `x-signature`, consulta el pago a la API de MP (no confía en el body) y actualiza de forma idempotente. | **sin JWT** |
| `invitar-abogado` | Valida que quien invita sea `abogado_premium` de un tenant B2B activo, genera el token con CSPRNG y guarda solo su hash. Devuelve el enlace una sola vez. | requerido |
| `_shared/canonical.ts` | Serialización canónica determinista + HMAC + comparación en tiempo constante. | — |

### Despliegue

```bash
# Secrets (ver .env.example para la lista completa)
supabase secrets set SPECTER_APP_ORIGIN=https://app.specter.co
supabase secrets set SPECTER_WEBHOOK_SECRET=...
supabase secrets set N8N_WEBHOOK_URL=...
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=...
supabase secrets set MERCADOPAGO_WEBHOOK_SECRET=...

supabase functions deploy procesar-caso
supabase functions deploy crear-pago
supabase functions deploy invitar-abogado
# El webhook lo llama Mercado Pago, no un usuario con sesión:
supabase functions deploy mercadopago-webhook --no-verify-jwt
```

En n8n: importa el Code node de [`n8n/validar-firma.js`](./n8n/validar-firma.js) como primer
nodo tras el Webhook, activa **Raw Body = ON** en el Webhook, y define
`SPECTER_WEBHOOK_SECRET` como variable de entorno de n8n (mismo valor que en Supabase).

### Validación realizada

Sin Docker no se pudo levantar el stack de Supabase ni una instancia de n8n, así que se validó
la lógica criptográfica ejecutando el código real de `_shared/canonical.ts` sobre WebCrypto (la
misma API que usa Deno) y comparándolo contra `crypto.createHmac` de Node (la que usa n8n):

- Ambos producen **firmas idénticas** para el mismo payload canónico, incluyendo UTF-8
  multibyte (`ñ á é í ó ú —`).
- La validación de n8n acepta la firma legítima y rechaza firma vacía, truncada, incorrecta de
  igual longitud, body alterado (tampering) y firma con otro secreto.
- La verificación de Mercado Pago acepta la firma válida y rechaza `v1` incorrecto, headers
  faltantes, `ts` alterado, `data.id` alterado y otro secreto.
- Las 8 migraciones aplican limpio, y en el bucket privado cada usuario solo lista el PDF de su
  propio caso sin poder subir objetos.

## Onboarding B2B (invitaciones)

Un abogado no puede unirse solo a una firma: el trigger anti-escalación se lo impide. El flujo
es `abogado_premium` → `invitar-abogado` → enlace `/auth?invite=<token>&email=<correo>` → el
invitado se registra y `handle_new_user` lo une al tenant de la firma. Detalles de seguridad en
[`SECURITY.md`](./SECURITY.md).

Verificado contra Postgres real: el alta con invitación válida entra como `abogado_premium` y ve
los casos de su firma (no los ajenos); el alta sin invitación sigue creando tenant personal como
`ciudadano`. Se rechazan token inválido, token emitido para otro correo, token ya usado, token
expirado y firma con suscripción vencida. Un cliente no puede crear invitaciones ni leer
`token_hash`. El SHA-256 de la Edge Function coincide con el de Postgres, incluido UTF-8.

**Pendiente de prueba end-to-end** contra una instancia real de n8n y el sandbox de Mercado
Pago.

## Próximos pasos

- Logo y pantalla "Workspace" de Stitch (aplicar al favicon/branding real y afinar el layout del
  workspace conversacional contra el mockup). El favicon actual es un placeholder.
- Envío del enlace de invitación por correo desde el servidor (hoy se devuelve al cliente para
  compartirlo manualmente; `TODO(email)` en `invitar-abogado`).
- Light mode: el design system no trae hex para modo claro (ver `TODO(design)` en
  `src/styles/tokens.css`).
- Prueba end-to-end de la Fase 3 contra n8n y Mercado Pago reales.
