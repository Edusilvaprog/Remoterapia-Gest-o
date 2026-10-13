'use server'

import { createClient } from '../supabase/server'
import { getAuthenticatedAluno } from '@/lib/security'
import { cookies } from 'next/headers'

// Política de senha: 12 a 128 caracteres; validação final pelo Supabase Auth
const SENHA_SEGURA_REGEX = /^[\s\S]{12,128}$/

/**
 * Validação da identidade pelo Supabase Auth e perfil vinculado
 */
async function validarSessaoAluno(mensalistaId?: string) {
  const auth = await getAuthenticatedAluno(mensalistaId)
  return auth ? { ok: true, sessionAlunoId: auth.aluno.id } : { ok: false, sessionAlunoId: undefined, error: 'Sessão não autenticada ou conta sem acesso.' }
}

async function hasRecentRecoverySession(auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedAluno>>>): Promise<boolean> {
  try {
    const { data, error } = await auth.supabase.auth.getClaims()
    const claims = data?.claims
    const issuer = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') + '/auth/v1'
    const now = Math.floor(Date.now() / 1000)
    if (
      error || !claims || claims.sub !== auth.user.id || claims.iss !== issuer ||
      claims.role !== 'authenticated' || claims.is_anonymous !== false ||
      typeof claims.session_id !== 'string' || !claims.session_id ||
      typeof claims.exp !== 'number' || claims.exp <= now ||
      !(claims.aud === 'authenticated' || (Array.isArray(claims.aud) && claims.aud.includes('authenticated')))
    ) return false

    return Array.isArray(claims.amr) && claims.amr.some(entry =>
      typeof entry === 'object' && entry !== null && entry.method === 'recovery' &&
      typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp) &&
      entry.timestamp <= now + 30 && now - entry.timestamp <= 15 * 60
    )
  } catch {
    return false
  }
}

export async function getAlunoAtual() {
  const auth = await getAuthenticatedAluno()
  if (!auth) return { ok: false, alunoId: undefined, nome: undefined, precisa_trocar_senha: undefined }
  const c = await cookies()
  const recoveryPending = c.get('redefinir_senha')?.value === '1' && await hasRecentRecoverySession(auth)
  return { ok: true, alunoId: auth.aluno.id as string, nome: auth.aluno.nome as string, precisa_trocar_senha: recoveryPending }
}

export async function requestrecuperacaoAluno(email: string) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: false, error: 'Informe seu e-mail.' }
  const supabase = await createClient()
  const site = process.env.NEXT_PUBLIC_SITE_URL
  if (!site) return { ok: false, error: 'Recuperação indisponível. Fale com a base.' }
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${site}/api/auth/callback?next=redefinir` })
  return { ok: true }
}

export async function loginAluno(loginInput: string, senhaInput: string) {
  if (!loginInput.includes('@')) return { ok: false, error: 'Use o e-mail cadastrado. O acesso por telefone foi substituído pelo login seguro.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: loginInput.trim().toLowerCase(), password: senhaInput })
  if (error) {
    if (process.env.NODE_ENV === 'development') console.warn('[login-portal] auth_failed', { code: error.code, status: error.status })
    return { ok: false, error: error.code === 'invalid_credentials' ? 'E-mail ou senha incorretos.' : 'Não foi possível validar o acesso agora. Tente novamente.' }
  }
  const auth = await getAuthenticatedAluno()
  if (!auth || auth.aluno.bloqueado) {
    if (process.env.NODE_ENV === 'development') console.warn('[login-portal] profile_unavailable')
    await supabase.auth.signOut({ scope: 'local' })
    return { ok: false, error: 'Acesso indisponível para esta conta. Fale com a base.' }
  }
  return { ok: true, precisa_trocar_senha: false, alunoId: auth.aluno.id as string, nome: auth.aluno.nome as string }
}

export async function cadastrarAluno(payload: { nome: string; email: string; telefone: string; cpf?: string; senha: string; termoAceito: boolean }) {
  if (payload.termoAceito !== true || payload.nome.trim().length < 3 || payload.nome.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim()) || !/^\d{10,13}$/.test(payload.telefone.replace(/\D/g,'')) || !SENHA_SEGURA_REGEX.test(payload.senha)) {
    return { ok: false, error: 'Confira nome, e-mail, telefone, aceite dos termos e senha de 12 a 128 caracteres.' }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim().toLowerCase(), password: payload.senha,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/auth/callback`,
      data: { nome: payload.nome.trim(), telefone: payload.telefone.replace(/\D/g,''), cpf: payload.cpf?.replace(/\D/g,''), termo_versao: '2026-10-09', termo_aceito: true } }
  })
  if (error) return { ok: false, error: 'Não foi possível concluir o cadastro. Tente novamente ou recupere seu acesso.' }
  if (!data.session) return { ok: true, requiresEmailConfirmation: true, alunoId: undefined, nome: undefined }
  const auth = await getAuthenticatedAluno()
  if (!auth) return { ok: false, error: 'Cadastro recebido. Confirme o e-mail e entre novamente.' }
  return { ok: true, requiresEmailConfirmation: false, alunoId: auth.aluno.id as string, nome: auth.aluno.nome as string }
}

