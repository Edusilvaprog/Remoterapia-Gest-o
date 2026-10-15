const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const geometry=require('./move-geometry.js'),engine=require('./style-engine.cjs'),ts=require('../../Remoterapia-Portal/node_modules/typescript');
const ids=Object.keys(engine.catalog().gestao).filter(id=>id.startsWith('part-')).slice(0,4);
assert.deepEqual(geometry.reorder(ids,ids[0],ids[3]),[ids[1],ids[2],ids[3],ids[0]]);
assert.deepEqual(geometry.reorder(ids,ids[3],ids[0]),[ids[3],ids[0],ids[1],ids[2]]);
assert.throws(()=>geometry.reorder(ids,'missing',ids[0]));assert.equal(ids.length,4);
const items=ids.map((id,index)=>({id,rect:{left:index%2*110,top:Math.floor(index/2)*80,width:100,height:60}})),bounds={left:0,top:0,width:210,height:140};
assert.equal(geometry.targetAt(items,170,110,bounds).id,ids[3]);assert.equal(geometry.targetAt(items,-30,0,bounds),null);
class Element{
 constructor(id,display='block',rect={left:0,top:0,width:100,height:60}){this.dataset=id?{rtPartId:id}:{};this.children=[];this.parentElement=null;this.rect=rect;this.computed={display,position:'static',order:'0',gridRowStart:'auto',gridColumnStart:'auto',flexDirection:'row',flexWrap:'nowrap'};this.classList={contains:()=>false};}
 getClientRects(){return [this.rect];}getBoundingClientRect(){return this.rect;}matches(){return false;}
}
const output={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'VisualMoveLayout.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:output,HTMLElement:Element,window:{innerWidth:1440},getComputedStyle:element=>element.computed});
const parent=new Element(null,'grid',bounds);parent.children=ids.map((id,index)=>new Element(id,'block',items[index].rect));parent.children.forEach(element=>element.parentElement=parent);
const identify=element=>element.dataset.rtPartId?{id:element.dataset.rtPartId,kind:'area'}:null;
let inspected=output.inspectMoveLayout(parent.children[0],identify);assert.deepEqual(Array.from(inspected.items,item=>item.id),ids);
parent.children[0].computed.order='4';parent.children[1].computed.order='1';parent.children[2].computed.order='2';parent.children[3].computed.order='3';
inspected=output.inspectMoveLayout(parent.children[0],identify);assert.deepEqual(Array.from(inspected.items,item=>item.id),[ids[1],ids[2],ids[3],ids[0]]);assert.equal(parent.children[0].dataset.rtPartId,ids[0],'React nodes keep their original ownership and DOM order');
parent.children[1].computed.gridRowStart='1';assert.equal(output.inspectMoveLayout(parent.children[0],identify).items.length,0,'anchored grid is protected');parent.children[1].computed.gridRowStart='auto';
parent.children[1].computed.position='absolute';assert.equal(output.inspectMoveLayout(parent.children[0],identify).items.length,0);parent.children[1].computed.position='static';
const state=engine.emptyState();state.gestao.desktop.orders=[[ids[2],ids[0],ids[1],ids[3]]];
const clean=engine.validateState(state);assert.deepEqual(clean.gestao.desktop.orders,state.gestao.desktop.orders);assert.deepEqual(clean.gestao.mobile,{});const css=engine.generateCss(clean.gestao);assert.match(css,new RegExp(`data-rt-part-id="${ids[2]}"[^}]+order:1!important`));
const invalid=engine.emptyState();invalid.gestao.desktop.orders=[[ids[0],ids[0]]];assert.throws(()=>engine.validateState(invalid));invalid.gestao.desktop.orders=[[ids[0],'part-000000000000']];assert.throws(()=>engine.validateState(invalid));
const copy=Object.keys(engine.catalog().gestao).find(id=>id.startsWith('copy-'));invalid.gestao.desktop.orders=[[ids[0],copy]];assert.throws(()=>engine.validateState(invalid));
for(const file of ['VisualMoveLayout.ts','VisualPreviewBridge.tsx'])for(const app of ['Remoterapia-Gestão','Remoterapia-Portal'])assert.equal(fs.readFileSync(path.join(__dirname,file),'utf8'),fs.readFileSync(path.join(__dirname,'../../',app,'components/ui',file),'utf8'));
console.log('OK: reordenação em grade, limites, posições fixas, persistência, isolamento por versão e DOM preservado.');
