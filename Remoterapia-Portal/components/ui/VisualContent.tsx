'use client'
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import saved from '@/app/visual-content.json'
type Block={id:string;type:'text'|'notice'|'link'|'columns';title:string;body:string;href?:string;label?:string}
type View={texts:Record<string,string>;slots:Record<string,Block[]>}
type Content={mobile:View;desktop:View}
const Context=createContext<Content>(saved as Content)
export function VisualContentProvider({children}:{children:ReactNode}){
 const [content,setContent]=useState<Content>(saved as Content)
 useEffect(()=>{setContent(saved as Content)},[])
 useEffect(()=>{
  if(process.env.NODE_ENV!=='development')return
  const handle=(event:MessageEvent)=>{
   if(event.source!==window.parent||window.parent===window||!['http://127.0.0.1:3010','http://localhost:3010'].includes(event.origin))return
   if(event.data?.type==='rt-content-preview'&&event.data.content?.mobile&&event.data.content?.desktop)setContent(event.data.content)
  }
  window.addEventListener('message',handle);return()=>window.removeEventListener('message',handle)
 },[])
 return <Context.Provider value={content}>{children}</Context.Provider>
}
export function VisualText({id,defaultText}:{id:string;defaultText:string}){
 const content=useContext(Context)
 return <span data-rt-copy-id={id} data-rt-copy-default={process.env.NODE_ENV==='development'?defaultText:undefined} className="rt-edit-copy"><span className="rt-visual-mobile">{content.mobile.texts[id]??defaultText}</span><span className="rt-visual-desktop">{content.desktop.texts[id]??defaultText}</span></span>
}
export function VisualContentSlot({id}:{id:string}){
 const content=useContext(Context)
 return <>{(['mobile','desktop'] as const).map(view=><div key={view} className={`rt-visual-${view} rt-visual-slot`} data-rt-slot={id}>{(content[view].slots[id]||[]).map(block=><section key={block.id} className={`rt-added-block rt-added-${block.type}`} data-rt-extra-id={block.id} data-rt-extra-parent={id}><div><h2>{block.title}</h2><p>{block.body}</p></div>{block.type==='link'&&block.href&&<a className="rt-primary" href={block.href}>{block.label||'Saiba mais'}<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>}{block.type==='columns'&&<div className="rt-added-art" aria-hidden="true"><svg viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="2"><path d="M-10 42q30-24 60 0t70 0M-10 58q30-24 60 0t70 0M-10 74q30-24 60 0t70 0"/><circle cx="87" cy="20" r="12"/></svg></div>}</section>)}</div>)}</>
}
