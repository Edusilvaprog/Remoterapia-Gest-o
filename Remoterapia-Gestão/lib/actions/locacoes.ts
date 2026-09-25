'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ActionResult, Locacao, CheckinPayload, HistoricoLocacao } from '@/lib/types'
import { registrarAuditoria } from './auditoria'

/**
 * Lista locações ativas (pessoas na água)
 */
export async function listarLocacoesAtivas(): Promise<ActionResult<Locacao[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locacoes')
    .select('*')
    .in('status', ['ativo', 'retornando'])
    .order('entrada', { ascending: false })
    
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data ?? [] }
}

/**
 * Realiza o Check-in (envia cliente para a água)
 */
export async function realizarCheckin(payload: CheckinPayload): Promise<ActionResult<Locacao>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Marca caiaques como 'em_uso'
  if (payload.caiaques_ids.length > 0) {
    const { error: errCaiaques } = await supabase
      .from('caiaques')
      .update({ status: 'em_uso' })
      .in('id', payload.caiaques_ids)
    if (errCaiaques) return { ok: false, error: 'Erro ao reservar caiaques.' }
  }

  // 2. Marca lockers como 'Ocupado'
  if (payload.lockers_ids && payload.lockers_ids.length > 0) {
    const { error: errLockers } = await supabase
      .from('lockers')
      .update({ status: 'Ocupado' })
      .in('id', payload.lockers_ids)
    if (errLockers) return { ok: false, error: 'Erro ao reservar lockers.' }
  }

  // 3. Atualiza Agendamento (se houver)
  if (payload.agendamento_id) {
    await supabase
      .from('agendamentos')
      .update({ status: 'concluido' })
      .eq('id', payload.agendamento_id)
  }

  // 4. Cria a Locação
  const { data, error } = await supabase
    .from('locacoes')
    .insert({
      cliente: payload.cliente,
      telefone: payload.telefone ?? null,
      rg: payload.rg ?? null,
      tipo: payload.tipo,
      mensalista_id: payload.mensalista_id ?? null,
      caiaques_ids: payload.caiaques_ids,
      lockers_ids: payload.lockers_ids ?? [],
      com_instrutor: payload.com_instrutor,
      instrutor_agua: payload.instrutor_agua || payload.instrutor_nome || null,
      pagamento: payload.pagamento ?? null,
      qtd_pessoas: payload.qtd_pessoas ?? 1,
      valor_final: payload.valor_final ?? null,
      agendamento_id: payload.agendamento_id ?? null,
      created_by: user?.id ?? null,
      status: 'ativo'
    })
    .select()
    .single()

  if (error) {
    // Rollback manual (compensação) omitido para simplificação, mas idealmente seria tratado via RPC ou compensação
    return { ok: false, error: error.message }
  }

  await registrarAuditoria(`Embarque: ${payload.cliente} (${payload.caiaques_ids.join(', ')})`)
  revalidatePath('/gestao')
  return { ok: true, data }
}

/**
 * Marca locação como Retornando
 */
export async function marcarRetorno(locacaoId: string): Promise<ActionResult> {
  const supabase = await createClient()
  
  const { data: loc } = await supabase.from('locacoes').select('cliente, caiaques_ids').eq('id', locacaoId).single()
  
  const { error } = await supabase
    .from('locacoes')
    .update({ status: 'retornando' })
    .eq('id', locacaoId)
    
  if (error) return { ok: false, error: error.message }
  
  await registrarAuditoria(`Retorno visualizado: ${loc?.cliente} (${loc?.caiaques_ids.join(', ')})`)
  revalidatePath('/gestao')
  return { ok: true }
}

/**
 * Finaliza Locação (Check-out)
 */
