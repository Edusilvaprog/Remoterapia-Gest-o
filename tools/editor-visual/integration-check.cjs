const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),url='http://localhost:3010';
assert(fs.existsSync(path.join(root,'original-preservado.json')),'Teste permitido somente na versão isolada.');
async function post(route,state){const response=await fetch(url+route,{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({state})});const result=await response.json();assert.equal(response.status,200,result.error);return result;}
(async()=>{
 const baseline=await(await fetch(url+'/api/state')).json();
 for(const app of ['gestao','portal'])for(const view of ['mobile','desktop'])assert.deepEqual(baseline.state[app][view],{},'Há edições reais salvas; teste interrompido para preservá-las.');
 assert.equal(baseline.canUndo,false);
 const copy=Object.keys(baseline.catalog.gestao).find(id=>baseline.catalog.gestao[id].label==='Um bom dia começa com clareza');assert(copy);
 const draft=structuredClone(baseline.state);draft.gestao.mobile={canvas:'#e8f4f7',texts:{[copy]:'Ação e organização para você'}};
 let restore=false;
 try{
  const result=await post('/api/save',draft);restore=true;assert.equal(result.canUndo,true);
  const content=JSON.parse(fs.readFileSync(path.join(root,'Remoterapia-Gestão/app/visual-content.json'),'utf8'));assert.equal(content.mobile.texts[copy],'Ação e organização para você');assert.deepEqual(content.desktop,{texts:{},slots:{}});
  const css=fs.readFileSync(path.join(root,'Remoterapia-Gestão/app/visual-custom.css'),'utf8');assert(css.slice(0,css.indexOf('min-width:1024px')).includes('#e8f4f7'));assert(!css.slice(css.indexOf('min-width:1024px')).includes('#e8f4f7'));
  const undone=await post('/api/undo',{});restore=false;assert.deepEqual(undone.state,baseline.state);assert.equal(undone.canUndo,false);
  const repeat=await fetch(url+'/api/undo',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:'{}'});assert.equal(repeat.status,400);
  console.log('OK: salvamento real, acentos, arquivos dos sites, isolamento móvel/computador e desfazer uma vez. Aparência original restaurada.');
 }finally{if(restore)await post('/api/undo',{});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
