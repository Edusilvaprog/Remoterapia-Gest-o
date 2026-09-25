'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  ActionResult, Agendamento, AgendamentoPayload, StatusAgendamento
} from '@/lib/types'
import { registrarAuditoria } from './auditoria'
import crypto from 'node:crypto'

/**
 * Lista agendamentos com filtros opcionais
 */
export async function listarAgendamentos(
  filtros?: {
    data?: string
    status?: StatusAgendamento
    mensalista_id?: string
  }
): Promise<ActionResult<Agendamento[]>> {
  const supabase = await createClient()

  let query = supabase
    .from('agendamentos')
    .select(`
      *,
      mensalista:mensalistas(id, nome, telefone, tipo_plano, creditos, bloqueado),
      caiaque:caiaques(id, nome, tipo, status)
    `)
    .order('data_reserva', { ascending: true })
    .order('horario_reserva', { ascending: true })

  if (filtros?.data)          query = query.eq('data_reserva', filtros.data)
  if (filtros?.status)        query = query.eq('status', filtros.status)
  if (filtros?.mensalista_id) query = query.eq('mensalista_id', filtros.mensalista_id)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data ?? [] }
}

/**
 * Cria agendamento manual (pelo admin/gestão)
 */
export async function criarAgendamento(payload: AgendamentoPayload): Promise<ActionResult<Agendamento>> {
  const supabase = await createClient()

  // Valida se mensalista existe e não está bloqueado
  const { data: mensalista, error: mensErr } = await supabase
    .from('mensalistas')
    .select('id, nome, creditos, bloqueado, tipo_plano')
    .eq('id', payload.mensalista_id)
    .single()

  if (mensErr || !mensalista) return { ok: false, error: 'Mensalista não encontrado.' }
  if (mensalista.bloqueado) return { ok: false, error: 'Cliente bloqueado. Regularize pendências antes de agendar.' }

  // Verifica créditos (apenas para mensalistas clube)
  if (mensalista.tipo_plano === 'mensalista' && mensalista.creditos <= 0) {
    return { ok: false, error: 'Cliente sem créditos disponíveis esta semana.' }
  }

  // Verifica conflito de horário no mesmo caiaque
  if (payload.caiaque_id) {
    const { data: conflito } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('caiaque_id', payload.caiaque_id)
      .eq('data_reserva', payload.data_reserva)
      .eq('horario_reserva', payload.horario_reserva)
      .in('status', ['pendente', 'confirmado'])
      .single()

    if (conflito) return { ok: false, error: 'Caiaque já reservado neste horário.' }
  }

  // Cria o agendamento
  const { data, error } = await supabase
    .from('agendamentos')
    .insert({
      mensalista_id:   payload.mensalista_id,
      mensalista_nome: mensalista.nome,
      caiaque_id:      payload.caiaque_id ?? null,
      data_reserva:    payload.data_reserva,
      horario_reserva: payload.horario_reserva,
      saida:           payload.saida ?? null,
      observacoes:     payload.observacoes ?? null,
      status:          'confirmado',
      criado_por_admin: true,
      manual:          true,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  // Debita crédito (apenas mensalistas clube)
  if (mensalista.tipo_plano === 'mensalista') {
    await supabase
      .from('mensalistas')
      .update({ creditos: mensalista.creditos - 1 })
      .eq('id', payload.mensalista_id)
  }

  await registrarAuditoria(`Agendamento criado para ${mensalista.nome} em ${payload.data_reserva} às ${payload.horario_reserva}.`)
  revalidatePath('/gestao/agendamentos')
  return { ok: true, data }
}

/**
 * Aprova um agendamento pendente
 */
export async function aprovarAgendamento(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: ag } = await supabase.from('agendamentos').select('mensalista_nome, data_reserva').eq('id', id).single()

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'confirmado' })
    .eq('id', id)
    .eq('status', 'pendente')

  if (error) return { ok: false, error: error.message }

  await registrarAuditoria(`Agendamento de ${ag?.mensalista_nome} em ${ag?.data_reserva} APROVADO.`)
  revalidatePath('/gestao/agendamentos')
  return { ok: true }
}

/**
 * Recusa um agendamento pendente
 */
export async function recusarAgendamento(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: ag } = await supabase
    .from('agendamentos')
    .select('mensalista_id, mensalista_nome, data_reserva, mensalista:mensalistas(tipo_plano, creditos)')
    .eq('id', id)
    .single() as any

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'recusado' })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  // Devolve crédito ao mensalista clube
  const mensObj: any = Array.isArray(ag?.mensalista) ? ag.mensalista[0] : ag?.mensalista
  if (ag?.mensalista_id && mensObj?.tipo_plano === 'mensalista') {
    await supabase
      .from('mensalistas')
      .update({ creditos: (mensObj.creditos ?? 0) + 1 })
      .eq('id', ag.mensalista_id)
  }

  await registrarAuditoria(`Agendamento de ${ag?.mensalista_nome} em ${ag?.data_reserva} RECUSADO.`)
  revalidatePath('/gestao/agendamentos')
  return { ok: true }
}

/**
 * Cancela um agendamento (pode ser feito pelo próprio mensalista ou admin)
 */
