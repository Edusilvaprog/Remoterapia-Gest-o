// Render the navigation owners to guard against hiding functional desktop screens again.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../Remoterapia-Gestão');
const ts=require(path.join(root,'node_modules/typescript'));
const React=require(path.join(root,'node_modules/react'));
const {renderToStaticMarkup}=require(path.join(root,'node_modules/react-dom/server'));
let currentPath='/gestao/painel';
const jsx=require(path.join(root,'node_modules/react/jsx-runtime'));
const empty=()=>null;
function load(relative,extra={}){
 const exports={};
 const modules={
  'react/jsx-runtime':jsx,
  'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
  'next/navigation':{usePathname:()=>currentPath},
  'lucide-react':new Proxy({},{get:()=>empty}),
  '@/lib/actions/auth':{logoutStaff:empty},
  '@/components/ThemeToggle':{default:empty},
  '@/components/ui/VisualLabel':{default:({text})=>text},
  '@/components/ui/VisualContent':{VisualText:({defaultText})=>defaultText,VisualContentSlot:empty},
  '@/components/desktop/GestaoMobileNav':{default:({items})=>React.createElement('div',{'data-mobile-links':items.map(i=>i.href).join(',')})},
  ...extra,
 };
 const source=fs.readFileSync(path.join(root,relative),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>{assert(Object.hasOwn(modules,name),name);return modules[name]}});
 return exports.default;
}
const Shell=load('components/desktop/GestaoDesktopShell.tsx');
const VisualLabel=load('components/ui/VisualLabel.tsx',{'./VisualContent':{VisualText:({id,defaultText})=>React.createElement('span',{'data-rt-copy-id':id},defaultText)}});
const Section=load('components/desktop/GestaoSectionNav.tsx',{'@/components/ui/VisualLabel':{default:VisualLabel}});
const Bottom=load('components/AppBottomNav.tsx',{'./desktop/GestaoSectionNav':{default:Section}});
const profile=role=>({role,roles:[],nome:'Teste'});
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
for(const route of ['/gestao/agua','/gestao/recepcao/dashboard','/gestao/fechamento']){
 currentPath=route;
 const html=render(Shell,{perfil:profile('admin'),children:React.createElement('p',{'data-test-screen':'true'},'Tela funcional')});
 const phoneOnly=route!=='/gestao/fechamento';
 assert(html.includes(phoneOnly?'class="rt-mobile-only"><p data-test-screen="true"':'class="rt-workspace-body"><p data-test-screen="true"'),'Correct device scope for '+route);
 assert.equal(html.includes('href="'+route+'"'),!phoneOnly,'Desktop links follow the requested device scope');
 const mobileItems=html.match(/data-mobile-links="([^"]*)"/)[1];
 assert(!mobileItems.includes('/gestao/agua')&&!mobileItems.includes('/gestao/recepcao/dashboard'),'Operation links already belong to the mobile operation menu');
}
currentPath='/gestao/recepcao/novo-embarque';
assert(render(Shell,{perfil:profile('admin'),children:'Embarque'}).includes('<div class="rt-mobile-only">Embarque</div>'),'New boarding remains mobile-only');
for(const [role,present,absent] of [
 ['recepcao','/gestao/portal','/gestao/agua'],
 ['instrutor','/gestao/clima','/gestao/fechamento'],
 ['guardaria','/gestao/guardaria','/gestao/admin'],
]){
 const html=render(Shell,{perfil:profile(role),children:'Tela'});
 assert(html.includes('href="'+present+'"'));assert(!html.includes('href="'+absent+'"'),'Role-filtered navigation: '+role);
}
const nav=render(Section,{pathname:'/gestao/agua',items:[{label:'Água',href:'/gestao/agua'},{label:'Areia',href:'/gestao/recepcao/dashboard'},{label:'Novo embarque',href:'/gestao/recepcao/novo-embarque'}]});
assert(!nav.includes('href="/gestao/agua"')&&!nav.includes('href="/gestao/recepcao/dashboard"'));assert(!nav.includes('novo-embarque'));
const bottom=render(Bottom,{items:[{label:'Mar',href:'/gestao/recepcao/dashboard'}],desktopItems:[{label:'Eventos',href:'/gestao/recepcao/eventos'}]});
assert(bottom.split('rt-mobile-tabs-wrap')[0].includes('/gestao/recepcao/eventos'));
assert(!bottom.split('rt-mobile-tabs-wrap')[1].includes('/gestao/recepcao/eventos'));
const phoneBar=render(Bottom,{items:[{label:'MAR',href:'/gestao/recepcao/dashboard'},{label:'REGISTRO',href:'/gestao/diario'},{label:'FECHAMENTO',href:'/gestao/fechamento'},{label:'CLIMA',href:'/gestao/clima'}],centerAction:{href:'/gestao/recepcao/novo-embarque',label:'Novo embarque'}}).split('rt-mobile-tabs-wrap')[1];
assert(phoneBar.includes('rt-mobile-tabs--with-action'),'Phone action bar has its own layout');
const positions=['>MAR<','>REGISTRO<','>Novo embarque<','>FECHAMENTO<','>CLIMA<'].map(label=>phoneBar.indexOf(label));assert(positions.every((position,index)=>position>=0&&(index===0||position>positions[index-1])),'Original phone order keeps boarding in the center');
const editable=render(Section,{pathname:'/gestao/admin',items:[{label:'FROTA & PREÇOS',onClick:empty},{label:'ALUNOS',onClick:empty}]});
assert(editable.includes('data-rt-copy-id="copy-18274b7d5cde"')&&editable.includes('data-rt-copy-id="copy-368e8054259d"'),'Desktop tabs use the existing editable labels');
// Render the separate Admin tab strip too: it does not use GestaoSectionNav.
const adminFile=ts.createSourceFile('AdminClient.tsx',fs.readFileSync(path.join(root,'app/gestao/admin/AdminClient.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let adminNav;
function visit(node){if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(attr=>ts.isJsxAttribute(attr)&&attr.name.text==='aria-label'&&attr.initializer?.text==='Seções da administração'))adminNav=node.getText(adminFile);ts.forEachChild(node,visit)}visit(adminFile);assert(adminNav);
const tabModule={exports:{}};
vm.runInNewContext(ts.transpileModule(`export default function Tabs({tab,setTab}){return (${adminNav})}`,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:tabModule.exports,require:()=>jsx,VisualText:({id,defaultText})=>React.createElement('span',{'data-rt-copy-id':id},defaultText)});
let active='usuarios';const adminTabs=tabModule.exports.default({tab:active,setTab:value=>active=value});
assert.equal((renderToStaticMarkup(adminTabs).match(/data-rt-copy-id=/g)||[]).length,4,'Every visible admin tab is editable');
for(const [index,id] of ['usuarios','frota','lockers','auditoria'].entries()){adminTabs.props.children[index].props.onClick();assert.equal(active,id,'Original tab action preserved')}
const Mobile=load('components/desktop/GestaoMobileNav.tsx',{'react':{useEffect:empty,useState:()=>[true,empty],useRef:()=>({current:null})}});
for(const [role,available,forbidden] of [['recepcao','/gestao/recepcao/dashboard','/gestao/agua'],['instrutor','/gestao/agua','/gestao/recepcao/dashboard']]){
 const html=render(Mobile,{nome:'Teste',roles:[role],path:'/gestao/painel',items:[]});assert(html.includes('href="'+available+'"'));assert(!html.includes('href="'+forbidden+'"'),'Phone operation remains role-filtered');
}
console.log('OK: água/areia/embarque só no celular; consultas e fechamento no computador; perfis e abas preservados.');
