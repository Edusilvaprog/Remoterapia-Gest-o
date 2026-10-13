import {localPreviewEnabled} from '@/lib/local-preview-client'
import 'server-only'
import {createHmac,timingSafeEqual} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
export type PedidoMP={id:string;mensalista_id:string;tipo:'plano'|'evento';item_id:string;descricao:string;quantidade:number;valor:number;status:string;preference_id:string|null;checkout_url:string|null;expires_at:string;created_at:string;observacao?:string|null}
export function paymentConfig(){
 if(localPreviewEnabled())return null
 const token=process.env.MERCADO_PAGO_ACCESS_TOKEN,secret=process.env.MERCADO_PAGO_WEBHOOK_SECRET,collector=process.env.MERCADO_PAGO_COLLECTOR_ID,base=process.env.MERCADO_PAGO_PORTAL_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY,mode=process.env.MERCADO_PAGO_MODE
 if(!token||!secret||!collector||!base||!service||!['test','production'].includes(mode||'')||process.env.MERCADO_PAGO_ENABLED!=='true')return null
 try{const url=new URL(base);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')return null;return {token,secret,collector,origin:url.origin,service,live:mode==='production'}}catch{return null}
}
export function gatewayServer(){const config=paymentConfig();if(!config)throw new Error('O pagamento online está em preparação. Fale com a equipe.');return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,config.service,{auth:{persistSession:false,autoRefreshToken:false}})}
export function validateSignature({signature,requestId,dataId,secret,now=Date.now()}:{signature:string;requestId:string;dataId:string;secret:string;now?:number}){
 if(!/^[a-z0-9-]{1,80}$/i.test(requestId)||!/^[0-9]{1,30}$/.test(dataId))return false
 const parts=Object.fromEntries(signature.split(',').map(part=>part.trim().split('='))),ts=parts.ts,hash=parts.v1
 if(!/^\d{10,13}$/.test(ts||'')||!/^[a-f0-9]{64}$/i.test(hash||''))return false
 const timestamp=Number(ts)*(ts.length===10?1000:1);if(Math.abs(now-timestamp)>300000)return false
 const expected=createHmac('sha256',secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest(),actual=Buffer.from(hash,'hex')
 return expected.length===actual.length&&timingSafeEqual(expected,actual)
}
export function trustedCheckoutUrl(value:unknown){if(typeof value!=='string')return false;try{const url=new URL(value);return url.protocol==='https:'&&['www.mercadopago.com.br','sandbox.mercadopago.com.br'].includes(url.hostname)&&!url.username&&!url.password}catch{return false}}
export async function mpRequest(path:string,init:RequestInit={}){
 const config=paymentConfig();if(!config)throw new Error('Gateway não configurado')
 const response=await fetch('https://api.mercadopago.com'+path,{...init,headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json',...init.headers},cache:'no-store',signal:AbortSignal.timeout(12000)})
 if(!response.ok)throw new Error('Falha ao consultar o Mercado Pago')
 return response.json()
}
export async function ensureCheckout(order:PedidoMP){
 const config=paymentConfig();if(!config)throw new Error('Gateway não configurado')
 if(order.checkout_url&&trustedCheckoutUrl(order.checkout_url))return order.checkout_url
 const database=gatewayServer(),cutoff=new Date(Date.now()-120000).toISOString()
 const {data:claimed,error:claimError}=await database.from('pedidos_mp').update({checkout_claimed_at:new Date().toISOString()}).eq('id',order.id).is('preference_id',null).or('checkout_claimed_at.is.null,checkout_claimed_at.lt.'+cutoff).select('id').maybeSingle()
 if(claimError||!claimed){const {data:saved}=await database.from('pedidos_mp').select('checkout_url').eq('id',order.id).single();if(saved?.checkout_url&&trustedCheckoutUrl(saved.checkout_url))return saved.checkout_url;throw new Error('Checkout sendo preparado; tente novamente em instantes')}
 const merchant=await mpRequest('/users/me');if(String(merchant.id)!==config.collector)throw new Error('Conta recebedora incompatível')
 const callback=new URL('/pagamento/retorno',config.origin);callback.searchParams.set('pedido',order.id)
 const resource=await mpRequest('/checkout/preferences',{method:'POST',headers:{'X-Idempotency-Key':order.id},body:JSON.stringify({items:[{id:order.id,title:order.descricao,currency_id:'BRL',quantity:1,unit_price:Number(order.valor)}],external_reference:order.id,metadata:{pedido_id:order.id},back_urls:{success:callback.href,pending:callback.href,failure:callback.href},auto_return:'approved',notification_url:config.origin+'/api/webhooks/mercado-pago',expires:true,expiration_date_from:order.created_at,expiration_date_to:order.expires_at,payment_methods:{excluded_payment_types:[{id:'ticket'}]}})})
 const link=config.live?resource.init_point:resource.sandbox_init_point
 if(!resource.id||!trustedCheckoutUrl(link))throw new Error('Resposta de checkout inválida')
 const {error}=await gatewayServer().from('pedidos_mp').update({preference_id:String(resource.id),checkout_url:link,updated_at:new Date().toISOString()}).eq('id',order.id).is('preference_id',null)
 if(error)throw new Error('Não foi possível registrar o checkout')
 return link as string
}
export function validatePayment(payment:any,config:NonNullable<ReturnType<typeof paymentConfig>>,id:string){
 return String(payment.id)===id&&String(payment.collector_id)===config.collector&&payment.live_mode===config.live&&/^[0-9a-f-]{36}$/i.test(payment.external_reference||'')&&payment.metadata?.pedido_id===payment.external_reference&&payment.currency_id==='BRL'&&Number.isFinite(Number(payment.transaction_amount))&&Number(payment.transaction_amount)>0&&typeof payment.date_last_updated==='string'&&Number.isFinite(Date.parse(payment.date_last_updated))
}
