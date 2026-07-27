-- Specter · Fase 1 · Row Level Security
--
-- FIX crítico (borrador original): una política `FOR ALL` con solo `USING`
-- no restringe INSERT/UPDATE — únicamente filtra qué filas son visibles/
-- afectables por el SELECT/UPDATE/DELETE implícitos. Sin `WITH CHECK`, un
-- cliente autenticado podía insertar o actualizar filas con tenant_id/user_id
-- ajenos, porque el chequeo solo se aplica a filas ya existentes. Toda
-- política de escritura de este archivo trae su propio WITH CHECK.
--
-- FIX crítico (pagos): el cliente NUNCA puede crear ni marcar un pago como
-- 'exitoso'. Solo se expone SELECT al dueño; la creación y el cambio de
-- status los hace el backend confiable (webhook de Mercado Pago vía
-- service role, que bypassa RLS por diseño) — ver Fase 4.
--
-- Aislamiento por tenant vía public.current_tenant_id() (resuelto desde
-- profiles), no vía claim JWT personalizado.

ALTER TABLE public.tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedientes_judiciales ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- tenants: un usuario solo puede ver el tenant al que pertenece. Sin política
-- de escritura -> INSERT/UPDATE/DELETE quedan denegados por defecto para
-- `authenticated`; is_active y el alta de tenants los gestiona el backend
-- (service role) durante el signup (trigger) y la facturación.
-- ---------------------------------------------------------------------------
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
  USING (id = public.current_tenant_id());

-- ---------------------------------------------------------------------------
-- profiles: aislado por id = auth.uid() en lectura y escritura. La
-- inmutabilidad de role/tenant_id la refuerza el trigger
-- prevent_profile_privilege_escalation (0004), no esta política.
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_write ON public.profiles FOR ALL TO authenticated
  USING     (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- casos: aislado por tenant en lectura; en escritura además exige que el
-- usuario sea el dueño del caso (user_id = auth.uid()).
-- ---------------------------------------------------------------------------
CREATE POLICY casos_select ON public.casos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY casos_write ON public.casos FOR ALL TO authenticated
  USING     (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id() AND user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- documentos: no tiene tenant_id propio; se acota vía el caso al que
-- pertenece. Lectura: el caso debe ser del tenant del usuario. Escritura:
-- además el caso debe ser del propio usuario (mismo criterio que casos_write).
-- ---------------------------------------------------------------------------
CREATE POLICY documentos_select ON public.documentos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.casos c
      WHERE c.id = documentos.caso_id
        AND c.tenant_id = public.current_tenant_id()
    )
  );

CREATE POLICY documentos_write ON public.documentos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.casos c
      WHERE c.id = documentos.caso_id
        AND c.tenant_id = public.current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.casos c
      WHERE c.id = documentos.caso_id
        AND c.tenant_id = public.current_tenant_id()
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- pagos: SOLO SELECT para el dueño. Sin política de escritura -> INSERT/
-- UPDATE/DELETE denegados por defecto para `authenticated`. La creación del
-- registro 'pendiente' y la transición a 'exitoso'/'fallido' las hace
-- exclusivamente el webhook de Mercado Pago corriendo con service role
-- (Fase 4), que bypassa RLS.
-- ---------------------------------------------------------------------------
CREATE POLICY pagos_select ON public.pagos FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- expedientes_judiciales: solo lectura para miembros del tenant (panel de
-- vigilancia B2B). Sin política de escritura -> el alta/actualización de
-- radicados los hace el backend (integración de monitoreo judicial) con
-- service role, nunca el cliente.
-- ---------------------------------------------------------------------------
CREATE POLICY expedientes_select ON public.expedientes_judiciales FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
