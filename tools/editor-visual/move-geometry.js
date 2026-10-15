'use strict';
(function(root){
  function reorder(ids,from,to){
    const next=ids.slice(),start=next.indexOf(from),end=next.indexOf(to);
    if(start<0||end<0||new Set(next).size!==next.length)throw Error('Grupo de blocos inválido.');
    next.splice(start,1);next.splice(end,0,from);return next;
  }
  function targetAt(items,x,y,bounds){
    if(x<bounds.left-8||x>bounds.left+bounds.width+8||y<bounds.top-8||y>bounds.top+bounds.height+8)return null;
    let chosen=null,best=Infinity;
    for(const item of items){const r=item.rect,dx=Math.max(r.left-x,0,x-r.left-r.width),dy=Math.max(r.top-y,0,y-r.top-r.height),distance=dx*dx+dy*dy;if(distance<best){chosen=item;best=distance;}}
    return chosen;
  }
  const api={reorder,targetAt};if(typeof module==='object'&&module.exports)module.exports=api;else root.RtMoveGeometry=api;
})(typeof window==='object'?window:globalThis);
