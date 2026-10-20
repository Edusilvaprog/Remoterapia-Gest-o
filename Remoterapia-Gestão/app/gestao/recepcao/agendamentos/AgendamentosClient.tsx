'use client'
import ReceptionBookingsTable from '@/components/desktop/ReceptionBookingsTable'
import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Agendamento } from '@/lib/types'
import { realizarCheckin } from '@/lib/actions/locacoes'
import { cancelarDiaPorClima } from '@/lib/actions/agendamentos'
import {VisualText} from '@/components/ui/VisualContent'


export default function AgendamentosClient({ agendamentosIniciais }: { agendamentosIniciais: Agendamento[] }) {
  const router = useRouter()
  // Pega apenas agendamentos do dia de hoje (ou todos pendentes/confirmados)
  const hoje = new Date().toISOString().split('T')[0]
  
  const [lista] = useState<Agendamento[]>(
    agendamentosIniciais.filter(a => a.data_reserva === hoje || ['pendente', 'confirmado'].includes(a.status))
  )

  const [isPending, startTransition] = useTransition()

  const [modalBloqueio, setModalBloqueio] = useState(false)
  const [motivoClima, setMotivoClima] = useState('Ressaca')
  const [recadoTexto, setRecadoTexto] = useState('')
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const handleLiberarSaida = (ag: Agendamento) => {
    if (!ag.caiaque_id) {
        showToast('Este agendamento não possui um caiaque alocado. Faça a saída pelo menu Novo Embarque.', 'warning')
        return
    }

    startTransition(async () => {
      const res = await realizarCheckin({
        cliente: ag.mensalista_nome || 'Mensalista',
        tipo: ag.mensalista?.tipo_plano === 'guardaria' ? 'guardaria' : 'mensalista',
        mensalista_id: ag.mensalista_id || undefined,
        caiaques_ids: [ag.caiaque_id!],
        com_instrutor: false, // Mensalista geralmente sai solo
        pagamento: 'Pendente', // Coberto pelo plano
        agendamento_id: ag.id
      } as any)

      if (res.ok) {
        router.push('/gestao/recepcao/dashboard')
      } else {
        showToast(res.error || 'Erro ao liberar saída.', 'error')
      }
    })
  }

  const handleSuspenderDia = () => {
    startTransition(async () => {
      const res = await cancelarDiaPorClima(hoje, motivoClima, recadoTexto)
      if (res.ok) {
        showToast('Dia suspenso e agendamentos cancelados com sucesso.', 'success')
        setModalBloqueio(false)
        router.refresh()
      } else {
        showToast('Erro ao suspender dia.', 'error')
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-emerald-100 text-emerald-700'
      case 'pendente': return 'bg-amber-100 text-amber-700'
      case 'concluido': return 'bg-blue-100 text-blue-700'
      case 'cancelado': 
      case 'falta':
      case 'recusado': return 'bg-red-100 text-red-700'
      case 'cancelado_clima': return 'bg-purple-100 text-purple-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="rt-reception-renewed rt-legacy-refresh rt-reception-bookings space-y-4">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 pointer-events-none animate-bounce">
          <div className={`rt-legacy-card p-4 rounded-2xl shadow-2xl backdrop-blur-xl border bg-white/95 dark:bg-slate-900/95 flex items-center justify-between gap-3 border-l-[6px] ${
            toast.tipo === 'success' ? '!border-l-emerald-500 border-emerald-100 dark:border-slate-800' :
            toast.tipo === 'warning' ? '!border-l-amber-500 border-amber-100 dark:border-slate-800' :
            toast.tipo === 'error' ? '!border-l-red-500 border-red-100 dark:border-slate-800' :
            '!border-l-blue-600 border-blue-100 dark:border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-lg shrink-0">
                <BrandLabel text={toast.tipo === 'success' ? '✅' : toast.tipo === 'warning' ? '⚠️' : toast.tipo === 'error' ? '❌' : '🛶'}/>
              </span>
              <p className="rt-legacy-type text-[11px] font-black leading-snug text-slate-900 dark:text-white">
                {toast.msg}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO DE BLOQUEIO CLIMÁTICO */}
      <button onClick={() => setModalBloqueio(true)} className="rt-legacy-control rt-legacy-type w-full py-3 bg-blue-100 text-blue-800 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm transition-all hover:bg-blue-200">
        <BrandIcon name="waves"/><VisualText id="copy-69fa0a788318" defaultText={" Bloqueio Climático / Suspender Dia"}/></button>

      <ReceptionBookingsTable agendamentos={lista}/><div className="rt-legacy-mobile">{lista.length === 0 ? (
        <div className="rt-legacy-card glass-card p-8 flex flex-col items-center justify-center text-center opacity-80 mt-2 rounded-3xl">
            <span className="text-4xl mb-3 opacity-50 grayscale filter"><BrandIcon name="calendar"/></span>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1"><VisualText id="copy-c6d59fa1802d" defaultText={"Sem agendamentos hoje"}/></p>
        </div>
      ) : (
        lista.map(ag => (
          <div key={ag.id} className="rt-legacy-card glass-card backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border border-white/60 dark:border-slate-700 rounded-3xl p-5 shadow-sm transition-all hover:scale-[1.01]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="rt-legacy-type text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter truncate">{ag.mensalista_nome}</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{ag.data_reserva} às {ag.horario_reserva}</p>
              </div>
              <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${getStatusColor(ag.status)}`}>
                {ag.status === 'cancelado_clima' ? `Cancelado ("${ag.motivo_cancelamento}")` : ag.status}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="rt-legacy-type text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-1 border border-slate-900 dark:border-slate-600 shadow-sm w-fit">
                  <BrandIcon name="ship"/> {ag.caiaque_id || 'Não alocado'}
              </span>
              {ag.mensalista?.tipo_plano && (
                  <span className="rt-legacy-type text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-1 border border-slate-900 dark:border-slate-600 shadow-sm w-fit">
                    {ag.mensalista.tipo_plano}
                  </span>
                )}

                {ag.status === 'concluido' && (
                  ag.avaliacao ? (
                    <span className="rt-legacy-type inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black w-fit">
                      ★ {ag.avaliacao}.0
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md w-fit"><VisualText id="copy-d2417b750a38" defaultText={"Sem avaliação"}/></span>
                  )
                )}
            </div>

            {ag.status === 'confirmado' && (
              <button 
                onClick={() => handleLiberarSaida(ag)}
                disabled={isPending}
                className="rt-legacy-control rt-legacy-type w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 text-center flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <BrandLabel text={isPending ? '⏳ Processando...' : '⛵ Liberar Saída'}/>
              </button>
            )}
          </div>
        ))
      )}

      </div>{modalBloqueio && (
        <div data-rt-modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 w-full max-w-sm space-y-4">
            <h3 className="rt-legacy-type text-sm font-black uppercase text-blue-600"><VisualText id="copy-7ff26cd37057" defaultText={"Suspender Dia (Clima)"}/></h3>
            <div className="space-y-3">
              <div>
                <label className="rt-legacy-type text-[10px] font-black uppercase text-slate-500 block mb-1"><VisualText id="copy-8ade1d0360c0" defaultText={"Motivo"}/></label>
                <select value={motivoClima} onChange={e=>setMotivoClima(e.target.value)} className="w-full p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-xs font-bold text-slate-900 dark:text-white">
                  <option>Ressaca</option>
                  <option>Vento Forte</option>
                  <option>Tempestade</option>
                  <option>Maré Seca Extrema</option>
                </select>
              </div>
              <div>
                <label className="rt-legacy-type text-[10px] font-black uppercase text-slate-500 block mb-1"><VisualText id="copy-3d261dc165eb" defaultText={"Recado aos Alunos"}/></label>
                <textarea rows={3} value={recadoTexto} onChange={e=>setRecadoTexto(e.target.value)} placeholder="Ex: Prezados alunos, devido à ressaca..." className="w-full p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-xs font-bold text-slate-900 dark:text-white" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModalBloqueio(false)} className="rt-legacy-control rt-legacy-type flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase"><VisualText id="copy-6dec3ea01081" defaultText={"Cancelar"}/></button>
                <button onClick={handleSuspenderDia} disabled={isPending} className="rt-legacy-control rt-legacy-type flex-1 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase shadow-lg disabled:opacity-50"><VisualText id="copy-f5f7ca2dd95e" defaultText={"Confirmar Suspensão"}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
