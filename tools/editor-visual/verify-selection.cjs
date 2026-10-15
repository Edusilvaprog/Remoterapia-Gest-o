// Exercises the real bridge handlers without requiring browser automation inside an iframe.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('../../Remoterapia-Portal/node_modules/typescript');
class Element {
 constructor(dataset={},matches={}){this.dataset=dataset;this.matches=matches;this.children=[];this.parentElement=null;this.attributes={};this.classList={contains:()=>false};}
 closest(selector){if(this.matches[selector])return this.matches[selector];if(selector.includes('[data-rt-control-id]')&&['rtCopyId','rtControlId','rtPartId','rtExtraId','rtArea'].some(key=>this.dataset[key]))return this;return this.parentElement?.closest(selector)||null;}
 querySelectorAll(){return this.copies||[];}
 getClientRects(){return [1];}
 setAttribute(key,value){this.attributes[key]=value;} removeAttribute(key){delete this.attributes[key];} focus(){} addEventListener(name,fn){this[name]=fn;} blur(){this.blurHandler?.();}
}
function load(file){
 const documentEvents={},windowEvents={},sent=[],input={disabled:false};
 const doc={styleSheets:[],querySelector:()=>null,querySelectorAll:selector=>selector==='input,select,textarea'?[input]:[],documentElement:{toggleAttribute(){}},head:{appendChild(){}},body:{},getElementById:()=>null,createElement:()=>({}),createRange:()=>({selectNodeContents(){}}),addEventListener:(type,fn)=>documentEvents[type]=fn,removeEventListener(){}};
 const win={location:{pathname:'/',search:'',hash:''},parent:{postMessage:data=>sent.push(data)},addEventListener:(type,fn)=>windowEvents[type]=fn,getSelection:()=>({removeAllRanges(){},addRange(){}})};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>name==='react'?{useEffect:callback=>callback()}:{inspectMoveLayout:()=>({id:'',items:[]})},process:{env:{NODE_ENV:'development'}},window:win,document:doc,Element,HTMLElement:Element,HTMLLinkElement:Element,MutationObserver:class{observe(){} disconnect(){}},getComputedStyle:()=>({display:'block'}),setTimeout,clearTimeout});
 exports.default();windowEvents.message({source:win.parent,origin:'http://localhost:3010',data:{type:'rt-visual-preview',css:'',editing:true}});
 return {events:documentEvents,sent,input,mode:editing=>windowEvents.message({source:win.parent,origin:'http://localhost:3010',data:{type:'rt-editor-mode',editing}})};
}
function event(target,altKey=false){return {target,altKey,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};}
const files=['VisualPreviewBridge.tsx','../../Remoterapia-Portal/components/ui/VisualPreviewBridge.tsx','../../Remoterapia-Gestão/components/ui/VisualPreviewBridge.tsx'].map(file=>path.join(__dirname,file));
assert.equal(fs.readFileSync(files[0],'utf8'),fs.readFileSync(files[1],'utf8'));assert.equal(fs.readFileSync(files[0],'utf8'),fs.readFileSync(files[2],'utf8'));
for(const file of files){
 const {events,sent,input,mode}=load(file),copy=new Element({rtCopyId:'copy-123456abcdef'}),area=new Element({rtArea:'area-123456abcdef'});
 copy.matches['[data-rt-copy-id]']=copy;copy.matches['[data-rt-area]']=area;
 let click=event(copy);events.click(click);assert.equal(sent.at(-1).id,copy.dataset.rtCopyId);assert.ok(click.prevented&&click.stopped);
 const button=new Element({rtControlId:'control-123456abcdef'}),small=new Element({rtPartId:'part-123456abcdef'});button.copies=[copy];copy.parentElement=button;button.parentElement=small;small.parentElement=area;
 const icon=new Element({}, {'button,a,h1,h2,h3,h4,label,summary':button,'[data-rt-area]':area});icon.parentElement=button;
 events.click(event(icon));assert.equal(sent.at(-1).id,button.dataset.rtControlId,'icon selects the button, not its outer panel');assert.deepEqual(Array.from(sent.at(-1).path,item=>item.id),[button.dataset.rtControlId,small.dataset.rtPartId,area.dataset.rtArea]);
 events.click(event(small));assert.equal(sent.at(-1).id,small.dataset.rtPartId,'small block remains selectable');
 const unavailable=new Element({}, {'button,a,summary,[role="button"]':new Element()});unavailable.parentElement=area;events.click(event(unavailable));assert.equal(sent.at(-1).type,'rt-selection-unavailable','unknown icon control never selects its large surrounding panel');
 events.click(event(copy));assert.equal(sent.at(-1).id,copy.dataset.rtCopyId,'words remain editable inside a button');
 events.mouseover(event(area));events.mouseover(event(icon));assert.equal(area.attributes['data-rt-hovered'],undefined);assert.equal(button.attributes['data-rt-hovered'],'true');
 click=event(icon,true);const count=sent.length;events.click(click);assert.equal(sent.length,count);assert.equal(click.prevented,undefined,'Alt preserves navigation');
 const text=new Element();text.textContent='Original';text.addEventListener=(name,fn)=>{if(name==='blur')text.blurHandler=fn;};text.blur=()=>text.blurHandler();copy.children=[text];
 events.dblclick(event(icon));assert.equal(text.contentEditable,'plaintext-only');text.textContent='Novo nome';text.blur();assert.equal(sent.at(-1).type,'rt-inline-text');assert.equal(sent.at(-1).text,'Novo nome');
 const extra=new Element({rtExtraId:'block-123456abcdef',rtExtraParent:area.dataset.rtArea});events.click(event(extra));assert.equal(sent.at(-1).kind,'extra');
 assert.equal(input.disabled,true);mode(false);assert.equal(input.disabled,false);click=event(icon);events.click(click);assert.equal(click.prevented,undefined,'navigation allows application actions');
 mode(true);assert.equal(input.disabled,true);click=event(icon);events.click(click);assert.equal(click.prevented,true,'editing intercepts application actions');
}
console.log('OK: texto/botão/bloco menor, hierarquia, destaque único, edição inline e Navegar/Editar; bridges sincronizados.');
