import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import AppBottomNav from '@/components/AppBottomNav'
import DonaClient from './DonaClient'
import {VisualContentSlot} from '@/components/ui/VisualContent'


export default async function DonaPage() {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  const hasMultipleAccess = ['admin', 'dona'].includes(perfil.role)

  return (
    <main className="max-w-md lg:max-w-7xl mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent" data-rt-area="area-ca80c5768a00">
      <AppHeader 
        title="CONTROLE DIÁRIO" 
        nomeUsuario={perfil.nome} 
        showTrocarArea={hasMultipleAccess} 
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-36 no-scrollbar w-full min-h-0">
        <DonaClient nomeUsuario={perfil.nome} />
      </div>

      <AppBottomNav 
        items={[
          { label: 'RESULTADOS', href: '/gestao/dona', icon: '📊', active: true },
          { label: 'FEEDBACK', href: '/gestao/dona/feedback', icon: '⭐' },
          { label: 'MÍDIA', href: '/gestao/dona/midia', icon: '📸' },
        ]}
      />
    <VisualContentSlot id="area-ca80c5768a00"/></main>
  )
}
