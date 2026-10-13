'use client'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import { realizarCheckout, listarLocacoesAtivas } from '@/lib/actions/locacoes'
import type { Locacao } from '@/lib/types'
import RecepcaoFilaClient from './RecepcaoFilaClient'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



interface LocacaoItem {
  id: string
  cliente: string
  caiaques_ids: string[]
  caiaque_nome?: string
  lockers_ids?: string[]
  com_instrutor?: boolean
  instrutor_nome?: string
  entrada: string
  tempo_min?: number
  pagamento?: string
  status: string
  qtd_pessoas?: number
  tipo?: string
}

export default function DashboardRecepcaoPage() {
  const [locacoes, setLocacoes] = useState<LocacaoItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [agora, setAgora] = useState(() => Date.now())
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const travaCheckout = useRef(false)
  const showToast = useCallback((msg: string, tipo: 'success' | 'error') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 5000)
  }, [])

  // MODAL DE VISTORIA CHECK-OUT
  const [modalCheckout, setModalCheckout] = useState<LocacaoItem | null>(null)
  const [avariaMode, setAvariaMode] = useState<'nenhuma' | 'leve' | 'inoperante'>('nenhuma')
  const [avariaObs, setAvariaObs] = useState('')

  // CARREGAR EMBARQUES ATIVOS DO BANCO
  useEffect(() => {
    let ativo = true
    void Promise.resolve().then(async () => {
      if (!ativo) return
      try {
        const res = await listarLocacoesAtivas()
        if (!ativo) return
        if (!res.ok) {
          showToast(res.error || 'Não foi possível consultar os embarques ativos.', 'error')
          return
        }
        setLocacoes((res.data ?? []).map((l: Locacao) => ({
          id: l.id,
          cliente: l.cliente,
          caiaques_ids: l.caiaques_ids || [],
          caiaque_nome: l.caiaque_nome,
          lockers_ids: l.lockers_ids || [],
          com_instrutor: l.com_instrutor,
          instrutor_nome: l.instrutor_nome || l.instrutor_agua || undefined,
          entrada: l.entrada,
          tempo_min: l.previsao ? Math.max(1, Math.round((new Date(l.previsao).getTime() - new Date(l.entrada).getTime()) / 60000)) : 60,
          pagamento: l.pagamento || undefined,
          status: l.status,
          qtd_pessoas: l.qtd_pessoas || 1,
          tipo: l.tipo
        })))
      } catch {
        if (ativo) showToast('Não foi possível consultar os embarques ativos.', 'error')
      }
    })
    return () => { ativo = false }
  }, [showToast])

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  // CHECKOUT OFICIAL NA AREIA
  const confirmarCheckout = () => {
    if (!modalCheckout || isPending || travaCheckout.current) return
    const id = modalCheckout.id
    let obs = avariaObs
    if (avariaMode === 'inoperante') obs = `[INOPERANTE] ${obs}`
    else if (avariaMode === 'leve') obs = `[AVARIA LEVE] ${obs}`

    travaCheckout.current = true
    startTransition(async () => {
      try {
        const result = await realizarCheckout(id, null, modalCheckout.pagamento || 'Pendente', obs)
        if (!result.ok) {
          showToast(result.error || 'O retorno não foi confirmado. Tente novamente.', 'error')
          return
        }
        setLocacoes(prev => prev.filter(l => l.id !== id))
        setModalCheckout(null)
        setAvariaObs('')
        setAvariaMode('nenhuma')
        showToast('Retorno registrado com sucesso.', 'success')
      } catch (e: unknown) {
        const mensagem = e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Falha ao registrar o retorno.'
        showToast(mensagem, 'error')
      } finally {
        travaCheckout.current = false
      }
    })
  }

  return (
    <div className="space-y-4 pb-12">
      {toast && <div role="status" className={`fixed top-4 left-1/2 -translate-x-1/2 z-[10010] w-[calc(100%-2rem)] max-w-sm p-4 rounded-2xl border shadow-xl text-xs font-bold ${toast.tipo === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{toast.msg}</div>}
      
      <RecepcaoFilaClient />

      {/* 2. TÍTULO MONITORAMENTO */}
      <div className="flex justify-center pt-1">
        <div className="bg-white/95 dark:bg-slate-900/95 rounded-full py-1.5 px-4 inline-flex items-center gap-2 border border-white/60 dark:border-slate-800 shadow-sm">
          <span className="text-sm"><BrandIcon name="clipboard"/></span>
          <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest leading-none"><VisualText id="copy-8088ae0d5bd6" defaultText={"Na água agora"}/></p>
        </div>
      </div>

      {/* 3. LISTA DE EMBARQUES ATIVOS (MODELO EXATO DA FOTO 1) */}
      {locacoes.length === 0 ? (
        <div className="bg-white/95 dark:bg-slate-900/95 p-6 rounded-[2.2rem] border border-white/60 dark:border-slate-800 text-center shadow-sm">
          <span className="text-3xl block mb-2 opacity-50"><BrandIcon name="waves"/></span>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider"><VisualText id="copy-6fd5c0997133" defaultText={"Nenhuma embarcação no mar no momento."}/></p>
        </div>
      ) : (
        <div className="space-y-3">
          {locacoes.map(loc => {
            const entDate = new Date(loc.entrada)
            const isValidEnt = !isNaN(entDate.getTime())
            const horaPartida = isValidEnt ? entDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
            
            const duracaoTotal = loc.tempo_min || 60
            const prevDate = isValidEnt ? new Date(entDate.getTime() + duracaoTotal * 60000) : null
            const horaPrevisao = prevDate && !isNaN(prevDate.getTime()) ? prevDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'

            const minNaAgua = isValidEnt ? Math.max(0, Math.floor((agora - entDate.getTime()) / 60000)) : 0
            const lockerId = loc.lockers_ids && loc.lockers_ids.length > 0 ? loc.lockers_ids[0] : null

            return (
              <div 
                key={loc.id} 
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-l-4 !border-l-blue-600 border border-slate-100 dark:border-slate-800 shadow-xl shadow-blue-500/5 space-y-3.5"
              >
                {/* 1. ETIQUETAS: CAIAQUE COM QTD EXATA + INSTRUTOR + GUARDA-VOLUMES */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-50 text-blue-900 border border-slate-200 dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700">
                    #{Array.isArray(loc.caiaques_ids) ? loc.caiaques_ids[0] : loc.caiaques_ids}<VisualText id="copy-07e2dff6e057" defaultText={" · QTD: "}/>{loc.qtd_pessoas || 1}
                  </span>

                  {loc.com_instrutor && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50/60 text-blue-600 border border-blue-200 dark:bg-blue-950/60 dark:text-cyan-300 dark:border-blue-900">
                      <VisualLabel text={loc.instrutor_nome ? `INST: ${loc.instrutor_nome.toUpperCase()}` : 'COM INSTRUTOR'}/>
                    </span>
                  )}

                  {lockerId && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50/80 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900 flex items-center gap-1">
                      <span><BrandIcon name="lock"/></span> GV {lockerId.replace('GV-', '').replace('GV', '').trim()}
                    </span>
                  )}
                </div>

                {/* 2. NOMES DOS PASSAGEIROS (SEM TAG AVULSO) */}
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                    {loc.cliente}
                  </h3>
                </div>

                {/* 3. BLOCO CENTRAL AZUL NÁUTICO DE ALTO CONTRASTE */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#eaf4fc] dark:bg-slate-800/80 py-3 px-4 rounded-2xl border border-blue-200 dark:border-slate-700 flex items-center justify-around text-center shadow-inner">
                    <div>
                      <span className="text-[8.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1"><VisualText id="copy-62c7b4164d73" defaultText={"PARTIDA"}/></span>
                      <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                        {horaPartida}
                      </span>
                    </div>

                    <div className="w-[1.5px] h-6 bg-blue-200/80 dark:bg-slate-700"></div>

                    <div>
                      <span className="text-[8.5px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-wider block mb-1"><VisualText id="copy-fd4a0605dde9" defaultText={"PREVISÃO"}/></span>
                      <span className="text-lg font-black text-blue-600 dark:text-cyan-400 leading-none">
                        {horaPrevisao}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#eaf4fc] dark:bg-slate-800 py-3 px-3 rounded-2xl border border-blue-200 dark:border-slate-700 text-center min-w-[82px] shrink-0 shadow-inner">
                    <p className="text-2xl font-black text-blue-600 dark:text-cyan-400 leading-none tabular-nums">
                      {minNaAgua}<span className="text-[10px] font-black ml-0.5"><VisualText id="copy-96ed3a95aa3b" defaultText={"MIN"}/></span>
                    </p>
                    <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-1"><VisualText id="copy-b1bff1095b65" defaultText={"NO MAR"}/></span>
                  </div>
                </div>

                {/* 4. RODAPÉ: FORMA DE PAGAMENTO / PLANO E FINALIZAR */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {loc.tipo === 'mensalista' ? (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800"><VisualText id="copy-4dbaa0d9528b" defaultText={"MENSALISTA"}/></span>
                  ) : loc.tipo === 'guardaria' ? (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"><VisualText id="copy-62987516f9a5" defaultText={"GUARDARIA"}/></span>
                  ) : loc.pagamento ? (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"><VisualText id="copy-8c008e56c80e" defaultText={"PAGO VIA "}/>{loc.pagamento.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"><VisualText id="copy-589f82a119f3" defaultText={"AVULSO"}/></span>
                  )}

                  <button 
                    type="button" 
                    disabled={isPending}
                    onClick={() => setModalCheckout(loc)}
                    className="py-2.5 px-7 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                  ><VisualText id="copy-e78e165b07f5" defaultText={"FINALIZAR"}/></button>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* MODAL VISTORIA DE CHECKOUT */}
      {modalCheckout && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 w-full max-w-sm rounded-[2.2rem] shadow-2xl border-t-4 !border-t-blue-600 border border-white/40 space-y-4">
            <div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest"><VisualText id="copy-4aeb4e767f71" defaultText={"VISTORIA DE RETORNO (AREIA)"}/></p>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
                {modalCheckout.cliente}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5"><VisualText id="copy-3b5be48601d8" defaultText={"Embarcação #"}/>{modalCheckout.caiaques_ids.join(', ')}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase ml-0.5"><VisualText id="copy-8b227598b018" defaultText={"ESTADO DA EMBARCAÇÃO:"}/></p>
              
              <button 
                type="button"
                onClick={() => setAvariaMode('nenhuma')}
                className={`w-full p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all text-left flex items-center justify-between ${
                  avariaMode === 'nenhuma' 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span><BrandIcon name="success"/><VisualText id="copy-2bfa43daa746" defaultText={" Conforme (Sem avarias)"}/></span>
                {avariaMode === 'nenhuma' && <span>✓</span>}
              </button>

              <button 
                type="button"
                onClick={() => setAvariaMode('leve')}
                className={`w-full p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all text-left flex items-center justify-between ${
                  avariaMode === 'leve' 
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span><BrandIcon name="warning"/><VisualText id="copy-f622e88ecef5" defaultText={" Avaria Leve (Uso normal)"}/></span>
                {avariaMode === 'leve' && <span>✓</span>}
              </button>

              <button 
                type="button"
                onClick={() => setAvariaMode('inoperante')}
                className={`w-full p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all text-left flex items-center justify-between ${
                  avariaMode === 'inoperante' 
                    ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span><BrandIcon name="warning"/><VisualText id="copy-caa15e43494d" defaultText={" Inoperante (Manutenção)"}/></span>
                {avariaMode === 'inoperante' && <span>✓</span>}
              </button>
            </div>

            {avariaMode !== 'nenhuma' && (
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block"><VisualText id="copy-af7201b1b905" defaultText={"Observações do Dano"}/></label>
                <input 
                  type="text" 
                  value={avariaObs} 
                  onChange={e => setAvariaObs(e.target.value)} 
                  placeholder="Ex: Remo rachado ou quilha riscada" 
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                disabled={isPending}
                onClick={() => setModalCheckout(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              ><VisualText id="copy-9eeb12380280" defaultText={"Cancelar"}/></button>
              <button 
                type="button" 
                disabled={isPending}
                onClick={confirmarCheckout}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              >
                <VisualLabel text={isPending ? 'Salvando...' : 'Finalizar Viagem'}/>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}


