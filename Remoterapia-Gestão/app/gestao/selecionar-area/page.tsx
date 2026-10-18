import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Waves,Umbrella,Ticket,ChartNoAxesCombined,Settings2,Anchor,ChevronRight} from 'lucide-react'
import {getPerfilAtual} from '@/lib/actions/auth'
import {createClient} from '@/lib/supabase/server'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'
export default async function SelecionarArea(){
 const perfil=await getPerfilAtual()
 if(!perfil){const client=await createClient();await client.auth.signOut({scope:'local'});redirect('/gestao/login')}
 const roles=[perfil.role,...(perfil.roles||[])],admin=perfil.role==='admin',owner=perfil.role==='dona',management=admin||owner
 const operation=[...(roles.includes('instrutor')||management?[{href:'/gestao/agua',title:'Equipe de água',description:'Monitoramento das embarcações e retornos.',Icon:Waves}]:[]),...(perfil.role==='recepcao'||management?[{href:'/gestao/recepcao/dashboard',title:'Equipe de areia',description:'Fila, embarques e atendimento na base.',Icon:Umbrella}]:[])]
 const administration=[...(management||roles.includes('recepcao')?[{href:'/gestao/portal',title:'Eventos',description:'Portal de alunos, agendamentos, planos e eventos.',Icon:Ticket}]:[]),...(management?[{href:'/gestao/dona',title:'Gestão e controle',description:'Resultados, histórico e acompanhamento.',Icon:ChartNoAxesCombined}]:[]),...(admin?[{href:'/gestao/admin',title:'Acesso administrador',description:'Equipe, frota, tarifas e guarda-volumes.',Icon:Settings2}]:[]),...(roles.includes('guardaria')||management?[{href:'/gestao/guardaria',title:'Guardaria',description:'Embarcações e armazenamento.',Icon:Anchor}]:[])]
 return <section className="rt-base-page rt-base-hub-page" data-rt-area="area-ce3739f1d622"><header className="rt-base-heading"><div><span className="rt-base-eyebrow"><VisualText id="copy-05391a8f5302" defaultText="Olá, "/>{perfil.nome}</span><h1><VisualText id="copy-b5c408c4a001" defaultText="Áreas da Gestão"/></h1><p><VisualText id="copy-b5c408c4a002" defaultText="Selecione a área que deseja acessar."/></p></div><Link href="/gestao/painel" className="rt-base-secondary"><VisualText id="copy-b5c408c4a003" defaultText="Visão geral"/><ChevronRight size={17}/></Link></header>
  {!!operation.length&&<section className="rt-base-hub-group rt-mobile-only" data-rt-area="area-b5c408c4a004"><h2><VisualText id="copy-b5c408c4a005" defaultText="Operação na base"/></h2><div className="rt-base-hub-grid">{operation.map(({href,title,description,Icon})=><Link href={href} key={href} className="rt-base-hub-card"><span className="rt-base-icon"><Icon size={24}/></span><div><h3><VisualLabel text={title}/></h3><p>{description}</p></div><ChevronRight size={19}/></Link>)}</div><VisualContentSlot id="area-b5c408c4a004"/></section>}
  <section className="rt-base-hub-group" data-rt-area="area-b5c408c4a006"><h2><VisualText id="copy-b5c408c4a007" defaultText="Administração e cadastros"/></h2><div className="rt-base-hub-grid">{administration.map(({href,title,description,Icon})=><Link href={href} key={href} className="rt-base-hub-card"><span className="rt-base-icon"><Icon size={24}/></span><div><h3><VisualLabel text={title}/></h3><p>{description}</p></div><ChevronRight size={19}/></Link>)}</div>{!administration.length&&<p className="rt-base-caption">As áreas são disponibilizadas conforme o seu perfil.</p>}<VisualContentSlot id="area-b5c408c4a006"/></section><VisualContentSlot id="area-ce3739f1d622"/>
 </section>
}
