import {redirect} from 'next/navigation'
import {getPerfilAtual} from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import PortalClient,{type ManagementSection} from '@/app/gestao/portal/PortalClient'

const titles:Record<ManagementSection,string>={clientes:'Clientes',agendamentos:'Agendamentos',eventos:'Eventos',bloqueios:'Bloqueios',planos:'Planos'}

export default async function ManagementSectionPage({section}:{section:ManagementSection}){
 const perfil=await getPerfilAtual()
 if(!perfil)redirect('/gestao/login')
 if(![perfil.role,...(perfil.roles||[])].some(role=>['admin','dona','recepcao'].includes(role)))redirect('/gestao/painel')
 return <main className="dw-portal rt-independent-area" data-management-section={section}>
  <AppHeader title={titles[section]} nomeUsuario={perfil.nome} backHref="/gestao/selecionar-area"/>
  <div className="rt-independent-content"><PortalClient key={section} section={section}/></div>
 </main>
}
