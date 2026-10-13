const APPS = ['gestao', 'portal'];
const VIEWS = ['mobile', 'desktop'];
const COLORS = ['primary', 'accent', 'canvas', 'surface', 'ink', 'muted'];
const NUMBERS = { textSize:[10,22], headingSize:[20,48], cardRadius:[0,32], buttonRadius:[0,28], buttonHeight:[32,64], pagePadding:[8,48], rowPadding:[6,24], iconSize:[14,28] };
const FONTS = { original:null, system:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif", arial:'Arial,sans-serif', segoe:"'Segoe UI',sans-serif" };
const fs=require('node:fs'),path=require('node:path');
function catalog(){const file=path.join(__dirname,'catalog.json');return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{gestao:{},portal:{}};}
function record(value){return value&&typeof value==='object'&&!Array.isArray(value)}
function safeLink(value){return typeof value==='string'&&value.length<=1000&&((/^\/(?!\/)/.test(value)&&!/[\\\r\n]/.test(value))||(/^https:\/\//.test(value)&&!/[\r\n]/.test(value)))}
function validateContent(key,value,entries){
 if(!record(value)||Object.keys(value).length>1000)throw Error('Conteúdo inválido.');
 const clean={};
 for(const [id,item] of Object.entries(value)){
  if(!Object.hasOwn(entries,id))throw Error('Elemento não cadastrado.');
  if(key==='texts'){
   if(entries[id].kind!=='text'||typeof item!=='string'||item.length>2000)throw Error('Texto inválido.');clean[id]=item;
  }else if(key==='elements'){
   if(!record(item)||Object.keys(value).length>60)throw Error('Estilo do elemento inválido.');const properties={};
   for(const [prop,setting] of Object.entries(item)){
    if(['background','color'].includes(prop)){if(typeof setting!=='string'||!/^#[0-9a-f]{6}$/i.test(setting))throw Error('Cor inválida.');properties[prop]=setting;}
    else if(['fontSize','radius','padding'].includes(prop)){if(typeof setting!=='number'||!Number.isFinite(setting)||setting<0||setting>(prop==='fontSize'?64:48))throw Error('Medida inválida.');if(entries[id].kind==='text'&&prop!=='fontSize')throw Error('Essa opção pertence a um bloco.');properties[prop]=Math.round(setting);}
    else if(prop==='hidden'){if(typeof setting!=='boolean'||!entries[id].canHide)throw Error('Este bloco mantém funções do sistema e não pode ser ocultado.');properties.hidden=setting;}
    else throw Error('Propriedade não permitida.');
   }
   clean[id]=properties;
  }else if(key==='slots'){
   if(entries[id].kind!=='area'||entries[id].canAdd===false||!Array.isArray(item)||item.length>12)throw Error('Área de blocos inválida.');
   const used=new Set();clean[id]=item.map(block=>{
    if(!record(block)||Object.keys(block).some(k=>!['id','type','title','body','href','label'].includes(k))||!/^block-[a-f0-9]{12}$/.test(block.id)||used.has(block.id)||!['text','notice','link','columns'].includes(block.type)||typeof block.title!=='string'||block.title.length>120||typeof block.body!=='string'||block.body.length>2000)throw Error('Bloco inválido.');
    if(block.href!==undefined&&!safeLink(block.href))throw Error('Use um endereço HTTPS ou uma rota do site.');if(block.label!==undefined&&(typeof block.label!=='string'||block.label.length>100))throw Error('Nome do botão inválido.');used.add(block.id);
    return {id:block.id,type:block.type,title:block.title,body:block.body,...(block.href?{href:block.href}:{}),...(block.label?{label:block.label}:{})};
   });
  }
 }
 return clean;
}
function emptyState(){return {gestao:{mobile:{},desktop:{}},portal:{mobile:{},desktop:{}}};}
function validateState(input){
  if(!input || typeof input!=='object' || Array.isArray(input)) throw Error('Configuração inválida.');
  const clean=emptyState(),registry=catalog();
  if(Object.keys(input).some(k=>!APPS.includes(k))) throw Error('Site inválido.');
  for(const app of APPS){
    const views=input[app] || {};
    if(typeof views!=='object' || Array.isArray(views) || Object.keys(views).some(k=>!VIEWS.includes(k))) throw Error('Visualização inválida.');
    for(const view of VIEWS){
      const style=views[view] || {};
      if(typeof style!=='object' || Array.isArray(style)) throw Error('Estilo inválido.');
      for(const [key,value] of Object.entries(style)){
        if(COLORS.includes(key)){if(typeof value!=='string'|| !/^#[0-9a-f]{6}$/i.test(value)) throw Error('Cor inválida.');clean[app][view][key]=value.toLowerCase();}
        else if(Object.hasOwn(NUMBERS,key)){const [min,max]=NUMBERS[key];if(typeof value!=='number'|| !Number.isFinite(value)||value<min||value>max) throw Error('Medida fora do limite.');clean[app][view][key]=Math.round(value);}
        else if(key==='font'){if(typeof value!=='string'||!Object.hasOwn(FONTS,value)) throw Error('Fonte inválida.');if(value!=='original') clean[app][view].font=value;}
        else if(['texts','elements','slots'].includes(key))clean[app][view][key]=validateContent(key,value,registry[app]);
        else throw Error('Opção não reconhecida.');
      }
    }
  }
  return clean;
}
function generateView(s){
  const out=[];const root=[];const rule=(selector,body)=>out.push(`${selector}{${body}}`);
  const map={primary:['--rt-blue','--dw-blue'],accent:['--rt-pink','--dw-pink','--rt-focus'],canvas:['--rt-canvas','--dw-canvas'],surface:['--rt-surface','--dw-surface'],ink:['--rt-ink','--dw-ink'],muted:['--rt-muted','--dw-muted']};
  for(const key of COLORS) if(s[key]) for(const token of map[key])root.push(`${token}:${s[key]}!important`);
  if(s.cardRadius!==undefined)root.push(`--rt-radius:${s.cardRadius}px!important`);
  if(root.length) rule(':root',root.join(';'));
  if(s.primary){rule('.rt-primary,.dw-primary,.plorix-btn-login,button[class*="bg-blue-600"],button[class*="bg-sky-600"],button[class*="bg-[#0284c7]"],button[class*="bg-[#0369a1]"]',`background-color:${s.primary}!important`);rule('.rt-nav-item.is-active,.rt-desktop-section-tabs .is-active',`border-color:${s.primary}!important`);}
  if(s.accent) rule('.rt-heading-dot,.rt-nav-item.is-active>svg',`color:${s.accent}!important`);
  if(s.canvas)rule('html,body,.rt-gestao-main,.rt-workspace-body,.rt-portal-content',`background-color:${s.canvas}!important`);
  if(s.surface)rule('.dw-panel,.dw-editor,.dw-metric,.dw-note,.rt-card,.rt-payment-option,.rt-payment-table,.rt-topbar,.rt-experience-card',`background-color:${s.surface}!important`);
  if(s.ink)rule('.dw-heading h1,.rt-page-heading h1,.dw-panel h2,.dw-editor h3,.dw-editor h4,.rt-card h2',`color:${s.ink}!important`);
  if(s.muted)rule('.dw-heading p,.rt-page-heading p,.dw-note p',`color:${s.muted}!important`);
  if(s.font && FONTS[s.font])rule('html,body,button,input,select,textarea',`font-family:${FONTS[s.font]}!important`);
  if(s.textSize!==undefined)rule('p,label,input,select,textarea,.dw-table,.rt-table,.rt-payment-table table',`font-size:${s.textSize}px!important`);
  if(s.headingSize!==undefined)rule('h1,.dw-heading h1,.rt-page-heading h1',`font-size:${s.headingSize}px!important`);
  if(s.cardRadius!==undefined)rule('.dw-panel,.dw-editor,.dw-metric,.dw-note,.rt-card,.rt-payment-option,.rt-experience-card,.rt-experience-dialog,[class*="rounded-3xl"]',`border-radius:${s.cardRadius}px!important`);
  if(s.buttonRadius!==undefined)rule('button,.rt-primary,.dw-primary',`border-radius:${s.buttonRadius}px!important`);
  if(s.buttonHeight!==undefined)rule('button:not([role="switch"]),.rt-primary,.dw-primary',`min-height:${s.buttonHeight}px!important`);
  if(s.pagePadding!==undefined)rule('.rt-workspace-body>main,.rt-portal-content,.rt-overview,.rt-settings,.rt-desktop-home',`padding:${s.pagePadding}px!important`);
  if(s.rowPadding!==undefined)rule('th,td',`padding-top:${s.rowPadding}px!important;padding-bottom:${s.rowPadding}px!important`);
  if(s.iconSize!==undefined)rule('.rt-brand-icon,button>svg,.rt-nav-item>svg',`width:${s.iconSize}px!important;height:${s.iconSize}px!important`);
  for(const [id,style] of Object.entries(s.elements||{})){
   const rules=[];if(style.color)rules.push(`color:${style.color}!important`);if(style.background)rules.push(`background-color:${style.background}!important`);if(style.fontSize!==undefined)rules.push(`font-size:${style.fontSize}px!important`);if(style.radius!==undefined)rules.push(`border-radius:${style.radius}px!important`);if(style.padding!==undefined)rules.push(`padding:${style.padding}px!important`);if(style.hidden)rules.push('display:none!important');
   if(rules.length)rule(`[${id.startsWith('copy-')?'data-rt-copy-id':'data-rt-area'}="${id}"]`,rules.join(';'));
  }
  return out.join('\n');
}
// A named layer lets the development preview remove only saved editor overrides.
// Original application styles are never reset or replaced by guessed defaults.
function generateCss(settings){return '/* Aparência editada pelo painel visual local. Não contém regras de negócio. */\n@layer rt-visual-custom{\n'+VIEWS.map(v=>`@media (${v==='mobile'?'max-width:1023px':'min-width:1024px'}){\n${generateView(settings[v])}\n}`).join('\n')+'\n}\n';}
function contentFor(settings){return Object.fromEntries(VIEWS.map(view=>[view,{texts:settings[view].texts||{},slots:settings[view].slots||{}}]));}
module.exports={APPS,VIEWS,COLORS,NUMBERS,FONTS,emptyState,validateState,generateCss,contentFor,catalog};
