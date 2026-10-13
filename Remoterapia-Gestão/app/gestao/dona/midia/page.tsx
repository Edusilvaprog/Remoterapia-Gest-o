import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import AppBottomNav from '@/components/AppBottomNav'
import DonaMidiaClient from './DonaMidiaClient'
import {VisualContentSlot} from '@/components/ui/VisualContent'


export default async function DonaMidiaPage() {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  return (
    <main className="max-w-md lg:max-w-7xl mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent" data-rt-area="area-556be78da651">
      <AppHeader 
        title="MARKETING" 
        nomeUsuario={perfil.nome} 
        backHref="/gestao/dona" 
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36 no-scrollbar w-full min-h-0">
        <DonaMidiaClient />
      </div>

      <AppBottomNav 
        items={[
          { label: 'RESULTADOS', href: '/gestao/dona', icon: '📊' },
          { label: 'FEEDBACK', href: '/gestao/dona/feedback', icon: '⭐' },
          { label: 'MÍDIA', href: '/gestao/dona/midia', icon: '📸', active: true },
        ]}
      />
    <VisualContentSlot id="area-556be78da651"/></main>
  )
}


