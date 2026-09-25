import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import { logoutStaff } from '@/lib/actions/auth'

interface AppHeaderProps {
  title: string
  nomeUsuario: string
  showSOS?: boolean
  showTrocarArea?: boolean
  backHref?: string
  showSair?: boolean
}

export default function AppHeader({
  title,
  nomeUsuario,
  showSOS = false,
  showTrocarArea = false,
  backHref,
  showSair = true,
}: AppHeaderProps) {
  return (
    <header className="m-3 p-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl shadow-lg z-50 border-2 border-white/40 dark:border-white/10 transition-colors duration-300 shrink-0">
        <div className="flex justify-between items-center gap-2">
            
            {/* LOGO NO TAMANHO EXATO + TÍTULO E STATUS DO SUPABASE */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img 
                  src="/logo.webp" 
                  alt="Remoterapia" 
                  className="w-11 h-11 object-contain drop-shadow-md shrink-0 select-none"
                />
                
                <div className="min-w-0 flex-1">
                    {/* LINHA 1: SOMENTE O NOME DO LOCAL */}
                    <h2 className="text-base font-black uppercase text-white leading-none tracking-tight italic drop-shadow-sm truncate">
                      {title}
                    </h2>
                    
                    {/* LINHA 2: BOTÃOZINHO VERDE SUPABASE + OLÁ E O LOGIN */}
                    <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-green-400 border border-white/60 shadow-[0_0_6px_rgba(74,222,128,0.9)] shrink-0 animate-pulse"></span>
                        <p className="text-[10px] font-black text-blue-100 uppercase tracking-wider truncate">
                          OLÁ, {nomeUsuario.toUpperCase()}
                        </p>
                    </div>
                </div>
            </div>

            {/* BOTÕES PADRONIZADOS EM QUADRADINHOS COMPACTOS (W-10 H-10) */}
            <div className="flex items-center gap-1.5 shrink-0">
                {/* 1. SOS (SE FOR EQUIPE ÁGUA) */}
                {showSOS && (
                  <button 
                    type="button" 
                    title="Emergência SOS" 
                    className="w-10 h-10 bg-red-600 hover:bg-red-500 text-white rounded-2xl flex flex-col items-center justify-center transition-all border border-white/30 shadow-sm active:scale-95 shrink-0 cursor-pointer select-none"
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider leading-none">SOS</span>
                  </button>
                )}

                {/* 2. VOLTAR OU TROCAR ÁREA (2 LINHAS) */}
                {backHref ? (
                  <Link 
                    href={backHref}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-2xl flex flex-col items-center justify-center transition-all border border-white/30 backdrop-blur-sm shadow-sm active:scale-95 shrink-0 select-none cursor-pointer"
                    title="Voltar à tela anterior"
                  >
                    <span className="text-[10px] leading-none mb-0.5">◀</span>
                    <span className="text-[7px] font-black uppercase leading-none tracking-wider">VOLTAR</span>
                  </Link>
                ) : showTrocarArea ? (
                  <Link 
                    href="/gestao/selecionar-area" 
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-2xl flex flex-col items-center justify-center transition-all border border-white/30 backdrop-blur-sm shadow-sm active:scale-95 shrink-0 select-none cursor-pointer text-center"
                    title="Trocar de Área"
                  >
                    <span className="text-[7px] font-black uppercase leading-tight tracking-wider">TROCAR</span>
                    <span className="text-[7px] font-black uppercase leading-tight tracking-wider">ÁREA</span>
                  </Link>
                ) : null}

                {/* 3. TEMA CLARO/ESCURO */}
                <ThemeToggle />

                {/* 4. SAIR */}
                {showSair && (
                  <form action={logoutStaff} className="shrink-0 m-0 p-0 flex">
                    <button 
                      type="submit" 
                      className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm border border-red-400 shadow-red-500/30 active:scale-95 shrink-0 cursor-pointer select-none"
                      title="Sair do Sistema"
                    >
                      <span className="text-[8px] font-black uppercase tracking-wider leading-none">SAIR</span>
                    </button>
                  </form>
                )}
            </div>

        </div>
    </header>
  )
}