export async function salvarNovaSenha(mensalistaId: string, novaSenha: string) {
  const auth = await getAuthenticatedAluno(mensalistaId)
  if (!auth || typeof novaSenha !== 'string' || !SENHA_SEGURA_REGEX.test(novaSenha)) {
    return { ok: false, error: 'Sessão válida e senha de 12 a 128 caracteres são necessárias.' }
  }
  if (!await hasRecentRecoverySession(auth)) {
    return { ok: false, error: 'Solicite um novo link de recuperação para redefinir sua senha.' }
  }
  const { error } = await auth.supabase.auth.updateUser({ password: novaSenha })
  if (error) return { ok: false, error: 'Não foi possível alterar a senha.' }
  const c = await cookies(); c.delete('redefinir_senha')
  return { ok: true }
}

export async function carregarPainelAluno(mensalistaId: string) {
  try {
    const auth = await getAuthenticatedAluno(mensalistaId)
    if (!auth || auth.aluno.bloqueado) return { ok: false, error: 'Sessão não autenticada ou conta sem acesso.' }
    const supabase = auth.supabase

    // Projeção explícita: credenciais legadas permanecem inacessíveis.
    const { data: aluno, error: alunoError } = await supabase.from('mensalistas')
      .select('id,nome,email,telefone,tipo_plano,creditos,status_pagamento,data_vencimento,bloqueado,primeiro_acesso,precisa_trocar_senha,avatar,caiaque_vinculado,pendencias,created_at,updated_at,dia_vencimento,tipo_embarcacao,marca_modelo,cor_embarcacao,metodo_pagamento,historico_estornos,plano_valor,plano_dia_venc,plano_descricao,cpf,foto_url,termos_versao,termos_aceitos_em')
      .eq('id', auth.aluno.id).eq('auth_id', auth.user.id).is('arquivado_em', null).single()
    if (alunoError || !aluno) return { ok: false, error: 'Não foi possível carregar seu perfil. Tente novamente.' }

    const { data: catalogoCaiaques, error: caiaquesError } = await supabase.rpc('catalogo_caiaques').order('id', { ascending: true })
    const { data: lockers, error: lockersError } = await supabase.rpc('catalogo_lockers').order('id', { ascending: true })
    const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
    const [futuras, anteriores] = await Promise.all([
      supabase.from('agendamentos').select('*').eq('mensalista_id', auth.aluno.id)
        .gte('data_reserva', hoje).order('data_reserva', { ascending: true }).limit(200),
      supabase.from('agendamentos').select('*').eq('mensalista_id', auth.aluno.id)
        .lt('data_reserva', hoje).order('data_reserva', { ascending: false }).limit(100)
    ])
    const agendamentosError = futuras.error || anteriores.error
    const agendamentos = [...(futuras.data || []), ...(anteriores.data || [])]
    const { data: config, error: configError } = await supabase.from('configuracoes').select('valor')
      .eq('chave', 'tabela_clubes').maybeSingle()
    const { data: diasFechados, error: diasError } = await supabase.from('dias_fechados').select('data')
    if (caiaquesError || lockersError || agendamentosError || configError || diasError) {
      return { ok: false, error: 'Não foi possível carregar o painel. Tente novamente.' }
    }
    return {
      ok: true, aluno,
      caiaques: catalogoCaiaques?.filter((c: { status: string | null }) => c.status === 'livre' || c.status == null) || [],
      lockers, agendamentos, configTabelaClubes: config?.valor,
      diasFechados: diasFechados?.map((d: { data: string }) => d.data) || []
    }
  } catch {
    return { ok: false, error: 'Não foi possível carregar o painel. Tente novamente.' }
  }
}

