const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../Remoterapia-Gestão'),ts=require(path.join(root,'node_modules/typescript'));
const after=fs.readFileSync(path.join(root,'proxy.ts'),'utf8');

function setup(source,scenario){
 const exports={},requests=[];
 const response=(kind,url)=>({kind,url:url?.toString(),cookies:{values:[],set(...args){this.values.push(args)},getAll(){return this.values.map(args=>args[0])}}});
 const supabase={auth:{getUser:async()=>({data:{user:scenario.user?{id:'test-user'}:null},error:scenario.authError?Error('denied'):null}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:scenario.aal2?'aal2':'aal1',nextLevel:scenario.enrolled?'aal2':'aal1'},error:scenario.mfaError?Error('MFA error'):null})}}};
 const modules={'@/lib/local-preview-client':{localPreviewEnabled:()=>scenario.dev===true&&scenario.local===true},'@supabase/ssr':{createServerClient:(url,key,options)=>{requests.push({url,key,cookieName:options.cookieOptions.name});options.cookies.setAll([{name:'session-refresh',value:'opaque',options:{httpOnly:true}}]);return supabase}},'next/server':{NextResponse:{next:()=>response('next'),redirect:url=>response('redirect',url)}}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>{if(!modules[n])throw Error(n);return modules[n]},process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test'}},URL});
 return {handler:exports.proxy||exports.middleware,requests};
}
async function main(){
 const scenarios=[{name:'protected-guest',path:'/gestao/admin',expected:'redirect',to:'/gestao/login'}, {name:'login-guest',path:'/gestao/login',expected:'next'}, {name:'invalid-auth',path:'/gestao/admin',user:true,authError:true,expected:'redirect',to:'/gestao/login'}, {name:'signed-login',path:'/gestao/login',user:true,expected:'redirect',to:'/gestao/selecionar-area'}, {name:'enrolled-mfa',path:'/gestao/admin',user:true,enrolled:true,expected:'redirect',to:'/gestao/seguranca'}, {name:'mfa-verified',path:'/gestao/admin',user:true,enrolled:true,aal2:true,expected:'next'}, {name:'mfa-error',path:'/gestao/admin',user:true,mfaError:true,expected:'redirect',to:'/gestao/seguranca'}, {name:'recovery-route',path:'/gestao/redefinir-senha',user:true,enrolled:true,expected:'next'}, {name:'preview-dev',path:'/gestao/admin',dev:true,local:true,expected:'next'}, {name:'production-preview-flag',path:'/gestao/admin',local:true,expected:'redirect',to:'/gestao/login'}];
 for(const scenario of scenarios){const url='https://gestao.example'+scenario.path;const req=()=>({nextUrl:{pathname:scenario.path,clone:()=>new URL(url)},cookies:{getAll:()=>[],set(){}}});const next=setup(after,scenario);const updated=await next.handler(req());assert.equal(updated.kind,scenario.expected);if(scenario.to)assert.equal(new URL(updated.url).pathname,scenario.to);if(next.requests.length)assert.equal(next.requests[0].cookieName,'sb-remoterapia-gestao-auth-token');}
 console.log('OK: 10 cenários; login, cookies separados, recuperação e MFA preservados; prévia bloqueada em produção.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
