import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import AppBottomNav from '@/components/AppBottomNav'
import DiarioClient from './DiarioClient'
import {VisualContentSlot} from '@/components/ui/VisualContent'


export default async function DiarioPage() {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  const hasMultipleAccess = ['admin', 'dona'].includes(perfil.role)

  return (
    <main className="max-w-md lg:max-w-7xl mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent" data-rt-area="area-54c5a2009b83">
      <AppHeader 
        title="REGISTRO DIÁRIO" 
        nomeUsuario={perfil.nome} 
        showTrocarArea={hasMultipleAccess} 
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36 no-scrollbar w-full min-h-0">
        <DiarioClient />
      </div>

      <AppBottomNav 
        items={[
          { label: 'MAR', href: '/gestao/recepcao/dashboard', icon: '🌊' },
          { label: 'REGISTRO', href: '/gestao/diario', icon: '📋' },
          { label: 'FECHAMENTO', href: '/gestao/fechamento', icon: '🔒' },
          { label: 'CLIMA', href: '/gestao/clima', icon: '☀️' },
        ]}
        centerAction={{
          href: '/gestao/recepcao/novo-embarque',
          label: 'Novo Embarque'
        }}
      />
    <VisualContentSlot id="area-54c5a2009b83"/></main>
  )
}


