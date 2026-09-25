import { getPerfilAtual, logoutStaff } from '@/lib/actions/auth'
import ThemeToggle from '@/components/ThemeToggle'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SelecionarArea() {
  const perfil = await getPerfilAtual()
  if (!perfil) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/gestao/login')
  }

  const role = perfil.role
  const isDona = role === 'dona'
  const isAdmin = role === 'admin'
  const canAccessPortal = isDona || isAdmin || role === 'recepcao'

  return (
    <section className="max-w-md mx-auto flex-1 flex flex-col min-h-[100dvh] min-h-[100svh] h-full w-full overflow-y-auto no-scrollbar px-6 pt-12 pb-[max(2rem,env(safe-area-inset-bottom))] justify-center items-center">
        
        {/* CABEÇALHO */}
        <div className="w-full relative mb-10 mt-auto flex flex-col items-center">
            <div className="absolute right-0 -top-12 flex items-center gap-2">
                <ThemeToggle />
                <form action={logoutStaff} className="m-0 p-0">
                    <button 
                      type="submit" 
                      className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm border border-red-400 shadow-red-500/30 active:scale-95 shrink-0 cursor-pointer"
                      title="Sair do Sistema"
                    >
                        <span className="text-[8px] font-black uppercase tracking-wider leading-none">SAIR</span>
                    </button>
                </form>
            </div>
            
            <div className="text-center mt-2">
                <h1 className="text-5xl font-black tracking-tighter text-blue-950 dark:text-white uppercase italic leading-none drop-shadow-sm">
                    Olá, {perfil.nome}
                </h1>
                <div className="flex justify-center mt-3">
                    <p className="text-blue-800 dark:text-cyan-300 font-black text-[9px] tracking-[0.25em] uppercase bg-white/70 dark:bg-slate-900/80 px-5 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/60 dark:border-slate-700">
                        SELECIONE A ÁREA
                    </p>
                </div>
            </div>
        </div>

        {/* LISTA DE CARDS: ORDEM ALFABÉTICA + ADMIN FIXADO NO FIM */}
        <div className="w-full space-y-3.5 flex flex-col mb-auto">
                
                {/* 1. EQUIPE DE ÁGUA (E-Á) */}
                {(role === 'instrutor' || isDona || isAdmin) && (
                    <Link 
                      href="/gestao/agua" 
                      className="w-full p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l-[6px] !border-l-blue-600 border border-white/60 dark:border-slate-800 rounded-[1.8rem] shadow-xl shadow-blue-500/5 flex items-center gap-4 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
                    >
                        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          🌊
                        </div>
                        <div className="text-left flex-1 min-w-0">
                            <p className="font-black text-base text-blue-600 dark:text-blue-400 uppercase tracking-tight leading-tight truncate">
                                EQUIPE DE ÁGUA
                            </p>
                            <p className="text-[10px] font-black text-blue-500/90 dark:text-blue-300 uppercase tracking-wider mt-0.5 truncate">
                                MONITORAMENTO
                            </p>
                        </div>
                    </Link>
                )}

                {/* 2. EQUIPE DE AREIA (E-Ar) */}
                {(role === 'recepcao' || isDona || isAdmin) && (
                    <Link 
                      href="/gestao/recepcao/dashboard" 
                      className="w-full p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l-[6px] !border-l-orange-500 border border-white/60 dark:border-slate-800 rounded-[1.8rem] shadow-xl shadow-blue-500/5 flex items-center gap-4 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
                    >
                        <div className="w-14 h-14 bg-orange-50 dark:bg-orange-950/60 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          ⛱️
                        </div>
                        <div className="text-left flex-1 min-w-0">
                            <p className="font-black text-base text-orange-600 dark:text-orange-400 uppercase tracking-tight leading-tight truncate">
                                EQUIPE DE AREIA
                            </p>
                            <p className="text-[10px] font-black text-orange-500/90 dark:text-orange-300 uppercase tracking-wider mt-0.5 truncate">
                                RECEPÇÃO
                            </p>
                        </div>
                    </Link>
                )}

                {/* 3. EVENTOS (Ev) */}
                {canAccessPortal && (
                    <Link 
                      href="/gestao/portal" 
                      className="w-full p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l-[6px] !border-l-indigo-600 border border-white/60 dark:border-slate-800 rounded-[1.8rem] shadow-xl shadow-indigo-500/5 flex items-center gap-4 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
                    >
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          🎟️
                        </div>
                        <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-base text-indigo-600 dark:text-indigo-400 uppercase tracking-tight leading-tight truncate">
                                EVENTOS
                              </p>
                            </div>
                            <p className="text-[10px] font-black text-indigo-500/90 dark:text-indigo-300 uppercase tracking-wider mt-0.5 truncate">
                                PORTAL DE ALUNOS
                            </p>
                        </div>
                    </Link>
                )}

                {/* 4. GESTÃO E CONTROLE (G) */}
                {(isDona || isAdmin) && (
                    <Link 
                      href="/gestao/dona" 
                      className="w-full p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l-[6px] !border-l-emerald-600 border border-white/60 dark:border-slate-800 rounded-[1.8rem] shadow-xl shadow-blue-500/5 flex items-center gap-4 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
                    >
                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          📊
                        </div>
                        <div className="text-left flex-1 min-w-0">
                            <p className="font-black text-base text-emerald-600 dark:text-emerald-400 uppercase tracking-tight leading-tight truncate">
                                GESTÃO E CONTROLE
                            </p>
                            <p className="text-[10px] font-black text-emerald-500/90 dark:text-emerald-300 uppercase tracking-wider mt-0.5 truncate">
                                ADMINISTRAÇÃO
                            </p>
                        </div>
                    </Link>
                )}

                {/* 5. ACESSO ADMINISTRADOR (FIXADO COMO ÚLTIMA OPÇÃO) */}
                {isAdmin && (
                    <Link 
                      href="/gestao/admin" 
                      className="w-full p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l-[6px] !border-l-slate-600 border border-white/60 dark:border-slate-800 rounded-[1.8rem] shadow-xl shadow-blue-500/5 flex items-center gap-4 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group mt-2"
                    >
                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          ⚙️
                        </div>
                        <div className="text-left flex-1 min-w-0">
                            <p className="font-black text-base text-slate-700 dark:text-slate-300 uppercase tracking-tight leading-tight truncate">
                                ACESSO ADMINISTRADOR
                            </p>
                            <p className="text-[10px] font-black text-slate-500/90 dark:text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                                PAINEL (TI)
                            </p>
                        </div>
                    </Link>
                )}
                
        </div>
    </section>
  )
}
