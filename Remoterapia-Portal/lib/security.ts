import 'server-only'
import { createClient } from './supabase/server'

export async function getAuthenticatedAluno(expectedId?: string) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    if (process.env.NODE_ENV === 'development' && error && error.name !== 'AuthSessionMissingError') console.warn('[sessao-portal] validation_failed', { code: error.code, status: error.status })
    return null
  }
  const { data: aluno, error: profileError } = await supabase.from('mensalistas')
    .select('id,nome,email,telefone,tipo_plano,bloqueado,precisa_trocar_senha')
    .eq('auth_id', user.id).is('arquivado_em', null).maybeSingle()
  if (process.env.NODE_ENV === 'development' && profileError) console.warn('[sessao-portal] profile_failed', { code: profileError.code })
  if (!aluno || (expectedId && expectedId !== aluno.id)) return null
  return { supabase, user, aluno }
}
