'use client'

import { useState, useRef } from 'react'

export default function MidiaClient({ perfilNome }: { perfilNome: string }) {
  const [modalCat, setModalCat] = useState<string | null>(null)
  const [fotos, setFotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3800)
  }
  
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (fotos.length >= 6) return showToast('Máximo de 6 fotos por envio.', 'warning')
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) setFotos(prev => prev.length < 6 ? [...prev, reader.result as string] : prev)
      }
      reader.readAsDataURL(file)
    })
  }

  const handleGuardar = async () => {
    if (fotos.length === 0) return showToast('Selecione ao menos 1 foto.', 'warning')
    setUploading(true)
    try {
      let falhas = 0
      for (const b64 of fotos) {
        try {
          const res = await fetch('/api/upload-foto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: b64, categoria: modalCat || 'Paisagem', autor: perfilNome || 'Instrutor' })
          })
          if (!res.ok) falhas++
        } catch {
          falhas++
        }
      }

      if (falhas > 0) {
        showToast(`Processamento concluído. ${falhas} foto(s) falharam no upload.`, 'warning')
      } else {
        showToast('Fotos guardadas com sucesso! Já estão disponíveis no Marketing.', 'success')
      }
      
      setFotos([])
      setModalCat(null)
    } catch {
      showToast('Erro geral ao enviar fotos.', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5 relative">
      {/* TOAST NÁUTICO */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[90%] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-3.5 rounded-2xl shadow-2xl border text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 ${
            toast.tipo === 'success' 
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/30' 
              : toast.tipo === 'error' 
              ? 'bg-red-600 text-white border-red-400 shadow-red-600/30' 
              : toast.tipo === 'warning'
              ? 'bg-amber-500 text-white border-amber-300 shadow-amber-500/30'
              : 'bg-blue-600 text-white border-blue-400 shadow-blue-600/30'
          }`}>
            <span>{toast.tipo === 'success' ? '✓' : toast.tipo === 'error' ? '✕' : 'ℹ'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
      
      {/* PÍLULA BRANCA TRANSLÚCIDA */}
      <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm rounded-full py-2 px-4 inline-flex items-center gap-2 border border-white/80 dark:border-slate-700 shadow-sm">
          <span className="text-lg">📸</span> 
          <p className="text-[10px] font-black text-blue-900 dark:text-white uppercase tracking-wider italic leading-none">
            Registro de fotos
          </p>
      </div>

      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
        Escolha a categoria e envie até 6 fotos de cada vez
      </p>

      {/* 2 CARDS GRANDES DA TELA PRINCIPAL */}
      <div className="grid grid-cols-1 gap-4">
        
        {/* CARD 1: PAISAGENS */}
        <button 
          type="button" 
          onClick={() => { setModalCat('Paisagem'); setFotos([]); }} 
          className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-sm flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all group w-full text-left cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-cyan-100 dark:bg-cyan-900/50 w-16 h-16 rounded-3xl text-3xl group-hover:scale-110 transition-transform shadow-sm flex items-center justify-center shrink-0">
              🏝️
            </div>
            <div className="text-left">
              <span className="text-[13px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block leading-tight">
                PAISAGENS
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase mt-1 block tracking-wider">
                REGISTRAR CLIMA / VISUAL
              </span>
            </div>
          </div>
          <div className="text-cyan-500 text-xl font-black px-2 group-hover:scale-125 transition-transform">
            +
          </div>
        </button>

        {/* CARD 2: DICAS DE SEGURANÇA */}
        <button 
          type="button" 
          onClick={() => { setModalCat('Segurança'); setFotos([]); }} 
          className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-sm flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all group w-full text-left cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 dark:bg-orange-900/50 w-16 h-16 rounded-3xl text-3xl group-hover:scale-110 transition-transform shadow-sm flex items-center justify-center shrink-0">
              💡
            </div>
            <div className="text-left">
              <span className="text-[13px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block leading-tight">
                DICAS DE SEGURANÇA
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase mt-1 block tracking-wider">
                REPORTAR AVARIAS OU AVISOS
              </span>
            </div>
          </div>
          <div className="text-orange-500 text-xl font-black px-2 group-hover:scale-125 transition-transform">
            +
          </div>
        </button>
      </div>

      {/* MODAL VIDRO FOSCO TRANSLÚCIDO */}
      {modalCat && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between p-4 max-w-md mx-auto animate-fade-in">
          
          <div className="space-y-4">
            {/* CABEÇALHO FLUTUANTE DO MODAL */}
            <div className="flex justify-between items-center gap-2 p-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl shadow-lg border-2 border-white/40">
              <div className="min-w-0">
                <p className="text-[8px] font-black text-blue-100 uppercase tracking-[0.28em] leading-none mb-1">
                  ENVIAR FOTOS
                </p>
                <h3 className="text-sm font-black uppercase text-white leading-none tracking-tighter italic drop-shadow-sm truncate">
                  {modalCat.toUpperCase()}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setModalCat(null)}
                aria-label="Fechar"
                className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-xl font-black text-base border border-white/40 flex items-center justify-center transition-all shadow-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* SUBTÍTULO */}
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider text-center">
              {modalCat === 'Paisagem' ? 'Registe o clima e o visual da praia' : 'Reporte avarias, avisos e dicas de segurança'}
            </p>

            {/* 2 BOTÕES DE VIDRO COM BORDA TRACEJADA CIANO */}
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer glass-card p-5 border-2 border-dashed border-cyan-400 text-center hover:bg-cyan-50/10 active:scale-[0.99] transition-all flex flex-col items-center justify-center rounded-3xl bg-white/5">
                <span className="text-3xl block mb-1 drop-shadow-sm">📸</span>
                <span className="text-xs font-black text-white uppercase tracking-wider leading-tight">Tirar Foto</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase block mt-1">Câmera Direta</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={handleFiles} 
                />
              </label>

              <label className="cursor-pointer glass-card p-5 border-2 border-dashed border-cyan-400 text-center hover:bg-cyan-50/10 active:scale-[0.99] transition-all flex flex-col items-center justify-center rounded-3xl bg-white/5">
                <span className="text-3xl block mb-1 drop-shadow-sm">🖼️</span>
                <span className="text-xs font-black text-white uppercase tracking-wider leading-tight">Galeria</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase block mt-1">Escolher no Celular</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handleFiles} 
                />
              </label>
            </div>

            {/* CONTADOR DE FOTOS */}
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-wider text-center">
              {fotos.length} foto(s) selecionada(s)
            </p>

            {/* ÁREA TRACEJADA OU MINIATURAS */}
            {fotos.length === 0 ? (
              <div className="border-2 border-dashed border-slate-700/80 bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-slate-500">
                <span className="text-3xl mb-1 opacity-50">📷</span>
                <p className="text-[9px] font-black uppercase tracking-wider">Nenhuma foto selecionada</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto no-scrollbar p-1">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-md">
                    <img src={f} alt={`Foto ${i}`} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setFotos(fotos.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-md cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTÕES DE AÇÃO INFERIORES */}
          <div className="space-y-2 pt-4">
            <button 
              type="button"
              onClick={handleGuardar}
              disabled={uploading || fotos.length === 0}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(14,165,233,0.4)] active:scale-95 transition-all disabled:opacity-40 border border-white/30 cursor-pointer"
            >
              {uploading ? 'GUARDANDO NO SISTEMA...' : 'Guardar no sistema'}
            </button>
            <button 
              type="button"
              onClick={() => setModalCat(null)}
              className="w-full py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>

        </div>
      )}

    </div>
  )
}
