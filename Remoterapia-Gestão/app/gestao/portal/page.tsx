import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import PortalClient from './PortalClient'
import { redirect } from 'next/navigation'

export default async function PortalPage() {
  const perfil = await getPerfilAtual()
  if (!perfil) {
    redirect('/gestao/login')
  }

  const hasMultipleAccess = ['admin', 'dona'].includes(perfil.role)

  return (
    <main className="max-w-md mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent">
      <AppHeader 
        title="PORTAL DE ALUNOS" 
        nomeUsuario={perfil.nome} 
        showTrocarArea={hasMultipleAccess} 
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36 no-scrollbar w-full min-h-0">
        <PortalClient />
      </div>
    </main>
  )
}
