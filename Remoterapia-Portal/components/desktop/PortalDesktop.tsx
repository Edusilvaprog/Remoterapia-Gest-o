'use client'
import { CreditCard, CalendarDays, Compass, History, UserRound, Waves, LogOut, Bell, ArrowUpRight, LifeBuoy } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import {VisualText} from '@/components/ui/VisualContent'


export type PortalView = 'home' | 'agendar' | 'eventos' | 'historico' | 'perfil' | 'pagamentos'
const tabs = [{id:'home',label:'Início',icon:Waves},{id:'agendar',label:'Agendar remada',icon:CalendarDays},{id:'eventos',label:'Eventos',icon:Compass},{id:'historico',label:'Histórico',icon:History},{id:'pagamentos',label:'Planos e pagamentos',icon:CreditCard},{id:'perfil',label:'Meu perfil',icon:UserRound}] as const
export function PortalDesktopNavigation({view,onNavigate,nome,canBook,onNotificacoes,onLogout}:{view:string;onNavigate:(v:PortalView)=>void;nome?:string;canBook:boolean;onNotificacoes:()=>void;onLogout:()=>void}) {
  const current=tabs.find(t=>t.id===view)
  return <div className="rt-desktop-navigation">
    <aside className="rt-sidebar"><a href="#home" onClick={e=>{e.preventDefault();onNavigate('home')}} className="rt-brand"><img className="rt-brand-logo" src="/logo.webp" alt="Remoterapia" width={52} height={52}/><span><VisualText id="copy-2ca3b39c4e2c" defaultText={"remoterapia"}/><span className="rt-brand-caption"><VisualText id="copy-d1aaafcb1686" defaultText={"PORTAL DO ALUNO"}/></span></span></a>
      <div className="rt-sidebar-label">Portal do aluno</div><nav aria-label="Navegação desktop do aluno">{tabs.filter(t=>t.id!=='agendar'||canBook).map(t=><button key={t.id} onClick={()=>onNavigate(t.id)} className={`rt-nav-item ${view===t.id?'is-active':''}`} aria-current={view===t.id?'page':undefined}><t.icon size={19}/>{t.label}{view===t.id&&<span className="rt-nav-dot"/>}</button>)}</nav>
      <div className="rt-sidebar-bottom"><div className="rt-support-card"><LifeBuoy size={22}/><strong><VisualText id="copy-c79fc6296748" defaultText={"Precisa de uma mão?"}/></strong><p><VisualText id="copy-f55db74fc343" defaultText={"Fale com a equipe para dúvidas sobre seu plano ou suas remadas."}/></p><a href="https://wa.me/5513997421804" target="_blank" rel="noreferrer"><VisualText id="copy-bc1dc4e37626" defaultText={"Conversar com a equipe "}/><ArrowUpRight size={15}/></a></div><button className="rt-nav-item" onClick={onLogout}><LogOut size={18}/><VisualText id="copy-813a6b2ae176" defaultText={"Sair do Portal"}/></button></div>
    </aside>
    <header className="rt-topbar"><div className="rt-breadcrumb"><Waves size={18}/><span><VisualText id="copy-0a59d94e5b75" defaultText={"Meu espaço"}/></span><span>/</span><strong>{current?.label||'Eventos'}</strong></div><div className="rt-topbar-actions"><ThemeToggle className="rt-icon-button"/><button className="rt-icon-button" aria-label="Ver avisos do aluno" onClick={onNotificacoes}><Bell size={19}/></button><button onClick={()=>onNavigate('perfil')} className="rt-profile-button"><span className="rt-avatar">{nome?.trim().charAt(0)||'A'}</span><span>{nome?.split(' ')[0]||'Minha conta'}<small><VisualText id="copy-2cabe89d749d" defaultText={"Aluno Remoterapia"}/></small></span></button></div></header>
  </div>
}
