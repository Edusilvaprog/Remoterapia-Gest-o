'use server'
import {getAuthenticatedAluno} from '@/lib/security'
import {paymentConfig,gatewayServer,ensureCheckout,type PedidoMP} from '@/lib/mercado-pago'
export async function iniciarCheckout(payload:{tipo:'plano'|'evento';item:string;quantidade?:number}){
 if(!paymentConfig())return {ok:false,error:'O pagamento online está em preparação. A equipe avisará quando estiver disponível.'}
 const auth=await getAuthenticatedAluno();if(!auth||auth.aluno.bloqueado||auth.aluno.precisa_trocar_senha)return {ok:false,error:'Entre no Portal com seu acesso atualizado para pagar.'}
 if(!payload||!['plano','evento'].includes(payload.tipo)||typeof payload.item!=='string'||payload.item.length>64||!Number.isInteger(payload.quantidade??1)||(payload.quantidade??1)<1||(payload.quantidade??1)>10)return {ok:false,error:'Confira o plano ou evento selecionado.'}
 try{
  const {data,error}=await gatewayServer().rpc('mp_criar_pedido',{p_aluno:auth.aluno.id,p_tipo:payload.tipo,p_item:payload.item,p_quantidade:payload.quantidade??1})
  if(error||!data)return {ok:false,error:'Não foi possível reservar este pedido. Confira o plano, a disponibilidade do evento ou fale com a equipe.'}
  const url=await ensureCheckout(data as PedidoMP)
  return {ok:true,url,pedidoId:data.id}
 }catch{return {ok:false,error:'Não foi possível abrir o pagamento agora. Tente novamente; nenhum benefício foi liberado.'}}
}
export async function listarMeusPagamentos(){
 const auth=await getAuthenticatedAluno();if(!auth)return {ok:false,error:'Entre no Portal para consultar seus pagamentos.',pedidos:[] as PedidoMP[],habilitado:false}
 const {data,error}=await auth.supabase.from('pedidos_mp').select('id,mensalista_id,tipo,item_id,descricao,quantidade,valor,status,preference_id,checkout_url,expires_at,created_at,observacao').eq('mensalista_id',auth.aluno.id).order('created_at',{ascending:false}).limit(50)
 return {ok:!error,error:error?'O histórico de pagamentos ainda está em preparação.':undefined,pedidos:(data||[]) as PedidoMP[],habilitado:!!paymentConfig()}
}
