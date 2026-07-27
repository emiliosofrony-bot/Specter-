-- Specter · Fase 1 · Índices

CREATE INDEX idx_profiles_tenant_id     ON public.profiles              USING btree (tenant_id);
CREATE INDEX idx_casos_tenant_id        ON public.casos                 USING btree (tenant_id);
CREATE INDEX idx_casos_user_id          ON public.casos                 USING btree (user_id);
CREATE INDEX idx_documentos_caso_id     ON public.documentos            USING btree (caso_id);   -- FIX: faltaba
CREATE INDEX idx_pagos_user_id          ON public.pagos                 USING btree (user_id);   -- FIX: faltaba
CREATE INDEX idx_pagos_caso_id          ON public.pagos                 USING btree (caso_id);
CREATE INDEX idx_expedientes_tenant_id  ON public.expedientes_judiciales USING btree (tenant_id);
CREATE INDEX idx_expedientes_caso_id    ON public.expedientes_judiciales USING btree (caso_id);