export async function realizarCheckout(
  locacaoId: string, 
  valorPago: number, 
  metodoPagamento: string, 
  observacoes?: string
): Promise<ActionResult> {
  const supabase = await createClient()
  
  // Busca locação atual
  const { data: loc, error: errLoc } = await supabase
    .from('locacoes')
    .select('*')
    .eq('id', locacaoId)
    .single()
    
  if (errLoc || !loc) return { ok: false, error: 'Locação não encontrada.' }
  
  const saidaStr = new Date().toISOString()

  // 1. Libera Caiaques ou marca como inoperante/manutencao
  if (loc.caiaques_ids && loc.caiaques_ids.length > 0) {
    if (observacoes?.includes('[INOPERANTE]')) {
      await supabase.from('caiaques').update({ status: 'manutencao' }).in('id', loc.caiaques_ids)
    } else {
      await supabase.from('caiaques').update({ status: 'livre' }).in('id', loc.caiaques_ids)
    }
  }

  // 2. Libera Lockers
  if (loc.lockers_ids && loc.lockers_ids.length > 0) {
    await supabase.from('lockers').update({ status: 'Livre', locacao_id: null }).in('id', loc.lockers_ids)
  }

  // 3. Atualiza Locação original
  const { error: updErr } = await supabase
    .from('locacoes')
    .update({ 
      status: 'finalizado', 
      saida: saidaStr, 
      valor_final: valorPago,
      pagamento: metodoPagamento,
      observacoes: observacoes ?? null
    })
    .eq('id', locacaoId)
    
  if (updErr) return { ok: false, error: updErr.message }

  // 4. Cria registro no Histórico
  const duracaoMs = new Date(saidaStr).getTime() - new Date(loc.entrada).getTime()
  const duracaoMin = Math.round(duracaoMs / 60000)
  
  // Lógica simplificada de atraso (exemplo: tolerância de 5 min sobre 60 min previstos)
  // O sistema original tinha cálculo complexo de taxa. Aqui mantemos o slot para o valor final validado.
  const atrasoMin = Math.max(0, duracaoMin - 60) // Assumindo locações de 1h como base

  const { error: histErr } = await supabase
    .from('historico_locacoes')
    .insert({
      locacao_id: loc.id,
      cliente: loc.cliente,
      tipo: loc.tipo,
      mensalista_id: loc.mensalista_id,
      caiaques_ids: loc.caiaques_ids,
      entrada: loc.entrada,
      saida: saidaStr,
      duracao_min: duracaoMin,
      valor: valorPago,
      pagamento: metodoPagamento,
      com_instrutor: loc.com_instrutor,
      atraso_min: atrasoMin,
      taxa_atraso: 0 // Simplificado
    })

  await registrarAuditoria(`Desembarque finalizado: ${loc.cliente} (${duracaoMin} min)`)
  revalidatePath('/gestao')
  return { ok: true }
}

/**
 * Cancela uma locação ativa (ex: cliente desistiu antes de entrar na água)
 */
export async function cancelarLocacao(locacaoId: string): Promise<ActionResult> {
  const supabase = await createClient()
  
  const { data: loc } = await supabase.from('locacoes').select('cliente, caiaques_ids, lockers_ids').eq('id', locacaoId).single()
  if (!loc) return { ok: false, error: 'Não encontrada.' }

  // Libera Caiaques
  if (loc.caiaques_ids && loc.caiaques_ids.length > 0) {
    await supabase.from('caiaques').update({ status: 'livre' }).in('id', loc.caiaques_ids)
  }

  // Libera Lockers
  if (loc.lockers_ids && loc.lockers_ids.length > 0) {
    await supabase.from('lockers').update({ status: 'Livre', locacao_id: null }).in('id', loc.lockers_ids)
  }

  const { error } = await supabase
    .from('locacoes')
    .update({ status: 'cancelado', saida: new Date().toISOString() })
    .eq('id', locacaoId)

  if (error) return { ok: false, error: error.message }
  
  await registrarAuditoria(`Locação cancelada: ${loc.cliente}`)
  revalidatePath('/gestao')
  return { ok: true }
}