export async function cancelarAgendamento(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: ag } = await supabase
    .from('agendamentos')
    .select('mensalista_id, mensalista_nome, data_reserva, status, mensalista:mensalistas(tipo_plano, creditos)')
    .eq('id', id)
    .single() as any

  if (!ag) return { ok: false, error: 'Agendamento não encontrado.' }

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'cancelado' })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  // Devolve crédito se estava confirmado
  const mensObj: any = Array.isArray(ag?.mensalista) ? ag.mensalista[0] : ag?.mensalista
  if (ag.status === 'confirmado' && ag.mensalista_id && mensObj?.tipo_plano === 'mensalista') {
    await supabase
      .from('mensalistas')
      .update({ creditos: (mensObj.creditos ?? 0) + 1 })
      .eq('id', ag.mensalista_id)
  }

  await registrarAuditoria(`Agendamento de ${ag.mensalista_nome} em ${ag.data_reserva} CANCELADO.`)
  revalidatePath('/gestao/agendamentos')
  return { ok: true }
}

/**
 * Registra FALTA em um agendamento
 * Aplica multa automática: R$200 para mensalista, R$50 para guardaria
 */
export async function registrarFalta(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: ag } = await supabase
    .from('agendamentos')
    .select(`
      mensalista_id, mensalista_nome, data_reserva,
      mensalista:mensalistas(tipo_plano, pendencias)
    `)
    .eq('id', id)
    .single() as any

  if (!ag) return { ok: false, error: 'Agendamento não encontrado.' }

  // Marca falta
  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'falta' })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  // Lança multa no perfil do mensalista
  if (ag.mensalista_id) {
    const mensObj: any = Array.isArray(ag?.mensalista) ? ag.mensalista[0] : ag?.mensalista
    const tipoPlano = mensObj?.tipo_plano ?? 'mensalista'
    const valorMulta = tipoPlano === 'guardaria' ? 50 : 200
    const pendencias = Array.isArray(mensObj?.pendencias) ? mensObj.pendencias : []
    const novaPendencia = {
      id: crypto.randomUUID(),
      data: new Date().toISOString().split('T')[0],
      valor: valorMulta,
      motivo: `Falta não justificada — agendamento ${ag.data_reserva}`,
      pago: false,
    }

    await supabase
      .from('mensalistas')
      .update({ pendencias: [...pendencias, novaPendencia] })
      .eq('id', ag.mensalista_id)
  }

  await registrarAuditoria(`FALTA registrada para ${ag.mensalista_nome} em ${ag.data_reserva}. Multa lançada.`)
  revalidatePath('/gestao/agendamentos')
  return { ok: true }
}

/**
 * Exclui um agendamento
 */
export async function excluirAgendamento(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: ag } = await supabase.from('agendamentos').select('mensalista_nome, data_reserva').eq('id', id).single()
  const { error } = await supabase.from('agendamentos').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  await registrarAuditoria(`Agendamento de ${ag?.mensalista_nome} em ${ag?.data_reserva} excluído.`)
  revalidatePath('/gestao/agendamentos')
  return { ok: true }
}

/**
 * Obtém dias fechados para bloqueio de calendário
 */
export async function listarDiasFechados(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('dias_fechados').select('data')
  return (data ?? []).map((d: any) => d.data)
}

/**
 * Alterna o estado de um dia (aberto/fechado)
 */
export async function toggleDiaFechado(data: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: existente } = await supabase
    .from('dias_fechados')
    .select('data')
    .eq('data', data)
    .single()

  if (existente) {
    await supabase.from('dias_fechados').delete().eq('data', data)
    await registrarAuditoria(`Dia ${data} ABERTO para agendamentos.`)
  } else {
    await supabase.from('dias_fechados').insert({ data })
    await registrarAuditoria(`Dia ${data} FECHADO para agendamentos.`)
  }

  revalidatePath('/gestao/agendamentos')
  return { ok: true }
}

export async function cancelarDiaPorClima(data: string, motivo: string, recadoTexto?: string): Promise<ActionResult> {
  const supabase = await createClient()

  // 1. Bloqueia a data na tabela dias_fechados
  await supabase.from('dias_fechados').upsert({
    data,
    motivo: recadoTexto || `Cancelamento por motivo climático: ${motivo}`,
    tipo_bloqueio: 'clima'
  })

  // 2. Busca agendamentos ativos na data
  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('id, mensalista_id, status, mensalista:mensalistas(id, creditos, tipo_plano)')
    .eq('data_reserva', data)
    .in('status', ['confirmado', 'pendente'])

  if (agendamentos && agendamentos.length > 0) {
    for (const ag of agendamentos) {
      await supabase
        .from('agendamentos')
        .update({
          status: 'cancelado_clima',
          motivo_cancelamento: motivo,
          observacoes: recadoTexto || `Suspensão preventiva: ${motivo}`
        })
        .eq('id', ag.id)

      // Devolve cota internamente no banco de dados para o mensalista
      const mensalistaObj: any = Array.isArray(ag.mensalista) ? ag.mensalista[0] : ag.mensalista
      if (ag.mensalista_id && mensalistaObj?.tipo_plano === 'mensalista') {
        const novosCreditos = (mensalistaObj?.creditos ?? 0) + 1
        await supabase
          .from('mensalistas')
          .update({ creditos: novosCreditos })
          .eq('id', ag.mensalista_id)
      }
    }
  }

  await registrarAuditoria(`Dia ${data} suspenso por clima (${motivo}). ${agendamentos?.length || 0} agendamentos cancelados.`)
  revalidatePath('/gestao/agendamentos')
  return { ok: true }
}
