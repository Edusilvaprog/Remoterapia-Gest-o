'use strict';
const $=id=>document.getElementById(id),clone=value=>JSON.parse(JSON.stringify(value));
const apps={gestao:{port:3015,pages:[['Entrada','/gestao/login'],['Painel central','/gestao/painel'],['Todas as áreas','/gestao/selecionar-area'],['Equipe de areia','/gestao/recepcao/dashboard'],['Equipe de água','/gestao/agua'],['Novo embarque · celular','/gestao/recepcao/novo-embarque'],['Administrador','/gestao/admin'],['Portal de alunos','/gestao/portal'],['Clientes da recepção','/gestao/recepcao/clientes'],['Agendamentos da recepção','/gestao/recepcao/agendamentos'],['Eventos da recepção','/gestao/recepcao/eventos'],['Guardaria','/gestao/guardaria'],['Clima','/gestao/clima'],['Diário','/gestao/diario'],['Gestão e controle','/gestao/dona'],['Feedback dos alunos','/gestao/dona/feedback'],['Mídia da direção','/gestao/dona/midia'],['Mídia','/gestao/midia'],['Fechamento','/gestao/fechamento'],['Pagamentos','/gestao/pagamentos'],['Configurações','/gestao/admin/configuracoes'],['Segurança do acesso','/gestao/seguranca']]},portal:{port:3016,pages:[['Entrada','/#login'],['Início','/#home'],['Agendar','/#agendar'],['Eventos','/#eventos'],['Histórico','/#historico'],['Pagamentos','/#pagamentos'],['Meu perfil','/#perfil']]}};
const draftKey='remoterapia-isolated-draft-v1',contextKey='remoterapia-editor-context-v2';
const mobilePages=new Set(['/gestao/recepcao/dashboard','/gestao/agua','/gestao/recepcao/novo-embarque']);
function availablePages(){return apps[app].pages.filter(([,path])=>app!=='gestao'||view==='mobile'||!mobilePages.has(path));}
let draft,baseline,stored,pendingState=null,revision=0,registry={},app='gestao',view='desktop',selection=null,selectionPath=[],editing=false,targetArea='',frameReady=false,canUndo=false,saveTimer,previewTimer,previewRequest=0,queue=Promise.resolve(),conflict=false;
const snapshots={};let moveUI,lastContent='';
function notice(message){$('notice').textContent=message;$('notice').classList.add('visible');clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('notice').classList.remove('visible'),4500);}
function dirty(){return draft&&JSON.stringify(draft)!==stored;}
function status(){ $('dirty').textContent=conflict?'Rascunho não salvo':dirty()?'Salvando rascunho…':'Rascunho salvo';$('undo').disabled=conflict||(!canUndo&&!dirty());$('restore').disabled=!draft||conflict;$('scope').textContent=`Ajustes exclusivos ${view==='mobile'?'do celular':'do computador'}.`; }
function storeRecovery(){try{localStorage.setItem(draftKey,JSON.stringify({base:JSON.stringify(baseline),revision,pendingState,state:draft}));}catch{notice('Armazenamento do navegador indisponível. Mantenha o editor aberto até o rascunho ser salvo.');}}
async function api(route,body){const response=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok){const error=Error(data.error||'Não foi possível salvar o rascunho.');error.status=response.status;throw error;}return data;}
function saveDraft(){clearTimeout(saveTimer);queue=queue.then(async()=>{if(!dirty()||conflict)return;const state=clone(draft);pendingState=JSON.stringify(state);storeRecovery();try{const data=await api('/api/editor/draft',{revision,state});revision=data.revision;stored=JSON.stringify(data.state);canUndo=data.canUndo;pendingState=null;if(dirty())storeRecovery();else try{localStorage.removeItem(draftKey);}catch{}status();}catch(error){conflict=true;status();notice(error.message);}});return queue;}
function change(){storeRecovery();status();clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,500);clearTimeout(previewTimer);previewTimer=setTimeout(preview,90);}
function send(message){if(frameReady)$('preview').contentWindow.postMessage(message,`http://localhost:${apps[app].port}`);}
async function preview(){if(!draft||!frameReady)return;const request=++previewRequest,currentApp=app;try{const data=await api('/api/preview',{app,state:{[app]:clone(draft[app])}});if(request!==previewRequest||currentApp!==app)return;send({type:'rt-visual-preview',css:data.css[app],editing});const content=Object.fromEntries(['mobile','desktop'].map(mode=>[mode,{texts:data.state[app][mode].texts||{},slots:data.state[app][mode].slots||{}}])),serialized=JSON.stringify(content);if(serialized!==lastContent){lastContent=serialized;send({type:'rt-content-preview',content});}$('preview-status').textContent=editing?'Editando o rascunho':'Navegação ativa';}catch(error){$('preview-status').textContent=error.message;}}
function size(){
 const width=view==='mobile'?390:1440,baseHeight=view==='mobile'?844:900,canvas=$('canvas'),padding=getComputedStyle(canvas),gutter=moveUI?.gutter()||0;
 const availableWidth=Math.max(1,canvas.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight)-gutter);
 const availableHeight=Math.max(1,canvas.clientHeight-parseFloat(padding.paddingTop)-parseFloat(padding.paddingBottom)-gutter);
 const auto=$('zoom').value==='auto';
 const scale=auto?Math.min(1,availableWidth/width,availableHeight/baseHeight):Number($('zoom').value);
 const height=baseHeight;
 Object.assign($('preview').style,{width:width+'px',height:height+'px',transform:`scale(${scale})`});
 Object.assign($('stage').style,{width:width*scale+'px',height:height*scale+'px'});
 moveUI?.resize({width,height,scale});$('size').textContent=`${view==='mobile'?'Celular':'Computador'} · ${Math.round(scale*100)}%`;
}
function expandPreview(expanded){
 document.body.classList.toggle('preview-expanded',expanded);
 setTools(false);
 $('expand-preview').setAttribute('aria-pressed',String(expanded));
 $('expand-label').textContent=expanded?'Voltar':'Ampliar';
 $('expand-preview').title=expanded?'Voltar ao editor (Esc)':'Ampliar a prévia';
 size();
}
function setTools(open){
 document.body.classList.toggle('tools-open',open);
 $('tools-toggle').setAttribute('aria-expanded',String(open));
 $('tools-label').textContent=open?'Fechar painel':'Ferramentas';
 size();
}
$('tools-toggle').addEventListener('click',()=>setTools(!document.body.classList.contains('tools-open')));
$('expand-preview').addEventListener('click',()=>expandPreview(!document.body.classList.contains('preview-expanded')));
window.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(document.body.classList.contains('tools-open')){setTools(false);$('tools-toggle').focus();}else if(document.body.classList.contains('preview-expanded')){expandPreview(false);$('expand-preview').focus();}});
let sizeFrame;
new ResizeObserver(()=>{cancelAnimationFrame(sizeFrame);sizeFrame=requestAnimationFrame(size);}).observe($('canvas'));
function context(){try{localStorage.setItem(contextKey,JSON.stringify({app,view,page:$('page').value,zoom:$('zoom').value,rulers:$('guides').checked}));}catch{}}
function loadPage(){moveUI?.reset();send({type:'rt-select-element',id:''});const url=`http://localhost:${apps[app].port}${$('page').value}`,previous=new URL($('preview').src||'about:blank'),next=new URL(url);const hashOnly=previous.origin===next.origin&&previous.pathname===next.pathname&&previous.hash!==next.hash;if(!hashOnly)frameReady=false;$('preview').src=url;selection=null;selectionPath=[];targetArea='';inspector();size();context();if(hashOnly)preview();}
function options(control,items,prompt){const select=$(control);select.replaceChildren();for(const [value,label] of [['',prompt],...items]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}}
function pages(page,navigate=true){const list=availablePages();options('page',list.map(([label,value])=>[value,label]),'Escolha uma tela');$('page').value=list.some(([,value])=>value===page)?page:app==='gestao'?'/gestao/painel':'/#home';if(navigate)loadPage();}
function extra(){return selection?.kind==='extra'?draft[app][view].slots?.[targetArea]?.find(block=>block.id===selection.id):null;}
function style(create=false){const block=extra();if(block){if(create)block.style??={};return block.style||{};}if(!selection)return {};const data=draft[app][view];if(create){data.elements??={};data.elements[selection.id]??={};}return data.elements?.[selection.id]||{};}
function labelFor(id){const meta=registry[app]?.[id];if(id.startsWith('control-')||id.startsWith('part-'))return (id.startsWith('control-')?'Botão · ':'Bloco · ')+labelFor('copy-'+id.slice(id.indexOf('-')+1));return meta?.kind==='text'?String(draft[app][view].texts?.[id]??meta.defaultText??meta.label).trim().slice(0,75)||'Texto vazio':meta?.label||'Bloco';}
function range(control,value,output,suffix){const input=$(control);value=Math.max(Number(input.min),Math.min(Number(input.max),Number(value)||0));input.value=value;if($(control+'-number'))$(control+'-number').value=value;$(output).textContent=value+suffix;}
function modeUi(){moveUI?.setMode(editing);
 $('workspace').classList.toggle('is-navigating',!editing);
 $('mode-title').textContent=editing?'Editar layout':'Usar o aplicativo';
 $('navigate-mode').setAttribute('aria-pressed',String(!editing));$('edit-mode').setAttribute('aria-pressed',String(editing));document.querySelector('.inspector').hidden=!editing;
 $('mode-help').textContent=editing?'Clique nas palavras para editar. Clique no fundo ou ícone para selecionar o botão. Alt + clique abre a aba sem sair da edição.':'Navegação ativa: use os menus, botões e formulários do aplicativo. Volte a Editar para ajustar o layout.';
 $('interaction-help').textContent=editing?'Modo Editar · cliques selecionam o layout. Use Navegar para abrir abas e executar ações.':'Modo Navegar · os controles do aplicativo funcionam normalmente.';
}
function setMode(value){editing=value;if(!editing){selection=null;selectionPath=[];targetArea='';inspector();}send({type:'rt-editor-mode',editing});modeUi();setTools(false);size();$('preview-status').textContent=editing?'Editando o rascunho':'Navegação ativa';}
$('navigate-mode').addEventListener('click',()=>setMode(false));$('edit-mode').addEventListener('click',()=>setMode(true));
function inspector(){
 const meta=selection&&registry[app]?.[selection.id],block=extra(),selected=!!(meta||block),isText=meta?.kind==='text';
 $('element-name').textContent=block?block.title||'Novo bloco':meta?labelFor(selection.id):'Clique no que deseja editar';
 $('path-field').hidden=!selectionPath.length;options('selection-path',selectionPath.map(item=>[item.id,(item.kind==='text'?'Texto · ':item.kind==='extra'?'Bloco adicionado · ':'')+(registry[app]?.[item.id]?labelFor(item.id):extra()?.title||'Bloco')]),'Escolha o alvo');if(selection)$('selection-path').value=selection.id;
 $('selection-help').hidden=selected;$('element-fields').hidden=!selected;$('text-field').hidden=!isText;$('extra-fields').hidden=!block;$('block-style').hidden=isText;
 $('block-actions').hidden=!targetArea||(meta?.canAdd===false&&!block&&!meta.canHide);$('area-list').value=targetArea;$('text-list').value=isText?selection.id:'';
 if(selected){const current=style(),snapshot=snapshots[`${app}:${view}:${selection.id}`]||{};$('element-text').value=isText?draft[app][view].texts?.[selection.id]??meta.defaultText??'':'';$('element-font-family').value=current.font||'original';$('element-color').value=current.color||snapshot.color||'#173550';$('element-background').value=current.background||snapshot.background||'#ffffff';range('element-font',current.fontSize??snapshot.fontSize??16,'font-output',' px');range('element-width',current.width??100,'width-output','%');range('element-height',current.minHeight??0,'height-output',' px');for(const [key,id] of [['paddingX','padding-x'],['paddingY','padding-y'],['marginTop','margin-top'],['marginBottom','margin-bottom']])range('element-'+id,current[key]??(key.startsWith('padding')?current.padding:undefined)??snapshot[key]??0,id+'-output',' px');}
 if(block){$('extra-title').value=block.title;$('extra-body').value=block.body;$('extra-href').value=block.href||'';$('extra-label').value=block.label||'';$('extra-link-field').hidden=$('extra-label-field').hidden=block.type!=='link';}
 const removable=!!block||(meta?.kind==='area'&&meta.canHide);$('remove-block').hidden=!removable;$('remove-block').textContent=meta&&style().hidden?'Recolocar bloco':'Remover bloco';$('protected-note').hidden=!(meta?.kind==='area'&&!meta.canHide);
 const area=registry[app]?.[targetArea];$('add-block').disabled=!area||area.canAdd===false;
 const blocks=draft?.[app]?.[view]?.slots?.[targetArea]||[];$('added-field').hidden=!blocks.length;options('added-list',blocks.map(item=>[item.id,item.title||'Bloco vazio']),'Selecione um bloco');if(block)$('added-list').value=block.id;
}
function select(id,kind,area,path){moveUI?.reset();if(Array.isArray(path))selectionPath=path.filter(item=>registry[app]?.[item.id]||item.kind==='extra');else if(!selectionPath.some(item=>item.id===id))selectionPath=id?[{id,kind,area}]:[];selection=id?{id,kind}:null;targetArea=area||targetArea;inspector();send({type:'rt-select-element',id});if(id&&editing&&(window.innerWidth<=900||document.body.classList.contains('preview-expanded')))setTools(true);}
$('app').addEventListener('change',()=>{app=$('app').value;options('area-list',[],'Clique em um bloco');options('text-list',[],'Clique em um texto');pages();status();});
$('page').addEventListener('change',loadPage);
$('view').addEventListener('change',()=>{const previousPage=$('page').value;view=$('view').value;pages(previousPage,false);if(previousPage!==$('page').value){loadPage();status();return;}moveUI?.reset();selection=null;selectionPath=[];targetArea='';inspector();send({type:'rt-select-element',id:''});size();context();status();preview();});
$('zoom').addEventListener('change',()=>{size();context();});window.addEventListener('resize',size);$('preview').addEventListener('load',preview);
$('selection-path').addEventListener('change',()=>{const item=selectionPath.find(item=>item.id===$('selection-path').value);if(item)select(item.id,item.kind,item.area);});
$('area-list').addEventListener('change',()=>select($('area-list').value,'area',$('area-list').value));$('text-list').addEventListener('change',()=>select($('text-list').value,'text'));$('added-list').addEventListener('change',()=>select($('added-list').value,'extra'));
window.addEventListener('message',event=>{
 if(event.source!==$('preview').contentWindow||event.origin!==`http://localhost:${apps[app].port}`||!draft)return;const message=event.data;
 if(message?.type==='rt-move-layout'){if(message.layout?.id===selection?.id)moveUI?.setLayout(message.layout);else if(!message.layout)moveUI?.reset();return;}
 if(message?.type==='rt-editor-ready'){frameReady=true;lastContent='';preview();return;}
 if(message?.type==='rt-page-changed'){if(availablePages().some(([,path])=>path===message.page)){$('page').value=message.page;context();}return;}
 if(message?.type==='rt-element-selected'&&(registry[app]?.[message.id]||message.kind==='extra')){select(message.id,message.kind,registry[app]?.[message.area]?.kind==='area'?message.area:message.kind==='area'?message.id:targetArea,message.path);return;}
 if(message?.type==='rt-style-snapshot'&&selection?.id===message.id&&message.values){if(registry[app]?.[message.area]?.kind==='area')targetArea=message.area;if(selectionPath.length<=1&&Array.isArray(message.path))selectionPath=message.path.filter(item=>registry[app]?.[item.id]||item.kind==='extra');const hex=value=>{const channels=String(value).match(/^rgb\(\s*(\d+)[, ]+(\d+)[, ]+(\d+)/);return channels?'#'+channels.slice(1,4).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):null;};snapshots[`${app}:${view}:${selection.id}`]={color:hex(message.values.color),background:hex(message.values.background),paddingX:Math.round(message.values.paddingX)||0,paddingY:Math.round(message.values.paddingY)||0,marginTop:Math.round(message.values.marginTop)||0,marginBottom:Math.round(message.values.marginBottom)||0,fontSize:Math.round(message.values.fontSize)||16};inspector();return;}
 if(message?.type==='rt-visible-areas'&&Array.isArray(message.ids)){if(availablePages().some(([,path])=>path===message.page)){$('page').value=message.page;context();}const areas=[...new Set([...message.ids,...(message.allAreas||[]).filter(id=>draft[app][view].elements?.[id]?.hidden)])].filter(id=>registry[app]?.[id]?.kind==='area');options('area-list',areas.map(id=>[id,labelFor(id)+(draft[app][view].elements?.[id]?.hidden?' · removido':'')]),'Clique em um bloco');options('text-list',[...new Set(message.texts||[])].filter(id=>registry[app]?.[id]?.kind==='text').map(id=>[id,labelFor(id)]),'Clique em um texto');$('area-list').value=targetArea;if(selection?.kind==='text')$('text-list').value=selection.id;return;}
 if(message?.type==='rt-selection-unavailable'){selection=null;selectionPath=[];targetArea='';inspector();send({type:'rt-select-element',id:''});notice(message.message||'Escolha um item editável.');return;}
 if(message?.type==='rt-inline-text'&&registry[app]?.[message.id]?.kind==='text'&&typeof message.text==='string'&&message.text.length<=2000){draft[app][view].texts??={};draft[app][view].texts[message.id]=message.text;selection={id:message.id,kind:'text'};inspector();change();}
});
$('element-text').addEventListener('input',()=>{if(selection?.kind!=='text')return;draft[app][view].texts??={};draft[app][view].texts[selection.id]=$('element-text').value;change();});
for(const [control,property,numeric,output,suffix] of [['element-padding-x','paddingX',true,'padding-x-output',' px'],['element-padding-y','paddingY',true,'padding-y-output',' px'],['element-margin-top','marginTop',true,'margin-top-output',' px'],['element-margin-bottom','marginBottom',true,'margin-bottom-output',' px'],['element-color','color'],['element-background','background'],['element-font-family','font'],['element-font','fontSize',true,'font-output',' px'],['element-width','width',true,'width-output','%'],['element-height','minHeight',true,'height-output',' px']])$(control).addEventListener('input',()=>{if(!selection)return;const value=numeric?Number($(control).value):$(control).value;if(property==='font'&&value==='original')delete style(true).font;else style(true)[property]=value;if(output){$(output).textContent=value+suffix;if($(control+'-number'))$(control+'-number').value=value;}change();});
for(const [control,property] of [['extra-title','title'],['extra-body','body'],['extra-href','href'],['extra-label','label']])$(control).addEventListener('input',()=>{const block=extra();if(block){block[property]=$(control).value;if(property==='title')$('element-name').textContent=block.title||'Novo bloco';change();}});
$('add-block').addEventListener('click',()=>{if(!targetArea||registry[app]?.[targetArea]?.canAdd===false)return;draft[app][view].slots??={};const blocks=draft[app][view].slots[targetArea]??=[];if(blocks.length>=12)return notice('Limite de 12 blocos nesta área.');const block={id:'block-'+crypto.randomUUID().replaceAll('-','').slice(0,12),type:$('block-type').value,title:'Novo bloco',body:'Escreva seu conteúdo aqui.'};if(block.type==='link'){block.href=app==='portal'?'/':'/gestao/painel';block.label='Saiba mais';}const group=draft[app][view].orders?.find(ids=>ids.some(id=>blocks.some(item=>item.id===id)));blocks.push(block);if(group)group.push(block.id);select(block.id,'extra',targetArea);change();});
$('remove-block').addEventListener('click',()=>{const block=extra();if(block){if(draft[app][view].orders)draft[app][view].orders=draft[app][view].orders.map(ids=>ids.filter(id=>id!==block.id)).filter(ids=>ids.length>1);draft[app][view].slots[targetArea]=draft[app][view].slots[targetArea].filter(item=>item.id!==block.id);select(targetArea,'area',targetArea);}else if(registry[app]?.[selection?.id]?.canHide)style(true).hidden=!style().hidden;else return;inspector();change();});
async function historyAction(action){moveUI?.reset();if(conflict)return;clearTimeout(saveTimer);$('workspace').inert=true;$('undo').disabled=$('restore').disabled=true;try{await saveDraft();if(conflict)return;const result=await api('/api/editor/'+action,{revision});draft=clone(result.state);revision=result.revision;stored=JSON.stringify(draft);canUndo=result.canUndo;try{localStorage.removeItem(draftKey);}catch{}selection=null;selectionPath=[];targetArea='';inspector();send({type:'rt-select-element',id:''});await preview();}catch(error){notice(error.message);}finally{$('workspace').inert=false;status();}}
$('undo').addEventListener('click',()=>historyAction('undo'));$('restore').addEventListener('click',()=>{if(confirm('Restaurar todos os ajustes do rascunho nos dois sites? A base dos aplicativos será mantida. Você poderá desfazer.'))historyAction('reset');});
window.addEventListener('pagehide',()=>{if(dirty())storeRecovery();});
async function init(){const response=await fetch('/api/editor/state');const data=await response.json();if(!response.ok)throw Error(data.error);draft=clone(data.state);baseline=clone(data.baseline);stored=JSON.stringify(data.state);registry=data.catalog;revision=data.revision;canUndo=data.canUndo;
 const names={'dw-editor':'Formulário de edição','dw-panel':'Painel de informações','dw-metric':'Indicador','dw-note':'Aviso','rt-note':'Observação','rt-card':'Quadro de conteúdo','rt-settings':'Configurações','dw-portal':'Alunos e reservas','dw-weather-hero':'Clima','rt-desktop-task-note':'Orientações',main:'Conteúdo principal',section:'Seção da tela',article:'Bloco de conteúdo',aside:'Painel lateral'};
 for(const entries of Object.values(registry))for(const meta of Object.values(entries))if(meta.kind==='area'&&names[meta.label])meta.label=names[meta.label];
 try{const recovery=JSON.parse(localStorage.getItem(draftKey)||'null');if(recovery?.base===JSON.stringify(baseline)){
   if(recovery.revision===revision||(recovery.revision+1===revision&&recovery.pendingState===stored)||(recovery.revision===undefined&&revision===0)){const checked=await api('/api/preview',{state:recovery.state});draft=clone(checked.state);if(dirty())await saveDraft();}
   else if(JSON.stringify(recovery.state)!==stored){localStorage.setItem(draftKey+'-conflict',JSON.stringify(recovery));localStorage.removeItem(draftKey);notice('Outra aba salvou um rascunho mais recente. A cópia anterior foi preservada no navegador.');}
 }}catch{notice('Rascunho do servidor preservado. A cópia do navegador precisa ser conferida.');}
 let savedContext;try{savedContext=JSON.parse(localStorage.getItem(contextKey)||'null');}catch{}if(apps[savedContext?.app])app=savedContext.app;if(['desktop','mobile'].includes(savedContext?.view))view=savedContext.view;$('app').value=app;$('view').value=view;$('guides').checked=savedContext?.rulers!==false;if(['auto','0.5','0.75','1'].includes(savedContext?.zoom))$('zoom').value=savedContext.zoom;modeUi();pages(savedContext?.page);status();}
