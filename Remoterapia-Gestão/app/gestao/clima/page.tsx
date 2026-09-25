import { getPerfilAtual } from '@/lib/actions/auth'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import ClimaClient from './ClimaClient'

export default async function ClimaPage({ searchParams }: { searchParams: any }) {
  const perfil = await getPerfilAtual()
  if (!perfil) return null

  const params = await searchParams
  const isAgua = perfil.role === 'instrutor' || params?.origem === 'agua'
  const backHref = isAgua ? '/gestao/agua' : '/gestao/recepcao/dashboard'
  const showSOS = isAgua

  return (
    <main className="max-w-md mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent">
      
      <AppHeader 
        title="METEOROLOGIA" 
        nomeUsuario={perfil.nome} 
        showSOS={showSOS} 
        backHref={backHref} 
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-36 no-scrollbar w-full min-h-0">
        <ClimaClient />
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none">
        {isAgua ? (
          /* BARRA DA EQUIPE ÁGUA */
          <nav className="max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-white/90 dark:border-slate-800 flex justify-between items-center rounded-[2.2rem] shadow-xl px-8 h-20 transition-all pointer-events-auto">
              <Link href="/gestao/agua" className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 dark:text-slate-500">
                  <span className="text-2xl">🌊</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">MAR</span>
              </Link>
              <Link href="/gestao/midia" className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 dark:text-slate-500">
                  <span className="text-2xl">📷</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">FOTOS</span>
              </Link>
              <Link href="/gestao/clima?origem=agua" className="flex flex-col items-center justify-center gap-1 text-blue-600 dark:text-cyan-400 font-black scale-105">
                  <span className="text-2xl">☀️</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">TEMPO</span>
              </Link>
          </nav>
        ) : (
          /* BARRA DA EQUIPE AREIA / RECEPÇÃO */
          <nav className="max-w-md mx-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-2 border-white/90 dark:border-slate-700 flex justify-between items-center rounded-[2.2rem] shadow-xl px-4 h-20 transition-all pointer-events-auto relative">
              <Link href="/gestao/recepcao/dashboard" className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 transition-all flex-1 h-full">
                  <span className="text-2xl">🌊</span>
                  <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Mar</span>
              </Link>

              <Link href="/gestao/diario" className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 transition-all flex-1 h-full">
                  <span className="text-2xl">📋</span>
                  <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Registro</span>
              </Link>

              <div className="flex-1 flex justify-center pb-2 z-10 relative">
                  <Link 
                    href="/gestao/recepcao/novo-embarque" 
                    className="absolute bottom-2 w-[68px] h-[68px] bg-gradient-to-tr from-blue-600 to-cyan-400 text-white rounded-[1.8rem] shadow-[0_10px_25px_rgba(14,165,233,0.5)] hover:-translate-y-1 active:scale-95 transition-all border-4 border-white dark:border-slate-800 flex items-center justify-center rotate-45 group"
                    title="Novo Embarque"
                  >
                      <span className="text-4xl font-black leading-none mb-1 drop-shadow-md -rotate-45 group-hover:scale-110 transition-transform">
                        +
                      </span>
                  </Link>
              </div>

              <Link href="/gestao/fechamento" className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 transition-all flex-1 h-full">
                  <span className="text-2xl">🔒</span>
                  <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Fechamento</span>
              </Link>

              <Link href="/gestao/clima?origem=areia" className="flex flex-col items-center justify-center gap-1 text-blue-600 dark:text-cyan-400 font-black scale-110 transition-all flex-1 h-full">
                  <span className="text-2xl">☀️</span>
                  <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Clima</span>
              </Link>
          </nav>
        )}
      </div>

    </main>
  )
}


