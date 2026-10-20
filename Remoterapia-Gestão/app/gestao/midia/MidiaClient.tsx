'use client'

import {WorkspaceHeading} from '@/components/desktop/DesktopWorkspace'
import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useRef } from 'react'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



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
    <div className="rt-legacy-refresh rt-media-workspace space-y-5 relative dw-media"><div className="dw-only"><WorkspaceHeading eyebrow="Remoterapia · Gestão" title="Registros da base" description="Organize os registros de paisagens e segurança em um espaço de envio próprio para computador."/></div>
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
            <span><BrandLabel text={toast.tipo === 'success' ? '✓' : toast.tipo === 'error' ? '✕' : 'ℹ'}/></span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
      
      {/* PÍLULA BRANCA TRANSLÚCIDA */}
      <div className="dw-mobile"><div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm rounded-full py-2 px-4 inline-flex items-center gap-2 border border-white/80 dark:border-slate-700 shadow-sm">
          <span className="text-lg"><BrandIcon name="camera"/></span> 
          <p className="rt-legacy-type rt-legacy-caption text-[10px] font-black text-blue-900 dark:text-white uppercase tracking-wider italic leading-none"><VisualText id="copy-8383144544d3" defaultText={"Registro de fotos"}/></p>
      </div></div>

      <div className="dw-mobile"><p className="rt-legacy-caption text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center"><VisualText id="copy-f3c14d10d483" defaultText={"Escolha a categoria e envie até 6 fotos de cada vez"}/></p></div>

      {/* 2 CARDS GRANDES DA TELA PRINCIPAL */}
      <div className="grid grid-cols-1 gap-4 dw-media-collections">
        
        {/* CARD 1: PAISAGENS */}
        <button 
          type="button" 
          onClick={() => { setModalCat('Paisagem'); setFotos([]); }} 
          className="rt-legacy-control bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-sm flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all group w-full text-left cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-cyan-100 dark:bg-cyan-900/50 w-16 h-16 rounded-3xl text-3xl group-hover:scale-110 transition-transform shadow-sm flex items-center justify-center shrink-0">
              <BrandIcon name="umbrella"/>
            </div>
            <div className="text-left">
              <span className="rt-legacy-type text-[13px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block leading-tight"><VisualText id="copy-ac3083df9d07" defaultText={"PAISAGENS"}/></span>
              <span className="rt-legacy-caption text-[9px] text-slate-500 font-bold uppercase mt-1 block tracking-wider"><VisualText id="copy-fb3aec017460" defaultText={"REGISTRAR CLIMA / VISUAL"}/></span>
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
          className="rt-legacy-control bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-sm flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all group w-full text-left cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 dark:bg-orange-900/50 w-16 h-16 rounded-3xl text-3xl group-hover:scale-110 transition-transform shadow-sm flex items-center justify-center shrink-0">
              <BrandIcon name="idea"/>
            </div>
            <div className="text-left">
              <span className="rt-legacy-type text-[13px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block leading-tight"><VisualText id="copy-7557e11e775c" defaultText={"DICAS DE SEGURANÇA"}/></span>
              <span className="rt-legacy-caption text-[9px] text-slate-500 font-bold uppercase mt-1 block tracking-wider"><VisualText id="copy-4a7400e14880" defaultText={"REPORTAR AVARIAS OU AVISOS"}/></span>
            </div>
          </div>
          <div className="text-orange-500 text-xl font-black px-2 group-hover:scale-125 transition-transform">
            +
          </div>
        </button>
      </div>

      {/* MODAL VIDRO FOSCO TRANSLÚCIDO */}
      {modalCat && (
        <div data-rt-modal className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between p-4 max-w-md mx-auto animate-fade-in dw-media-modal"><div className="dw-media-dialog">
          
          <div className="space-y-4">
            {/* CABEÇALHO FLUTUANTE DO MODAL */}
            <div className="flex justify-between items-center gap-2 p-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl shadow-lg border-2 border-white/40">
              <div className="min-w-0">
                <p className="rt-legacy-type rt-legacy-caption text-[8px] font-black text-blue-100 uppercase tracking-[0.28em] leading-none mb-1"><VisualText id="copy-ddb170a1c55a" defaultText={"ENVIAR FOTOS"}/></p>
                <h3 className="rt-legacy-type text-sm font-black uppercase text-white leading-none tracking-tighter italic drop-shadow-sm truncate">
                  {modalCat.toUpperCase()}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setModalCat(null)}
                aria-label="Fechar"
                className="rt-legacy-type rt-legacy-control w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-xl font-black text-base border border-white/40 flex items-center justify-center transition-all shadow-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* SUBTÍTULO */}
            <p className="rt-legacy-caption text-[10px] font-bold text-slate-300 uppercase tracking-wider text-center">
              <VisualLabel text={modalCat === 'Paisagem' ? 'Registe o clima e o visual da praia' : 'Reporte avarias, avisos e dicas de segurança'}/>
            </p>

            {/* 2 BOTÕES DE VIDRO COM BORDA TRACEJADA CIANO */}
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer glass-card p-5 border-2 border-dashed border-cyan-400 text-center hover:bg-cyan-50/10 active:scale-[0.99] transition-all flex flex-col items-center justify-center rounded-3xl bg-white/5">
                <span className="text-3xl block mb-1 drop-shadow-sm"><BrandIcon name="camera"/></span>
                <span className="rt-legacy-type text-xs font-black text-white uppercase tracking-wider leading-tight"><VisualText id="copy-63fe5dc7ec0a" defaultText={"Tirar Foto"}/></span>
                <span className="rt-legacy-caption text-[8px] font-bold text-slate-400 uppercase block mt-1"><VisualText id="copy-438f1443eba8" defaultText={"Câmera Direta"}/></span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="rt-legacy-fields hidden"
                  onChange={handleFiles} 
                />
              </label>

              <label className="cursor-pointer glass-card p-5 border-2 border-dashed border-cyan-400 text-center hover:bg-cyan-50/10 active:scale-[0.99] transition-all flex flex-col items-center justify-center rounded-3xl bg-white/5">
                <span className="text-3xl block mb-1 drop-shadow-sm"><BrandIcon name="image"/></span>
                <span className="rt-legacy-type text-xs font-black text-white uppercase tracking-wider leading-tight"><VisualText id="copy-0c8ddffa5585" defaultText={"Galeria"}/></span>
                <span className="rt-legacy-caption text-[8px] font-bold text-slate-400 uppercase block mt-1"><VisualText id="copy-59e5fbaa1136" defaultText={"Escolher imagens"}/></span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="rt-legacy-fields hidden"
                  onChange={handleFiles} 
                />
              </label>
            </div>

            {/* CONTADOR DE FOTOS */}
            <p className="rt-legacy-type rt-legacy-caption text-[10px] font-black text-cyan-400 uppercase tracking-wider text-center">
              {fotos.length}<VisualText id="copy-4e1bffa8ebb2" defaultText={" foto(s) selecionada(s)"}/></p>

            {/* ÁREA TRACEJADA OU MINIATURAS */}
            {fotos.length === 0 ? (
              <div className="rt-legacy-card border-2 border-dashed border-slate-700/80 bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-slate-500">
                <span className="text-3xl mb-1 opacity-50"><BrandIcon name="camera"/></span>
                <p className="rt-legacy-type rt-legacy-caption text-[9px] font-black uppercase tracking-wider"><VisualText id="copy-cfdcabb9a017" defaultText={"Nenhuma foto selecionada"}/></p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto no-scrollbar p-1">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-md">
                    <img src={f} alt={`Foto ${i}`} className="w-full h-full object-cover" />
                    <button aria-label="Fechar janela" 
                      type="button"
                      onClick={() => setFotos(fotos.filter((_, idx) => idx !== i))}
                      className="rt-legacy-type rt-legacy-control absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-md cursor-pointer"
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
              className="rt-legacy-type rt-legacy-control w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(14,165,233,0.4)] active:scale-95 transition-all disabled:opacity-40 border border-white/30 cursor-pointer"
            >
              <VisualLabel text={uploading ? 'GUARDANDO NO SISTEMA...' : 'Guardar no sistema'}/>
            </button>
            <button 
              type="button"
              onClick={() => setModalCat(null)}
              className="w-full py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
            ><VisualText id="copy-3822685be4ec" defaultText={"Cancelar"}/></button>
          </div>

        </div></div>
      )}

    </div>
  )
}