export async function confirmarAgendamento(payload: {mensalista_id:string;data_reserva:string;horario_reserva?:string;hora_reserva?:string;hora?:string;caiaque_id?:string;locker_id?:string}) {
 const auth=await getAuthenticatedAluno(payload.mensalista_id)
 if(!auth)return {ok:false,error:'Sessão não autorizada.'}
 const {data,error}=await auth.supabase.rpc('reservar_remada',{p_aluno:auth.aluno.id,p_data:payload.data_reserva,p_hora:payload.horario_reserva||payload.hora_reserva||payload.hora,p_caiaque:payload.caiaque_id==='PROPRIO'?null:payload.caiaque_id||null,p_locker:payload.locker_id||null})
 return error||!data?{ok:false,error:error?.message||'Reserva não confirmada.'}:{ok:true}
}

export async function cancelarReserva(agendamentoId:string,mensalistaId:string) {
 const auth=await getAuthenticatedAluno(mensalistaId)
 if(!auth)return {ok:false,error:'Sessão não autorizada.'}
 const {data,error}=await auth.supabase.rpc('transicionar_reserva',{p_id:agendamentoId,p_status:'cancelado'})
 return error||!data?{ok:false,error:error?.message||'Cancelamento não confirmado.'}:{ok:true}
}

export async function logoutAluno() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) return { ok: false, error: 'Não foi possível encerrar a sessão.' }
  const c = await cookies(); c.delete('aluno_id'); c.delete('redefinir_senha')
  return { ok: true }
}

export async function avaliarAgendamento(agendamentoId:string,mensalistaId:string,nota:number,comentario?:string) {
 const auth=await getAuthenticatedAluno(mensalistaId)
 if(!auth||!Number.isInteger(nota)||nota<1||nota>5)return {ok:false,error:'Avaliação ou sessão inválida.'}
 const {error}=await auth.supabase.rpc('avaliar_remada',{p_id:agendamentoId,p_nota:nota,p_comentario:comentario||null})
 return error?{ok:false,error:error.message}:{ok:true}
}

export async function assinarClube(payload: { nome: string; telefone: string; senha?: string; pin?: string; tipo_plano: 'mensalista'|'guardaria'|'combo_mensalista_guardaria'; dia_vencimento: number; metodo_pagamento: 'pix'|'cartao'|'debito'; tipo_embarcacao?: string; marca_modelo?: string; cor_embarcacao?: string }) {
  const auth = await getAuthenticatedAluno()
  if (!auth) return { ok: false, error: 'Entre ou crie uma conta antes de solicitar seu plano.' }
  return { ok: false, error: 'A cobrança de planos precisa ser configurada pela base. Nenhum plano ou crédito foi liberado.' , mensalistaId: undefined }
}

export async function alterarSenhaAluno(mensalistaId: string, senhaAntiga: string, novaSenha: string, confirmaSenha: string) {
  const auth = await getAuthenticatedAluno(mensalistaId)
  if (!auth || !auth.user.email) return { ok: false, error: 'Sessão não autenticada.' }
  if (!SENHA_SEGURA_REGEX.test(novaSenha) || novaSenha !== confirmaSenha || novaSenha === senhaAntiga) return { ok: false, error: 'Confira a nova senha e sua confirmação. Use de 12 a 128 caracteres.' }
  const { error: check } = await auth.supabase.auth.signInWithPassword({ email: auth.user.email, password: senhaAntiga })
  if (check) return { ok: false, error: 'Senha atual incorreta.' }
  const { error } = await auth.supabase.auth.updateUser({ password: novaSenha })
  if (error) return { ok: false, error: 'Não foi possível alterar a senha.' }
  await auth.supabase.auth.signOut({ scope: 'others' })
  return { ok: true }
}

export async function registrarAvaliacaoEstrelas(agendamentoId:string,nota:number) {
 const auth=await getAuthenticatedAluno()
 if(!auth)return {ok:false,error:'Sessão não autorizada.'}
 return avaliarAgendamento(agendamentoId,auth.aluno.id,nota)
}