function setupMeasures(){
 for(const slider of document.querySelectorAll('input[type="range"]')){
  const row=document.createElement('div');row.className='measure-row';slider.before(row);row.append(slider);
  const number=document.createElement('input');number.type='number';number.id=slider.id+'-number';number.min=slider.min;number.max=slider.max;number.step=slider.step||'1';number.value=slider.value;
  const name=slider.closest('label').firstChild.textContent.trim();slider.setAttribute('aria-label',name);number.setAttribute('aria-label',name+(slider.id==='element-width'?' em porcentagem':' em pixels'));
  number.addEventListener('input',()=>{if(number.value===''||!number.checkValidity())return;slider.value=number.value;slider.dispatchEvent(new Event('input',{bubbles:true}));});
  number.addEventListener('blur',()=>{number.value=slider.value;});slider.addEventListener('input',()=>{number.value=slider.value;});row.append(number);
 }
}
setupMeasures();
moveUI=window.createMoveEditor({resize:size,remember:context,commit(ids){
 if(!editing||conflict||!draft||ids.length<2||!ids.includes(selection?.id))return;
 const slots=draft[app][view].slots||{},slot=Object.entries(slots).find(([,blocks])=>blocks.length===ids.length&&blocks.every(block=>ids.includes(block.id)));
 if(slot){const [area,blocks]=slot,byId=new Map(blocks.map(block=>[block.id,block]));if(blocks.every((block,index)=>block.id===ids[index]))return;draft[app][view].slots[area]=ids.map(id=>byId.get(id));change();return;}
 const extraIds=new Set(Object.values(slots).flat().map(block=>block.id));
 if(ids.some(id=>!(registry[app]?.[id]?.kind==='area'&&!id.startsWith('control-'))&&!extraIds.has(id)))return;
 const orders=draft[app][view].orders||[],existing=orders.find(group=>group.length===ids.length&&group.every(id=>ids.includes(id)));
 if(existing&&JSON.stringify(existing)===JSON.stringify(ids))return;
 draft[app][view].orders=[...orders.filter(group=>!group.some(id=>ids.includes(id))),ids.slice()];change();
}});
init().catch(error=>{$('dirty').textContent=error.message;notice(error.message);});
