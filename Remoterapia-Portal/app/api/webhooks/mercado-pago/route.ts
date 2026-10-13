import {localPreviewEnabled} from '@/lib/local-preview-client'
import {NextResponse} from 'next/server'
import {paymentConfig,validateSignature,mpRequest,gatewayServer,validatePayment} from '@/lib/mercado-pago'
export const runtime='nodejs'
export async function POST(request:Request){
 if(localPreviewEnabled())return Response.json({error:'Integração externa desativada na prévia local.'},{status:409});

 const config=paymentConfig();if(!config)return NextResponse.json({error:'Gateway não habilitado.'},{status:503})
 const url=new URL(request.url),id=url.searchParams.get('data.id')||''
 if(!validateSignature({signature:request.headers.get('x-signature')||'',requestId:request.headers.get('x-request-id')||'',dataId:id,secret:config.secret}))return NextResponse.json({error:'Assinatura inválida.'},{status:401})
 // Topic comes from the signed resource ID lookup; body fields never authorize a benefit.
 if(url.searchParams.get('type')!=='payment')return NextResponse.json({received:true,ignored:true})
 try{
  const payment=await mpRequest('/v1/payments/'+id)
  if(!validatePayment(payment,config,id))return NextResponse.json({error:'Pagamento incompatível.'},{status:400})
  const status=Number(payment.transaction_amount_refunded)>0&&payment.status==='approved'?'in_mediation':payment.status
  const {error}=await gatewayServer().rpc('mp_conciliar_pagamento',{p_pedido:payment.external_reference,p_payment_id:id,p_status:status,p_valor:payment.transaction_amount,p_moeda:payment.currency_id,p_atualizado:payment.date_last_updated})
  if(error)return NextResponse.json({error:'Conciliação não concluída.'},{status:500})
  return NextResponse.json({received:true})
 }catch{return NextResponse.json({error:'Conciliação temporariamente indisponível.'},{status:503})}
}
