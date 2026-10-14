'use client'

import { useState } from 'react'
import { X, Info } from 'lucide-react'
import PortalHomeLayout from './PortalHomeLayout'
import {VisualText} from '@/components/ui/VisualContent'



interface AbaInicioProps {
  alunoData: any
  agendamentos: any[]
  reservasSemana: number
  maxMensalista?: number
  disponiveisSemana?: number
  caiaques: any[]
  lockers: any[]
  onSolicitarNovo: () => void
  onExplorarEventos: () => void
  onCancelar: (id: string, dataStr: string) => void
}

export default function AbaInicio({
  alunoData,
  agendamentos,
  reservasSemana,
  maxMensalista,
  disponiveisSemana,
  caiaques,
  lockers,
  onSolicitarNovo,
  onExplorarEventos,
  onCancelar
}: AbaInicioProps) {
  // Modal interno de motivo de cancelamento (Blindado, não depende de page.tsx)
  const [detalhesCancelado, setDetalhesCancelado] = useState<{ motivo: string, obs: string } | null>(null)

  // Cotas semanais seguras
  const maxCotas = maxMensalista ?? (alunoData?.max_reservas_semana || 2)
  const livres = disponiveisSemana ?? Math.max(0, maxCotas - reservasSemana)

  // Filtra agendamentos ativos/relevantes
  const agendamentosAtivos = (agendamentos || []).filter(
    (a: any) => a.status === 'pendente' || a.status === 'confirmado' || a.status === 'cancelado_clima' || a.status === 'cancelado'
  )

  return (
    <>
      <PortalHomeLayout student={alunoData} items={agendamentosAtivos} available={livres} limit={maxCotas} used={reservasSemana} boats={caiaques||[]} onBook={onSolicitarNovo} onEvents={onExplorarEventos} onCancel={onCancelar} onDetails={item=>setDetalhesCancelado({motivo:item.motivo_cancelamento||'Cancelamento registrado pela equipe.',obs:item.observacoes||''})}/>
      {/* MODAL INTERNO: DETALHES DE CANCELAMENTO */}
      {detalhesCancelado && (
        <div data-rt-modal className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 rounded-[2.2rem] shadow-2xl w-full max-w-sm border border-white/80 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase text-purple-700 dark:text-purple-400 flex items-center gap-2">
                <Info className="w-4 h-4" /><VisualText id="copy-5f0164bb24e5" defaultText={" Detalhes do Cancelamento"}/></h3>
              <button aria-label="Fechar janela" 
                type="button"
                onClick={() => setDetalhesCancelado(null)} 
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider"><VisualText id="copy-f46a77b1dac8" defaultText={"Motivo Informado"}/></p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{detalhesCancelado.motivo}</p>
              </div>
              {detalhesCancelado.obs && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider"><VisualText id="copy-cdf61afff59a" defaultText={"Orientações da Equipe"}/></p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">{detalhesCancelado.obs}</p>
                </div>
              )}
            </div>
            <button 
              type="button"
              onClick={() => setDetalhesCancelado(null)} 
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black rounded-xl text-xs uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            ><VisualText id="copy-18652f8c2a4a" defaultText={"Fechar"}/></button>
          </div>
        </div>
      )}

    </>
  )
}
