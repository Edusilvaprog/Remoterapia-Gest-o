'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface HistoricoItem {
  id: string | number
  cliente: string
  caiaque: string
  caiaque_nome?: string
  entrada: string
  saida: string
  duracaoMin?: number
  data: string
}

export default function DiarioClient() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [loading, setLoading] = useState(false)

  const dateStr = selectedDate.toLocaleDateString('pt-BR')
  const todayStr = new Date().toLocaleDateString('pt-BR')
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR')

  let relativeLabel = ''
  if (dateStr === todayStr) relativeLabel = 'HOJE'
  else if (dateStr === yesterdayStr) relativeLabel = 'ONTEM'
  else {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' }
    relativeLabel = selectedDate.toLocaleDateString('pt-BR', options).split('-')[0].toUpperCase()
  }

  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + offset)
    setSelectedDate(newDate)
  }

  const setToday = () => {
    setSelectedDate(new Date())
  }

  const carregarHistorico = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      const { data } = await supabase
        .from('locacoes')
        .select('*')
        .eq('status', 'finalizado')
        .order('entrada', { ascending: false })

      if (data && data.length > 0) {
        const filtrados = data.filter((item: any) => {
          const itemData = new Date(item.entrada).toLocaleDateString('pt-BR')
          return itemData === dateStr
        })

        if (filtrados.length > 0) {
          setHistorico(filtrados.map((item: any) => {
            const eDate = item.entrada ? new Date(item.entrada) : new Date()
            const sDate = item.saida ? new Date(item.saida) : new Date()
            const dur = Math.max(1, Math.round((sDate.getTime() - eDate.getTime()) / 60000))

            return {
              id: item.id,
              cliente: item.cliente,
              caiaque: Array.isArray(item.caiaques_ids) ? item.caiaques_ids.join(', ') : (item.caiaque || '14'),
              caiaque_nome: item.caiaque_nome || 'SOLO',
              entrada: item.entrada ? eDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '13:06',
              saida: item.saida ? sDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '13:40',
              duracaoMin: dur,
              data: dateStr
            }
          }))
          setLoading(false)
          return
        }
      }

      setHistorico([])

    } catch {
      setHistorico([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarHistorico()
  }, [selectedDate])

  return (
    <div className="space-y-4">
      
      {/* 1. SELETOR DE DATA ELEVADO SEM BORDAS PRETAS */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-3.5 flex justify-between items-center rounded-2xl shadow-sm border-t-4 !border-t-cyan-400 border border-white/60 dark:border-slate-800 mb-4">
        <button 
          type="button" 
          onClick={() => changeDate(-1)}
          className="w-10 h-10 flex items-center justify-center text-blue-600 dark:text-cyan-400 bg-[#f2f8fc] dark:bg-slate-800 hover:bg-blue-100 rounded-xl transition-all shadow-sm text-sm font-black active:scale-90 border border-blue-100 dark:border-slate-700 cursor-pointer"
        >
          &lt;
        </button>
        
        <div className="text-center flex-1 cursor-pointer" onClick={setToday}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
            {relativeLabel}
          </p>
          <p className="text-sm font-black text-blue-950 dark:text-white uppercase flex items-center justify-center gap-1.5 leading-tight">
            <span>📅</span> {dateStr}
          </p>
        </div>

        <button 
          type="button" 
          onClick={() => changeDate(1)}
          className="w-10 h-10 flex items-center justify-center text-blue-600 dark:text-cyan-400 bg-[#f2f8fc] dark:bg-slate-800 hover:bg-blue-100 rounded-xl transition-all shadow-sm text-sm font-black active:scale-90 border border-blue-100 dark:border-slate-700 cursor-pointer"
        >
          &gt;
        </button>
      </div>

      {/* 2. TÍTULO DA SEÇÃO */}
      <h4 className="text-[11px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest mb-3 text-center italic">
        REGISTRO DE EMBARQUES
      </h4>

      {/* 3. LISTAGEM DOS EMBARQUES (CARDS MODERNOS DE ALTO PADRÃO) */}
      {loading ? (
        <p className="text-center text-xs font-bold text-slate-400 py-8 animate-pulse">Carregando registros...</p>
      ) : historico.length === 0 ? (
        <div className="text-center p-8 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-white/60 dark:border-slate-800 shadow-sm mt-2">
          <span className="text-4xl opacity-60 block mb-2">📭</span>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Nenhuma navegação registrada nesta data.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {historico.map(item => {
            return (
              <div 
                key={item.id}
                className="flex items-center justify-between p-4 bg-white/95 dark:bg-slate-900/95 rounded-[2rem] border-l-[6px] !border-l-cyan-400 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/5 hover:scale-[1.01] transition-all"
              >
                {/* LADO ESQUERDO: ÍCONE + NOME GRANDE + ETIQUETAS */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-13 h-13 bg-cyan-50 dark:bg-cyan-950/50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-cyan-100 dark:border-cyan-900 shrink-0">
                    🛶
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    {/* NOME EM DESTAQUE MAIOR */}
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase leading-tight truncate">
                      {item.cliente}
                    </h3>
                    
                    {/* ETIQUETA DO CAIAQUE E STATUS */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[8px] font-black text-blue-700 dark:text-cyan-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                        #{item.caiaque} {item.caiaque_nome ? `· ${item.caiaque_nome}` : ''}
                      </span>
                      <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        FINALIZADO
                      </span>
                    </div>
                  </div>
                </div>

                {/* LADO DIREITO: TURNO E DURAÇÃO */}
                <div className="text-right border-l border-slate-100 dark:border-slate-800 pl-3.5 min-w-[85px] shrink-0">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    TURNO
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-none">
                      {item.entrada} ➜ {item.saida}
                    </span>
                    <span className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase mt-1 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-100 dark:border-cyan-900/60">
                      ⏱️ {item.duracaoMin || 34} MIN
                    </span>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

