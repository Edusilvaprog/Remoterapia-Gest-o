'use server'

import { createClient } from '../supabase/server'
import { getAuthenticatedAluno } from '@/lib/security'

// Retorna eventos abertos
export async function fetchEventos() {
  try {
    const supabase = await createClient()
    const hojeStr = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .in('status', ['aberto'])
      .gte('data_evento', hojeStr)
      .order('data_evento', { ascending: true })
      
    if (error) {
      console.warn('Tabela de eventos ou erro ao carregar eventos:', error.message)
      return { ok: false, eventos: [], error: "Não foi possível carregar os eventos." }
    }
    return { ok: true, eventos: data || [] }
  } catch (error: any) {
    console.warn('Erro ao conectar eventos:', error.message)
    return { ok: true, eventos: [] }
  }
}

// Processa inscrição 
export async function processarInscricao(_payload: {evento_id:string;mensalista_id?:string;nome:string;telefone:string;email?:string;qtd_vagas:number;embarcacao?:string;valor_total:number;metodo_pagamento:string;data_evento?:string;horario_evento?:string;titulo_evento?:string;nomes_acompanhantes?:string[]}) {
 const auth=await getAuthenticatedAluno()
 if(!auth)return {ok:false,error:'Entre no Portal para solicitar uma inscrição.',voucher:undefined,agendamento:undefined,dados:undefined}
 return {ok:false,error:'A cobrança de eventos ainda precisa ser configurada pela base. Nenhuma vaga foi cobrada ou confirmada.',voucher:undefined,agendamento:undefined,dados:undefined}
}

export async function cancelarInscricao(inscricaoId:string,mensalistaId?:string) {
 const auth=await getAuthenticatedAluno(mensalistaId)
 if(!auth)return {ok:false,error:'Sessão não autorizada.'}
 const {error}=await auth.supabase.rpc('cancelar_inscricao_pendente',{p_id:inscricaoId})
 return error?{ok:false,error:error.message}:{ok:true,message:'Inscrição pendente cancelada.'}
}

export async function buscarPrecosClubes() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('configuracoes').select('valor').eq('chave', 'tabela_clubes').maybeSingle()
    if (data?.valor) {
      return {
        mensalista: data.valor.mensalista || 150,
        guardaria: data.valor.guardaria || 150,
        remadas_semanais: data.valor.remadas_semanais || 2,
        horario_corte: data.valor.horario_corte || '19:00',
        dia_manutencao: data.valor.dia_manutencao || 'Segunda-feira'
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar precos', e)
  }
  return { mensalista: 150, guardaria: 150, remadas_semanais: 2, horario_corte: '19:00', dia_manutencao: 'Segunda-feira' }
}

