-- Specter · Fase 1 · Enums
-- Tipos usados por las tablas de negocio (casos, documentos, pagos).

CREATE TYPE public.estado_caso    AS ENUM ('draft', 'in_progress', 'review', 'done');
CREATE TYPE public.rol_usuario    AS ENUM ('ciudadano', 'abogado_premium');
CREATE TYPE public.tipo_documento AS ENUM ('tutela', 'peticion', 'demanda');
CREATE TYPE public.estado_pago    AS ENUM ('pendiente', 'exitoso', 'fallido');
