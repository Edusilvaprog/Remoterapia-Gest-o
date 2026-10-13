'use server'

import {localPreviewEnabled,createLocalPreviewClient} from '@/lib/local-preview-client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { configuredAppOrigin, hasRecentRecoverySession } from '@/lib/auth-recovery'
import { ActionResult, PerfilStaff } from '@/lib/types'

/**
 * Login do staff (admin, dona, instrutor, recepcao, guardaria)
 * Usa Supabase Auth com email + senha
 */
export async function loginStaff(email: string, password: string): Promise<ActionResult<PerfilStaff>> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) {
    if (process.env.NODE_ENV === 'development') console.warn('[login-gestao] auth_failed', { code: error.code, status: error.status })
    return { ok: false, error: error.code === 'invalid_credentials' ? 'Usuário ou senha incorretos.' : 'Não foi possível validar o acesso agora. Tente novamente.' }
  }
  const perfil = await getPerfilAtual()
  if (!perfil) {
    if (process.env.NODE_ENV === 'development') console.warn('[login-gestao] profile_unavailable')
    await supabase.auth.signOut({ scope: 'local' })
    return { ok: false, error: 'Esta conta não possui acesso à equipe.' }
  }
  revalidatePath('/gestao')
  return { ok: true, data: perfil }
}

export async function logoutStaff(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/gestao/login')
}

/**
 * Obtém o perfil do usuário logado
 */
export async function getPerfilAtual(): Promise<PerfilStaff | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    if (process.env.NODE_ENV === 'development' && error && error.name !== 'AuthSessionMissingError') console.warn('[sessao-gestao] validation_failed', { code: error.code, status: error.status })
    return null
  }
  const { data, error: profileError } = await supabase.from('perfis_staff').select('*').eq('id', user.id).eq('ativo', true).maybeSingle()
  if (process.env.NODE_ENV === 'development' && profileError) console.warn('[sessao-gestao] profile_failed', { code: profileError.code })
  if (!data || !data.ativo || !['admin','dona','instrutor','recepcao','guardaria'].includes(data.role)) return null
  return data as PerfilStaff
}

export async function alterarSenha(novaSenha: string): Promise<ActionResult> {
  if (typeof novaSenha !== 'string' || novaSenha.length < 12 || novaSenha.length > 128) return { ok: false, error: 'Use uma senha de 12 a 128 caracteres.' }
  const perfil = await getPerfilAtual()
  if (!perfil) return { ok: false, error: 'Sessão não autenticada.' }
  const supabase = await createClient()
  if (!await hasRecentRecoverySession(supabase, perfil.id)) return { ok: false, error: 'Solicite um novo link de recuperação para alterar a senha.' }
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) return { ok: false, error: 'Não foi possível alterar a senha. Solicite um novo link.' }
  await supabase.auth.signOut({ scope: 'global' })
  return { ok: true }
}

export async function solicitarRecuperacaoSenha(email: string): Promise<ActionResult> {
  const origin = configuredAppOrigin()
  if (!origin) return { ok: false, error: 'A recuperação de senha ainda não está configurada.' }
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: true }
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: origin + '/api/auth/callback' })
  if (error) return { ok: false, error: 'Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.' }
  return { ok: true }
}

/**
 * Cria um novo usuário de staff
 * Apenas admin/dona pode executar
 */
export async function criarStaff(
  email: string,
  password: string,
  nome: string,
  role: string
): Promise<ActionResult<PerfilStaff>> {
  const supabase = await createClient()

  // Verifica se quem está executando é admin
  const perfil = await getPerfilAtual()
  if (!perfil || !['admin', 'dona'].includes(perfil.role)) {
    return { ok: false, error: 'Sem permissão para criar usuários.' }
  }

  if (!['admin','dona','instrutor','recepcao','guardaria'].includes(role) || password.length < 12) return { ok: false, error: 'Papel ou senha inválidos.' }

  // Cria cliente isolado para não sobrescrever os cookies/sessão do Admin
  const isolatedClient = localPreviewEnabled() ? createLocalPreviewClient() : createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {}
      }
    }
  )

  const { data, error } = await isolatedClient.auth.signUp({
    email,
    password,
    options: {
      data: { nome, role }
    }
  })

  if (error) return { ok: false, error: error.message }
  if (!data.user) return { ok: false, error: 'Falha ao criar usuário.' }

  // Upsert seguro para garantir persistência mesmo se o trigger do auth não tiver disparado
  const { data: perfilCriado, error: updateError } = await supabase
    .from('perfis_staff')
    .upsert({
      id: data.user.id,
      email,
      nome,
      role,
      ativo: true
    })
    .select()
    .single()

  if (updateError) return { ok: false, error: updateError.message }

  revalidatePath('/gestao/admin')
  return { ok: true, data: perfilCriado }
}

/**
 * Lista todos os usuários de staff
 */
export async function listarStaff(): Promise<ActionResult<PerfilStaff[]>> {
  const perfil = await getPerfilAtual()
  if (!perfil || !['admin','dona'].includes(perfil.role)) return { ok: false, error: 'Sem permissão.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfis_staff')
    .select('*')
    .order('nome')

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data ?? [] }
}

/**
 * Atualiza permissões de um usuário de staff
 */
export async function atualizarPermissoesStaff(
  staffId: string,
  permissions: { qualidadeEmbarque: boolean; avaria: boolean }
): Promise<ActionResult> {
  const perfil = await getPerfilAtual()
  if (!perfil || !['admin','dona'].includes(perfil.role)) return { ok: false, error: 'Sem permissão.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('perfis_staff')
    .update({ permissions })
    .eq('id', staffId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/gestao/admin')
  return { ok: true }
}

/**
 * Desativa um usuário de staff (não deleta, apenas marca como inativo)
 */
export async function desativarStaff(staffId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const perfil = await getPerfilAtual()

  if (!perfil || !['admin', 'dona'].includes(perfil.role)) {
    return { ok: false, error: 'Sem permissão.' }
  }
  if (perfil.id === staffId) {
    return { ok: false, error: 'Você não pode desativar sua própria conta.' }
  }

  const { error } = await supabase
    .from('perfis_staff')
    .update({ ativo: false })
    .eq('id', staffId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/gestao/admin')
  return { ok: true }
}

/** Desativa somente o acesso à equipe; preserva identidade e dados do aluno. */
export async function definirAcessoStaff(staffId: string, ativo: boolean): Promise<ActionResult> {
  const perfil = await getPerfilAtual()
  if (!perfil || !['admin','dona'].includes(perfil.role)) return { ok: false, error: 'Sem permissão para gerenciar acessos.' }
  if (typeof ativo !== 'boolean' || typeof staffId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffId)) return { ok: false, error: 'Acesso inválido.' }
  if (!ativo && staffId === perfil.id) return { ok: false, error: 'Você não pode desativar seu próprio acesso administrativo.' }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('perfis_staff').update({ ativo }).eq('id', staffId).select('id').maybeSingle()
    if (error || !data) return { ok: false, error: 'A alteração do acesso não foi confirmada.' }
    revalidatePath('/gestao/admin')
    return { ok: true }
  } catch { return { ok: false, error: 'Não foi possível atualizar o acesso.' } }
}
