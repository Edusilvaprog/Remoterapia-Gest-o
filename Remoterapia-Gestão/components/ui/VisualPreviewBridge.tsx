'use client'
import { useEffect } from 'react'
export default function VisualPreviewBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const editorOrigins = new Set(['http://127.0.0.1:3010', 'http://localhost:3010'])
    let editing=false,origin='',lastAreas='',timer:ReturnType<typeof setTimeout>,hovered:HTMLElement|null=null
    const marker='[data-rt-copy-id],[data-rt-control-id],[data-rt-part-id],[data-rt-extra-id],[data-rt-area]'
    const cards='.rt-base-panel,.rt-base-metrics>*,.rt-base-hub-card,.rt-base-history-card,.dw-panel,.dw-metric,.rt-card,.rt-payment-option,.rt-experience-card'
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
    const identify=(element:HTMLElement)=>{
      const id=element.dataset.rtCopyId||element.dataset.rtControlId||element.dataset.rtPartId||element.dataset.rtExtraId||element.dataset.rtArea
      const kind=element.dataset.rtCopyId?'text':element.dataset.rtExtraId?'extra':'area'
      return id?{id,kind,area:element.dataset.rtExtraParent||element.closest<HTMLElement>('[data-rt-area]')?.dataset.rtArea}:null
    }
    const registerTargets=()=>{
      for(const [selector,attribute,prefix] of [['button,a,summary,[role="button"]','data-rt-control-id','control'],[cards,'data-rt-part-id','part']]){
        document.querySelectorAll<HTMLElement>(selector).forEach(element=>{
          if(attribute==='data-rt-part-id'&&element.dataset.rtArea)return
          const copy=Array.from(element.querySelectorAll<HTMLElement>('[data-rt-copy-id]')).find(item=>item.closest(selector)===element)
          if(copy?.dataset.rtCopyId&&/^copy-[a-f0-9]{12}$/.test(copy.dataset.rtCopyId))element.setAttribute(attribute,`${prefix}-${copy.dataset.rtCopyId.slice(5)}`)
        })
      }
    }
    const targets=(target:Element)=>{
      const control=target.closest<HTMLElement>('button,a,summary,[role="button"]')
      if(control&&!control.dataset.rtControlId&&!target.closest('[data-rt-copy-id]')&&!target.closest('[data-rt-extra-id]'))return []
      const found:Array<{id:string;kind:string;area:string|undefined}>=[],seen=new Set<string>()
      let current:HTMLElement|null=target.closest<HTMLElement>(marker)
      while(current){const entry=identify(current);if(entry&&!seen.has(entry.id)){found.push(entry);seen.add(entry.id)}current=current.parentElement?.closest<HTMLElement>(marker)||null}
      return found
    }
    const highlight=(id:string)=>{
      document.querySelectorAll('[data-rt-selected]').forEach(element=>element.removeAttribute('data-rt-selected'))
      if(!/^(copy|area|block|control|part)-[a-f0-9]{12}$/.test(id))return
      const attr=id.startsWith('copy-')?'data-rt-copy-id':id.startsWith('area-')?'data-rt-area':id.startsWith('control-')?'data-rt-control-id':id.startsWith('part-')?'data-rt-part-id':'data-rt-extra-id'
      const element=Array.from(document.querySelectorAll<HTMLElement>(`[${attr}="${id}"]`)).find(item=>item.getClientRects().length>0)
      element?.setAttribute('data-rt-selected','true')
      if(element&&origin){const style=getComputedStyle(element),area=element.closest<HTMLElement>('[data-rt-area]');post({type:'rt-style-snapshot',id,path:targets(element),area:area?.dataset.rtArea,values:{color:style.color,background:style.backgroundColor,fontSize:parseFloat(style.fontSize),paddingX:parseFloat(style.paddingLeft),paddingY:parseFloat(style.paddingTop),marginTop:parseFloat(style.marginTop),marginBottom:parseFloat(style.marginBottom)}})}
    }
    const areas=()=>{
      registerTargets()
      const visible=Array.from(document.querySelectorAll<HTMLElement>(marker)).filter(element=>element.getClientRects().length>0)
      const ids=visible.filter(element=>element.dataset.rtArea||element.dataset.rtControlId||element.dataset.rtPartId).map(element=>identify(element)?.id),texts=visible.filter(element=>element.dataset.rtCopyId).map(element=>element.dataset.rtCopyId)
      const allAreas=Array.from(document.querySelectorAll<HTMLElement>('[data-rt-area]')).map(element=>element.dataset.rtArea)
      const page=window.location.pathname+window.location.search+window.location.hash
      const serialized=JSON.stringify([ids,texts,allAreas,page]);if(serialized!==lastAreas){lastAreas=serialized;post({type:'rt-visible-areas',ids,texts,allAreas,page})}
    }
    const resolveCopy=(target:Element)=>{
      const direct=target.closest<HTMLElement>('[data-rt-copy-id]');if(direct)return direct
      const container=target.closest('button,a,h1,h2,h3,h4,label,summary')
      const copies=Array.from(container?.querySelectorAll<HTMLElement>('[data-rt-copy-id]')||[]).filter(item=>item.getClientRects().length>0)
      return copies.length===1?copies[0]:null
    }
    const pick=(event:MouseEvent)=>{
      if(!editing||event.altKey||!(event.target instanceof Element))return
      if(event.target.closest('[contenteditable="plaintext-only"]')){event.stopPropagation();return}
      event.preventDefault();event.stopPropagation()
      const path=targets(event.target),selected=path[0]
      if(selected){highlight(selected.id);post({type:'rt-element-selected',...selected,path})}
      else post({type:'rt-selection-unavailable',message:'Este controle não possui um ajuste visual cadastrado. Use Navegar para utilizá-lo.'})
    }
    const hover=(event:MouseEvent)=>{
      const element=editing&&event.target instanceof Element&&targets(event.target).length?event.target.closest<HTMLElement>(marker):null
      if(element===hovered)return
      hovered?.removeAttribute('data-rt-hovered');hovered=element;hovered?.setAttribute('data-rt-hovered','true')
    }
    const inline=(event:MouseEvent)=>{
      if(!editing||event.altKey||!(event.target instanceof Element))return
      const root=resolveCopy(event.target);if(!root)return
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
      if(payload?.type==='rt-editor-mode'){
        editing=payload.editing===true;protectControls();document.documentElement.toggleAttribute('data-rt-editing',editing)
        if(!editing){hovered?.removeAttribute('data-rt-hovered');hovered=null;document.querySelectorAll('[data-rt-selected]').forEach(element=>element.removeAttribute('data-rt-selected'))}
        return
      }
      if(payload?.type==='rt-select-element'&&typeof payload.id==='string'){highlight(payload.id);return}
      if (!payload || payload.type !== 'rt-visual-preview' || typeof payload.css !== 'string' || payload.css.length > 30000) return
      editing=payload.editing===true
      protectControls()
      document.documentElement.toggleAttribute('data-rt-editing',editing)
      let style = document.getElementById('rt-local-visual-preview')
      if (!style) { style = document.createElement('style'); style.id = 'rt-local-visual-preview'; document.head.appendChild(style) }
      style.textContent = payload.css+'\n[data-rt-editing] [data-rt-hovered]{outline:1px dashed #176ab0;outline-offset:2px;cursor:crosshair}[data-rt-editing] [data-rt-selected]{outline:2px solid #dc2d85!important;outline-offset:3px}[contenteditable="plaintext-only"]{outline:2px solid #1d70b8!important;cursor:text!important}'
      clearSavedStyles()
      lastAreas='';areas()
    }
    window.addEventListener('message', handle)
    document.addEventListener('click',pick,true);document.addEventListener('dblclick',inline,true);document.addEventListener('mouseover',hover,true)
    document.addEventListener('submit',guardSubmit,true)
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{protectControls();areas()},200)});observer.observe(document.body,{childList:true,subtree:true})
    const headObserver=new MutationObserver(records=>{if(records.some(record=>(record.target as Element).id!=='rt-local-visual-preview'&&(record.target as Element).parentElement?.id!=='rt-local-visual-preview'))clearSavedStyles()});headObserver.observe(document.head,{childList:true,subtree:true})
    const onStyleLoad=(event:Event)=>{if(event.target instanceof HTMLLinkElement)clearSavedStyles()};document.addEventListener('load',onStyleLoad,true)
    const announce=()=>{if(window.parent!==window)window.parent.postMessage({type:'rt-editor-ready'},'*')}
    window.addEventListener('hashchange',announce)
    if(window.parent!==window)window.parent.postMessage({type:'rt-editor-ready'},'*')
    return () => { window.removeEventListener('message', handle);window.removeEventListener('hashchange',announce);document.removeEventListener('click',pick,true);document.removeEventListener('dblclick',inline,true);document.removeEventListener('mouseover',hover,true);document.removeEventListener('submit',guardSubmit,true);document.removeEventListener('load',onStyleLoad,true);observer.disconnect();headObserver.disconnect();clearTimeout(timer);editing=false;protectControls();hovered?.removeAttribute('data-rt-hovered');document.documentElement.removeAttribute('data-rt-editing');document.getElementById('rt-local-visual-preview')?.remove() }
  }, [])
  return null
}
