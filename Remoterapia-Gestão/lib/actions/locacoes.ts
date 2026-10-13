'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ActionResult, Locacao, CheckinPayload } from '@/lib/types'

export async function listarLocacoesAtivas(): Promise<ActionResult<Locacao[]>> {
 const s=await createClient()
 const {data,error}=await s.from('locacoes').select('*').in('status',['ativo','retornando']).order('entrada',{ascending:false}).limit(200)
 return error?{ok:false,error:'Não foi possível carregar as locações.'}:{ok:true,data:data??[]}
}
export async function realizarCheckin(payload:CheckinPayload):Promise<ActionResult<Locacao>> {
 const s=await createClient()
 const {data,error}=await s.rpc('iniciar_locacao',{p_payload:payload})
 if(error||!data)return {ok:false,error:error?.message||'Embarque não confirmado.'}
 revalidatePath('/gestao')
 return {ok:true,data}
}
export async function marcarRetorno(locacaoId:string):Promise<ActionResult> {
 const s=await createClient()
 const {data,error}=await s.rpc('marcar_retorno',{p_id:locacaoId})
 if(error||!data)return {ok:false,error:error?.message||'Retorno não confirmado.'}
 revalidatePath('/gestao'); return {ok:true}
}
export async function realizarCheckout(locacaoId:string,valorPago:number|null,metodoPagamento:string,observacoes?:string):Promise<ActionResult> {
 if(valorPago!==null&&(!Number.isFinite(valorPago)||valorPago<0))return {ok:false,error:'Valor inválido.'}
 const s=await createClient()
 const {data,error}=await s.rpc('finalizar_locacao',{p_id:locacaoId,p_valor:valorPago,p_metodo:metodoPagamento,p_obs:observacoes??null,p_cancelar:false})
 if(error||!data)return {ok:false,error:error?.message||'Desembarque não confirmado.'}
 revalidatePath('/gestao'); return {ok:true}
}
export async function cancelarLocacao(locacaoId:string):Promise<ActionResult> {
 const s=await createClient()
 const {data,error}=await s.rpc('finalizar_locacao',{p_id:locacaoId,p_valor:null,p_metodo:null,p_obs:null,p_cancelar:true})
 if(error||!data)return {ok:false,error:error?.message||'Cancelamento não confirmado.'}
 revalidatePath('/gestao'); return {ok:true}
}

