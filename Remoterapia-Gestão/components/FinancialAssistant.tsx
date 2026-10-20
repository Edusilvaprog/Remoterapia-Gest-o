import {ClipboardCheck,ArrowUpRight,TriangleAlert} from 'lucide-react'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'
import {reviewPayments,type ReviewOrder,type ReviewStudent} from '@/lib/assistants/payments'
export default function FinancialAssistant({orders,students,ordersError,studentsError}:{orders:ReviewOrder[];students:ReviewStudent[];ordersError:boolean;studentsError:boolean}){
 const report=reviewPayments(orders,students)
 return <section className="rt-base-panel" style={{margin:'24px 0'}} data-rt-area="area-b9c408c4a001">
  <div className="rt-base-panel-title"><span className="rt-base-icon"><ClipboardCheck size={23}/></span><div><h2><VisualText id="copy-b9c408c4a001" defaultText="Conferência de pagamentos e pendências"/></h2><p><VisualText id="copy-b9c408c4a002" defaultText="Resumo por regras, com recomendações para a equipe."/></p></div></div>
  <p className="rt-base-caption"><VisualText id="copy-b9c408c4a003" defaultText="Esta conferência lê registros do sistema. Não consulta o saldo bancário, confirma pagamentos, cobra alunos ou realiza estornos. Não há IA generativa conectada."/></p>
  {(ordersError||studentsError)&&<p role="alert" className="rt-error-note"><TriangleAlert size={18}/>{ordersError?'Não foi possível conferir pedidos. ':''}{studentsError?'Não foi possível conferir cadastros de alunos.':''} A conferência está incompleta.</p>}
  <p className="rt-base-caption">{report.ordersRead} <VisualText id="copy-b9c408c4a004" defaultText="pedidos recentes consultados (máximo 100) e"/> {report.studentsRead} <VisualText id="copy-b9c408c4a005" defaultText="cadastros recentes (máximo 50). Novos registros e recebimentos externos podem não estar nesta consulta."/></p>
  <div className="rt-base-action-grid" style={{marginTop:20}}>{report.findings.map(finding=><article key={finding.id} className="rt-base-panel"><h3 style={{fontWeight:650}}>{finding.title}</h3><p className="rt-base-caption">{finding.detail}</p><a className="rt-base-text-button" href={finding.action==='abrir_cadastro'?'/gestao/clientes':'https://www.mercadopago.com.br/activities'} {...(finding.action==='consultar_gateway'?{target:'_blank',rel:'noreferrer'}:{})}>{finding.action==='abrir_cadastro'?'Abrir cadastros':'Consultar Mercado Pago'}<ArrowUpRight size={16}/></a></article>)}</div>
  {!report.findings.length&&!ordersError&&!studentsError&&<p className="rt-base-caption"><VisualText id="copy-b9c408c4a006" defaultText="Nenhum alerta encontrado nos registros consultados. Isso não comprova ausência de dívidas ou recebimento no banco."/></p>}
  <VisualContentSlot id="area-b9c408c4a001"/>
 </section>
}
