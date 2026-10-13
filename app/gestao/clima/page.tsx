import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import AppBottomNav from '@/components/AppBottomNav'
import ClimaClient from './ClimaClient'
import {VisualContentSlot} from '@/components/ui/VisualContent'


export default async function ClimaPage({ searchParams }: { searchParams: any }) {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  const params = await searchParams
  const isAgua = perfil.role === 'instrutor' || params?.origem === 'agua'
  const backHref = isAgua ? '/gestao/agua' : '/gestao/recepcao/dashboard'
  const showSOS = isAgua

  return (
    <main className="max-w-md lg:max-w-7xl mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent" data-rt-area="area-72d53a95c0fb">
      
      <AppHeader 
        title="METEOROLOGIA" 
        nomeUsuario={perfil.nome} 
        showSOS={showSOS} 
        backHref={backHref} 
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-36 no-scrollbar w-full min-h-0">
        <ClimaClient />
      </div>

      <AppBottomNav items={isAgua ? [
        {label:'Mar',href:'/gestao/agua',icon:'🌊'},
        {label:'Fotos',href:'/gestao/midia',icon:'📷'},
        {label:'Tempo',href:'/gestao/clima?origem=agua',icon:'☀️',active:true}
      ] : [
        {label:'Mar',href:'/gestao/recepcao/dashboard',icon:'🌊'},
        {label:'Registro',href:'/gestao/diario',icon:'📋'},
        {label:'Fechamento',href:'/gestao/fechamento',icon:'🔒'},
        {label:'Clima',href:'/gestao/clima?origem=areia',icon:'☀️',active:true}
      ]} centerAction={isAgua?undefined:{href:'/gestao/recepcao/novo-embarque',label:'Novo embarque'}}/>

    <VisualContentSlot id="area-72d53a95c0fb"/></main>
  )
}


