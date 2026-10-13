import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import GuardariaClient from './GuardariaClient'
import {VisualContentSlot} from '@/components/ui/VisualContent'


export default async function GuardariaPage() {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  const hasMultipleAccess = ['admin', 'dona'].includes(perfil.role)

  return (
    <main className="max-w-md lg:max-w-7xl mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent" data-rt-area="area-fa53c9782b23">
      
      {/* HEADER PADRONIZADO */}
      <AppHeader 
        title="GUARDARIA" 
        nomeUsuario={perfil.nome} 
        showTrocarArea={hasMultipleAccess} 
      />

      <GuardariaClient />

    <VisualContentSlot id="area-fa53c9782b23"/></main>
  )
}


