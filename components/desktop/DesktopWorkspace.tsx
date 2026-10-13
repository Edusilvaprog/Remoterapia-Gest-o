'use client'
import type { ReactNode } from 'react'
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Search, Waves } from 'lucide-react'
import BrandIcon from '@/components/ui/BrandIcon'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'


export function WorkspaceHeading({eyebrow,title,description,actions}:{eyebrow:string;title:string;description:string;actions?:ReactNode}){
  return <header className="dw-heading"><div><span className="dw-eyebrow"><Waves size={15}/>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions&&<div className="dw-heading-actions">{actions}</div>}</header>
}
export function WorkspaceMetric({label,value,detail,icon}:{label:string;value:ReactNode;detail?:string;icon:Parameters<typeof BrandIcon>[0]['name']}){
  return <article className="dw-metric" data-rt-area="area-452458a4776b"><span className="dw-metric-icon"><BrandIcon name={icon} size={21}/></span><div><p>{label}</p><strong>{value}</strong>{detail&&<small>{detail}</small>}</div><VisualContentSlot id="area-452458a4776b"/></article>
}
export function WorkspacePanel({title,description,children,aside}:{title:string;description?:string;children:ReactNode;aside?:ReactNode}){
  return <section className="dw-panel" data-rt-area="area-9e5718732bae"><header className="dw-panel-heading"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{aside}</header>{children}<VisualContentSlot id="area-9e5718732bae"/></section>
}
export function WorkspaceEmpty({title,description}:{title:string;description?:string}){
  return <div className="dw-empty"><span><Search size={26}/></span><h3>{title}</h3>{description&&<p>{description}</p>}</div>
}
export function WorkspaceDate({label,prev,next,today,nextDisabled=false}:{label:string;prev:()=>void;next:()=>void;today?:()=>void;nextDisabled?:boolean}){
  return <div className="dw-date"><button type="button" aria-label="Dia anterior" onClick={prev}><ChevronLeft size={18}/></button><span><CalendarDays size={17}/>{label}</span><button type="button" aria-label="Próximo dia" disabled={nextDisabled} onClick={next}><ChevronRight size={18}/></button>{today&&<button type="button" onClick={today}><VisualText id="copy-163cbcf71324" defaultText={"Hoje"}/></button>}</div>
}
export function WorkspaceNote({title,children}:{title:string;children:ReactNode}){
  return <aside className="dw-note" data-rt-area="area-4ad2a3b399fd"><span className="dw-note-icon"><ArrowUpRight size={22}/></span><h3>{title}</h3><div>{children}</div><svg viewBox="0 0 240 75" aria-hidden="true"><path d="M-10 45 C35 8 68 79 112 39 S193 13 252 41 M-10 59 C35 22 68 93 112 53 S193 27 252 55" fill="none" stroke="currentColor" strokeWidth="2"/></svg><VisualContentSlot id="area-4ad2a3b399fd"/></aside>
}
