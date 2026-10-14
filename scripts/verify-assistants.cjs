const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(path.join(root,'Remoterapia-Portal/node_modules/typescript'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const financial=load('Remoterapia-Gestão/lib/assistants/payments.ts');
const orders=[{id:'paid',status:'approved',valor:150,descricao:'Plano'},{id:'late',status:'pending',valor:60,expires_at:'2026-10-01T00:00:00Z'},{id:'invalid',status:'created',valor:'NaN'},{id:'dispute',status:'charged_back',valor:50},{id:'review',status:'review',valor:60}];
const students=[{id:'active',status_pagamento:'ativo',pendencias:[]},{id:'pending',status_pagamento:'pendente',pendencias:[{valor:25}]}];
const copy=JSON.stringify({orders,students}),report=financial.reviewPayments(orders,students,Date.parse('2026-10-14T12:00:00Z'));
assert.equal(report.approved,1);assert.equal(report.pending,2);assert.equal(report.findings.length,5);assert(!report.findings.some(f=>f.id.startsWith('pedido:paid:')));assert(report.findings.some(f=>f.id==='pedido:late:prazo'&&f.detail.includes('pagamento tardio')));assert.equal(JSON.stringify({orders,students}),copy);
const faq=load('Remoterapia-Portal/lib/assistants/faq.ts');
assert.equal(faq.FAQ_ARTICLES.length,6);
for(const entry of faq.FAQ_ARTICLES){assert(entry.title&&entry.answer&&entry.titleCopyId&&entry.answerCopyId);assert(!/\b(?:https?:\/\/api\.|sk-)/.test(entry.answer));}
console.log('OK: conferência de pendências, prazo tardio e valores inválidos; aprovado não sinalizado; dados não alterados; seis tópicos locais.');
