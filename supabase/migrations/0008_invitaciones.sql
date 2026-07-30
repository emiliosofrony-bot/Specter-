-- Specter · Fase 4 · Onboarding B2B por invitación
--
-- Cierra el TODO de 0004_functions_triggers.sql: hasta ahora TODO registro
-- creaba un tenant personal con role 'ciudadano', así que un abogado de una
-- firma no tenía forma de unirse al tenant de su firma como 'abogado_premium'
-- (y el trigger anti-escalación de 0004 le impide, correctamente,
-- auto-asignarse el rol después).
--
-- Flujo: un abogado_premium de un tenant B2B activo crea una invitación
-- (Edge Function `invitar-abogado`, service role) → el invitado se registra
-- pasando el token en raw_user_meta_data.invite_token → este trigger lo
-- consume y lo une al tenant correcto con el rol correcto.

-- pgcrypto para digest(). En un proyecto Supabase ya está instalado en el
-- esquema `extensions`; el IF NOT EXISTS lo vuelve idempotente.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.invitaciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        public.rol_usuario NOT NULL DEFAULT 'abogado_premium',
  -- FIX: se guarda el SHA-256 del token, no el token. Si la base se filtra
  -- (dump, backup, log de query), un hash de un token aleatorio de 32 bytes no
  -- es reversible ni fuerza-brutable, así que no otorga acceso a la firma.
  token_hash  text NOT NULL UNIQUE,
  invited_by  uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invitaciones IS
  'Invitaciones pendientes para unirse a un tenant B2B. El token se entrega una sola vez a quien invita; aquí solo vive su hash.';

CREATE INDEX idx_invitaciones_tenant_id ON public.invitaciones USING btree (tenant_id);
CREATE INDEX idx_invitaciones_email     ON public.invitaciones USING btree (lower(email));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invitaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- hash_invitacion_token(): un único lugar que define cómo se hashea el token,
-- para que la Edge Function que crea la invitación y el trigger que la consume
-- no puedan divergir. Debe coincidir con el SHA-256 hex que calcula
-- `invitar-abogado` con WebCrypto.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hash_invitacion_token(token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT encode(extensions.digest(token, 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user(): ahora bifurca según haya o no invitación.
--
-- Reemplaza la versión de 0004. La rama B2C (tenant personal + 'ciudadano')
-- queda idéntica; se añade la rama B2B.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_tenant_id uuid;
  invite_token  text;
  invitacion    public.invitaciones;
BEGIN
  invite_token := nullif(new.raw_user_meta_data ->> 'invite_token', '');

  IF invite_token IS NOT NULL THEN
    -- FOR UPDATE serializa dos registros concurrentes con el mismo token, para
    -- que una invitación no pueda aceptarse dos veces.
    SELECT i.* INTO invitacion
    FROM public.invitaciones i
    WHERE i.token_hash = public.hash_invitacion_token(invite_token)
      AND i.accepted_at IS NULL
      AND i.expires_at > now()
      -- FIX: la invitación está atada al correo. Sin esto, un token filtrado
      -- (reenvío de correo, historial de chat) permitiría a CUALQUIERA entrar
      -- al tenant de la firma y leer todos sus casos.
      AND lower(i.email) = lower(new.email)
    FOR UPDATE;

    IF invitacion.id IS NULL THEN
      RAISE EXCEPTION 'Invitación inválida: no existe, ya fue usada, expiró, o corresponde a otro correo.';
    END IF;

    -- Una firma con suscripción vencida no puede seguir sumando miembros.
    IF NOT public.verificar_suscripcion_activa(invitacion.tenant_id) THEN
      RAISE EXCEPTION 'La suscripción de la firma no está activa.';
    END IF;

    INSERT INTO public.profiles (id, tenant_id, role, full_name, email)
    VALUES (
      new.id,
      invitacion.tenant_id,
      invitacion.role,
      new.raw_user_meta_data ->> 'full_name',
      new.email
    );

    UPDATE public.invitaciones SET accepted_at = now() WHERE id = invitacion.id;

    RETURN new;
  END IF;

  -- Rama B2C (sin invitación): tenant personal, rol ciudadano.
  INSERT INTO public.tenants (name, is_active, is_b2b)
  VALUES (coalesce(new.raw_user_meta_data ->> 'full_name', new.email), true, false)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, role, full_name, email)
  VALUES (
    new.id,
    new_tenant_id,
    'ciudadano',
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );

  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS: los miembros de un tenant pueden VER las invitaciones de su firma
-- (para saber quién está pendiente). No hay política de escritura: crear o
-- revocar invitaciones es exclusivo del backend (service role), que además
-- valida que quien invita sea abogado_premium de un tenant B2B activo.
-- ---------------------------------------------------------------------------
ALTER TABLE public.invitaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY invitaciones_select ON public.invitaciones FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- FIX: defensa en profundidad sobre token_hash. Aunque un SHA-256 no es
-- reversible, no hay razón para exponerlo al cliente. Postgres no permite
-- revocar una columna cuando el privilegio viene de un GRANT a nivel de tabla,
-- así que se revoca la tabla y se re-otorga columna por columna.
REVOKE SELECT ON public.invitaciones FROM authenticated;
GRANT SELECT (id, tenant_id, email, role, invited_by, expires_at, accepted_at, created_at, updated_at)
  ON public.invitaciones TO authenticated;
