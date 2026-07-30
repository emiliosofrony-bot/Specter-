// Specter · Tipos de base de datos
//
// Este archivo fue escrito a mano para reflejar exactamente el esquema de
// supabase/migrations/000{1..6}_*.sql, validado localmente contra un
// PostgreSQL 16 real (ver Fase 1). En este entorno la CLI de Supabase
// (`supabase gen types typescript`) requiere un daemon de Docker que no está
// disponible en este sandbox, así que no se pudo invocar el generador real.
//
// En cuanto el proyecto esté enlazado a un proyecto Supabase real, regenera
// este archivo con la fuente de verdad:
//   supabase gen types typescript --project-id <project-ref> > src/types/database.types.ts
// o en local (con Docker disponible):
//   supabase gen types typescript --local > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          is_active: boolean
          is_b2b: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          is_b2b?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          is_b2b?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          role: Database['public']['Enums']['rol_usuario']
          full_name: string | null
          email: string
          workspace_config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          role?: Database['public']['Enums']['rol_usuario']
          full_name?: string | null
          email: string
          workspace_config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          role?: Database['public']['Enums']['rol_usuario']
          full_name?: string | null
          email?: string
          workspace_config?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      casos: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          titulo: string
          descripcion: string | null
          tipo_documento: Database['public']['Enums']['tipo_documento'] | null
          status: Database['public']['Enums']['estado_caso']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          titulo: string
          descripcion?: string | null
          tipo_documento?: Database['public']['Enums']['tipo_documento'] | null
          status?: Database['public']['Enums']['estado_caso']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          titulo?: string
          descripcion?: string | null
          tipo_documento?: Database['public']['Enums']['tipo_documento'] | null
          status?: Database['public']['Enums']['estado_caso']
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'casos_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'casos_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      documentos: {
        Row: {
          id: string
          caso_id: string
          tipo_documento: Database['public']['Enums']['tipo_documento']
          content_markdown: string | null
          pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          caso_id: string
          tipo_documento: Database['public']['Enums']['tipo_documento']
          content_markdown?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          caso_id?: string
          tipo_documento?: Database['public']['Enums']['tipo_documento']
          content_markdown?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_caso_id_fkey'
            columns: ['caso_id']
            isOneToOne: false
            referencedRelation: 'casos'
            referencedColumns: ['id']
          },
        ]
      }
      pagos: {
        Row: {
          id: string
          user_id: string
          caso_id: string | null
          monto_cop: number
          status: Database['public']['Enums']['estado_pago']
          gateway: string | null
          gateway_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          caso_id?: string | null
          monto_cop?: number
          status?: Database['public']['Enums']['estado_pago']
          gateway?: string | null
          gateway_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          caso_id?: string | null
          monto_cop?: number
          status?: Database['public']['Enums']['estado_pago']
          gateway?: string | null
          gateway_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pagos_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_caso_id_fkey'
            columns: ['caso_id']
            isOneToOne: false
            referencedRelation: 'casos'
            referencedColumns: ['id']
          },
        ]
      }
      invitaciones: {
        Row: {
          id: string
          tenant_id: string
          email: string
          role: Database['public']['Enums']['rol_usuario']
          token_hash: string
          invited_by: string | null
          expires_at: string
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          role?: Database['public']['Enums']['rol_usuario']
          token_hash: string
          invited_by?: string | null
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          role?: Database['public']['Enums']['rol_usuario']
          token_hash?: string
          invited_by?: string | null
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitaciones_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitaciones_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      expedientes_judiciales: {
        Row: {
          id: string
          tenant_id: string
          caso_id: string | null
          radicado_23_digitos: string
          despacho_judicial: string | null
          ultima_actuacion: string | null
          fecha_actuacion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          caso_id?: string | null
          radicado_23_digitos: string
          despacho_judicial?: string | null
          ultima_actuacion?: string | null
          fecha_actuacion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          caso_id?: string | null
          radicado_23_digitos?: string
          despacho_judicial?: string | null
          ultima_actuacion?: string | null
          fecha_actuacion?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expedientes_judiciales_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expedientes_judiciales_caso_id_fkey'
            columns: ['caso_id']
            isOneToOne: false
            referencedRelation: 'casos'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      verificar_suscripcion_activa: {
        Args: { target_tenant_id: string }
        Returns: boolean
      }
      hash_invitacion_token: {
        Args: { token: string }
        Returns: string
      }
    }
    Enums: {
      estado_caso: 'draft' | 'in_progress' | 'review' | 'done'
      rol_usuario: 'ciudadano' | 'abogado_premium'
      tipo_documento: 'tutela' | 'peticion' | 'demanda'
      estado_pago: 'pendiente' | 'exitoso' | 'fallido'
    }
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database['public']

export type Tables<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'],
> = PublicSchema['Tables'][PublicTableNameOrOptions]['Row']

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'],
> = PublicSchema['Tables'][PublicTableNameOrOptions]['Insert']

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'],
> = PublicSchema['Tables'][PublicTableNameOrOptions]['Update']

export type Enums<PublicEnumNameOrOptions extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][PublicEnumNameOrOptions]
