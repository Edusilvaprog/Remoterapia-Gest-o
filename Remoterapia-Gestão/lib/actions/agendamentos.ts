'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {ActionResult,Agendamento,AgendamentoPayload,StatusAgendamento} from '@/lib/types'
export async function listarAgendamentos(filtros?:{data?:string;status?:StatusAgendamento;mensalista_id?:string}):Promise<ActionResult<Agendamento[]>> {
 const s=await createClient()
 let q=s.from('agendamentos').select('*,mensalista:mensalistas(id,nome,telefone,tipo_plano,creditos,bloqueado),caiaque:caiaques(id,nome,tipo,status)').order('data_reserva').order('horario_reserva').limit(500)
 if(filtros?.data)q=q.eq('data_reserva',filtros.data)
 if(filtros?.status)q=q.eq('status',filtros.status)
 if(filtros?.mensalista_id)q=q.eq('mensalista_id',filtros.mensalista_id)
 const {data,error}=await q
 return error?{ok:false,error:'Não foi possível carregar a agenda.'}:{ok:true,data:data as unknown as Agendamento[]}
}
export async function criarAgendamento(p:AgendamentoPayload):Promise<ActionResult<Agendamento>> {
 const s=await createClient()
 const {data,error}=await s.rpc('reservar_remada',{p_aluno:p.mensalista_id,p_data:p.data_reserva,p_hora:p.horario_reserva,p_caiaque:p.caiaque_id||null,p_saida:p.saida||null,p_obs:p.observacoes||null})
 if(error||!data)return {ok:false,error:error?.message||'Reserva não confirmada.'}
 revalidatePath('/gestao');return {ok:true,data}
}
async function transition(id:string,status:string):Promise<ActionResult> {
 const s=await createClient()
 const {data,error}=await s.rpc('transicionar_reserva',{p_id:id,p_status:status})
 if(error||!data)return {ok:false,error:error?.message||'Alteração não confirmada.'}
 revalidatePath('/gestao');return {ok:true}
}
export async function aprovarAgendamento(id:string){return transition(id,'confirmado')}
export async function recusarAgendamento(id:string){return transition(id,'recusado')}
export async function cancelarAgendamento(id:string){return transition(id,'cancelado')}
export async function registrarFalta(id:string){return transition(id,'falta')}
export async function excluirAgendamento(id:string){return transition(id,'cancelado')}
export async function listarDiasFechados():Promise<string[]> {
 const s=await createClient();const {data}=await s.from('dias_fechados').select('data');return (data??[]).map(d=>d.data)
}
export async function toggleDiaFechado(data:string):Promise<ActionResult> {
 const s=await createClient();const {data:result,error}=await s.rpc('toggle_dia_fechado',{p_data:data})
 return error||!result?{ok:false,error:error?.message||'Alteração não confirmada.'}:{ok:true}
}
export async function cancelarDiaPorClima(data:string,motivo:string,recadoTexto?:string):Promise<ActionResult> {
 const s=await createClient();const {error}=await s.rpc('cancelar_dia_clima',{p_data:data,p_motivo:recadoTexto||motivo})
 if(error)return {ok:false,error:error.message}
 revalidatePath('/gestao');return {ok:true}
}


export async function sincronizarDiasFechados(datas:string[]):Promise<ActionResult> {
 const s=await createClient();const {data,error}=await s.rpc('sincronizar_dias_fechados',{p_datas:datas})
 if(error||!data)return {ok:false,error:error?.message||'Calendário não confirmado.'}
 revalidatePath('/gestao');return {ok:true}
}
