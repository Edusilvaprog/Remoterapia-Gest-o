import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import GuardariaClient from './GuardariaClient'

export default async function GuardariaPage() {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  const hasMultipleAccess = ['admin', 'dona'].includes(perfil.role)

  return (
    <main className="max-w-md mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent">
      
      {/* HEADER PADRONIZADO */}
      <AppHeader 
        title="GUARDARIA" 
        nomeUsuario={perfil.nome} 
        showTrocarArea={hasMultipleAccess} 
      />

      <GuardariaClient />

    </main>
  )
}


