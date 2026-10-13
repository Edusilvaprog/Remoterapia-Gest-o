'use client'
import {useEffect,useState} from 'react'
import {localPreviewEnabled} from '@/lib/local-preview-client'
const initial='Prévia local · dados fictícios · sem acesso ao banco real'
export default function LocalPreviewNotice(){
 const [message,setMessage]=useState(initial)
 useEffect(()=>{
  if(!localPreviewEnabled())return
  let timer:ReturnType<typeof setTimeout>
  const guard=(event:MouseEvent)=>{
   if(!(event.target instanceof Element))return
   const anchor=event.target.closest<HTMLAnchorElement>('a[href]');if(!anchor)return
   const url=new URL(anchor.href,window.location.href)
   if(url.origin===window.location.origin)return
   event.preventDefault();event.stopImmediatePropagation();setMessage('Link externo desativado na prévia. Nenhuma mensagem foi enviada.');clearTimeout(timer);timer=setTimeout(()=>setMessage(initial),5000)
  }
  document.addEventListener('click',guard,true);return()=>{document.removeEventListener('click',guard,true);clearTimeout(timer)}
 },[])
 return localPreviewEnabled()?<div className="rt-local-preview-notice" role="status">{message}</div>:null
}
