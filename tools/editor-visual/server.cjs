const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {APPS,emptyState,validateState,generateCss,catalog}=require('./style-engine.cjs');
const localData=require('./local-data.cjs');
const {createDraftStore}=require('./draft-store.cjs');
const projectCandidate=path.resolve(__dirname,'../..');
const ROOT=projectCandidate;
if(!fs.existsSync(path.join(ROOT,'original-preservado.json')))throw Error('Editor permitido apenas na versão isolada.');
const STATE_FILE=path.join(__dirname,'visual-settings.json');
const origins=new Set(['http://127.0.0.1:3010','http://localhost:3010']);
function readState(){return fs.existsSync(STATE_FILE)?validateState(JSON.parse(fs.readFileSync(STATE_FILE,'utf8'))):emptyState();}
const drafts=createDraftStore(path.join(__dirname,'.editor-draft.json'),readState);
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
const assets={'/':['index.html','text/html; charset=utf-8'],'/editor.js':['editor.js','text/javascript; charset=utf-8'],'/editor.css':['editor.css','text/css; charset=utf-8']};
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src http://localhost:3015 http://localhost:3016; frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
  if(!['127.0.0.1:3010','localhost:3010'].includes(req.headers.host))return reply(res,403,{error:'Endereço não autorizado.'});
  const url=new URL(req.url,'http://127.0.0.1:3010');
  if(['/api/local-data','/api/local-reset','/api/export-preview'].includes(url.pathname)){
    if(process.env.NEXT_PUBLIC_LOCAL_PREVIEW!=='1')return reply(res,404,{error:'Prévia local desativada.'});
    const caller=req.headers.origin;
    const allowed=['http://localhost:3010','http://127.0.0.1:3010','http://localhost:3015','http://127.0.0.1:3015','http://localhost:3016','http://127.0.0.1:3016'];
    if(caller&&!allowed.includes(caller))return reply(res,403,{error:'Origem não autorizada.'});
    if(caller){res.setHeader('Access-Control-Allow-Origin',caller);res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST, GET');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204);return res.end();}
    if(req.method==='GET'&&url.pathname==='/api/export-preview'){
      res.setHeader('Content-Disposition','attachment; filename="remoterapia-revisao-local.json"');
      return reply(res,200,{design:readState(),...localData.exportSnapshot(),notice:'Dados fictícios. Este arquivo documenta a revisão; não é uma migração SQL nem deve ser importado no banco real.'});
    }
    if(req.method!=='POST')return reply(res,405,{error:'Método não permitido.'});
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(res,415,{error:'Use JSON.'});
    if(url.pathname==='/api/local-reset'){if(!origins.has(caller))return reply(res,403,{error:'Reinicie os exemplos pelo painel visual.'});return reply(res,200,localData.reset());}
    req.setEncoding('utf8');let raw='';try{for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>100000)return reply(res,413,{error:'Dados locais excederam o limite.'});}return reply(res,200,localData.execute(JSON.parse(raw)));}catch{return reply(res,400,{error:'Dados locais inválidos.'});}
  }
  if(req.method==='GET'&&Object.hasOwn(assets,url.pathname)){const [name,type]=assets[url.pathname];res.setHeader('Content-Type',type);return fs.createReadStream(path.join(__dirname,name)).pipe(res);}
  if(url.pathname.startsWith('/api/editor/')){
    try {
      if(req.method==='GET'&&url.pathname==='/api/editor/state')return reply(res,200,{...drafts.get(),baseline:readState(),catalog:catalog()});
      const action={'/api/editor/draft':'save','/api/editor/undo':'undo','/api/editor/reset':'reset'}[url.pathname];
      if(req.method!=='POST'||!action)return reply(res,404,{error:'Página não encontrada.'});
      if(!origins.has(req.headers.origin))return reply(res,403,{error:'Abra o editor local para editar.'});
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(res,415,{error:'Use JSON.'});
      req.setEncoding('utf8');let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>200000)return reply(res,413,{error:'Rascunho excedeu o limite.'});}
      const data=JSON.parse(raw);return reply(res,200,drafts.mutate(action,data.revision,data.state));
    }catch(error){return reply(res,error.status||400,{error:error.message});}
  }
  if(req.method==='GET'&&url.pathname==='/api/state'){try{const state=readState();return reply(res,200,{isolated:true,mode:process.env.NEXT_PUBLIC_LOCAL_PREVIEW==='1'?'local-preview':'isolated',state,catalog:catalog(),canUndo:false,css:Object.fromEntries(APPS.map(app=>[app,generateCss(state[app])]))});}catch{return reply(res,500,{error:'As configurações salvas precisam ser verificadas. Nenhum arquivo foi alterado.'});}}
  // Applying a draft requires a future review workflow, never a button or legacy endpoint.
  if(['/api/save','/api/undo'].includes(url.pathname))return reply(res,409,{error:'Aplicação direta desativada. O editor mantém apenas rascunhos.'});
  if(req.method!=='POST'||url.pathname!=='/api/preview')return reply(res,404,{error:'Página não encontrada.'});
  if(!origins.has(req.headers.origin))return reply(res,403,{error:'Abra o painel local para editar.'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(res,415,{error:'Formato de envio inválido.'});
  req.setEncoding('utf8');
  let raw='';try{for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>200000){return reply(res,413,{error:'Envio excedeu o limite.'});}}
    const data=JSON.parse(raw||'{}');
    const state=validateState(data.state);
    return reply(res,200,{state,css:Object.fromEntries(APPS.map(app=>[app,generateCss(state[app])]))});
  }catch(error){return reply(res,400,{error:error.code==='ENOENT'?'Nenhum salvamento para desfazer.':error.message});}
});
if(require.main===module)server.listen(3010,'127.0.0.1',()=>console.log('Painel visual: http://127.0.0.1:3010'));
module.exports={server};
