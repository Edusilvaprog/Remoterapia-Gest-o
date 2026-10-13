const assert=require('node:assert/strict');
const routes=['/gestao/painel','/gestao/recepcao/dashboard','/gestao/agua','/gestao/selecionar-area','/gestao/admin','/gestao/admin/configuracoes','/gestao/portal','/gestao/guardaria','/gestao/clima','/gestao/diario','/gestao/dona','/gestao/midia','/gestao/pagamentos','/gestao/seguranca'];
(async()=>{
 for(const route of routes){const response=await fetch('http://localhost:3015'+route);const body=await response.text();assert.equal(response.status,200,route+' não abriu');assert(!body.includes('NEXT_HTTP_ERROR_FALLBACK;500'),route+' retornou erro');assert(body.includes('rt-local-preview-notice'),route+' sem aviso de prévia');console.log('OK '+route);}
 const portal=await fetch('http://localhost:3016/');assert.equal(portal.status,200);console.log('OK Portal');
 for(const [port,route] of [[3015,'/api/upload-foto'],[3016,'/api/upload-foto-perfil'],[3016,'/api/webhooks/mercado-pago']]){const response=await fetch(`http://localhost:${port}${route}`,{method:'POST'});assert.equal(response.status,409,route+' precisa bloquear integração externa');}
 const foreign=await fetch('http://localhost:3010/api/local-data',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({op:'select',table:'mensalistas',filters:[]})});assert.equal(foreign.status,403);
 console.log('OK: áreas abrem sem senha; uploads, webhook e origem externa bloqueados.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
