'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ActionResult, Mensalista, MensalistaPayload } from '@/lib/types'
import { getPerfilAtual } from './auth'
import { registrarAuditoria } from './auditoria'

const SAFE_COLUMNS='id,auth_id,nome,telefone,email,cpf,tipo_plano,creditos,status_pagamento,data_vencimento,bloqueado,primeiro_acesso,precisa_trocar_senha,avatar,foto_url,caiaque_vinculado,pendencias,created_at,updated_at,plano_valor,plano_dia_venc,plano_descricao,dia_vencimento,tipo_embarcacao,marca_modelo,cor_embarcacao,metodo_pagamento,historico_estornos,arquivado_em'
async function staffAllowed() {
 const p=await getPerfilAtual()
 return p && ['admin','dona','recepcao','guardaria'].includes(p.role)
}
export async function resetarPinMensalista(_id:string):Promise<ActionResult<string>> {
 return {ok:false,error:'O acesso agora usa e-mail e senha. O aluno deve usar Recuperar acesso no Portal.'}
}
export async function listarMensalistas():Promise<ActionResult<Mensalista[]>> {
 if(!await staffAllowed())return {ok:false,error:'Acesso não autorizado.'}
 const s=await createClient()
 const {data,error}=await s.from('mensalistas').select(SAFE_COLUMNS).is('arquivado_em',null).order('nome').limit(500)
 return error?{ok:false,error:'Não foi possível carregar clientes.'}:{ok:true,data:data as unknown as Mensalista[]}
}
export async function criarMensalista(payload:MensalistaPayload & {email?:string}):Promise<ActionResult<Mensalista>> {
 if(!await staffAllowed())return {ok:false,error:'Acesso não autorizado.'}
 const phone=payload.telefone.replace(/\D/g,'')
 if(payload.nome.trim().length<3 || !/^\d{10,13}$/.test(phone) || !['mensalista','guardaria','combo_mensalista_guardaria'].includes(payload.tipo_plano))return {ok:false,error:'Confira nome, telefone e plano.'}
 const email=payload.email?.trim().toLowerCase()
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {ok:false,error:'E-mail inválido.'}
 const s=await createClient()
 const {data:config}=await s.from('configuracoes').select('valor').eq('chave','creditos_mensais').maybeSingle()
 const credits=payload.tipo_plano==='guardaria'?0:Number(config?.valor??8)
 const {data,error}=await s.from('mensalistas').insert({nome:payload.nome.trim(),telefone:phone,email:email||null,tipo_plano:payload.tipo_plano,creditos:credits,status_pagamento:'pendente',data_vencimento:payload.data_vencimento||null,caiaque_vinculado:payload.caiaque_vinculado||null,bloqueado:false,primeiro_acesso:true,precisa_trocar_senha:false}).select(SAFE_COLUMNS).single()
 if(error||!data)return {ok:false,error:error?.code==='23505'?'Cliente já cadastrado.':'Não foi possível cadastrar.'}
 await registrarAuditoria('Cliente cadastrado: '+data.id)
 revalidatePath('/gestao');return {ok:true,data:data as unknown as Mensalista}
}
export async function bloquearMensalista(id:string,bloquear:boolean):Promise<ActionResult> {
 if(!await staffAllowed()||typeof bloquear!=='boolean')return {ok:false,error:'Acesso não autorizado.'}
 const s=await createClient()
 const {data,error}=await s.from('mensalistas').update({bloqueado:bloquear}).eq('id',id).is('arquivado_em',null).select('id').maybeSingle()
 if(error||!data)return {ok:false,error:'Bloqueio não confirmado.'}
 await registrarAuditoria('Bloqueio de cliente: '+id+' / '+bloquear)
 revalidatePath('/gestao');return {ok:true}
}
export async function renovarMensalista(id:string,_creditos?:number,_novaDataVenc?:string):Promise<ActionResult> {
 if(!await staffAllowed())return {ok:false,error:'Acesso não autorizado.'}
 const s=await createClient()
 const {data,error}=await s.rpc('renovar_plano_manual',{p_aluno:id})
 if(error||!data)return {ok:false,error:error?.message||'Recebimento e renovação não confirmados.'}
 revalidatePath('/gestao');return {ok:true}
}
export async function arquivarMensalista(id:string):Promise<ActionResult> {
 if(!await staffAllowed())return {ok:false,error:'Acesso não autorizado.'}
 const s=await createClient()
 const {data,error}=await s.rpc('arquivar_aluno',{p_id:id})
 if(error||!data)return {ok:false,error:error?.message||'Arquivamento não confirmado.'}
 revalidatePath('/gestao');return {ok:true}
}
export async function adicionarPendencia(id:string,valor:number,motivo:string):Promise<ActionResult> {
 if(!await staffAllowed()||!Number.isFinite(valor)||valor<=0||motivo.trim().length<3)return {ok:false,error:'Dados ou acesso inválidos.'}
 const s=await createClient()
 const {error}=await s.rpc('adicionar_pendencia',{p_id:id,p_valor:valor,p_motivo:motivo})
 return error?{ok:false,error:error.message}:{ok:true}
}

