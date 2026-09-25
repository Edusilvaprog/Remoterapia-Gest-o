import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import AppBottomNav from '@/components/AppBottomNav'
import Link from 'next/link'
import MidiaClient from './MidiaClient'

export default async function MidiaPage() {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  return (
    <main className="max-w-md mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent">
      
      {/* HEADER PADRONIZADO */}
      <AppHeader 
        title="FOTOS" 
        nomeUsuario={perfil.nome} 
        backHref="/gestao/agua"
        showSOS={true}
      />

      {/* ÁREA CENTRAL */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 no-scrollbar w-full min-h-0">
        <MidiaClient perfilNome={perfil.nome} />
      </div>

      <AppBottomNav 
        items={[
          { label: 'MAR', href: '/gestao/agua', icon: '🌊' },
          { label: 'FOTOS', href: '/gestao/midia', icon: '📷' },
          { label: 'TEMPO', href: '/gestao/clima?origem=agua', icon: '☀️' },
        ]}
      />

    </main>
  )
}


