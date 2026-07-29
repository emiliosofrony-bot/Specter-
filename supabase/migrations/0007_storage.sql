-- Specter · Fase 3 · Storage privado para PDFs generados
--
-- src/api/documentos.ts lee documentos.pdf_url como la KEY de un objeto en
-- este bucket, nunca como URL pública, y siempre pide una signed URL de
-- corta duración. Este archivo crea el bucket y las políticas que lo hacen
-- cierto también a nivel de base de datos.

-- FIX: public = false. Un bucket público haría que cualquiera con la key del
-- objeto (adivinable o filtrada en logs) pudiera leer un documento legal
-- ajeno, sin pasar por RLS ni por signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-privados', 'documentos-privados', false)
ON CONFLICT (id) DO NOTHING;

-- Convención de rutas: <caso_id>/<documento_id>.pdf
-- El primer segmento del path identifica el caso, lo que permite acotar el
-- acceso por tenant reutilizando el mismo criterio que documentos_select
-- (0005_rls.sql) sin duplicar lógica de negocio.
CREATE POLICY documentos_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-privados'
    AND EXISTS (
      SELECT 1 FROM public.casos c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.tenant_id = public.current_tenant_id()
    )
  );

-- FIX: no se crean políticas de INSERT/UPDATE/DELETE para `authenticated`.
-- Los PDFs los sube exclusivamente el backend (n8n / Edge Functions con
-- service role, que bypassa RLS) tras generar el documento. Un cliente que
-- pudiera escribir en este bucket podría sustituir el PDF de un documento ya
-- pagado por contenido arbitrario.
