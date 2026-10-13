import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

// Nenhum benefício é liberado por este endpoint enquanto o processamento
// autenticado, atômico e idempotente do gateway não estiver configurado.
export async function POST(request:Request) {
 const expected=process.env.ASAAS_WEBHOOK_TOKEN
 if(!expected)return NextResponse.json({error:'Integração de pagamentos indisponível.'},{status:503})
 const supplied=request.headers.get('asaas-access-token')||''
 const a=Buffer.from(expected),b=Buffer.from(supplied)
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Acesso não autorizado.'},{status:401})
 return NextResponse.json({error:'Processamento de cobranças ainda não habilitado.'},{status:503})
}

