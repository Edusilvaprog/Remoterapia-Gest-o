'use server'

import { createClient } from '../supabase/server'

interface AsaasConfig {
  apiKey: string
  baseUrl: string
  isConfigured: boolean
}

function getAsaasConfig(): AsaasConfig {
  const apiKey = process.env.ASAAS_API_KEY || ''
  const isSandbox = process.env.ASAAS_SANDBOX !== 'false'
  const baseUrl = isSandbox
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3'

  return {
    apiKey,
    baseUrl,
    isConfigured: Boolean(apiKey && apiKey.length > 5)
  }
}

/**
 * Cria ou recupera o cliente no gateway Asaas
 */
export async function criarClienteAsaas(aluno: {
  id?: string
  nome: string
  email?: string | null
  telefone: string
  cpfCnpj?: string
}) {
  try {
    const config = getAsaasConfig()
    if (!config.isConfigured) {
      console.warn('Asaas API Key não configurada. Operação em modo simulado.')
      return { 
        ok: true, 
        simulado: true, 
        data: { gateway_cliente_id: `cus_sim_${Date.now()}` },
        customerId: `cus_sim_${Date.now()}` 
      }
    }

    const telLimpo = aluno.telefone.replace(/\D/g, '')

    const response = await fetch(`${config.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': config.apiKey
      },
      body: JSON.stringify({
        name: aluno.nome.trim(),
        email: aluno.email || undefined,
        mobilePhone: telLimpo,
        cpfCnpj: aluno.cpfCnpj ? aluno.cpfCnpj.replace(/\D/g, '') : undefined,
        notificationDisabled: false
      })
    })

    const data = await response.json()
    if (!response.ok) {
      return { 
        ok: false, 
        error: data.errors?.[0]?.description || 'Erro ao registrar cliente no Asaas.' 
      }
    }

    return { 
      ok: true, 
      customerId: data.id, 
      data: { gateway_cliente_id: data.id }, 
      customer: data 
    }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha de comunicação com o gateway de pagamentos.' }
  }
}

/**
 * Cria uma assinatura recorrente no Asaas (Mensalidade)
 */
export async function criarAssinaturaAsaas(payload: {
  gateway_cliente_id: string
  valor: number
  dia_vencimento?: number
  nextDueDate?: string
  descricao: string
  mensalista_id?: string
  billingType?: 'PIX' | 'CREDIT_CARD' | 'BOLETO'
}) {
  try {
    const config = getAsaasConfig()
    const supabase = await createClient()

    // Calcula próxima data de vencimento
    let dueDate = payload.nextDueDate
    if (!dueDate) {
      const hoje = new Date()
      const dia = payload.dia_vencimento || 5
      const mesVenc = hoje.getDate() > dia ? hoje.getMonth() + 1 : hoje.getMonth()
      const dataVenc = new Date(hoje.getFullYear(), mesVenc, dia)
      dueDate = dataVenc.toISOString().split('T')[0]
    }

    if (!config.isConfigured) {
      console.warn('Asaas API Key não configurada. Assinatura em modo simulado.')
      const subId = `sub_sim_${Date.now()}`

      if (payload.mensalista_id) {
        try {
          await supabase
            .from('mensalistas')
            .update({ 
              gateway_cliente_id: payload.gateway_cliente_id,
              status_pagamento: 'ativo'
            })
            .eq('id', payload.mensalista_id)
        } catch {}
      }

      return { ok: true, simulado: true, subscriptionId: subId }
    }

    const response = await fetch(`${config.baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': config.apiKey
      },
      body: JSON.stringify({
        customer: payload.gateway_cliente_id,
        billingType: payload.billingType || 'PIX',
        value: payload.valor,
        nextDueDate: dueDate,
        cycle: 'MONTHLY',
        description: payload.descricao,
        externalReference: payload.mensalista_id
      })
    })

    const data = await response.json()
    if (!response.ok) {
      return { 
        ok: false, 
        error: data.errors?.[0]?.description || 'Erro ao criar assinatura no gateway.' 
      }
    }

    return { ok: true, subscriptionId: data.id, subscription: data }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao comunicar com gateway de assinaturas.' }
  }
}

/**
 * Gera uma cobrança pontual no Asaas
 */
export async function gerarCobrancaAsaas(payload: {
  customerId: string
  mensalistaId?: string
  tipo: 'mensalidade' | 'evento' | 'guardaria' | 'avulso'
  valor: number
  metodo: 'PIX' | 'CREDIT_CARD' | 'BOLETO'
  descricao: string
  dueDate?: string
}) {
  try {
    const config = getAsaasConfig()
    const supabase = await createClient()

    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const dueDate = payload.dueDate || amanha.toISOString().split('T')[0]

    if (!config.isConfigured) {
      const cobrancaId = `pay_sim_${Date.now()}`
      try {
        await supabase.from('transacoes').insert({
          mensalista_id: payload.mensalistaId || null,
          tipo: payload.tipo,
          gateway: 'asaas_simulado',
          gateway_id: cobrancaId,
          valor: payload.valor,
          status: 'aprovado',
          dados_gateway: { simulado: true, descricao: payload.descricao }
        })
      } catch {}

      return {
        ok: true,
        simulado: true,
        cobrancaId
      }
    }

    const response = await fetch(`${config.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': config.apiKey
      },
      body: JSON.stringify({
        customer: payload.customerId,
        billingType: payload.metodo,
        value: payload.valor,
        dueDate,
        description: payload.descricao,
        externalReference: payload.mensalistaId,
        postalService: false
      })
    })

    const data = await response.json()
    if (!response.ok) {
      return { 
        ok: false, 
        error: data.errors?.[0]?.description || 'Erro ao gerar cobrança no gateway.' 
      }
    }

    return {
      ok: true,
      cobrancaId: data.id,
      status: data.status,
      invoiceUrl: data.invoiceUrl
    }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao processar cobrança.' }
  }
}
