'use strict';
window.createMoveEditor=function({commit,resize,remember}){
  const $=id=>document.getElementById(id),geometry=window.RtMoveGeometry;
  let layout=null,editing=true,metrics={width:1440,height:900,scale:1},drag=null,positionTimer;
  const stage=$('stage'),frame=$('preview');
  const layer=document.createElement('div');layer.id='move-overlay';layer.setAttribute('aria-hidden','false');stage.append(layer);
  const make=(tag,id)=>{const node=document.createElement(tag);node.id=id;layer.append(node);return node;};
  const handle=make('button','move-handle');handle.type='button';handle.setAttribute('aria-label','Segurar para mover o bloco');handle.innerHTML='<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M6 3v.1M12 3v.1M6 9v.1M12 9v.1M6 15v.1M12 15v.1"/></svg>Mover';
  const ghost=make('div','move-ghost'),drop=make('div','move-drop'),vertical=make('div','move-guide-x'),horizontal=make('div','move-guide-y'),boundary=make('div','move-boundary'),message=make('div','move-label');
  const rulerX=document.createElement('div'),rulerY=document.createElement('div');rulerX.id='move-ruler-x';rulerY.id='move-ruler-y';rulerX.setAttribute('aria-hidden','true');rulerY.setAttribute('aria-hidden','true');stage.append(rulerX,rulerY);
  const movable=()=>editing&&layout?.bounds&&layout.items.length>1;
  function box(node,rect){const s=metrics.scale;Object.assign(node.style,{left:rect.left*s+'px',top:rect.top*s+'px',width:rect.width*s+'px',height:rect.height*s+'px'});}
  function rulers(){
    const enabled=editing&&$('guides').checked,gutter=enabled?20:0,s=metrics.scale;
    Object.assign(stage.style,{width:metrics.width*s+gutter+'px',height:metrics.height*s+gutter+'px'});
    Object.assign(frame.style,{position:'absolute',left:gutter+'px',top:gutter+'px'});
    Object.assign(layer.style,{left:gutter+'px',top:gutter+'px',width:metrics.width*s+'px',height:metrics.height*s+'px'});
    rulerX.hidden=rulerY.hidden=!enabled;
    for(const [node,length,axis] of [[rulerX,metrics.width,'x'],[rulerY,metrics.height,'y']]){
      node.replaceChildren();node.style.setProperty('--minor',10*s+'px');node.style.setProperty('--major',50*s+'px');
      if(axis==='x')Object.assign(node.style,{left:gutter+'px',width:length*s+'px'});else Object.assign(node.style,{top:gutter+'px',height:length*s+'px'});
      const step=s<.5?200:100;for(let value=0;value<=length;value+=step){const label=document.createElement('span');label.textContent=String(value);label.style[axis==='x'?'left':'top']=value*s+'px';node.append(label);}
    }
  }
  function guide(rect){const show=editing&&$('guides').checked;vertical.hidden=horizontal.hidden=!show;if(show){vertical.style.left=(rect.left+rect.width/2)*metrics.scale+'px';horizontal.style.top=(rect.top+rect.height/2)*metrics.scale+'px';}}
  function render(){
    const enabled=movable(),selected=layout?.items.find(item=>item.id===layout.id);
    handle.hidden=!enabled||!selected;ghost.hidden=drop.hidden=boundary.hidden=message.hidden=true;vertical.hidden=horizontal.hidden=true;
    $('move-tools').hidden=!enabled;$('move-fixed').hidden=!editing||!layout?.reason;$('move-fixed').textContent=layout?.reason||'';
    if(!enabled||!selected)return;
    const index=layout.items.indexOf(selected),s=metrics.scale;
    Object.assign(handle.style,{left:Math.max(0,Math.min(metrics.width*s-92,(selected.rect.left+selected.rect.width/2)*s-46))+'px',top:Math.max(0,selected.rect.top*s-30)+'px'});
    $('move-position').max=String(layout.items.length);$('move-position').value=String(index+1);$('move-help').textContent=`${index+1} de ${layout.items.length} · segure Mover e solte sobre outro bloco deste grupo. Esc cancela.`;
    guide(layout.bounds);
  }
  function stop(cancel=false){
    if(!drag)return;const current=drag;drag=null;try{handle.releasePointerCapture(current.pointerId);}catch{}
    handle.classList.remove('is-dragging');render();
    if(!cancel&&current.target&&current.target.id!==layout?.id){const ids=current.layout.items.map(item=>item.id);commit(geometry.reorder(ids,current.layout.id,current.target.id));}
  }
  handle.addEventListener('pointerdown',event=>{
    if(event.button!==0||!movable())return;event.preventDefault();event.stopPropagation();handle.focus();
    const selected=layout.items.find(item=>item.id===layout.id);if(!selected)return;
    drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,layout,target:selected,rect:selected.rect,started:false};
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;event.preventDefault();const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(!drag.started&&Math.hypot(dx,dy)<5)return;drag.started=true;handle.classList.add('is-dragging');
    const frameRect=frame.getBoundingClientRect(),x=(event.clientX-frameRect.left)/metrics.scale,y=(event.clientY-frameRect.top)/metrics.scale;
    drag.target=geometry.targetAt(drag.layout.items,drag.rect.left+drag.rect.width/2+dx/metrics.scale,drag.rect.top+drag.rect.height/2+dy/metrics.scale,drag.layout.bounds);
    ghost.hidden=false;box(ghost,{...drag.rect,left:drag.rect.left+dx/metrics.scale,top:drag.rect.top+dy/metrics.scale});
    boundary.hidden=false;box(boundary,drag.layout.bounds);message.hidden=false;
    const target=drag.target;drop.hidden=!target;
    if(target){box(drop,target.rect);guide(target.rect);message.textContent=`Soltar na posição ${drag.layout.items.indexOf(target)+1}`;}
    else{vertical.hidden=horizontal.hidden=true;message.textContent='Solte sobre um bloco deste grupo';}
    Object.assign(message.style,{left:Math.max(0,Math.min(metrics.width*metrics.scale-210,x*metrics.scale+12))+'px',top:Math.max(0,y*metrics.scale+18)+'px'});
  });
  handle.addEventListener('pointerup',event=>{if(drag&&event.pointerId===drag.pointerId)stop(!drag.started);});
  handle.addEventListener('pointercancel',()=>stop(true));handle.addEventListener('lostpointercapture',()=>stop(true));
  document.addEventListener('keydown',event=>{if(drag&&event.key==='Escape'){event.preventDefault();stop(true);}});window.addEventListener('blur',()=>stop(true));
  function position(){clearTimeout(positionTimer);if(!movable())return;const index=Number($('move-position').value)-1;if(!Number.isInteger(index)||index<0||index>=layout.items.length){render();return;}if(layout.items[index].id!==layout.id)commit(geometry.reorder(layout.items.map(item=>item.id),layout.id,layout.items[index].id));}
  $('move-position').addEventListener('input',()=>{clearTimeout(positionTimer);positionTimer=setTimeout(position,200);});
  $('move-position').addEventListener('change',position);
  $('move-position').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();position();}});
  $('guides').addEventListener('change',()=>{stop(true);remember();resize();render();});
  return {
    gutter:()=>editing&&$('guides').checked?20:0,
    resize(next){stop(true);metrics=next;rulers();render();},
    setMode(value){stop(true);clearTimeout(positionTimer);editing=value;$('guides').disabled=!editing;resize();render();},
    setLayout(next){if(drag){if(JSON.stringify(next)===JSON.stringify(layout))return;stop(true);}layout=next;render();},
    reset(){stop(true);clearTimeout(positionTimer);layout=null;render();},
    cancel(){stop(true);}
  };
};
