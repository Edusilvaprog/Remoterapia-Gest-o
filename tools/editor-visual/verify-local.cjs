const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execute,reset,exportSnapshot,USER,ALUNO}=require('./local-data.cjs');
const root=path.resolve(__dirname,'../..');
reset();
const staff=execute({table:'perfis_staff',op:'select',filters:[['eq','id',USER]],single:true});assert.equal(staff.data.role,'admin');
const student=execute({table:'mensalistas',op:'select',filters:[['eq','auth_id',USER],['is','arquivado_em',null]],single:true});assert.equal(student.data.id,ALUNO);
const config=execute({table:'configuracoes',op:'upsert',payload:{chave:'tabela_clubes',valor:{mensalista:175}},filters:[]});assert.equal(config.error,null);
const shared=execute({table:'configuracoes',op:'select',filters:[['eq','chave','tabela_clubes']],single:true});assert.equal(shared.data.valor.mensalista,175);
const booking=execute({op:'rpc',rpc:'reservar_remada',payload:{p_aluno:ALUNO,p_data:'2099-01-01',p_hora:'10:00',p_caiaque:'K02'}});assert(booking.data.id);
const duplicate=execute({op:'rpc',rpc:'reservar_remada',payload:{p_aluno:ALUNO,p_data:'2099-01-01',p_hora:'10:00',p_caiaque:'K02'}});assert(duplicate.error);
const fromManagement=execute({table:'agendamentos',op:'select',filters:[['eq','id',booking.data.id]],single:true});assert.equal(fromManagement.data.mensalista.nome,'Aluno de demonstração');
execute({op:'rpc',rpc:'transicionar_reserva',payload:{p_id:booking.data.id,p_status:'cancelado'}});assert.equal(execute({table:'agendamentos',op:'select',filters:[['eq','id',booking.data.id]],single:true}).data.status,'cancelado');
assert(execute({op:'rpc',rpc:'mp_criar_pedido',payload:{}}).error);
assert(execute({op:'select',table:'auth.users',filters:[]}).error);
assert(execute(JSON.parse('{"op":"update","table":"mensalistas","payload":{"__proto__":{"admin":true}},"filters":[]}')).error);
assert.equal(exportSnapshot().fictionalData,true);assert(exportSnapshot().changes.length>=3);
reset();assert.equal(execute({table:'agendamentos',op:'select',filters:[]}).data.length,4);
for(const app of ['Remoterapia-Gestão','Remoterapia-Portal']){
 const env=fs.readFileSync(path.join(root,app,'.env.local'),'utf8');assert.equal(env.trim(),'NEXT_PUBLIC_LOCAL_PREVIEW=1');
 const adapter=fs.readFileSync(path.join(root,app,'lib/local-preview-client.ts'),'utf8');assert(adapter.includes("process.env.NODE_ENV==='development'"));assert(adapter.includes("fetch('http://localhost:3010/api/local-data'"));
 const config=fs.readFileSync(path.join(root,app,'next.config.ts'),'utf8');assert(config.includes("process.env.NODE_ENV==='production'"));
}
console.log('OK: acesso fictício, dados compartilhados, reserva/cancelamento local, bloqueio de integração, reinício e ausência de credenciais reais.');
