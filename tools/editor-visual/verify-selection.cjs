// Exercises the real bridge handlers without requiring browser automation inside an iframe.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('../../Remoterapia-Portal/node_modules/typescript');
class Element {
 constructor(dataset={},matches={}){this.dataset=dataset;this.matches=matches;this.children=[];this.classList={contains:()=>false};}
 closest(selector){return this.matches[selector]||null;}
 querySelectorAll(){return this.copies||[];}
 getClientRects(){return [1];}
 setAttribute(){} removeAttribute(){} focus(){} addEventListener(name,fn){this[name]=fn;} blur(){this.blurHandler?.();}
}
function load(file){
 const documentEvents={},windowEvents={},sent=[];
 const doc={styleSheets:[],querySelectorAll:()=>[],documentElement:{toggleAttribute(){}},head:{appendChild(){}},body:{},getElementById:()=>null,createElement:()=>({}),createRange:()=>({selectNodeContents(){}}),addEventListener:(type,fn)=>documentEvents[type]=fn,removeEventListener(){}};
 const win={parent:{postMessage:data=>sent.push(data)},addEventListener:(type,fn)=>windowEvents[type]=fn,getSelection:()=>({removeAllRanges(){},addRange(){}})};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:()=>({useEffect:callback=>callback()}),process:{env:{NODE_ENV:'development'}},window:win,document:doc,Element,HTMLElement:Element,HTMLLinkElement:Element,MutationObserver:class{observe(){} disconnect(){}},getComputedStyle:()=>({display:'block'}),setTimeout,clearTimeout});
 exports.default();windowEvents.message({source:win.parent,origin:'http://localhost:3010',data:{type:'rt-visual-preview',css:'',editing:true}});
 return {events:documentEvents,sent};
}
function event(target,altKey=false){return {target,altKey,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};}
const files=['VisualPreviewBridge.tsx','../../Remoterapia-Portal/components/ui/VisualPreviewBridge.tsx','../../Remoterapia-Gestão/components/ui/VisualPreviewBridge.tsx'].map(file=>path.join(__dirname,file));
assert.equal(fs.readFileSync(files[0],'utf8'),fs.readFileSync(files[1],'utf8'));assert.equal(fs.readFileSync(files[0],'utf8'),fs.readFileSync(files[2],'utf8'));
for(const file of files){
 const {events,sent}=load(file),copy=new Element({rtCopyId:'copy-123456abcdef'}),area=new Element({rtArea:'area-123456abcdef'});
 copy.matches['[data-rt-copy-id]']=copy;copy.matches['[data-rt-area]']=area;
 let click=event(copy);events.click(click);assert.equal(sent.at(-1).id,copy.dataset.rtCopyId);assert.ok(click.prevented&&click.stopped);
 const button=new Element();button.copies=[copy];const icon=new Element({}, {'button,a,h1,h2,h3,h4,label,summary':button,'[data-rt-area]':area});
 events.click(event(icon));assert.equal(sent.at(-1).id,copy.dataset.rtCopyId,'icon resolves its single label');
 click=event(icon,true);const count=sent.length;events.click(click);assert.equal(sent.length,count);assert.equal(click.prevented,undefined,'Alt preserves navigation');
 const text=new Element();text.textContent='Original';text.addEventListener=(name,fn)=>{if(name==='blur')text.blurHandler=fn;};text.blur=()=>text.blurHandler();copy.children=[text];
 events.dblclick(event(icon));assert.equal(text.contentEditable,'plaintext-only');text.textContent='Novo nome';text.blur();assert.equal(sent.at(-1).type,'rt-inline-text');assert.equal(sent.at(-1).text,'Novo nome');
 const extra=new Element({rtExtraId:'block-123456abcdef',rtExtraParent:area.dataset.rtArea});events.click(event(new Element({}, {'[data-rt-extra-id]':extra})));assert.equal(sent.at(-1).kind,'extra');
}
console.log('OK: texto, ícone, bloco, duplo clique, edição inline e Alt; bridges sincronizados.');
