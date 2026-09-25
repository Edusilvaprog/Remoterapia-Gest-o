'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Avaliacao {
  id: string
  nota: number
  comentario: string
  created_at: string
  mensalistas?: { nome: string }
}

export default function FeedbackClient() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [filtro, setFiltro] = useState<'todas' | '5' | 'comentario'>('todas')

  useEffect(() => {
    carregarAvaliacoes()
  }, [])

  const carregarAvaliacoes = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('avaliacoes')
        .select('id, nota, comentario, created_at, mensalistas(nome)')
        .order('created_at', { ascending: false })
      
      if (data) {
        setAvaliacoes(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const media = avaliacoes.length > 0 
    ? (avaliacoes.reduce((acc, a) => acc + (a.nota || 5), 0) / avaliacoes.length).toFixed(1)
    : '5.0'
  
  const contarNotas = (nota: number) => avaliacoes.filter(a => a.nota === nota).length

  const filtradas = avaliacoes.filter(a => {
    if (filtro === '5') return a.nota === 5
    if (filtro === 'comentario') return a.comentario && a.comentario.length > 0
    return true
  })

  return (
    <div className="space-y-4">
      <div className="bg-white/95 dark:bg-slate-900/95 p-6 rounded-[2.2rem] shadow-xl border-t-4 !border-t-amber-400 border border-white/60 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">GERAL</span>
          <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight uppercase">Média</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-amber-500">{media}</span>
          <div className="flex flex-col">
            <span className="text-amber-400 text-xs tracking-widest">★★★★★</span>
            <span className="text-[9px] font-bold text-slate-400">{avaliacoes.length} avaliações</span>
          </div>
        </div>
      </div>

      {/* Barras de Progresso */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-5 rounded-3xl shadow-md border border-slate-100 dark:border-slate-800/80 space-y-2">
        {[5, 4, 3, 2, 1].map(nota => {
          const count = contarNotas(nota)
          const pct = avaliacoes.length > 0 ? (count / avaliacoes.length) * 100 : 0
          return (
            <div key={nota} className="flex items-center gap-2 text-[10px]">
              <span className="w-4 font-black text-slate-600 dark:text-slate-400">{nota}★</span>
              <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-4 text-right font-bold text-slate-400">{count}</span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        <button onClick={() => setFiltro('todas')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${filtro === 'todas' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'}`}>Todas</button>
        <button onClick={() => setFiltro('5')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${filtro === '5' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'}`}>5 Estrelas</button>
        <button onClick={() => setFiltro('comentario')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${filtro === 'comentario' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'}`}>Com Comentário</button>
      </div>

      <div className="space-y-3 pt-2">
        {filtradas.length === 0 && (
          <div className="text-center p-8 bg-white/50 rounded-3xl border border-dashed border-slate-300">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Nenhuma avaliação encontrada.</p>
          </div>
        )}
        
        {filtradas.map(av => (
          <div key={av.id} className="bg-white/95 dark:bg-slate-900/95 p-4 rounded-[1.8rem] shadow-sm border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate pr-2">
                {av.mensalistas?.nome || 'Aluno Remoterapia'}
              </span>
              <div className="flex text-amber-400 text-xs">
                {'★'.repeat(Math.round(av.nota || 5))}
                {'☆'.repeat(Math.max(0, 5 - Math.round(av.nota || 5)))}
              </div>
            </div>
            {av.comentario && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium italic border-l-2 border-amber-200 dark:border-amber-900/60 pl-2 ml-0.5">
                "{av.comentario}"
              </p>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[8.5px] font-bold text-blue-500 uppercase">Remada Avulsa</span>
              <span className="text-[8.5px] font-bold text-slate-400 uppercase">
                {new Date(av.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
