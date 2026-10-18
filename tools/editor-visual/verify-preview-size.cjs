const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/editor.js','utf8');
const nodes=Object.fromEntries(['canvas','preview','stage','size','zoom','expand-preview','expand-label'].map(id=>[id,{style:{},value:'auto',attributes:{},setAttribute(key,value){this.attributes[key]=value;},addEventListener(type,fn){this[type]=fn;},focus(){this.focused=true;}}]));
const classes=new Set(),events={};let metrics;
const context=vm.createContext({$:id=>nodes[id],view:'desktop',moveUI:{gutter:()=>context.gutter,resize:value=>{metrics=value;nodes.stage.style.width=value.width*value.scale+context.gutter+'px';nodes.stage.style.height=value.height*value.scale+context.gutter+'px';}},gutter:0,
 getComputedStyle:()=>({paddingLeft:'12px',paddingRight:'12px',paddingTop:'8px',paddingBottom:'12px'}),
 document:{body:{classList:{toggle(name,on){on?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)}}},window:{addEventListener:(name,fn)=>events[name]=fn},ResizeObserver:class{observe(){}},cancelAnimationFrame(){},requestAnimationFrame(){}});
vm.runInContext(source.slice(source.indexOf('function size(){'),source.indexOf('function context(){')),context);
for(const [width,height,gutter] of [[360,450,0],[1200,640,20],[1900,1100,0],[500,180,20]]){
 Object.assign(nodes.canvas,{clientWidth:width,clientHeight:height});context.gutter=gutter;context.size();
 assert.ok(parseFloat(nodes.stage.style.width)<=width-24+.001,'desktop fits available width including rulers');
 assert.ok(parseFloat(nodes.stage.style.height)<=height-20+.001,'desktop fits available height including rulers');
 assert.ok(parseFloat(nodes.stage.style.height)>=height-21,'desktop uses the remaining height without a blank lower area');
 assert.equal(metrics.width,1440,'desktop keeps its own responsive layout');
}
nodes.zoom.value='1';context.size();assert.equal(metrics.scale,1,'manual zoom stays available');
nodes.zoom.value='auto';context.view='mobile';context.size();assert.equal(metrics.width,390);assert.equal(metrics.height,844);
nodes['expand-preview'].click();assert.ok(classes.has('preview-expanded'));assert.equal(nodes['expand-preview'].attributes['aria-pressed'],'true');
events.keydown({key:'Escape'});assert.ok(!classes.has('preview-expanded'));assert.equal(nodes['expand-label'].textContent,'Ampliar');assert.ok(nodes['expand-preview'].focused);
console.log('Prévia: PC cabe em largura/altura, réguas e zoom preservados; ampliar/Esc funcionam.');
