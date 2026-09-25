'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { ActionResult, PerfilStaff } from '@/lib/types'

/**
 * Login do staff (admin, dona, instrutor, recepcao, guardaria)
 * Usa Supabase Auth com email + senha
 */
export async function loginStaff(email: string, password: string): Promise<ActionResult<PerfilStaff>> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { ok: false, error: 'Usuário ou senha incorretos.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Falha ao obter usuário.' }

  let { data: perfil } = await supabase
    .from('perfis_staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!perfil && user.email) {
    const { data: perfilEmail } = await supabase
      .from('perfis_staff')
      .select('*')
      .eq('email', user.email)
      .single()

    if (perfilEmail) {
      await supabase.from('perfis_staff').update({ id: user.id }).eq('email', user.email)
      perfil = { ...perfilEmail, id: user.id }
    }
  }

  if (!perfil) {
    const { data: novoPerfil } = await supabase
      .from('perfis_staff')
      .insert({
        id: user.id,
        email: user.email,
        nome: user.email?.split('@')[0].toUpperCase() || 'ADMINISTRADOR',
        role: 'admin',
        status: 'ativo'
      })
      .select()
      .single()
    perfil = novoPerfil
  }

  revalidatePath('/gestao')
  return { ok: true, data: perfil as PerfilStaff }
}

/**
 * Logout do staff
 */
export async function logoutStaff(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/gestao/login')
}

/**
 * Obtém o perfil do usuário logado
 */
export async function getPerfilAtual(): Promise<PerfilStaff | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  let { data } = await supabase
    .from('perfis_staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!data && user.email) {
    const { data: perfilEmail } = await supabase
      .from('perfis_staff')
      .select('*')
      .eq('email', user.email)
      .single()

    if (perfilEmail) {
      await supabase.from('perfis_staff').update({ id: user.id }).eq('email', user.email)
      data = { ...perfilEmail, id: user.id }
    }
  }

  if (data) {
    const roleFinal = data.role || (Array.isArray(data.roles) && data.roles[0]) || 'admin'
    return {
      ...data,
      role: roleFinal,
      ativo: data.ativo !== undefined ? Boolean(data.ativo) : (data.status ? data.status === 'ativo' : true),
      permissions: data.permissions || { qualidadeEmbarque: true, avaria: true }
    } as PerfilStaff
  }

  return null
}

/**
 * Altera senha do staff logado
 */
export async function alterarSenha(novaSenha: string): Promise<ActionResult> {
  if (novaSenha.length < 6) return { ok: false, error: 'Senha deve ter pelo menos 6 caracteres.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Solicita e-mail de recuperação de senha do Supabase
 */
export async function solicitarRecuperacaoSenha(email: string): Promise<ActionResult> {
  const supabase = await createClient()
  // Usa URL absoluta para o redirecionamento funcionar bem no gateway de e-mail do Supabase
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005'}/gestao/redefinir-senha`
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  })
  
  if (error) return { ok: false, error: error.message }
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

  // Cria cliente isolado para não sobrescrever os cookies/sessão do Admin
  const isolatedClient = createServerClient(
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
