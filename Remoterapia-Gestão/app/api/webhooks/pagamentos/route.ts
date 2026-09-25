import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { registrarAuditoria } from '@/lib/actions/auditoria'

export async function POST(request: Request) {
  try {
    // 1. Validação de Segurança do Token Asaas (header 'asaas-access-token')
    const token = request.headers.get('asaas-access-token')
    if (process.env.NODE_ENV === 'production' && process.env.ASAAS_WEBHOOK_TOKEN) {
      if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
        return NextResponse.json({ error: 'Token de webhook inválido' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { event, payment } = body

    if (!payment) {
      return NextResponse.json({ received: true, ignored: 'sem objeto de pagamento' })
    }

    const supabase = await createClient()

    // 2. Mapeia eventos de confirmação de pagamento
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const mensalistaId = payment.externalReference

      if (mensalistaId) {
        // Atualiza status do mensalista
        const hoje = new Date()
        const diaVenc = parseInt(payment.dueDate?.split('-')[2] ?? '5')
        const novaDataVenc = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVenc)

        await supabase.from('mensalistas').update({
          status_pagamento: 'ativo',
          bloqueado: false,
          data_vencimento: novaDataVenc.toISOString().split('T')[0],
        }).eq('id', mensalistaId)

        // Grava transação
        await supabase.from('transacoes').insert({
          mensalista_id: mensalistaId,
          tipo: 'mensalidade',
          gateway: 'asaas',
          gateway_id: payment.id,
          valor: payment.value,
          status: 'aprovado',
          dados_gateway: payment,
        })

        const valorFormatado = Number(payment.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        await registrarAuditoria(`Pagamento de ${valorFormatado} confirmado via Asaas. Cliente ID: ${mensalistaId}`)
      }
    }

    // 3. Mapeia eventos de atraso de pagamento
    if (event === 'PAYMENT_OVERDUE') {
      const mensalistaId = payment.externalReference
      if (mensalistaId) {
        await supabase.from('mensalistas').update({
          status_pagamento: 'vencido',
          bloqueado: true,
        }).eq('id', mensalistaId)

        await registrarAuditoria(`Mensalidade vencida no Asaas. Cliente ID: ${mensalistaId} marcado como VENCIDO/BLOQUEADO.`)
      }
    }

    return NextResponse.json({ received: true, status: 'processed' })

  } catch (error: any) {
    console.error('Erro no webhook de pagamentos:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
