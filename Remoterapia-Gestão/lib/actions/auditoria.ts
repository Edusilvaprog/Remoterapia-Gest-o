'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Registra uma ação no log de auditoria
 */
export async function registrarAuditoria(acao: string): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    let usuario = 'Sistema'
    let created_by = null
    
    if (user) {
      const { data: perfil } = await supabase
        .from('perfis_staff')
        .select('nome')
        .eq('id', user.id)
        .single()
        
      if (perfil) {
        usuario = perfil.nome
        created_by = user.id
      }
    }

    await supabase.from('auditoria').insert({
      acao,
      usuario,
      created_by
    })
  } catch (error) {
    console.error('Falha ao registrar auditoria:', error)
  }
}

/**
 * Lista as últimas ações da auditoria
 */
export async function listarAuditoria(limit = 100) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('auditoria')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
    
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data ?? [] }
}
