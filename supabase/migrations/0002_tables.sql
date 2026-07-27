-- Specter · Fase 1 · Tablas
-- tenants, profiles, casos, documentos, pagos, expedientes_judiciales

CREATE TABLE public.tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  is_b2b      boolean NOT NULL DEFAULT false, -- FIX: distingue tenants personales (B2C) de firmas (B2B)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenants IS 'Cada ciudadano B2C recibe un tenant personal al registrarse; las firmas B2B comparten un tenant multi-usuario.';

CREATE TABLE public.profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  role              public.rol_usuario NOT NULL DEFAULT 'ciudadano',
  full_name         text,
  email             text NOT NULL,
  -- FIX: alimenta los sliders del workspace (nivel_investigacion, enfoque) y el modo oscuro por defecto
  workspace_config  jsonb NOT NULL DEFAULT '{"is_dark_mode": true, "nivel_investigacion": 50, "enfoque": "B2C"}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.casos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  descripcion     text,
  tipo_documento  public.tipo_documento,
  status          public.estado_caso NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documentos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id           uuid NOT NULL REFERENCES public.casos (id) ON DELETE CASCADE,
  tipo_documento    public.tipo_documento NOT NULL,
  content_markdown  text,
  -- FIX: nunca una URL pública; es la key de un objeto en un bucket privado de Storage.
  -- El frontend obtiene acceso mediante signed URLs de corta duración generadas server-side.
  pdf_url           text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pagos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  caso_id             uuid REFERENCES public.casos (id) ON DELETE SET NULL,
  monto_cop           numeric(12, 2) NOT NULL DEFAULT 14900.00,
  status              public.estado_pago NOT NULL DEFAULT 'pendiente',
  -- FIX: agnóstico a la pasarela para no acoplar el esquema a un proveedor; Fase 4 cablea Mercado Pago.
  gateway             text,
  gateway_reference   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expedientes_judiciales (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  caso_id                   uuid REFERENCES public.casos (id) ON DELETE SET NULL,
  -- FIX: radicado único nacional de la Rama Judicial, siempre 23 dígitos.
  radicado_23_digitos       varchar(23) NOT NULL CHECK (length(radicado_23_digitos) = 23),
  despacho_judicial         text,
  ultima_actuacion          text,
  fecha_actuacion           date,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, radicado_23_digitos)
);
