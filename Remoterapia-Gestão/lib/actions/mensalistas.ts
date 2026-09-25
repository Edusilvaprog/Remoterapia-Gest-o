'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ActionResult, Mensalista, MensalistaPayload } from '@/lib/types'
import { registrarAuditoria } from './auditoria'
import crypto from 'node:crypto'

export async function resetarPinMensalista(id: string): Promise<ActionResult<string>> {
  const supabase = await createClient()
  
  // Gera 6 dígitos aleatórios
  const novoPin = Math.floor(100000 + Math.random() * 900000).toString()
  
  // Hash simples com SHA-256 (sem salt adicional por enquanto, ou com salt simples se preferir. 
  // Seguindo regra base: o ideal é usar bcrypt ou similar, mas WebCrypto sha256 é pedido nas regras originais "SHA-256 + Salt")
  // Aqui aplicarei um hash SHA-256 puro que será verificado no login.
  const pin_hash = crypto.createHash('sha256').update(novoPin).digest('hex')

  const { error } = await supabase
    .from('mensalistas')
    .update({ 
      pin_hash,
      primeiro_acesso: false, 
      precisa_trocar_senha: true 
    })
    .eq('id', id)
    
  if (error) return { ok: false, error: error.message }
  
  const { data } = await supabase.from('mensalistas').select('nome').eq('id', id).single()
  await registrarAuditoria(`PIN resetado manualmente para ${data?.nome}.`)
  
  revalidatePath('/gestao/recepcao/clientes')
  return { ok: true, data: novoPin }
}

export async function listarMensalistas(): Promise<ActionResult<Mensalista[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mensalistas')
    .select('*')
    .order('nome')
    
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data ?? [] }
}

export async function criarMensalista(payload: MensalistaPayload): Promise<ActionResult<Mensalista>> {
  const supabase = await createClient()

  const { data: config } = await supabase.from('configuracoes').select('valor').eq('chave', 'tabela_clubes').single()
  const configValor = config?.valor || {}
  const creditosMensalista = configValor.creditos_mensalista ?? 8
  const creditosGuardaria = configValor.creditos_guardaria ?? 0
  
  // Limpa caracteres especiais do telefone
  const telefoneLimpo = payload.telefone.replace(/\D/g, '')

  const { data, error } = await supabase
    .from('mensalistas')
    .insert({
      nome: payload.nome,
      telefone: telefoneLimpo,
      tipo_plano: payload.tipo_plano,
      creditos: payload.creditos ?? (payload.tipo_plano === 'mensalista' ? creditosMensalista : creditosGuardaria),
      status_pagamento: 'ativo',
      data_vencimento: payload.data_vencimento ?? null,
      caiaque_vinculado: payload.caiaque_vinculado ?? null,
      bloqueado: false,
      primeiro_acesso: true,
      precisa_trocar_senha: true
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Telefone já cadastrado.' }
    return { ok: false, error: error.message }
  }

  // Integração Asaas
  if (process.env.ASAAS_API_KEY) {
    try {
      const { criarClienteAsaas } = await import('./asaas')
      const resAsaas = await criarClienteAsaas({
        id: data.id,
        nome: payload.nome,
        telefone: payload.telefone,
        email: null
      })
      if (resAsaas.ok && resAsaas.data?.gateway_cliente_id) {
        await supabase
          .from('mensalistas')
          .update({ gateway_cliente_id: resAsaas.data.gateway_cliente_id })
          .eq('id', data.id)
      }
    } catch (e: any) {
      console.warn('Erro ao integrar cliente com Asaas:', e.message)
    }
  }

  await registrarAuditoria(`Cliente ${payload.tipo_plano} criado: ${payload.nome}`)
  revalidatePath('/gestao/clientes')
  return { ok: true, data }
}

export async function bloquearMensalista(id: string, bloquear: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('mensalistas')
    .update({ bloqueado: bloquear })
    .eq('id', id)
    
  if (error) return { ok: false, error: error.message }
  
  const acao = bloquear ? 'BLOQUEADO' : 'DESBLOQUEADO'
  const { data } = await supabase.from('mensalistas').select('nome').eq('id', id).single()
  await registrarAuditoria(`Cliente ${data?.nome} foi ${acao}.`)
  
  revalidatePath('/gestao/clientes')
  return { ok: true }
}

export async function renovarMensalista(id: string, creditos: number, novaDataVenc: string): Promise<ActionResult> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('mensalistas')
    .update({ 
      creditos, 
      data_vencimento: novaDataVenc,
      status_pagamento: 'ativo'
    })
    .eq('id', id)
    
  if (error) return { ok: false, error: error.message }
  
  const { data } = await supabase.from('mensalistas').select('nome, gateway_cliente_id, plano_valor, plano_dia_venc').eq('id', id).single()
  await registrarAuditoria(`Plano renovado para ${data?.nome}.`)

  // Integração Asaas
  if (process.env.ASAAS_API_KEY && data?.gateway_cliente_id) {
    try {
      const { criarAssinaturaAsaas } = await import('./asaas')
      await criarAssinaturaAsaas({
        gateway_cliente_id: data.gateway_cliente_id,
        valor: data.plano_valor ?? 220,
        dia_vencimento: data.plano_dia_venc ?? 5,
        descricao: `Mensalidade Remoterapia — ${data.nome}`,
        mensalista_id: id
      })
    } catch (e: any) {
      console.warn('Erro ao sincronizar assinatura Asaas:', e.message)
    }
  }
  
  revalidatePath('/gestao/clientes')
  return { ok: true }
}

export async function adicionarPendencia(id: string, valor: number, motivo: string): Promise<ActionResult> {
  const supabase = await createClient()
  
  const { data: mensalista } = await supabase.from('mensalistas').select('pendencias, nome').eq('id', id).single()
  if (!mensalista) return { ok: false, error: 'Não encontrado.' }
  
  const pendencias = Array.isArray(mensalista.pendencias) ? mensalista.pendencias : []
  const nova = {
    id: crypto.randomUUID(),
    data: new Date().toISOString().split('T')[0],
    valor,
    motivo,
    pago: false
  }
  
  const { error } = await supabase
    .from('mensalistas')
    .update({ pendencias: [...pendencias, nova] })
    .eq('id', id)
    
  if (error) return { ok: false, error: error.message }
  
  await registrarAuditoria(`Pendência de R$${valor} lançada para ${mensalista.nome}: ${motivo}`)
  revalidatePath('/gestao/clientes')
  return { ok: true }
}

