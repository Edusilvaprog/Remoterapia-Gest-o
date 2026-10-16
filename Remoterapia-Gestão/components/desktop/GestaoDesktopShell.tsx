'use client'
import VisualLabel from '@/components/ui/VisualLabel'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {LayoutDashboard,CalendarDays,UsersRound,Ship,CloudSun,ClipboardList,ChartNoAxesCombined,ShieldCheck,Settings2,LogOut,ChevronRight,Image,Archive,Smartphone,CreditCard,ArrowUpRight,Waves,Umbrella,LockKeyhole} from 'lucide-react'
import {logoutStaff} from '@/lib/actions/auth'
import ThemeToggle from '@/components/ThemeToggle'
import GestaoMobileNav from '@/components/desktop/GestaoMobileNav'
import type {PerfilStaff} from '@/lib/types'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'

const menu=[
 {group:'Acompanhamento',href:'/gestao/painel',label:'Visão geral',icon:LayoutDashboard,roles:['admin','dona','recepcao','instrutor','guardaria']},
 {group:'Acompanhamento',href:'/gestao/portal',label:'Alunos e reservas',icon:CalendarDays,roles:['admin','dona','recepcao']},
 {group:'Acompanhamento',href:'/gestao/recepcao/dashboard',label:'Equipe de areia',icon:Umbrella,roles:['admin','dona','recepcao']},
 {group:'Acompanhamento',href:'/gestao/agua',label:'Equipe de água',icon:Waves,roles:['admin','dona','instrutor']},
 {group:'Acompanhamento',href:'/gestao/diario',label:'Diário da operação',icon:ClipboardList,roles:['admin','dona','recepcao']},
 {group:'Acompanhamento',href:'/gestao/clima',label:'Clima e segurança',icon:CloudSun,roles:['admin','dona','recepcao','instrutor']},
 {group:'Administração',href:'/gestao/dona',label:'Resultados',icon:ChartNoAxesCombined,roles:['admin','dona']},
 {group:'Administração',href:'/gestao/fechamento',label:'Fechamento',icon:LockKeyhole,roles:['admin','dona','recepcao']},
 {group:'Administração',href:'/gestao/pagamentos',label:'Pagamentos',icon:CreditCard,roles:['admin','dona','recepcao']},
 {group:'Administração',href:'/gestao/admin',label:'Equipe e equipamentos',icon:UsersRound,roles:['admin','dona']},
 {group:'Administração',href:'/gestao/guardaria',label:'Guardaria',icon:Archive,roles:['admin','dona','guardaria']},
 {group:'Administração',href:'/gestao/admin/configuracoes',label:'Configurações',icon:Settings2,roles:['admin','dona']},
 {group:'Administração',href:'/gestao/midia',label:'Mídia',icon:Image,roles:['admin','dona','instrutor']},
 {group:'Minha conta',href:'/gestao/seguranca',label:'Segurança do acesso',icon:ShieldCheck,roles:['admin','dona','recepcao','instrutor','guardaria']}
]
const mobileTasks=['/gestao/recepcao/novo-embarque']
export default function GestaoDesktopShell({perfil,children}:{perfil:PerfilStaff|null;children:React.ReactNode}) {
 const path=usePathname()
 if(!perfil||['/gestao/login','/gestao/setup','/gestao/redefinir-senha'].includes(path))return <>{children}</>
 const roles=[perfil.role,...(perfil.roles||[])]
 const items=menu.filter(item=>item.roles.some(role=>roles.includes(role as typeof perfil.role)))
 const current=[...items].sort((a,b)=>b.href.length-a.href.length).find(item=>path===item.href||path.startsWith(item.href+'/'))
 const restricted=mobileTasks.some(route=>path===route||path.startsWith(route+'/'))
 return <div className="rt-gestao-workspace rt-base-gestao">
  <GestaoMobileNav nome={perfil.nome} roles={roles} path={path} items={items.filter(item=>!['/gestao/recepcao/dashboard','/gestao/agua'].includes(item.href))}/>
  <aside className="rt-sidebar rt-desktop-navigation">
   <Link href="/gestao/painel" className="rt-brand"><img className="rt-brand-logo" src="/logo.webp" alt="Remoterapia" width={44} height={44}/><span><VisualText id="copy-04e7b823d6e8" defaultText={"remoterapia"}/><span className="rt-brand-caption"><VisualText id="copy-dbeb0de9bbec" defaultText={"ESPAÇO DA GESTÃO"}/></span></span></Link>
   <nav aria-label="Navegação desktop da gestão">{['Acompanhamento','Administração','Minha conta'].map(group=><div key={group}>{items.some(item=>item.group===group)&&<div className="rt-sidebar-label"><VisualLabel text={group}/></div>}{items.filter(item=>item.group===group).map(item=><Link key={item.href} href={item.href} className={`rt-nav-item ${current?.href===item.href?'is-active':''}`} aria-current={current?.href===item.href?'page':undefined}><item.icon size={19}/><VisualLabel text={item.label}/>{current?.href===item.href&&<span className="rt-nav-dot"/>}</Link>)}</div>)}</nav>
   <div className="rt-sidebar-bottom"><div className="rt-workspace-label"><ShieldCheck size={19}/><div><strong><VisualLabel text={perfil.role==='admin'?'Administrador':perfil.role==='dona'?'Direção':'Equipe Remoterapia'}/></strong><small>{perfil.nome}</small></div></div><form action={logoutStaff}><button className="rt-nav-item" type="submit"><LogOut size={18}/><VisualText id="copy-f2e64bbff050" defaultText={"Sair da Gestão"}/></button></form></div>
  </aside>
  <div className="rt-gestao-main"><header className="rt-topbar rt-desktop-navigation"><div className="rt-breadcrumb"><Ship size={18}/><span><VisualText id="copy-405f103c8524" defaultText={"Remoterapia"}/></span><ChevronRight size={14}/><strong><VisualLabel text={current?.label||'Espaço de trabalho'}/></strong></div><div className="rt-topbar-actions"><ThemeToggle className="rt-icon-button"/><span className="rt-avatar">{perfil.nome.charAt(0)}</span><span className="rt-user-name">{perfil.nome}<small><VisualLabel text={perfil.role==='admin'?'Administrador':'Equipe Remoterapia'}/></small></span></div></header>
   <div className="rt-workspace-body">
    {restricted?<><div className="rt-mobile-only">{children}</div><div className="rt-desktop-only"><section className="rt-desktop-task-note" data-rt-area="area-75b23174bf47"><Smartphone size={48}/><div><span className="rt-eyebrow"><VisualLabel text={restricted?'OPERAÇÃO NO CELULAR':'BEM-VINDO À GESTÃO'}/></span><h1><VisualLabel text={restricted?'O embarque acontece na base.':'Seu espaço de administração.'}/></h1><p><VisualLabel text={restricted?'Use a Gestão no celular para registrar novos embarques. No computador, acompanhe a operação, organize alunos e reservas e configure o sistema.':'Acesse a visão geral para acompanhar a Remoterapia e use o menu lateral para encontrar os cadastros, resultados e configurações disponíveis para seu perfil.'}/></p><Link className="rt-primary" href="/gestao/painel"><VisualText id="copy-db093c2a44c3" defaultText={"Ir para a visão geral"}/><ArrowUpRight size={17}/></Link></div><VisualContentSlot id="area-75b23174bf47"/></section></div></>:children}
   </div>
  </div>
 </div>
}
