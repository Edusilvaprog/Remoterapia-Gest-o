'use client'
import { useState, useEffect, useTransition } from 'react'
import { realizarCheckout, listarLocacoesAtivas } from '@/lib/actions/locacoes'

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
  const [fila, setFila] = useState<string[]>([])
  const [modalFila, setModalFila] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoWhats, setNovoWhats] = useState('')
  const [locacoes, setLocacoes] = useState<LocacaoItem[]>([])
  const [isPending, startTransition] = useTransition()

  // MODAL DE VISTORIA CHECK-OUT
  const [modalCheckout, setModalCheckout] = useState<LocacaoItem | null>(null)
  const [avariaMode, setAvariaMode] = useState<'nenhuma' | 'leve' | 'inoperante'>('nenhuma')
  const [avariaObs, setAvariaObs] = useState('')

  // CARREGAR FILA E EMBARQUES ATIVOS DO BANCO
  useEffect(() => {
    try {
      localStorage.removeItem('plorix_locacoes_ativas')
      const fStored = localStorage.getItem('plorix_fila_espera')
      if (fStored) setFila(JSON.parse(fStored))
    } catch {}

    async function carregar() {
      const res = await listarLocacoesAtivas()
      if (res.ok && res.data && res.data.length > 0) {
        setLocacoes(res.data.map((l: any) => ({
          id: l.id,
          cliente: l.cliente,
          caiaques_ids: l.caiaques_ids || [],
          caiaque_nome: l.caiaque_nome,
          lockers_ids: l.lockers_ids || [],
          com_instrutor: l.com_instrutor,
          instrutor_nome: l.instrutor_nome || l.instrutor_agua,
          entrada: l.entrada,
          tempo_min: l.duracao_min || 60,
          pagamento: l.pagamento,
          status: l.status,
          qtd_pessoas: l.qtd_pessoas || 1,
          tipo: l.tipo
        })))
      } else {
        setLocacoes([])
      }
    }
    carregar()
  }, [])

  // ADICIONAR NA FILA
  const handleAdicionarFila = (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) return
    const entry = novoWhats.trim() ? `${novoNome.trim()} · 📱 ${novoWhats.trim()}` : novoNome.trim()
    const updated = [...fila, entry]
    setFila(updated)
    localStorage.setItem('plorix_fila_espera', JSON.stringify(updated))
    setNovoNome('')
    setNovoWhats('')
    setModalFila(false)
  }

  const removerFila = (idx: number) => {
    const updated = fila.filter((_, i) => i !== idx)
    setFila(updated)
    localStorage.setItem('plorix_fila_espera', JSON.stringify(updated))
  }

  // CHECKOUT OFICIAL NA AREIA
  const confirmarCheckout = () => {
    if (!modalCheckout) return
    const id = modalCheckout.id
    let obs = avariaObs
    if (avariaMode === 'inoperante') obs = `[INOPERANTE] ${obs}`
    else if (avariaMode === 'leve') obs = `[AVARIA LEVE] ${obs}`

    startTransition(async () => {
      try { await realizarCheckout(id, 0, modalCheckout.pagamento || 'Pix', obs) } catch {}
      setLocacoes(prev => prev.filter(l => l.id !== id))
      setModalCheckout(null)
      setAvariaObs('')
      setAvariaMode('nenhuma')
    })
  }

  return (
    <div className="space-y-4 pb-12">
      
      {/* 1. FILA DE ESPERA */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-5 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-3.5">
        
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">RECEPÇÃO AREIA</span>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              FILA DE ESPERA ({fila.length})
            </h3>
          </div>

          <button 
            type="button" 
            onClick={() => setModalFila(true)}
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            + Adicionar à Fila
          </button>
        </div>

        {fila.length === 0 ? (
          <div className="bg-[#f4f9fc] dark:bg-slate-800/80 p-4 rounded-2xl border border-blue-100 dark:border-slate-700 text-center">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Nenhum cliente aguardando na fila.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {fila.map((item, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-[#f8fafc] dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">
                    {idx + 1}º
                  </span>
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">
                    {item}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => removerFila(idx)}
                  className="text-[10px] font-black text-red-500 hover:text-red-700 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 2. TÍTULO MONITORAMENTO */}
      <div className="flex justify-center pt-1">
        <div className="bg-white/95 dark:bg-slate-900/95 rounded-full py-1.5 px-4 inline-flex items-center gap-2 border border-white/60 dark:border-slate-800 shadow-sm">
          <span className="text-sm">📋</span>
          <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest leading-none">
            MONITORAMENTO DE NAVEGAÇÕES
          </p>
        </div>
      </div>

      {/* 3. LISTA DE EMBARQUES ATIVOS (MODELO EXATO DA FOTO 1) */}
      {locacoes.length === 0 ? (
        <div className="bg-white/95 dark:bg-slate-900/95 p-6 rounded-[2.2rem] border border-white/60 dark:border-slate-800 text-center shadow-sm">
          <span className="text-3xl block mb-2 opacity-50">🌊</span>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Nenhuma embarcação no mar no momento.
          </p>
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

            const agora = Date.now()
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
                    #{Array.isArray(loc.caiaques_ids) ? loc.caiaques_ids[0] : loc.caiaques_ids} · QTD: {loc.qtd_pessoas || 1}
                  </span>

                  {loc.com_instrutor && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50/60 text-blue-600 border border-blue-200 dark:bg-blue-950/60 dark:text-cyan-300 dark:border-blue-900">
                      {loc.instrutor_nome ? `INST: ${loc.instrutor_nome.toUpperCase()}` : 'COM INSTRUTOR'}
                    </span>
                  )}

                  {lockerId && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50/80 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900 flex items-center gap-1">
                      <span>🔒</span> GV {lockerId.replace('GV-', '').replace('GV', '').trim()}
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
                      <span className="text-[8.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        PARTIDA
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                        {horaPartida}
                      </span>
                    </div>

                    <div className="w-[1.5px] h-6 bg-blue-200/80 dark:bg-slate-700"></div>

                    <div>
                      <span className="text-[8.5px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-wider block mb-1">
                        PREVISÃO
                      </span>
                      <span className="text-lg font-black text-blue-600 dark:text-cyan-400 leading-none">
                        {horaPrevisao}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#eaf4fc] dark:bg-slate-800 py-3 px-3 rounded-2xl border border-blue-200 dark:border-slate-700 text-center min-w-[82px] shrink-0 shadow-inner">
                    <p className="text-2xl font-black text-blue-600 dark:text-cyan-400 leading-none tabular-nums">
                      {minNaAgua}<span className="text-[10px] font-black ml-0.5">MIN</span>
                    </p>
                    <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-1">
                      NO MAR
                    </span>
                  </div>
                </div>

                {/* 4. RODAPÉ: FORMA DE PAGAMENTO / PLANO E FINALIZAR */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {loc.tipo === 'mensalista' ? (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                      MENSALISTA
                    </span>
                  ) : loc.tipo === 'guardaria' ? (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      GUARDARIA
                    </span>
                  ) : loc.pagamento ? (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      PAGO VIA {loc.pagamento.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      AVULSO
                    </span>
                  )}

                  <button 
                    type="button" 
                    disabled={isPending}
                    onClick={() => setModalCheckout(loc)}
                    className="py-2.5 px-7 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    FINALIZAR
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* MODAL ADICIONAR FILA */}
      {modalFila && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4">
          <form onSubmit={handleAdicionarFila} className="bg-white dark:bg-slate-900 p-6 w-full max-w-sm rounded-[2.2rem] shadow-2xl border-t-4 !border-t-blue-600 border border-white/40 space-y-4">
            <div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">RECEPÇÃO AREIA</p>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">ADICIONAR À FILA</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={novoNome} 
                  onChange={e => setNovoNome(e.target.value)} 
                  placeholder="Ex: Família Silva" 
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block">WhatsApp (Opcional)</label>
                <input 
                  type="text" 
                  value={novoWhats} 
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '')
                    if (v.length > 11) v = v.slice(0, 11)
                    if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`
                    if (v.length > 10) v = `${v.slice(0,10)}-${v.slice(10)}`
                    setNovoWhats(v)
                  }} 
                  placeholder="(13) 99999-9999" 
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setModalFila(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL VISTORIA DE CHECKOUT */}
      {modalCheckout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 w-full max-w-sm rounded-[2.2rem] shadow-2xl border-t-4 !border-t-blue-600 border border-white/40 space-y-4">
            <div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">VISTORIA DE RETORNO (AREIA)</p>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
                {modalCheckout.cliente}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                Embarcação #{modalCheckout.caiaques_ids.join(', ')}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase ml-0.5">ESTADO DA EMBARCAÇÃO:</p>
              
              <button 
                type="button"
                onClick={() => setAvariaMode('nenhuma')}
                className={`w-full p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all text-left flex items-center justify-between ${
                  avariaMode === 'nenhuma' 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>✅ Conforme (Sem avarias)</span>
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
                <span>⚠️ Avaria Leve (Uso normal)</span>
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
                <span>🚫 Inoperante (Manutenção)</span>
                {avariaMode === 'inoperante' && <span>✓</span>}
              </button>
            </div>

            {avariaMode !== 'nenhuma' && (
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block">Observações do Dano</label>
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
                onClick={() => setModalCheckout(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={confirmarCheckout}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              >
                Finalizar Viagem
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}


