'use client'
import { useEffect } from 'react'
export default function VisualPreviewBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const editorOrigins = new Set(['http://127.0.0.1:3010', 'http://localhost:3010'])
    let editing=false,origin='',lastAreas='',timer:ReturnType<typeof setTimeout>
    const post=(data:object)=>{if(origin)window.parent.postMessage(data,origin)}
    const inputs=new Map<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement,boolean>()
    const protectControls=()=>{
      if(editing)document.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea').forEach(input=>{if(!inputs.has(input))inputs.set(input,input.disabled);input.disabled=true})
      else{inputs.forEach((disabled,input)=>{input.disabled=disabled});inputs.clear()}
    }
    const guardSubmit=(event:Event)=>{if(editing){event.preventDefault();event.stopImmediatePropagation()}}
    const clearSavedStyles=()=>{
      if(!origin||window.parent===window)return
      for(const sheet of Array.from(document.styleSheets)){
        if((sheet.ownerNode as HTMLElement|null)?.id==='rt-local-visual-preview')continue
        try{for(let i=sheet.cssRules.length-1;i>=0;i--)if(/^@layer rt-visual-custom\s*\{/.test(sheet.cssRules[i].cssText))sheet.deleteRule(i)}catch{/* External sheets remain unchanged. */}
      }
    }
    const highlight=(id:string)=>{
      document.querySelectorAll('[data-rt-selected]').forEach(element=>element.removeAttribute('data-rt-selected'))
      if(!/^(copy|area|block)-[a-f0-9]{12}$/.test(id))return
      const attr=id.startsWith('copy-')?'data-rt-copy-id':id.startsWith('area-')?'data-rt-area':'data-rt-extra-id'
      const element=Array.from(document.querySelectorAll<HTMLElement>(`[${attr}="${id}"]`)).find(item=>item.getClientRects().length>0)
      element?.setAttribute('data-rt-selected','true')
      if(element&&origin){const style=getComputedStyle(element),area=element.closest<HTMLElement>('[data-rt-area]');post({type:'rt-style-snapshot',id,area:area?.dataset.rtArea,values:{color:style.color,background:style.backgroundColor,fontSize:parseFloat(style.fontSize),radius:parseFloat(style.borderRadius),padding:parseFloat(style.paddingTop)}})}
    }
    const areas=()=>{
      const visible=Array.from(document.querySelectorAll<HTMLElement>('[data-rt-area],[data-rt-copy-id]')).filter(element=>element.getClientRects().length>0)
      const ids=visible.filter(element=>element.dataset.rtArea).map(element=>element.dataset.rtArea),texts=visible.filter(element=>element.dataset.rtCopyId).map(element=>element.dataset.rtCopyId)
      const allAreas=Array.from(document.querySelectorAll<HTMLElement>('[data-rt-area]')).map(element=>element.dataset.rtArea)
      const serialized=JSON.stringify([ids,texts,allAreas]);if(serialized!==lastAreas){lastAreas=serialized;post({type:'rt-visible-areas',ids,texts,allAreas})}
    }
    const pick=(event:MouseEvent)=>{
      if(!editing||!(event.target instanceof Element))return
      if(event.target.closest('[contenteditable="plaintext-only"]')){event.stopPropagation();event.stopImmediatePropagation();return}
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation()
      const extra=event.target.closest<HTMLElement>('[data-rt-extra-id]'),copy=event.target.closest<HTMLElement>('[data-rt-copy-id]');let area=event.target.closest<HTMLElement>('[data-rt-area]');while(area?.classList.contains('rt-card-heading'))area=area.parentElement?.closest<HTMLElement>('[data-rt-area]')||null
      const kind=extra?'extra':copy?'text':'area',id=extra?.dataset.rtExtraId||copy?.dataset.rtCopyId||area?.dataset.rtArea
      if(id){highlight(id);post({type:'rt-element-selected',id,kind,area:extra?.dataset.rtExtraParent||area?.dataset.rtArea})}
    }
    const inline=(event:MouseEvent)=>{
      if(!editing||!(event.target instanceof Element))return
      const root=event.target.closest<HTMLElement>('[data-rt-copy-id]');if(!root)return
      event.preventDefault();event.stopPropagation()
      const text=Array.from(root.children).find(child=>getComputedStyle(child).display!=='none') as HTMLElement|undefined
      if(!text)return;text.contentEditable='plaintext-only';text.focus()
      const range=document.createRange();range.selectNodeContents(text);const caret=window.getSelection();caret?.removeAllRanges();caret?.addRange(range)
      let cancelled=false;const original=text.textContent
      const commit=()=>{text.contentEditable='false';text.onkeydown=null;if(!cancelled)post({type:'rt-inline-text',id:root.dataset.rtCopyId,text:(text.textContent||'').slice(0,2000)})}
      text.addEventListener('blur',commit,{once:true})
      text.onkeydown=key=>{if(key.key==='Escape'||(key.key==='Enter'&&!key.shiftKey)){key.preventDefault();if(key.key==='Escape'){cancelled=true;text.textContent=original}text.blur()}}
    }
    const handle = (event: MessageEvent) => {
      if (window.parent === window || event.source !== window.parent || !editorOrigins.has(event.origin)) return
      const payload = event.data
      origin=event.origin
      if(payload?.type==='rt-select-element'&&typeof payload.id==='string'){highlight(payload.id);return}
      if (!payload || payload.type !== 'rt-visual-preview' || typeof payload.css !== 'string' || payload.css.length > 30000) return
      editing=payload.editing===true
      protectControls()
      document.documentElement.toggleAttribute('data-rt-editing',editing)
      let style = document.getElementById('rt-local-visual-preview')
      if (!style) { style = document.createElement('style'); style.id = 'rt-local-visual-preview'; document.head.appendChild(style) }
      style.textContent = payload.css+'\n[data-rt-editing] [data-rt-copy-id]:hover,[data-rt-editing] [data-rt-area]:hover{outline:1px dashed #dc2d85;outline-offset:3px;cursor:crosshair}[data-rt-editing] [data-rt-selected]{outline:2px solid #dc2d85!important;outline-offset:4px}[contenteditable="plaintext-only"]{outline:2px solid #1d70b8!important;cursor:text!important}'
      clearSavedStyles()
      lastAreas='';areas()
    }
    window.addEventListener('message', handle)
    document.addEventListener('click',pick,true);document.addEventListener('dblclick',inline,true)
    document.addEventListener('submit',guardSubmit,true)
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{protectControls();areas()},200)});observer.observe(document.body,{childList:true,subtree:true})
    const headObserver=new MutationObserver(records=>{if(records.some(record=>(record.target as Element).id!=='rt-local-visual-preview'&&(record.target as Element).parentElement?.id!=='rt-local-visual-preview'))clearSavedStyles()});headObserver.observe(document.head,{childList:true,subtree:true})
    const onStyleLoad=(event:Event)=>{if(event.target instanceof HTMLLinkElement)clearSavedStyles()};document.addEventListener('load',onStyleLoad,true)
    if(window.parent!==window)window.parent.postMessage({type:'rt-editor-ready'},'*')
    return () => { window.removeEventListener('message', handle);document.removeEventListener('click',pick,true);document.removeEventListener('dblclick',inline,true);document.removeEventListener('submit',guardSubmit,true);document.removeEventListener('load',onStyleLoad,true);observer.disconnect();headObserver.disconnect();clearTimeout(timer);editing=false;protectControls();document.documentElement.removeAttribute('data-rt-editing');document.getElementById('rt-local-visual-preview')?.remove() }
  }, [])
  return null
}
