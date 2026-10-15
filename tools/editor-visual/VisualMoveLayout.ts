export type MoveEntry={id:string;kind:string;area?:string}
export type MoveRect={left:number;top:number;width:number;height:number}
export type MoveLayout={id:string;items:{id:string;rect:MoveRect}[];bounds?:MoveRect;reason?:string}

/** Reads only existing sibling groups. Application nodes are never detached or moved. */
export function inspectMoveLayout(element:HTMLElement,identify:(element:HTMLElement)=>MoveEntry|null):MoveLayout{
  const selected=identify(element),id=selected?.id||'',parent=element.parentElement;
  const fixed=(reason:string):MoveLayout=>({id,items:[],reason});
  if(!selected||selected.kind==='text'||element.dataset.rtControlId)return fixed('Selecione um bloco para mover.');
  if(!parent||element.matches('main,[role="main"],.rt-base-page'))return fixed('A estrutura principal da página permanece fixa. Selecione um bloco dentro dela.');
  const children=Array.from(parent.children).filter((item):item is HTMLElement=>item instanceof HTMLElement&&item.getClientRects().length>0);
  if(children.length<2)return fixed('Este bloco precisa de outro bloco na mesma área para trocar de posição.');
  if(children.length>60)return fixed('Este grupo é grande demais para reorganizar pelo editor.');
  const items=children.map((item,index)=>({element:item,entry:identify(item),index,style:getComputedStyle(item)}));
  if(items.some(item=>!item.entry||item.entry.kind==='text'||item.element.dataset.rtControlId||['absolute','fixed'].includes(item.style.position)))return fixed('Este bloco faz parte de uma estrutura fixa. Selecione um cartão ou seção na mesma grade.');
  const ids=items.map(item=>item.entry!.id);
  if(new Set(ids).size!==ids.length)return fixed('Há blocos repetidos neste grupo; sua ordem precisa ser ajustada na estrutura da página.');
  const style=getComputedStyle(parent),grid=style.display.includes('grid'),flex=style.display.includes('flex');
  const auto=(value:string)=>value==='auto'||value.startsWith('span ');
  if(grid&&items.some(item=>!auto(item.style.gridRowStart)||!auto(item.style.gridColumnStart)))return fixed('Esta grade tem posições fixas. Seus blocos permanecem ancorados para evitar sobreposição.');
  if(flex&&(style.flexDirection.endsWith('reverse')||style.flexWrap==='wrap-reverse'))return fixed('Esta linha usa ordem invertida. Selecione um grupo com ordem direta.');
  if(!grid&&!flex&&!parent.classList.contains('rt-visual-slot'))return fixed('Esta área não é uma linha ou grade de blocos editáveis.');
  const rect=(item:HTMLElement):MoveRect=>{const r=item.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
  const arranged=items.sort((a,b)=>(Number(a.style.order)||0)-(Number(b.style.order)||0)||a.index-b.index).map(item=>({id:item.entry!.id,rect:rect(item.element)}));
  let bounds=rect(parent);
  if(!bounds.width||!bounds.height){const left=Math.min(...arranged.map(item=>item.rect.left)),top=Math.min(...arranged.map(item=>item.rect.top)),right=Math.max(...arranged.map(item=>item.rect.left+item.rect.width)),bottom=Math.max(...arranged.map(item=>item.rect.top+item.rect.height));bounds={left,top,width:right-left,height:bottom-top};}
  return {id,bounds,items:arranged};
}
