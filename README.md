# Specter

Plataforma LegalTech colombiana con IA. Modelo dual:

- **B2C**: ciudadanos generan documentos legales (tutelas, derechos de petición, demandas) por
  tarifa fija de $14.900 COP por descarga, vía interfaz conversacional/visual.
- **B2B**: firmas boutique y litigantes de élite bajo suscripción mensual multi-tenant.

Stack: Vite + React + TypeScript + Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage) ·
n8n (orquestación IA) · TanStack Query.

## Estado del proyecto

- ✅ **Fase 1 — Base de datos (Supabase)**: migraciones, funciones/triggers, RLS.
- ⏳ **Fase 2 — Frontend**: pendiente de assets de diseño (Stitch) y build de la app.
- ⏳ **Fase 3 — Integración n8n**: pendiente.

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

### Decisiones clave (ver comentarios `-- FIX:` en las migraciones)

- **Aislamiento de tenant** vía `public.current_tenant_id()` (resuelve `tenant_id` desde
  `profiles` con `auth.uid()`), no vía un claim custom en el JWT.
- **Toda política de escritura tiene `WITH CHECK`** además de `USING` — una política `FOR ALL`
  con solo `USING` no restringe `INSERT`/`UPDATE`.
- **`pagos`** solo expone `SELECT` al dueño. No hay política de `INSERT`/`UPDATE`, así que el
  cliente no puede crear pagos ni marcarlos `exitoso`; eso lo hace el backend (webhook de
  Mercado Pago) con la `service_role` key, que bypassa RLS.
- **Cada ciudadano (B2C) recibe un tenant personal** al registrarse (trigger
  `handle_new_user`). Los usuarios B2B (abogados de una firma) necesitan un flujo de invitación
  aparte — ver el `TODO` en `0004_functions_triggers.sql`.
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

## Próximos pasos

- Fase 2: assets de diseño de Stitch (logo + pantalla de workspace pendientes; el design system
  ya está en `design/design-system.md`), scaffold del frontend, Kanban, workspace conversacional,
  flujo de pago.
- Fase 3: Edge Function de firma HMAC + webhook de n8n + integración Mercado Pago.
