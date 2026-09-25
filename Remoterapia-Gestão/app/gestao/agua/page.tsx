import { getPerfilAtual } from '@/lib/actions/auth'
import { listarLocacoesAtivas } from '@/lib/actions/locacoes'
import AppHeader from '@/components/AppHeader'
import AppBottomNav from '@/components/AppBottomNav'
import AguaClient from './AguaClient'

export default async function EquipeAgua() {
  const perfil = await getPerfilAtual()
  if (!perfil) return null
  
  const { data: locacoes } = await listarLocacoesAtivas()
  const ativas = locacoes || []
  const hasMultipleAccess = ['admin', 'dona'].includes(perfil.role)

  return (
    <main className="max-w-md mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent">
      <AppHeader 
        title="STATUS DO MAR" 
        nomeUsuario={perfil.nome} 
        showSOS={true} 
        showTrocarArea={hasMultipleAccess} 
      />

      <div className="flex-1 overflow-y-auto p-4 pb-36 no-scrollbar w-full min-h-0 space-y-4">
        <div className="bg-white/70 dark:bg-slate-800/80 backdrop-blur-md rounded-full py-2 px-5 inline-flex items-center gap-2 border border-white/80 dark:border-slate-700 shadow-sm">
            <span className="text-lg">🌊</span>
            <p className="text-xs font-black text-blue-950 dark:text-white uppercase tracking-wider italic leading-none">MONITORAMENTO</p>
        </div>

        <AguaClient locacoesIniciais={ativas} />
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


