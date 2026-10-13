'use server'
import {getPerfilAtual} from '@/lib/actions/auth'
import {createClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'
export interface ConfiguracaoOperacao {mensalista:number;guardaria:number;remadas_semanais:number;horario_corte:string;dia_manutencao:string}
export async function salvarConfiguracaoOperacao(payload:ConfiguracaoOperacao){
 const perfil=await getPerfilAtual()
 if(!perfil||!['admin','dona'].includes(perfil.role))return {ok:false,error:'Você não tem permissão para alterar as configurações.'}
 if(!payload||![payload.mensalista,payload.guardaria].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100000)||!Number.isInteger(payload.remadas_semanais)||payload.remadas_semanais<1||payload.remadas_semanais>14||typeof payload.horario_corte!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.horario_corte)||!['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'].includes(payload.dia_manutencao))return {ok:false,error:'Confira os valores, o limite semanal e o horário informados.'}
 try{
  const supabase=await createClient()
  const {data:current,error:readError}=await supabase.from('configuracoes').select('valor').eq('chave','tabela_clubes').maybeSingle()
  if(readError)return {ok:false,error:'Não foi possível conferir a configuração atual. Nenhuma alteração foi enviada.'}
  const valor={...(current?.valor&&typeof current.valor==='object'&&!Array.isArray(current.valor)?current.valor:{}),mensalista:payload.mensalista,guardaria:payload.guardaria,remadas_semanais:payload.remadas_semanais,horario_corte:payload.horario_corte,dia_manutencao:payload.dia_manutencao}
  const {data,error}=await supabase.from('configuracoes').upsert({chave:'tabela_clubes',valor}).select('chave').maybeSingle()
  if(error||!data)return {ok:false,error:'Não foi possível confirmar a alteração. Tente novamente.'}
  revalidatePath('/gestao/admin/configuracoes');revalidatePath('/gestao/portal')
  return {ok:true}
 }catch{return {ok:false,error:'Não foi possível salvar as configurações.'}}
}
