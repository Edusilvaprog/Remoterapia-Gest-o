'use client'
import AlunoAssistente from './AlunoAssistente'
import {Camera,Lock,CalendarDays,MessageCircle,Smartphone,LogOut,ChevronRight,ShieldCheck,Mail,Phone,Anchor,CreditCard} from 'lucide-react'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'
type Props={aluno:any;onPhoto?:()=>void;onPassword:()=>void;onInstall:()=>void;onLogout:()=>void;onPlan:()=>void;onEvents:()=>void;support:string;registration:string;phone:string;planName:string}
export default function PortalProfileLayout({aluno,onPhoto,onPassword,onInstall,onLogout,onPlan,onEvents,support,registration,phone,planName}:Props){
 const name=aluno?.nome||'Aluno Remoterapia',hasStorage=String(aluno?.tipo_plano||'').toLowerCase().includes('guardaria')
 const initials=name.trim().split(/\s+/).map((part:string)=>part[0]).slice(0,2).join('').toUpperCase()
 const pending=['pendente','vencido'].includes(aluno?.status_pagamento),inactive=['cancelado','inativo'].includes(aluno?.status_pagamento)||aluno?.bloqueado||['bloqueado','inativo'].includes(aluno?.status)
 const financial=inactive?'Inativo':pending?'Pagamento pendente':aluno?.status_pagamento==='ativo'?'Em dia':'A confirmar'
 return <section className="rt-base-page rt-base-profile" data-rt-area="area-c9cfd543f781">
  <header className="rt-base-heading"><div><span className="rt-base-eyebrow"><VisualText id="copy-9c935e3e00fc" defaultText="Portal do aluno"/></span><h1><VisualText id="copy-2e29584ab9c5" defaultText="Meu perfil"/></h1><p><VisualText id="copy-edb1c8358991" defaultText="Informações da conta, plano e preferências."/></p></div></header>
  <div className="rt-base-profile-grid">
   <aside className="rt-base-panel rt-base-identity" data-rt-area="area-704382de2300">
    <div className="rt-base-avatar">{aluno?.foto_url?<img src={aluno.foto_url} alt={name}/>:<span>{initials}</span>}<button type="button" aria-label="Alterar foto de perfil" disabled={!onPhoto} onClick={onPhoto}><Camera size={18}/></button></div>
    <span className="rt-base-kicker">{registration}</span><h2>{name}</h2><span className="rt-base-badge">{planName}</span>
    <dl className="rt-base-contact"><div><dt><Mail size={17}/><VisualText id="copy-b1c408c4a001" defaultText="E-mail"/></dt><dd>{aluno?.email||'Não informado'}</dd></div><div><dt><Phone size={17}/><VisualText id="copy-39b38e4dc505" defaultText="Telefone"/></dt><dd>{phone}</dd></div></dl>
    <div className="rt-base-inline-note"><ShieldCheck size={19}/><p><VisualText id="copy-014284159bd7" defaultText="Para atualizar seus dados, fale com a equipe."/></p></div><VisualContentSlot id="area-704382de2300"/>
   </aside>
   <div className="rt-base-profile-details">
    <section className="rt-base-panel rt-base-plan" data-rt-area="area-b1c408c4a002">
     <div className="rt-base-panel-title"><span className="rt-base-icon"><CreditCard size={23}/></span><div><h2><VisualText id="copy-fa1391f603f9" defaultText="Minha assinatura"/></h2><p><VisualText id="copy-6b2ad95d8856" defaultText="Plano atual e mensalidade"/></p></div><span className={'rt-base-badge '+(pending||inactive?'is-warn':'is-good')}>{financial}</span></div>
     <dl className="rt-base-plan-facts"><div><dt><VisualText id="copy-7aa37588beaa" defaultText="Plano"/></dt><dd>{planName}</dd></div><div><dt><VisualText id="copy-b1c408c4a003" defaultText="Vencimento"/></dt><dd>{aluno?.dia_vencimento?'Dia '+aluno.dia_vencimento:'Não informado'}</dd></div><div><dt><VisualText id="copy-b1c408c4a004" defaultText="Reservas por semana"/></dt><dd>{String(aluno?.tipo_plano||'').includes('mensalista')?(aluno?.max_reservas_semana??2):'Conforme o plano'}</dd></div></dl>
     <button type="button" className="rt-base-primary" onClick={onPlan}><VisualText id="copy-b1c408c4a005" defaultText="Ver planos e pagamentos"/><ChevronRight size={17}/></button><VisualContentSlot id="area-b1c408c4a002"/>
    </section>
    {hasStorage&&<section className="rt-base-panel" data-rt-area="area-b1c408c4a006"><div className="rt-base-panel-title"><span className="rt-base-icon"><Anchor size={23}/></span><div><h2><VisualText id="copy-b1c408c4a007" defaultText="Minha embarcação"/></h2><p><VisualText id="copy-b1c408c4a008" defaultText="Informações da Guardaria"/></p></div></div><dl className="rt-base-plan-facts"><div><dt>Tipo</dt><dd>{aluno?.tipo_embarcacao||'Não informado'}</dd></div><div><dt>Modelo</dt><dd>{aluno?.modelo_embarcacao||aluno?.caiaque_vinculado||'Não informado'}</dd></div><div><dt>Cor</dt><dd>{aluno?.cor_embarcacao||'Não informada'}</dd></div></dl><VisualContentSlot id="area-b1c408c4a006"/></section>}
    <section className="rt-base-panel rt-base-account" data-rt-area="area-d0455064f461"><div className="rt-base-panel-title"><div><h2><VisualText id="copy-64dbba94e160" defaultText="Conta e atividades"/></h2><p><VisualText id="copy-ba8d1f0bb94e" defaultText="Acesse as opções da sua conta."/></p></div></div>
     <div className="rt-base-action-grid">
      <button type="button" onClick={onEvents}><CalendarDays size={22}/><span><strong><VisualText id="copy-1d4a97279b8c" defaultText="Meus eventos"/></strong><small><VisualText id="copy-0804ac6056d3" defaultText="Inscrições confirmadas e roteiros"/></small></span><ChevronRight size={18}/></button>
      <button type="button" onClick={onPassword}><Lock size={22}/><span><strong><VisualText id="copy-c8880eb54ea1" defaultText="Mudar senha"/></strong><small><VisualText id="copy-e971ec8dec08" defaultText="Atualizar senha da conta"/></small></span><ChevronRight size={18}/></button>
      <button type="button" onClick={onInstall}><Smartphone size={22}/><span><strong><VisualText id="copy-6b11698946a0" defaultText="Instalar aplicativo"/></strong><small><VisualText id="copy-fc1a8dc77260" defaultText="Adicionar atalho na tela inicial"/></small></span><ChevronRight size={18}/></button>
     </div><VisualContentSlot id="area-d0455064f461"/>
    </section>
    <section className="rt-base-panel rt-base-support" data-rt-area="area-73b436061a80"><MessageCircle size={24}/><div><h2><VisualText id="copy-4189b8cfb139" defaultText="Suporte"/></h2><p><VisualText id="copy-d53d26e22a8a" defaultText="Atendimento via WhatsApp"/></p></div><a className="rt-base-secondary" href={support} target="_blank" rel="noreferrer"><VisualText id="copy-4155904a0213" defaultText="Abrir atendimento"/><ChevronRight size={16}/></a><VisualContentSlot id="area-73b436061a80"/></section>
    <AlunoAssistente support={support}/>
    <button type="button" className="rt-base-signout" onClick={onLogout}><LogOut size={18}/><VisualText id="copy-2ed7a460825b" defaultText="Encerrar sessão"/></button>
   </div>
  </div><VisualContentSlot id="area-c9cfd543f781"/>
 </section>
}
