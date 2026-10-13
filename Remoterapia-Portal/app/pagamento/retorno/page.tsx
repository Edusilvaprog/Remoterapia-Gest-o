import Link from 'next/link'
import {CreditCard,ArrowUpRight} from 'lucide-react'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'

// Deliberately does not consume provider status query parameters as evidence of payment.
export default function PaymentReturn(){return <main className="rt-payment-panel" style={{padding:40,maxWidth:760}} data-rt-area="area-db7826649c45"><section className="rt-payment-option" data-rt-area="area-282bf0ec31fb"><CreditCard size={36}/><h1><VisualText id="copy-5f160f859ece" defaultText={"Vamos conferir seu pagamento."}/></h1><p><VisualText id="copy-4af7de5b8933" defaultText={"O retorno do checkout não confirma a cobrança. Aguarde a atualização no Portal: somente a confirmação recebida do Mercado Pago libera o plano ou a inscrição."}/></p><Link href="/#pagamentos" className="rt-primary" style={{marginTop:24}}><VisualText id="copy-b33426fa0f39" defaultText={"Ver meus pagamentos"}/><ArrowUpRight size={18}/></Link><VisualContentSlot id="area-282bf0ec31fb"/></section><VisualContentSlot id="area-db7826649c45"/></main>}
