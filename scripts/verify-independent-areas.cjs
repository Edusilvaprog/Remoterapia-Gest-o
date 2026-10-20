const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=path.resolve(__dirname,'../Remoterapia-Gestão'),ts=require(path.join(app,'node_modules/typescript')),React=require(path.join(app,'node_modules/react')),jsx=require(path.join(app,'node_modules/react/jsx-runtime'));
const sections=['clientes','agendamentos','eventos','bloqueios','planos'],noop=()=>null;
const hooks={useState:value=>[typeof value==='function'?value():value,noop],useEffect:noop,useCallback:fn=>fn,useRef:value=>({current:value})};
const Navigation=()=>null;
function load(relative,overrides={}){const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(app,relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(code,{exports,Date,console,require:name=>{
 if(name in overrides)return overrides[name];if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;if(name==='@/components/AppBottomNav')return {default:Navigation};
 if(name.startsWith('@/components/'))return new Proxy({},{get:()=>noop});if(name.startsWith('@/lib/'))return new Proxy({},{get:()=>()=>{throw Error('Unexpected request during render: '+name)}});throw Error(name);
 }});return exports.default;}
function all(node,predicate,result=[]){if(!node||typeof node!=='object')return result;if(Array.isArray(node)){node.forEach(child=>all(child,predicate,result));return result;}if(predicate(node))result.push(node);all(node.props?.children,predicate,result);return result;}
const Portal=load('app/gestao/portal/PortalClient.tsx');
for(const section of sections){const tree=Portal({section});const panes=all(tree,node=>typeof node.props?.className==='string'&&node.props.className.split(' ').includes('rt-module-'+section));assert.equal(panes.length,1,section+' has exactly its own pane');
 for(const other of sections.filter(value=>value!==section))assert.equal(all(tree,node=>typeof node.props?.className==='string'&&node.props.className.split(' ').includes('rt-module-'+other)).length,0,other+' must not leak into '+section);
 assert.equal(all(tree,node=>node.type===Navigation).length,0,'combined tab strip is absent');
 const route=fs.readFileSync(path.join(app,'app/gestao',section,'page.tsx'),'utf8');assert(route.includes('section="'+section+'"'));
}
let profile={role:'recepcao',roles:[],nome:'Teste'};
const redirects={redirect:route=>{throw Error('REDIRECT '+route)}};
const Page=load('components/ManagementSectionPage.tsx',{'next/navigation':redirects,'@/lib/actions/auth':{getPerfilAtual:async()=>profile},'@/app/gestao/portal/PortalClient':{default:Portal}});
(async()=>{for(const section of sections){const tree=await Page({section});assert.equal(tree.props['data-management-section'],section);assert.equal(all(tree,node=>node.type===Portal)[0].props.section,section);}
 profile={role:'instrutor',roles:[],nome:'Teste'};await assert.rejects(()=>Page({section:'clientes'}),/REDIRECT \/gestao\/painel/);
 profile={role:'instrutor',roles:['recepcao'],nome:'Teste'};assert.equal((await Page({section:'clientes'})).props['data-management-section'],'clientes','existing combined staff profiles remain supported');
 profile=null;await assert.rejects(()=>Page({section:'eventos'}),/REDIRECT \/gestao\/login/);
 const Alias=load('app/gestao/portal/page.tsx',{'next/navigation':redirects});assert.throws(()=>Alias(),/REDIRECT \/gestao\/agendamentos/);
 console.log('OK: cinco áreas independentes; cada tela exibe apenas seu conteúdo; perfil e login exigidos; endereço antigo compatível.');
})().catch(error=>{console.error(error);process.exitCode=1});
