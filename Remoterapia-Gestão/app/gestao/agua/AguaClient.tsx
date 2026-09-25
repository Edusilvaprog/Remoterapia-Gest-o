'use client'
import { useState, useEffect, useTransition } from 'react'
import { Locacao } from '@/lib/types'
import { marcarRetorno } from '@/lib/actions/locacoes'

export default function AguaClient({ locacoesIniciais }: { locacoesIniciais: Locacao[] }) {
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    // Limpeza rigorosa de dados zumbis do cliente
    try {
      localStorage.removeItem('plorix_locacoes_ativas')
    } catch {}

    setLocacoes(locacoesIniciais || [])
  }, [locacoesIniciais])

  const handleRetornando = (id: string) => {
    startTransition(async () => {
      try {
        await marcarRetorno(id)
      } catch {}

      setLocacoes(prev => prev.map(l => l.id === id ? { ...l, status: 'retornando' } : l))
    })
  }

  return (
    <div className="space-y-3 pb-8">
      {locacoes.length === 0 ? (
        <div className="bg-white/95 dark:bg-slate-900/95 p-6 rounded-[2rem] border border-white/60 dark:border-slate-800 text-center shadow-sm">
          <span className="text-3xl block mb-2 opacity-50">🌊</span>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Nenhuma embarcação no mar no momento.
          </p>
        </div>
      ) : (
        locacoes.map(loc => {
        const agora = Date.now()
        const minNaAgua = Math.max(0, Math.floor((agora - new Date(loc.entrada).getTime()) / 60000))
        const isRetornando = loc.status === 'retornando'

        return (
          <div 
            key={loc.id} 
            className="bg-white/95 dark:bg-slate-900/95 rounded-[2rem] p-5 shadow-xl shadow-blue-500/5 border-l-[6px] !border-l-blue-600 border border-white/60 dark:border-slate-800 space-y-4"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                
                {/* ETIQUETA DO INSTRUTOR / TIPO */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    loc.com_instrutor
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-cyan-300 dark:border-blue-900'
                      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                    {loc.com_instrutor ? `👤 COM INSTRUTOR ${loc.instrutor_nome ? `(${loc.instrutor_nome})` : ''}` : '🛶 EMBARQUE AUTÔNOMO (SOLO)'}
                  </span>
                </div>

                {/* NOME DO CLIENTE EM DESTAQUE */}
                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight truncate">
                  {loc.cliente}
                </h4>

                {/* DADOS DA EMBARCAÇÃO */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[9px] font-black text-blue-600 dark:text-cyan-400 uppercase bg-[#eaf4fc] dark:bg-slate-800 px-2.5 py-1 rounded-md border border-blue-100 dark:border-slate-700">
                    #{Array.isArray(loc.caiaques_ids) ? loc.caiaques_ids[0] : loc.caiaques_ids} {loc.caiaque_nome ? `· ${loc.caiaque_nome}` : ''}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">
                    {loc.qtd_pessoas || 1} {loc.qtd_pessoas > 1 ? 'Tripulantes' : 'Tripulante'}
                  </span>
                </div>

              </div>
              
              {/* BLOCO DE MINUTOS NA ÁGUA */}
              <div className="text-center bg-[#eaf4fc] dark:bg-slate-800 p-3 rounded-2xl border border-blue-100 dark:border-slate-700 shrink-0 min-w-[80px]">
                <p className="text-2xl font-black text-blue-600 dark:text-cyan-400 leading-none tabular-nums">
                  {minNaAgua}
                </p>
                <p className="text-[8px] font-black uppercase text-slate-400 mt-1">MIN NA ÁGUA</p>
              </div>
            </div>

            {/* BOTÃO DE STATUS / RETORNO */}
            {isRetornando ? (
              <div className="w-full py-3 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-center">
                ⏳ Aguardando confirmação na areia
              </div>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleRetornando(loc.id)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black rounded-xl uppercase tracking-wider text-[10px] shadow-md shadow-blue-500/20 transition-all cursor-pointer text-center disabled:opacity-50"
              >
                {isPending ? 'PROCESSANDO...' : 'SINALIZAR RETORNO À BASE'}
              </button>
            )}
          </div>
        )
      }))}
    </div>
  )
}

