// Render the actual navigation components; keep their business callbacks intact.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),portal=path.join(root,'Remoterapia-Portal');
const ts=require(path.join(portal,'node_modules/typescript')),React=require(path.join(portal,'node_modules/react'));
const jsx=require(path.join(portal,'node_modules/react/jsx-runtime')),{renderToStaticMarkup}=require(path.join(portal,'node_modules/react-dom/server'));
const registry=require('../tools/editor-visual/style-engine.cjs').catalog();
const empty=()=>null;
function load(app,file){
 const exports={},modules={
  'react/jsx-runtime':jsx,'react':{...React,useMemo:fn=>fn(),useState:value=>[value,empty],useEffect:empty,useRef:()=>({current:null})},
  'lucide-react':new Proxy({},{get:()=>empty}),
  'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
  '@/components/ThemeToggle':{default:empty},
  '@/components/ui/VisualLabel':{default:({text})=>text},
  '@/components/ui/VisualContent':{VisualText:({id,defaultText})=>React.createElement('span',{'data-rt-copy-id':id},defaultText),VisualContentSlot:empty},
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,app,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>{assert(Object.hasOwn(modules,name),name);return modules[name]}});return exports;
}
function find(node,predicate){if(!node||typeof node!=='object')return; if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found}}
function editableControls(node,app,count){
 const controls=React.Children.toArray(node.props.children),html=renderToStaticMarkup(node);
 const ids=[...html.matchAll(/data-rt-copy-id="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(controls.length,count);assert.equal(ids.length,count);for(const id of ids)assert(registry[app][id],id+' must be registered');return controls;
}
const Desktop=load('Remoterapia-Portal','components/desktop/PortalDesktop.tsx').PortalDesktopNavigation;
let destination='';
const props={view:'home',canBook:true,nome:'Aluno de teste',onNavigate:view=>destination=view,onNotificacoes:empty,onLogout:empty};
const nav=find(Desktop(props),node=>node.props?.['aria-label']==='Navegação desktop do aluno');
const buttons=editableControls(nav,'portal',6);
for(const [index,view] of ['home','agendar','eventos','historico','pagamentos','perfil'].entries()){buttons[index].props.onClick();assert.equal(destination,view)}
const restricted=find(Desktop({...props,canBook:false}),node=>node.props?.['aria-label']==='Navegação desktop do aluno');assert.equal(React.Children.toArray(restricted.props.children).length,5);
const PhoneNavigation=load('Remoterapia-Portal','components/BottomNav.tsx').default;
const phoneNav=find(PhoneNavigation({view:'home',setView:value=>destination=value,alunoData:{tipo_plano:'mensalista'}}),node=>node.props?.['aria-label']==='Navegação do portal');
const phoneButtonNav=React.cloneElement(phoneNav,{children:React.Children.toArray(phoneNav.props.children).filter(child=>child.type==='button')});
const phoneButtons=editableControls(phoneButtonNav,'portal',5);for(const [index,value] of ['home','agendar','eventos','historico','perfil'].entries()){phoneButtons[index].props.onClick();assert.equal(destination,value,'Original phone tab order preserved')}
const paymentNav=find(PhoneNavigation({view:'pagamentos',setView:empty,alunoData:{tipo_plano:'mensalista'}}),node=>node.props?.['aria-label']==='Navegação do portal');
assert.equal(React.Children.toArray(paymentNav.props.children).filter(child=>child.type==='button').at(-1).props['aria-current'],'page','Billing keeps the profile tab selected');
const History=load('Remoterapia-Portal','components/PortalHistoryLayout.tsx').default;
let filter='todas';const history=History({items:[],filter,ratings:{},busy:null,onFilter:value=>filter=value,onRate:empty,support:'https://example.com'});
const segments=find(history,node=>node.props?.['aria-label']==='Filtrar atividades');
const filters=editableControls(segments,'portal',4);for(const [index,value] of ['todas','concluidas','canceladas','eventos'].entries()){filters[index].props.onClick();assert.equal(filter,value)}
const Overview=load('Remoterapia-Gestão','components/desktop/GestaoOverview.tsx').default;
const data={reservas:0,naAgua:0,frota:0,alunos:0,agenda:[],failed:false,dateLabel:'Hoje'};
const overview=Overview({nome:'Teste',role:'admin',data});const shortcuts=find(overview,node=>node.props?.['aria-label']==='Acesso rápido da Gestão');
const links=editableControls(shortcuts,'gestao',6);assert.deepEqual(links.map(link=>link.props.href),['/gestao/portal','/gestao/diario','/gestao/pagamentos','/gestao/admin','/gestao/admin/configuracoes','/gestao/clima']);
for(const [role,paths] of [['admin',['/gestao/agua','/gestao/recepcao/dashboard']],['recepcao',['/gestao/recepcao/dashboard']],['instrutor',['/gestao/agua']]]){
 const home=Overview({nome:'Teste',role,data}),operations=find(home,node=>node.props?.['aria-label']==='Operação na base');assert(operations.props.className.includes('rt-mobile-only'));
 const actual=React.Children.toArray(operations.props.children).map(link=>link.props.href);assert.deepEqual(actual,paths,'Phone shortcuts follow profile '+role);
}
assert(!find(Overview({nome:'Teste',role:'guardaria',data}),node=>node.props?.['aria-label']==='Operação na base'));
assert.equal(React.Children.toArray(find(Overview({nome:'Teste',role:'recepcao',roles:['instrutor'],data}),node=>node.props?.['aria-label']==='Operação na base').props.children).length,2,'Combined profiles keep both mobile areas');
const editor=ts.createSourceFile('editor.js',fs.readFileSync(path.join(root,'tools/editor-visual/editor.js'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const pageCode=editor.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(declaration=>['apps','mobilePages'].includes(declaration.name.getText(editor)))||ts.isFunctionDeclaration(node)&&node.name?.text==='availablePages').map(node=>node.getText(editor)).join('\n');
const context=vm.createContext({app:'gestao',view:'desktop'});vm.runInContext(pageCode,context);
const pagePaths=()=>Array.from(vm.runInContext('availablePages()',context),item=>item[1]);
for(const route of ['/gestao/agua','/gestao/recepcao/dashboard','/gestao/recepcao/novo-embarque'])assert(!pagePaths().includes(route),'Desktop editor excludes '+route);
context.view='mobile';for(const route of ['/gestao/agua','/gestao/recepcao/dashboard','/gestao/recepcao/novo-embarque'])assert(pagePaths().includes(route),'Phone editor keeps '+route);
context.app='portal';assert.equal(pagePaths().length,7);context.view='desktop';assert.equal(pagePaths().length,7);
console.log('OK: menu/filtros/atalhos editáveis, ações preservadas e telas do editor filtradas por dispositivo.');
