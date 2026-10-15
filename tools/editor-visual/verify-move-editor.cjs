const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),geometry=require('./move-geometry.js');
const nodes=new Map(),globalEvents={},windowEvents={},commits=[];
class Node{
 constructor(){this.children=[];this.style={setProperty(){}};this.events={};this.checked=true;this.classList={add(){},remove(){}};}
 set id(value){this.name=value;nodes.set(value,this);}get id(){return this.name;}
 setAttribute(){}append(...children){this.children.push(...children);}replaceChildren(){this.children=[];}focus(){}
 addEventListener(type,fn){this.events[type]=fn;}setPointerCapture(id){this.pointer=id;}releasePointerCapture(){this.pointer=null;}
 getBoundingClientRect(){return {left:100,top:100,width:200,height:100};}
 fire(type,data={}){this.events[type]?.({preventDefault(){},stopPropagation(){},button:0,pointerId:1,...data});}
}
for(const id of ['stage','preview','guides','move-tools','move-fixed','move-position','move-help']){const node=new Node();node.id=id;}
const document={getElementById:id=>nodes.get(id),createElement:()=>new Node(),addEventListener:(type,fn)=>globalEvents[type]=fn};
const window={RtMoveGeometry:geometry,addEventListener:(type,fn)=>windowEvents[type]=fn};
vm.runInNewContext(fs.readFileSync(__dirname+'/move-editor.js','utf8'),{window,document,setTimeout,clearTimeout});
let ui;const metrics={width:400,height:200,scale:.5};ui=window.createMoveEditor({commit:ids=>commits.push(Array.from(ids)),resize:()=>ui.resize(metrics),remember(){}});ui.resize(metrics);
const layout={id:'a',bounds:{left:0,top:0,width:400,height:100},items:['a','b','c','d'].map((id,index)=>({id,rect:{left:index*100,top:0,width:100,height:100}}))};
ui.setLayout(layout);const handle=nodes.get('move-handle');assert.equal(handle.hidden,false);assert.equal(nodes.get('stage').style.width,'220px');
function drag(dx){handle.fire('pointerdown',{clientX:100,clientY:100});handle.fire('pointermove',{clientX:100+dx,clientY:100});}
drag(100);handle.fire('pointerup');assert.deepEqual(commits,[['b','c','a','d']],'screen delta is converted through zoom into a single reorder');
assert.equal(nodes.get('move-ghost').hidden,true);assert.equal(nodes.get('move-drop').hidden,true);
drag(50);globalEvents.keydown({key:'Escape',preventDefault(){}});handle.fire('pointerup');assert.equal(commits.length,1,'Escape cancels');
drag(400);handle.fire('pointerup');assert.equal(commits.length,1,'outside the group cancels');
drag(50);handle.fire('pointercancel');assert.equal(commits.length,1);
drag(50);ui.setMode(false);handle.fire('pointerup');assert.equal(commits.length,1);assert.equal(handle.hidden,true);assert.equal(nodes.get('move-ruler-x').hidden,true);assert.equal(nodes.get('stage').style.width,'200px');
ui.setMode(true);ui.setLayout(layout);nodes.get('move-position').value='4';nodes.get('move-position').fire('change');assert.deepEqual(commits.at(-1),['b','c','d','a']);
nodes.get('guides').checked=false;nodes.get('guides').fire('change');assert.equal(nodes.get('move-ruler-y').hidden,true);
console.log('OK: ponteiro com zoom, soltura única, Esc, cancelamento, limite do grupo, modos, réguas e teclado.');
