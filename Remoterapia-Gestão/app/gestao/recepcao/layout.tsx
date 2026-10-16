import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import AppBottomNav from '@/components/AppBottomNav'
export default async function RecepcaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  const hasMultipleAccess = ['admin', 'dona'].includes(perfil.role)

  return (
    <main className="max-w-md lg:max-w-7xl mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent">
      <AppHeader 
        title="CONTROLE DA BASE" 
        nomeUsuario={perfil.nome} 
        showTrocarArea={hasMultipleAccess} 
      />

      <div className="flex-1 overflow-y-auto p-4 lg:px-6 lg:py-5 space-y-4 pb-36 lg:pb-28 no-scrollbar w-full min-h-0">
        {children}
      </div>

      <AppBottomNav 
        desktopItems={[
          { label: 'MAR', href: '/gestao/recepcao/dashboard', icon: '🌊' },
          { label: 'CLIENTES', href: '/gestao/recepcao/clientes', icon: '👥' },
          { label: 'AGENDAMENTOS', href: '/gestao/recepcao/agendamentos', icon: '📅' },
          { label: 'EVENTOS', href: '/gestao/recepcao/eventos', icon: '🎟️' },
          { label: 'REGISTRO', href: '/gestao/diario', icon: '📋' },
          { label: 'FECHAMENTO', href: '/gestao/fechamento', icon: '🔒' },
          { label: 'CLIMA', href: '/gestao/clima', icon: '☀️' },
        ]}
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
    </main>
  )
}
