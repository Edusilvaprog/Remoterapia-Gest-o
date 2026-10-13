const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {emptyState,validateState,generateCss,catalog,contentFor}=require('./style-engine.cjs');
const initial=emptyState();
assert.deepEqual(validateState(initial),initial);
for(const bad of [{gestao:{desktop:{canvas:'red;display:none'}}},{gestao:{desktop:{buttonHeight:1}}},{gestao:{desktop:{path:'../../secret'}}},{unknown:{}},{gestao:{desktop:{font:'unknown'}}}])assert.throws(()=>validateState(bad));
const edited=emptyState();edited.gestao.desktop={canvas:'#E8F4F7',buttonRadius:15.2};
const valid=validateState(edited);assert.equal(valid.gestao.desktop.canvas,'#e8f4f7');assert.equal(valid.gestao.desktop.buttonRadius,15);
const css=generateCss(valid.gestao);assert(css.includes('@layer rt-visual-custom'));assert(!generateCss(initial.gestao).includes('!important'));assert(css.indexOf('#e8f4f7')>css.indexOf('min-width:1024px'));assert(!css.slice(0,css.indexOf('min-width:1024px')).includes('#e8f4f7'));assert(css.length<15000);
const entries=catalog();
for(const app of ['gestao','portal']){
 const copy=Object.keys(entries[app]).find(id=>entries[app][id].kind==='text'),area=Object.keys(entries[app]).find(id=>entries[app][id].kind==='area'&&entries[app][id].canAdd!==false),protectedArea=Object.keys(entries[app]).find(id=>entries[app][id].kind==='area'&&!entries[app][id].canHide);
 assert(copy&&area&&protectedArea);
 const content=emptyState();content[app].mobile={texts:{[copy]:'Mensagem <script>literal</script>'},slots:{[area]:[{id:'block-123456789abc',type:'notice',title:'Aviso',body:'Nova mensagem'}]}};
 const cleaned=validateState(content);assert.deepEqual(contentFor(cleaned[app]).desktop,{texts:{},slots:{}});assert.equal(contentFor(cleaned[app]).mobile.texts[copy],'Mensagem <script>literal</script>');
 const bad=emptyState();bad[app].mobile={elements:{[protectedArea]:{hidden:true}}};assert.throws(()=>validateState(bad));
 const badLink=emptyState();badLink[app].mobile={slots:{[area]:[{id:'block-123456789abc',type:'link',title:'Link',body:'Mensagem',href:'javascript:alert(1)'}]}};assert.throws(()=>validateState(badLink));
 const unknown=emptyState();unknown[app].mobile={texts:{'copy-000000000000':'Não cadastrado'}};assert.throws(()=>validateState(unknown));
}
const root='C:/Users/Admin/Documents/remoterapia-v2';
const ts=require(path.join(root,'Remoterapia-Gestão/node_modules/typescript'));
(async()=>{
 for(const app of ['Remoterapia-Gestão','Remoterapia-Portal']){
  const source=fs.readFileSync(path.join(root,app,'next.config.ts'),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  for(const mode of ['production','development']){
   const context={exports:{},process:{env:{NODE_ENV:mode}}};vm.runInNewContext(code,context);
   const headers=(await context.exports.default.headers())[0].headers;
   const csp=headers.find(h=>h.key==='Content-Security-Policy').value;
   const frame=headers.find(h=>h.key==='X-Frame-Options');
   if(mode==='production'){assert.equal(frame.value,'DENY');assert(csp.includes("frame-ancestors 'none'"));assert(!csp.includes('3010'));}
   else{assert.equal(frame,undefined);assert(csp.startsWith('frame-ancestors http://127.0.0.1:3010 http://localhost:3010;'));}
  }
 }
 console.log('OK: limites, textos/blocos, rotas de botão, áreas protegidas, isolamento celular/computador e proteção de produção nos dois sites.');
})().catch(error=>{console.error(error);process.exitCode=1;});
