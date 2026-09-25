import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import AppBottomNav from '@/components/AppBottomNav'
import FeedbackClient from './FeedbackClient'

export default async function DonaFeedbackPage() {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  return (
    <main className="max-w-md mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent">
      <AppHeader 
        title="FEEDBACK DOS ALUNOS" 
        nomeUsuario={perfil.nome} 
        backHref="/gestao/dona" 
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36 no-scrollbar w-full min-h-0">
        <FeedbackClient />
      </div>

      <AppBottomNav 
        items={[
          { label: 'RESULTADOS', href: '/gestao/dona', icon: '📊' },
          { label: 'FEEDBACK', href: '/gestao/dona/feedback', icon: '⭐', active: true },
          { label: 'MÍDIA', href: '/gestao/dona/midia', icon: '📸' },
        ]}
      />
    </main>
  )
}
