import { supabase } from '@/lib/supabaseClient'

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string,
  // Token de invitación B2B (opcional). El trigger handle_new_user (0008) lo
  // lee de raw_user_meta_data: si es válido y corresponde a este correo, une al
  // usuario al tenant de la firma como abogado_premium en vez de crearle un
  // tenant personal. Un token inválido/expirado hace fallar el registro.
  inviteToken?: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: inviteToken ? { full_name: fullName, invite_token: inviteToken } : { full_name: fullName },
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
