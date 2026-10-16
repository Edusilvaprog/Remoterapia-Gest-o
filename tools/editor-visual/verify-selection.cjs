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
function load(file,standalone=false){
 const documentEvents={},windowEvents={},sent=[],observers=[],tasks=new Map(),input={disabled:false,isConnected:true};let queries=0;
 const doc={styleSheets:[],querySelector:()=>null,querySelectorAll:selector=>selector==='input,select,textarea'?[input]:[],documentElement:{toggleAttribute(){}},head:{appendChild(){}},body:{},getElementById:()=>null,createElement:()=>({}),createRange:()=>({selectNodeContents(){}}),addEventListener:(type,fn)=>documentEvents[type]=fn,removeEventListener(){}};
 const win={location:{pathname:'/',search:'',hash:''},parent:{postMessage:data=>sent.push(data)},addEventListener:(type,fn)=>windowEvents[type]=fn,getSelection:()=>({removeAllRanges(){},addRange(){}})};
 if(standalone)win.parent=win;
 const query=doc.querySelectorAll;doc.querySelectorAll=selector=>{queries++;return query(selector)};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>name==='react'?{useEffect:callback=>callback()}:{inspectMoveLayout:()=>({id:'',items:[]})},process:{env:{NODE_ENV:'development'}},window:win,document:doc,Element,HTMLElement:Element,HTMLLinkElement:Element,MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this)}observe(){} disconnect(){}},getComputedStyle:()=>({display:'block'}),setTimeout:fn=>{tasks.set(fn,fn);return fn},clearTimeout:id=>tasks.delete(id)});
 exports.default();if(!standalone)windowEvents.message({source:win.parent,origin:'http://localhost:3010',data:{type:'rt-visual-preview',css:'',editing:true}});
 return {events:documentEvents,windowEvents,sent,input,observers,tasks,win,queries:()=>queries,mode:editing=>windowEvents.message({source:win.parent,origin:'http://localhost:3010',data:{type:'rt-editor-mode',editing}})};
}
function event(target,altKey=false){return {target,altKey,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};}
const files=['VisualPreviewBridge.tsx','../../Remoterapia-Portal/components/ui/VisualPreviewBridge.tsx','../../Remoterapia-Gestão/components/ui/VisualPreviewBridge.tsx'].map(file=>path.join(__dirname,file));
assert.equal(fs.readFileSync(files[0],'utf8'),fs.readFileSync(files[1],'utf8'));assert.equal(fs.readFileSync(files[0],'utf8'),fs.readFileSync(files[2],'utf8'));
for(const file of files){
 const standalone=load(file,true);assert.equal(standalone.observers.length,0);assert.equal(Object.keys(standalone.events).length,0);assert.equal(Object.keys(standalone.windowEvents).length,0,'Direct app installs no editor handlers');
 const harness=load(file),{events,sent,input,mode}=harness,copy=new Element({rtCopyId:'copy-123456abcdef'}),area=new Element({rtArea:'area-123456abcdef'});
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
 const before=harness.queries();harness.win.location.pathname='/gestao/admin';harness.observers[0].callback([]);assert.equal(harness.queries(),before,'Navigation performs no DOM inspection');assert.equal(harness.tasks.size,0,'Navigation schedules no geometry work');assert.equal(sent.at(-1).page,'/gestao/admin','Route tracking remains active without scanning');
 mode(true);assert.equal(input.disabled,true);click=event(icon);events.click(click);assert.equal(click.prevented,true,'editing intercepts application actions');
 assert(harness.queries()>before,'Editing discovers selectable targets');
}
console.log('OK: seleção/inline/modos; app direto sem handlers; Navegar sem varredura; rotas acompanhadas; bridges sincronizados.');
