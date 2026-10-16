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
const Section=load('components/desktop/GestaoSectionNav.tsx');
const Bottom=load('components/AppBottomNav.tsx',{'./desktop/GestaoSectionNav':{default:Section}});
const profile=role=>({role,roles:[],nome:'Teste'});
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
for(const route of ['/gestao/agua','/gestao/recepcao/dashboard','/gestao/fechamento']){
 currentPath=route;
 const html=render(Shell,{perfil:profile('admin'),children:React.createElement('p',{'data-test-screen':'true'},'Tela funcional')});
 assert(html.includes('class="rt-workspace-body"><p data-test-screen="true"'),'Desktop must render '+route);
 assert(html.includes('href="'+route+'"'));
 const mobileItems=html.match(/data-mobile-links="([^"]*)"/)[1];
 assert(!mobileItems.includes('/gestao/agua')&&!mobileItems.includes('/gestao/recepcao/dashboard'),'Operation links already belong to the mobile operation menu');
}
currentPath='/gestao/recepcao/novo-embarque';
assert(render(Shell,{perfil:profile('admin'),children:'Embarque'}).includes('<div class="rt-mobile-only">Embarque</div>'),'New boarding remains mobile-only');
for(const [role,present,absent] of [
 ['recepcao','/gestao/recepcao/dashboard','/gestao/agua'],
 ['instrutor','/gestao/agua','/gestao/fechamento'],
 ['guardaria','/gestao/guardaria','/gestao/admin'],
]){
 const html=render(Shell,{perfil:profile(role),children:'Tela'});
 assert(html.includes('href="'+present+'"'));assert(!html.includes('href="'+absent+'"'),'Role-filtered navigation: '+role);
}
const nav=render(Section,{pathname:'/gestao/agua',items:[{label:'Água',href:'/gestao/agua'},{label:'Areia',href:'/gestao/recepcao/dashboard'},{label:'Novo embarque',href:'/gestao/recepcao/novo-embarque'}]});
assert(nav.includes('href="/gestao/agua"')&&nav.includes('href="/gestao/recepcao/dashboard"'));assert(!nav.includes('novo-embarque'));
const bottom=render(Bottom,{items:[{label:'Mar',href:'/gestao/recepcao/dashboard'}],desktopItems:[{label:'Eventos',href:'/gestao/recepcao/eventos'}]});
assert(bottom.split('rt-mobile-tabs-wrap')[0].includes('/gestao/recepcao/eventos'));
assert(!bottom.split('rt-mobile-tabs-wrap')[1].includes('/gestao/recepcao/eventos'));
console.log('OK: telas operacionais no desktop, novo embarque no celular, menus por perfil e abas exclusivas do computador.');
