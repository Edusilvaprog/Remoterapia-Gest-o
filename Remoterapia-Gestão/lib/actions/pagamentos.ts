'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResult } from '@/lib/types'
import { registrarAuditoria } from './auditoria'

export interface DadosNascerDoSol {
  nome: string
  telefone: string
  data: string
  quantidade_pessoas: number
  caiaque_tipo: 'individual' | 'duplo'
}

/**
 * Cria o agendamento e gera link de pagamento (Gateway genérico preparado)
 */
export async function agendarNascerDoSol(dados: DadosNascerDoSol): Promise<ActionResult<{ link_pagamento: string }>> {
  const supabase = await createClient()

  // 1. O Nascer do Sol usa a tabela de Agendamentos (cliente avulso, não vinculado a mensalista_id fixo)
  // Como a regra de negócio pede, o Nascer do Sol é uma locação futura.
  // Vamos registrar isso na tabela de 'agendamentos' mas sem 'mensalista_id' obrigatório, 
  // usando o campo 'mensalista_nome' e 'observacoes' para rastrear.

  const { data: agendamento, error } = await supabase
    .from('agendamentos')
    .insert({
      mensalista_nome: dados.nome,
      data_reserva: dados.data,
      horario_reserva: '05:00', // Horário base padrão do Nascer do Sol
      status: 'pendente', // Só confirma após pagamento
      observacoes: `[NASCER DO SOL] Tel: ${dados.telefone} | Qtd: ${dados.quantidade_pessoas} | Tipo: ${dados.caiaque_tipo}`
    })
    .select()
    .single()

  if (error) return { ok: false, error: 'Erro ao registrar pré-agendamento: ' + error.message }

  // 2. Integração com Gateway de Pagamento (Mercado Pago, Stripe, etc)
  // AQUI ENTRA A INTEGRAÇÃO FUTURA. O sistema gera um link e retorna.
  // Exemplo simulado:
  const valorUnitario = dados.caiaque_tipo === 'duplo' ? 120 : 60
  const valorTotal = valorUnitario * dados.quantidade_pessoas
  const linkPagamentoSimulado = `https://pagamento.exemplo.com/checkout?ref=${agendamento.id}&v=${valorTotal}`

  await registrarAuditoria(`Agendamento Nascer do Sol (Pendente Pgto): ${dados.nome} em ${dados.data}`)

  return { 
    ok: true, 
    data: { link_pagamento: linkPagamentoSimulado } 
  }
}

/**
 * Webhook simulado de confirmação de pagamento
 */
export async function confirmarPagamentoNascerDoSol(agendamentoId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'confirmado' })
    .eq('id', agendamentoId)
    .like('observacoes', '%[NASCER DO SOL]%')

  if (error) return { ok: false, error: error.message }

  await registrarAuditoria(`Pagamento APROVADO para o Nascer do Sol (ID: ${agendamentoId})`)
  return { ok: true }
}

export async function fecharCaixa(): Promise<ActionResult> {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]
  
  const { data: locacoes } = await supabase
    .from('locacoes')
    .select('pagamento, valor_final')
    .eq('status', 'finalizado')
    .gte('entrada', `${hoje}T00:00:00`)

  if (!locacoes || locacoes.length === 0) {
    return { ok: false, error: 'Não há locações finalizadas hoje para fechar o caixa.' }
  }

  let pix = 0
  let cartao = 0
  let dinheiro = 0
  let pendente = 0

  locacoes.forEach(loc => {
    const val = loc.valor_final || 0
    if (loc.pagamento === 'Pix') pix += val
    else if (loc.pagamento === 'Dinheiro') dinheiro += val
    else if (loc.pagamento === 'Pendente') pendente += val
    else cartao += val // engloba todos os cartões
  })

  const total = pix + cartao + dinheiro

  // Supondo que a tabela "fechamentos_caixa" exista:
  await supabase.from('fechamentos_caixa').insert({
      data_fechamento: hoje,
      total,
      visitantes: locacoes.length,
      detalhes: { Pix: pix, Cartao: cartao, Dinheiro: dinheiro, Pendente: pendente }
  })
  
  await registrarAuditoria(`Caixa fechado. Total Recebido: R$${total.toFixed(2)}`)
  return { ok: true }
}
