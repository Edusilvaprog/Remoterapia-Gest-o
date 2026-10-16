// Render the actual navigation components; keep their business callbacks intact.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),portal=path.join(root,'Remoterapia-Portal');
const ts=require(path.join(portal,'node_modules/typescript')),React=require(path.join(portal,'node_modules/react'));
const jsx=require(path.join(portal,'node_modules/react/jsx-runtime')),{renderToStaticMarkup}=require(path.join(portal,'node_modules/react-dom/server'));
const registry=require('../tools/editor-visual/style-engine.cjs').catalog();
const empty=()=>null;
function load(app,file){
 const exports={},modules={
  'react/jsx-runtime':jsx,'react':{...React,useMemo:fn=>fn(),useState:value=>[value,empty]},
  'lucide-react':new Proxy({},{get:()=>empty}),
  'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
  '@/components/ThemeToggle':{default:empty},
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
const History=load('Remoterapia-Portal','components/PortalHistoryLayout.tsx').default;
let filter='todas';const history=History({items:[],filter,ratings:{},busy:null,onFilter:value=>filter=value,onRate:empty,support:'https://example.com'});
const segments=find(history,node=>node.props?.['aria-label']==='Filtrar atividades');
const filters=editableControls(segments,'portal',4);for(const [index,value] of ['todas','concluidas','canceladas','eventos'].entries()){filters[index].props.onClick();assert.equal(filter,value)}
const Overview=load('Remoterapia-Gestão','components/desktop/GestaoOverview.tsx').default;
const data={reservas:0,naAgua:0,frota:0,alunos:0,agenda:[],failed:false,dateLabel:'Hoje'};
const overview=Overview({nome:'Teste',role:'admin',data});const shortcuts=find(overview,node=>node.props?.['aria-label']==='Acesso rápido da Gestão');
const links=editableControls(shortcuts,'gestao',6);assert.deepEqual(links.map(link=>link.props.href),['/gestao/portal','/gestao/diario','/gestao/pagamentos','/gestao/admin','/gestao/admin/configuracoes','/gestao/clima']);
console.log('OK: menu desktop do Portal, filtros do histórico e atalhos da Gestão editáveis; ações e acesso preservados.');
