'use client'
import { useState, useEffect } from 'react'

export default function RecepcaoFilaClient() {
  const [fila, setFila] = useState<string[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [whats, setWhats] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('plorix_fila_espera')
      if (saved) setFila(JSON.parse(saved))
    } catch {}
  }, [])

  // FORMATAÇÃO INTELIGENTE DE TELEFONE EM TEMPO REAL
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11)
    
    if (cleaned.length === 0) return ''
    if (cleaned.length <= 2) return `(${cleaned}`
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
  }

  const handleOpenModal = () => {
    setNome('')
    setWhats('')
    setModalAberto(true)
  }

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    
    const entry = whats.trim() ? `${nome.trim()} - 📞 ${whats.trim()}` : nome.trim()
    const novaFila = [...fila, entry]
    
    setFila(novaFila)
    localStorage.setItem('plorix_fila_espera', JSON.stringify(novaFila))
    setModalAberto(false)
  }

  const removeFila = (index: number) => {
    const novaFila = fila.filter((_, i) => i !== index)
    setFila(novaFila)
    localStorage.setItem('plorix_fila_espera', JSON.stringify(novaFila))
  }

  return (
    <>
      {/* CARD PRINCIPAL DA FILA DE ESPERA */}
      <div 
        className="glass-card p-5 relative overflow-hidden mb-4 shadow-sm border-t-4 !border-t-cyan-400" 
        style={{ borderTop: '4px solid #22d3ee' }}
      >
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recepção
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider truncate">
              Fila de Espera
            </p>
          </div>
          <button 
            type="button" 
            onClick={handleOpenModal}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-700 active:scale-95 shadow-sm transition-all"
          >
            + Fila de Espera
          </button>
        </div>

        {/* LISTAGEM OU VAZIO */}
        {fila.length > 0 ? (
          <div className="mt-4 space-y-2">
            {fila.map((item, idx) => (
              <div 
                key={idx} 
                className="glass-card p-3.5 flex justify-between items-center border-l-4 !border-l-cyan-400 bg-white/90 dark:bg-slate-800/90 shadow-sm rounded-2xl"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                    FILA
                  </p>
                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight break-words">
                    {item}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => removeFila(idx)}
                  className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-red-200 dark:border-red-800/40 active:scale-95 hover:bg-red-100 transition-colors shadow-sm shrink-0"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider border-2 border-dashed border-slate-900 dark:border-slate-700 rounded-2xl p-6 bg-white/60 dark:bg-slate-800/40">
            Nenhum cliente na fila
          </div>
        )}
      </div>

      {/* MODAL OFICIAL DE ADICIONAR NA FILA */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="glass-card p-6 w-full max-w-sm rounded-[2.5rem] bg-white/95 dark:bg-slate-900/95 border-2 border-white/80 dark:border-slate-700 shadow-2xl relative overflow-hidden border-t-4 !border-t-cyan-400"
            style={{ borderTop: '4px solid #22d3ee' }}
          >
            <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Nova entrada
            </p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider mb-5">
              Fila de Espera
            </h3>

            <form onSubmit={handleConfirmar} className="space-y-3">
              <input 
                type="text" 
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Nome do cliente..." 
                autoFocus
                required
                className="w-full py-4 px-5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white font-black text-sm outline-none focus:border-cyan-400 placeholder:text-slate-400 transition-colors"
              />

              <input 
                type="tel" 
                value={whats}
                onChange={e => setWhats(formatPhoneNumber(e.target.value))}
                placeholder="WhatsApp (Opcional)..." 
                maxLength={15}
                className="w-full py-4 px-5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white font-black text-sm outline-none focus:border-cyan-400 placeholder:text-slate-400 transition-colors"
              />

              <div className="flex gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setModalAberto(false)}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider border border-slate-900 dark:border-slate-700 active:scale-95 shadow-sm transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 shadow-md shadow-cyan-500/30 transition-all"
                >
                  Adicionar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  )
}

