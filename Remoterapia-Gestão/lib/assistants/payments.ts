export type ReviewOrder={id:string;descricao?:string;status:string;valor:unknown;expires_at?:string|null;mensalistas?:{nome?:string}|null}
export type ReviewStudent={id:string;nome?:string;status_pagamento?:string;bloqueado?:boolean;pendencias?:unknown}
export type Finding={id:string;title:string;detail:string;source:'pedido'|'aluno';action:'consultar_gateway'|'abrir_cadastro'}
const known=new Set(['created','pending','approved','rejected','cancelled','refunded','charged_back','review'])
export function reviewPayments(orders:ReviewOrder[],students:ReviewStudent[],now=Date.now()){
 const findings:Finding[]=[]
 for(const order of orders){
  const title=order.descricao||'Pedido do Portal',name=order.mensalistas?.nome||'Aluno'
  const add=(code:string,detail:string)=>findings.push({id:`pedido:${order.id}:${code}`,title,detail:`${name}: ${detail}`,source:'pedido',action:'consultar_gateway'})
  const price=Number(order.valor)
  if(order.valor===null||order.valor===undefined||order.valor===''||!Number.isFinite(price)||price<=0)add('valor','valor registrado inválido; confira o pedido original no gateway.')
  if(!known.has(order.status))add('situacao','situação não reconhecida; confira o registro antes de orientar o aluno.')
  if(order.status==='review')add('revisao','pedido sinalizado para atendimento. Consulte a observação e a transação no gateway.')
  if(order.status==='charged_back')add('contestacao','contestação registrada. Confira os prazos e documentos no gateway.')
  if(order.status==='refunded')add('estorno','devolução registrada. Confira a situação do plano ou inscrição com a equipe.')
  const expiration=Date.parse(order.expires_at||'')
  if(['created','pending'].includes(order.status)&&Number.isFinite(expiration)&&expiration<now)add('prazo','prazo local do pedido encerrado; consulte o gateway, pois pode existir pagamento tardio.')
 }
 for(const student of students){
  const details=[]
  if(['pendente','vencido'].includes(student.status_pagamento||''))details.push('pagamento indicado como pendente no cadastro')
  if(Array.isArray(student.pendencias)&&student.pendencias.length)details.push(`${student.pendencias.length} pendência(s) registrada(s)`)
  if(details.length)findings.push({id:`aluno:${student.id}`,title:student.nome||'Aluno',detail:details.join('; ')+'. Confira o cadastro e o recebimento antes de qualquer alteração.',source:'aluno',action:'abrir_cadastro'})
 }
 return {findings,ordersRead:orders.length,studentsRead:students.length,pending:orders.filter(order=>['created','pending'].includes(order.status)).length,approved:orders.filter(order=>order.status==='approved').length}
}
