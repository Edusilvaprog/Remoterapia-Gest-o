const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {emptyState,validateState,generateCss,contentFor,catalog}=require('./style-engine.cjs');
const localData=require('./local-data.cjs');
const projectCandidate=path.resolve(__dirname,'../..');
const ROOT=projectCandidate;
if(!fs.existsSync(path.join(ROOT,'original-preservado.json')))throw Error('Editor permitido apenas na versão isolada.');
const CSS_FILES={gestao:path.join(ROOT,'Remoterapia-Gestão/app/visual-custom.css'),portal:path.join(ROOT,'Remoterapia-Portal/app/visual-custom.css')};
const CONTENT_FILES=Object.fromEntries(Object.entries(CSS_FILES).map(([app,file])=>[app,path.join(path.dirname(file),'visual-content.json')]));
const STATE_FILE=path.join(__dirname,'visual-settings.json'),HISTORY_FILE=path.join(__dirname,'previous-settings.json');
const origins=new Set(['http://127.0.0.1:3010','http://localhost:3010']);
let saving=false;
function readState(){return fs.existsSync(STATE_FILE)?validateState(JSON.parse(fs.readFileSync(STATE_FILE,'utf8'))):emptyState();}
function readHistory(){return fs.existsSync(HISTORY_FILE)?JSON.parse(fs.readFileSync(HISTORY_FILE,'utf8')):null;}
function atomic(file,body){const temp=file+'.tmp';fs.writeFileSync(temp,body,'utf8');fs.renameSync(temp,file);}
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function persist(state){
  const old=readState();const oldFiles=Object.fromEntries([...Object.values(CSS_FILES),...Object.values(CONTENT_FILES)].map(f=>[f,fs.readFileSync(f,'utf8')]));
  atomic(HISTORY_FILE,JSON.stringify(old,null,2));
  try{for(const [app,file] of Object.entries(CSS_FILES)){atomic(file,generateCss(state[app]));atomic(CONTENT_FILES[app],JSON.stringify(contentFor(state[app]),null,2));}atomic(STATE_FILE,JSON.stringify(state,null,2));}
  catch(error){for(const [file,body] of Object.entries(oldFiles))atomic(file,body);atomic(STATE_FILE,JSON.stringify(old,null,2));throw error;}
}
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
  if(req.method==='GET'&&url.pathname==='/api/state'){try{const state=readState();return reply(res,200,{isolated:true,mode:process.env.NEXT_PUBLIC_LOCAL_PREVIEW==='1'?'local-preview':'isolated',state,catalog:catalog(),canUndo:!!readHistory(),css:Object.fromEntries(Object.keys(CSS_FILES).map(app=>[app,generateCss(state[app])]))});}catch{return reply(res,500,{error:'As configurações salvas precisam ser verificadas. Nenhum arquivo foi alterado.'});}}
  if(req.method!=='POST'||!['/api/preview','/api/save','/api/undo'].includes(url.pathname))return reply(res,404,{error:'Página não encontrada.'});
  if(!origins.has(req.headers.origin))return reply(res,403,{error:'Abra o painel local para editar.'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(res,415,{error:'Formato de envio inválido.'});
  req.setEncoding('utf8');
  let raw='';try{for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>200000){return reply(res,413,{error:'Envio excedeu o limite.'});}}
    if(saving && url.pathname!=='/api/preview')return reply(res,409,{error:'Aguarde o salvamento em andamento.'});
    const data=JSON.parse(raw||'{}');
    const history=url.pathname==='/api/undo'?readHistory():null;if(url.pathname==='/api/undo'&&!history)throw Error('Nenhum salvamento para desfazer.');
    const state=url.pathname==='/api/undo'?validateState(history):validateState(data.state);
    if(url.pathname!=='/api/preview'){saving=true;try{persist(state);if(url.pathname==='/api/undo')atomic(HISTORY_FILE,'null');}finally{saving=false;}}
    return reply(res,200,{state,css:Object.fromEntries(Object.keys(CSS_FILES).map(app=>[app,generateCss(state[app])])),canUndo:!!readHistory()});
  }catch(error){return reply(res,400,{error:error.code==='ENOENT'?'Nenhum salvamento para desfazer.':error.message});}
});
if(require.main===module)server.listen(3010,'127.0.0.1',()=>console.log('Painel visual: http://127.0.0.1:3010'));
module.exports={server};
