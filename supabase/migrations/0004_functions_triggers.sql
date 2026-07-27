-- Specter · Fase 1 · Funciones y triggers

-- ---------------------------------------------------------------------------
-- current_tenant_id(): resuelve el tenant del usuario autenticado desde
-- profiles en vez de depender de un claim personalizado en el JWT.
-- FIX: patrón recomendado sobre el borrador original (claim supabase_tenant_id).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- verificar_suscripcion_activa(): usada por RLS/backend para confirmar que un
-- tenant B2B tiene suscripción vigente antes de exponer funcionalidad premium.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verificar_suscripcion_activa(target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants WHERE id = target_tenant_id AND is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- set_updated_at(): mantiene updated_at sincronizado en cada UPDATE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.casos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expedientes_judiciales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- handle_new_user(): trigger de alta de perfil al registrarse en auth.users.
--
-- Cubre el flujo B2C (ciudadano): crea un tenant personal y un profile con
-- role = 'ciudadano'.
--
-- TODO (B2B): este trigger NO cubre el alta de abogados/firmas. Los usuarios
-- B2B deben unirse a un tenant EXISTENTE (el de su firma) con role =
-- 'abogado_premium', vía un flujo de invitación (p.ej. un invite_token en
-- raw_user_meta_data resuelto contra una tabla de invitaciones pendientes).
-- Mientras esa tabla/flujo no exista, cualquier registro -- incluido el de un
-- abogado invitado -- termina creando un tenant personal nuevo. Implementar
-- antes de habilitar el onboarding B2B multi-usuario.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- prevent_profile_privilege_escalation(): la política RLS de escritura sobre
-- profiles (0005) permite que cada usuario actualice SU PROPIA fila (para
-- persistir workspace_config, full_name, etc). Sin este guardia, esa misma
-- política dejaría a un ciudadano cambiarse a sí mismo role = 'abogado_premium'
-- o moverse a otro tenant_id. Solo el backend (service role, que bypassa RLS y
-- este trigger no aplica) puede modificar role/tenant_id.
-- FIX: gap de seguridad no cubierto por el borrador original.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.role()) = 'authenticated' THEN
    IF new.role IS DISTINCT FROM old.role OR new.tenant_id IS DISTINCT FROM old.tenant_id THEN
      RAISE EXCEPTION 'No autorizado: role y tenant_id solo pueden modificarse por el backend.';
    END IF;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER prevent_profile_privilege_escalation BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
