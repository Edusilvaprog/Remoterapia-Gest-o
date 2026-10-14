const {randomUUID}=require('node:crypto');
const USER='10000000-0000-4000-8000-000000000001',ALUNO='20000000-0000-4000-8000-000000000001';
const user={id:USER,email:'preview@remoterapia.local',role:'authenticated',aud:'authenticated',app_metadata:{provider:'local-preview'},user_metadata:{nome:'Equipe de demonstração'},is_anonymous:false};
const tables=['perfis_staff','mensalistas','caiaques','lockers','agendamentos','locacoes','historico_locacoes','fechamentos_caixa','fotos','avarias','inspecoes','avaliacoes','dias_fechados','fila_espera','configuracoes','estado_sistema','auditoria','eventos','inscricoes_eventos','pedidos_mp','planos','guardaria','midias'];
let db,changes;
const tomorrow=()=>new Date(Date.now()+86400000).toISOString().slice(0,10);
function reset(){
 const now=new Date().toISOString();db=Object.fromEntries(tables.map(table=>[table,[]]));changes=[];
 db.perfis_staff=[{id:USER,nome:'Equipe de demonstração',email:user.email,role:'admin',roles:['dona','recepcao','instrutor','guardaria'],ativo:true,permissions:{qualidadeEmbarque:true,avaria:true},created_at:now,updated_at:now}];
 db.mensalistas=[{id:ALUNO,auth_id:USER,nome:'Aluno de demonstração',email:user.email,telefone:'13000000000',tipo_plano:'mensalista',creditos:8,status_pagamento:'ativo',data_vencimento:tomorrow(),dia_vencimento:10,bloqueado:false,primeiro_acesso:false,precisa_trocar_senha:false,avatar:null,foto_url:null,cpf:null,caiaque_vinculado:null,pendencias:[],historico_estornos:[],arquivado_em:null,plano_valor:150,plano_dia_venc:10,plano_descricao:'Plano de demonstração',created_at:now,updated_at:now}];
 db.caiaques=[1,2,3,4].map(n=>({id:'K0'+n,nome:'Caiaque de exemplo '+n,tipo:n===4?'duplo':'individual',capacidade:n===4?2:1,preco_sem_instrutor:n===4?80:50,preco_com_instrutor:n===4?110:80,status:'livre',dono:null,mensalista_id:null,created_at:now,updated_at:now}));
 db.lockers=[1,2,3].map(n=>({id:'L0'+n,nome:'Armário '+n,numero:n,status:'Livre',created_at:now}));
 db.agendamentos=[{id:'30000000-0000-4000-8000-000000000001',mensalista_id:ALUNO,mensalista_nome:'Aluno de demonstração',caiaque_id:'K01',locker_id:null,data_reserva:tomorrow(),horario_reserva:'08:00',hora_reserva:'08:00',status:'confirmado',tipo:'remada',is_evento:false,manual:false,avaliado:false,fotos_enviadas:false,vistoria_pulada:false,created_at:now,updated_at:now}];
 // Exemplos historicos locais para revisar filtros, avaliacoes e eventos.
 const priorDate=days=>new Date(Date.now()-days*86400000).toISOString().slice(0,10);
 db.agendamentos.push(
  {id:'30000000-0000-4000-8000-000000000002',mensalista_id:ALUNO,mensalista_nome:'Aluno de demonstração',caiaque_id:'K02',data_reserva:priorDate(20),horario_reserva:'08:00',status:'concluido',titulo:'Remada do clube',is_evento:false,avaliado:false,created_at:now},
  {id:'30000000-0000-4000-8000-000000000003',mensalista_id:ALUNO,mensalista_nome:'Aluno de demonstração',caiaque_id:'K01',data_reserva:priorDate(18),horario_reserva:'06:00',status:'cancelado_clima',titulo:'Remada do clube',motivo_cancelamento:'Condições do mar — exemplo de cancelamento.',is_evento:false,reagendado:false,created_at:now},
  {id:'30000000-0000-4000-8000-000000000004',mensalista_id:ALUNO,mensalista_nome:'Aluno de demonstração',data_reserva:priorDate(15),horario_reserva:'07:00',status:'concluido',titulo_evento:'Remada em grupo — exemplo',evento_id:'40000000-0000-4000-8000-000000000001',is_evento:true,created_at:now}
 );
 db.configuracoes=[{id:'clubes',chave:'tabela_clubes',valor:{mensalista:150,guardaria:150,combo:250,remadas_semanais:2,horario_corte:'19:00',dia_manutencao:'Segunda-feira'}},{id:'tarifas',chave:'tabela_precos',valor:{individual:50,duplo:80,com_instrutor:30}}];
 db.estado_sistema=[{id:1,clima:'favoravel',status_mar:'liberado',mar_liberado:true,vento:8,observacoes:'Condição ilustrativa. Não utilizar para decisões de navegação.'}];
 db.eventos=[{id:'40000000-0000-4000-8000-000000000001',titulo:'Remada ao nascer do sol · exemplo',nome:'Remada ao nascer do sol',descricao:'Evento fictício para conferir a apresentação e a navegação.',data_evento:tomorrow(),horario:'07:00',horario_evento:'07:00',hora_evento:'07:00',status:'aberto',vagas_totais:12,vagas_ocupadas:2,vagas_disponiveis:10,preco:60,valor:60,valor_por_pessoa:60,local:'Base Remoterapia',instrutor:'Equipe de demonstração',foto_url:null,created_at:now}];
 return {ok:true};
}
reset();
if(process.env.RT_LOCAL_SNAPSHOT||process.env.RT_LOCAL_SNAPSHOT_FILE){
 try{const raw=process.env.RT_LOCAL_SNAPSHOT_FILE?require('node:fs').readFileSync(process.env.RT_LOCAL_SNAPSHOT_FILE,'utf8'):Buffer.from(process.env.RT_LOCAL_SNAPSHOT,'base64').toString('utf8');const snapshot=JSON.parse(raw.replace(/^\uFEFF/,''));rejectUnsafe(snapshot);if(snapshot.fictionalData===true&&snapshot.tables&&tables.every(table=>Array.isArray(snapshot.tables[table]))){db=structuredClone(snapshot.tables);changes=Array.isArray(snapshot.changes)?structuredClone(snapshot.changes):[];}}
 catch{/* An invalid transfer restores the known examples. */}
 delete process.env.RT_LOCAL_SNAPSHOT;
 delete process.env.RT_LOCAL_SNAPSHOT_FILE;
}
const result=(data,count)=>({data,error:null,count:count??null,status:200,statusText:'OK'});
const error=message=>({data:null,error:{message,code:'LOCAL_PREVIEW'},count:null,status:400,statusText:'Local preview'});
const read=table=>db[table];
function rejectUnsafe(value){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Campo não permitido.');rejectUnsafe(item);}}
function compare(actual,op,value){if(op==='eq')return actual===value;if(op==='neq')return actual!==value;if(op==='is')return value===null?actual==null:actual===value;if(op==='in')return Array.isArray(value)&&value.includes(actual);if(op==='gte')return actual>=value;if(op==='gt')return actual>value;if(op==='lte')return actual<=value;if(op==='lt')return actual<value;if(op==='ilike'||op==='like')return String(actual??'').toLowerCase().includes(String(value).replaceAll('%','').toLowerCase());return false;}
function matches(row,filters=[]){return filters.every(([op,key,value])=>{
 if(op==='or')return String(key).split(',').some(expression=>{const [column,operator,...parts]=expression.split('.');const text=parts.join('.'),expected=text==='null'?null:text==='true'?true:text==='false'?false:text;return compare(row[column],operator,expected)});
 if(op==='not'){const [operator,expected]=value;return !compare(row[key],operator,expected)}
 return compare(row[key],op,value);
});}
function enriched(table,row){const data={...row};if(table==='agendamentos'){const aluno=db.mensalistas.find(a=>a.id===row.mensalista_id),caiaque=db.caiaques.find(c=>c.id===row.caiaque_id);data.mensalista=aluno;data.mensalistas=aluno;data.caiaque=caiaque;data.caiaques=caiaque;}return data;}
function log(kind,target,payload){changes.push({at:new Date().toISOString(),kind,target,payload:structuredClone(payload)});if(changes.length>2000)changes.shift();}
function rpc(name,p){
 const update=(table,id,patch)=>{const row=db[table].find(r=>r.id===id);if(!row)return error('Registro de exemplo não encontrado.');Object.assign(row,patch,{updated_at:new Date().toISOString()});return result(structuredClone(row));};
 if(name==='catalogo_caiaques')return result(structuredClone(db.caiaques));
 if(name==='catalogo_lockers')return result(structuredClone(db.lockers));
 if(name==='reservar_remada'){const row={id:randomUUID(),mensalista_id:p.p_aluno,mensalista_nome:db.mensalistas.find(a=>a.id===p.p_aluno)?.nome,caiaque_id:p.p_caiaque,locker_id:p.p_locker,data_reserva:p.p_data,horario_reserva:p.p_hora,hora_reserva:p.p_hora,status:'confirmado',is_evento:false,avaliado:false,created_at:new Date().toISOString()};if(!row.mensalista_id||!row.data_reserva||!row.horario_reserva)return error('Confira o aluno, a data e o horário.');if(db.agendamentos.some(r=>r.mensalista_id===row.mensalista_id&&r.data_reserva===row.data_reserva&&r.horario_reserva===row.horario_reserva&&r.status==='confirmado'))return error('Já existe uma reserva de exemplo neste horário.');db.agendamentos.push(row);return result(row);}
 if(name==='transicionar_reserva')return update('agendamentos',p.p_id,{status:p.p_status});
 if(name==='avaliar_remada')return update('agendamentos',p.p_id,{avaliado:true,avaliacao:p.p_nota,comentario:p.p_comentario});
 if(name==='renovar_plano_manual')return update('mensalistas',p.p_aluno,{creditos:8,status_pagamento:'ativo'});
 if(name==='arquivar_aluno')return update('mensalistas',p.p_id,{arquivado_em:new Date().toISOString()});
 if(name==='adicionar_pendencia'){const row=db.mensalistas.find(a=>a.id===p.p_id);if(!row)return error('Aluno de exemplo não encontrado.');row.pendencias.push({id:randomUUID(),valor:p.p_valor,motivo:p.p_motivo,pago:false});return result(true);}
 if(name==='toggle_dia_fechado'){const index=db.dias_fechados.findIndex(d=>d.data===p.p_data);if(index>=0)db.dias_fechados.splice(index,1);else db.dias_fechados.push({id:randomUUID(),data:p.p_data});return result(index<0);}
 if(name==='sincronizar_dias_fechados'){db.dias_fechados=(p.p_datas||[]).map(data=>({id:randomUUID(),data}));return result(true);}
 if(name==='cancelar_dia_clima'){for(const row of db.agendamentos)if(row.data_reserva===p.p_data){row.status='cancelado';row.motivo_cancelamento=p.p_motivo;}return result(true);}
 if(name==='iniciar_locacao'){const payload=p.p_payload||{},row={...payload,id:randomUUID(),entrada:new Date().toISOString(),status:'em_andamento',status_retorno:'na_agua',caiaques_ids:payload.caiaques_ids||[],lockers_ids:payload.lockers_ids||[],valor_original:payload.valor_original||50,created_at:new Date().toISOString()};db.locacoes.push(row);for(const c of db.caiaques)if(row.caiaques_ids.includes(c.id))c.status='em_uso';return result(row);}
 if(name==='marcar_retorno')return update('locacoes',p.p_id,{status_retorno:'retornou'});
 if(name==='finalizar_locacao'){const response=update('locacoes',p.p_id,{status:p.p_cancelar?'cancelado':'finalizado',valor_final:p.p_valor,pagamento:p.p_metodo,saida:new Date().toISOString()});if(response.data){db.historico_locacoes.push({...response.data});for(const c of db.caiaques)if(response.data.caiaques_ids.includes(c.id))c.status='livre';}return response;}
 if(name==='cancelar_inscricao_pendente')return update('inscricoes_eventos',p.p_id,{status:'cancelado'});
 return error('Esta ação depende de uma integração real e está desativada na prévia local.');
}
function execute(query){
 try{
  rejectUnsafe(query);if(!query||!['select','insert','upsert','update','delete','rpc'].includes(query.op))return error('Operação local não permitida.');
  if(query.op==='rpc'){const response=rpc(query.rpc,query.payload||{});if(!response.error&&!query.rpc.startsWith('catalogo_'))log('rpc',query.rpc,query.payload||{});let data=response.data;if(Array.isArray(data)&&query.order)data=[...data].sort((a,b)=>String(a[query.order[0]]).localeCompare(String(b[query.order[0]])));return {...response,data};}
  if(!Object.hasOwn(db,query.table))return error('Esta área ainda não possui exemplos locais.');
  let selected=read(query.table).filter(row=>matches(row,query.filters));
  if(query.op==='delete'){db[query.table]=read(query.table).filter(row=>!matches(row,query.filters));log('delete',query.table,{ids:selected.map(row=>row.id)});}
  else if(query.op==='update'){for(const row of selected)Object.assign(row,query.payload,{updated_at:new Date().toISOString()});log('update',query.table,{ids:selected.map(row=>row.id),values:query.payload});}
  else if(['insert','upsert'].includes(query.op)){
   const values=Array.isArray(query.payload)?query.payload:[query.payload];if(!values.length||values.some(row=>!row||typeof row!=='object'))return error('Dados locais inválidos.');
   selected=values.map(item=>{const key=query.table==='configuracoes'?'chave':'id';const existing=query.op==='upsert'&&item[key]!=null?read(query.table).find(row=>row[key]===item[key]):null;if(existing){Object.assign(existing,item);return existing;}const row={id:randomUUID(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...item};read(query.table).push(row);return row;});log(query.op,query.table,query.payload);
  }
  const count=selected.length;if(query.order){const [key,ascending]=query.order;selected.sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(ascending===false?-1:1));}
  if(query.range)selected=selected.slice(query.range[0],query.range[1]+1);if(query.limit)selected=selected.slice(0,query.limit);
  const rows=selected.map(row=>enriched(query.table,structuredClone(row)));
  if(query.single&&rows.length!==1)return error('Não foi possível encontrar um registro único de exemplo.');
  return result(query.head?null:query.single||query.maybeSingle?rows[0]||null:rows,count);
 }catch{return error('Não foi possível executar esta ação local.');}
}
function exportSnapshot(){return {mode:'local-preview',fictionalData:true,exportedAt:new Date().toISOString(),tables:structuredClone(db),changes:structuredClone(changes)};}
module.exports={execute,reset,exportSnapshot,user,USER,ALUNO};
