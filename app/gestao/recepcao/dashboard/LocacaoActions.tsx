'use client'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useTransition } from 'react'
import { marcarRetorno, realizarCheckout } from '@/lib/actions/locacoes'
import {VisualText} from '@/components/ui/VisualContent'


export default function LocacaoActions({ locacaoId, status }: { locacaoId: string, status: string }) {
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleRetorno = () => {
    setErrorMsg('')
    startTransition(async () => {
      const res = await marcarRetorno(locacaoId)
      if (!res.ok) setErrorMsg(res.error || 'Erro ao marcar retorno')
    })
  }

  const submitCheckout = () => {
    setErrorMsg('')
    startTransition(async () => {
      const res = await realizarCheckout(locacaoId, 0, 'Pendente', '')
      if (!res.ok) setErrorMsg(res.error || 'Erro no checkout')
      else setShowModal(false)
    })
  }

  return (
    <>
      {errorMsg && (
        <div className="mt-2 p-2 bg-red-100 text-red-600 text-[10px] font-bold rounded-lg text-center uppercase">
          {errorMsg}
        </div>
      )}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        {status !== 'retornando' && (
          <button 
            onClick={handleRetorno} 
            disabled={isPending}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 text-center flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <BrandIcon name="warning"/> {isPending ? 'Proc...' : 'Avisar Retorno'}
          </button>
        )}
        <button 
          onClick={() => setShowModal(true)} 
          disabled={isPending}
          className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 text-center flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <BrandIcon name="success"/> {isPending ? 'Fin...' : 'Check-out'}
        </button>
      </div>

      {showModal && (
        <div data-rt-modal className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card backdrop-blur-md bg-white/95 dark:bg-slate-800/95 border border-white/60 dark:border-slate-700 rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-fade-down">
            <h3 className="text-sm font-black uppercase italic tracking-tighter text-slate-800 dark:text-white mb-1"><VisualText id="copy-7598dbd0e8e1" defaultText={"Confirmar Check-out"}/></h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4"><VisualText id="copy-9c60e2eee548" defaultText={"Deseja liberar este caiaque?"}/></p>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"><VisualText id="copy-ef982baeca25" defaultText={"Cancelar"}/></button>
              <button onClick={submitCheckout} disabled={isPending} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 disabled:opacity-50"><VisualText id="copy-f726d070162f" defaultText={"Confirmar"}/></button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

