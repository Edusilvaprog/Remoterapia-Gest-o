'use client'
import {useEffect} from 'react'
// Applies keyboard behavior to the existing dialogs while their action handlers stay in their owning components.
export default function DialogAccessibility(){
 useEffect(()=>{
  let active:HTMLElement|null=null,previous:HTMLElement|null=null
  const focusable='button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]'
  const visible=(node:HTMLElement)=>node.getClientRects().length>0&&!node.closest('[inert]')
  const scan=()=>{
   const overlays=Array.from(document.querySelectorAll<HTMLElement>('[data-rt-modal]')).filter(visible)
   const overlay=overlays.sort((a,b)=>(Number(getComputedStyle(a).zIndex)||0)-(Number(getComputedStyle(b).zIndex)||0)).at(-1)
   const panel=overlay?.firstElementChild as HTMLElement|undefined
   if(panel===active)return
   if(active&&!panel&&previous?.isConnected)previous.focus()
   active=panel||null
   if(!active)return
   previous=document.activeElement instanceof HTMLElement?document.activeElement:null
   active.setAttribute('role','dialog');active.setAttribute('aria-modal','true');active.setAttribute('tabindex','-1')
   if(!active.hasAttribute('aria-label')&&!active.hasAttribute('aria-labelledby'))active.setAttribute('aria-label',active.querySelector('h1,h2,h3,h4')?.textContent?.trim()||'Janela da Remoterapia')
   active.querySelectorAll<HTMLButtonElement>('button').forEach(button=>{if(!button.textContent?.trim()&&!button.hasAttribute('aria-label'))button.setAttribute('aria-label',button.title|| (button.querySelector('.lucide-x')?'Fechar janela':'Ação da janela'))})
   const first=Array.from(active.querySelectorAll<HTMLElement>(focusable)).find(visible);(first||active).focus()
  }
  const key=(event:KeyboardEvent)=>{
   if(!active||!active.isConnected)return
   if(event.key==='Escape'){const close=Array.from(active.querySelectorAll<HTMLButtonElement>('button')).find(button=>/fechar|cancelar|voltar/i.test(button.getAttribute('aria-label')||button.title||button.textContent||'')&&visible(button));if(close&&!close.disabled){event.preventDefault();close.click()}return}
   if(event.key!=='Tab')return
   const choices=Array.from(active.querySelectorAll<HTMLElement>(focusable)).filter(visible)
   if(!choices.length){event.preventDefault();active.focus();return}
   const first=choices[0],last=choices.at(-1)!
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===active)){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&(document.activeElement===last||!active.contains(document.activeElement))){event.preventDefault();first.focus()}
  }
  const keepFocus=(event:FocusEvent)=>{if(active?.isConnected&&event.target instanceof HTMLElement&&!active.contains(event.target)){const first=Array.from(active.querySelectorAll<HTMLElement>(focusable)).find(visible);(first||active).focus()}}
  document.addEventListener('focusin',keepFocus)
  const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});scan();document.addEventListener('keydown',key)
  return()=>{document.removeEventListener('focusin',keepFocus);observer.disconnect();document.removeEventListener('keydown',key)}
 },[])
 return null
}
