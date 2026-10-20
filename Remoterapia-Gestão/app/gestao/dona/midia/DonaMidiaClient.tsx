'use client'
import {WorkspaceHeading} from '@/components/desktop/DesktopWorkspace'
import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



interface FotoItem {
  id: string | number
  url: string
  categoria: string
  autor: string
  criado_em: string
}

export default function DonaMidiaClient() {
  const [fotos, setFotos] = useState<FotoItem[]>([])
  const [tipoFiltro, setTipoFiltro] = useState<'all' | 'Paisagem' | 'Segurança'>('all')
  const [dataFiltro, setDataFiltro] = useState<'all' | 'hoje' | 'ontem'>('all')
  const [autorFiltro, setAutorFiltro] = useState('all')
  const [autorFiltroDrop, setAutorFiltroDrop] = useState(false)
  const [fotoModal, setFotoModal] = useState<FotoItem | null>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  const carregarFotos = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase.from('fotos').select('*').order('created_at', { ascending: false })
      
      if (data && data.length > 0) {
        setFotos(data.map((f: any) => ({
          id: f.id,
          url: f.img_url || f.url,
          categoria: f.tipo || f.categoria || 'Paisagem',
          autor: f.autor || 'Instrutor',
          criado_em: f.created_at || f.data || new Date().toISOString()
        })))
      } else {
        setFotos([])
      }
    } catch {
      setFotos([])
    }
  }

  useEffect(() => {
    carregarFotos()
  }, [])

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const hojeStr = new Date().toLocaleDateString('pt-BR')
  const ontemStr = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR')

  const formatarData = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  const formatarHora = (iso: string) => {
    if (!iso) return '10:15'
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // FILTRAGEM
  const fotosFiltradas = fotos.filter(f => {
    const fData = formatarData(f.criado_em)
    const matchesTipo = tipoFiltro === 'all' || f.categoria?.toLowerCase() === tipoFiltro.toLowerCase()
    
    let matchesData = true
    if (dataFiltro === 'hoje') matchesData = fData === hojeStr
    else if (dataFiltro === 'ontem') matchesData = fData === ontemStr

    let matchesAutor = true
    if (autorFiltro !== 'all') matchesAutor = f.autor === autorFiltro

    return matchesTipo && matchesData && matchesAutor
  })

  const totalPaisagem = fotos.filter(f => f.categoria?.toLowerCase() === 'paisagem').length
  const totalSeguranca = fotos.filter(f => f.categoria?.toLowerCase() === 'segurança').length
  const autores = Array.from(new Set(fotos.map(f => f.autor).filter(Boolean))).sort()

  const excluirFoto = async (id: string | number) => {
    if (!confirm('Deseja realmente remover esta foto da galeria?')) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase.from('fotos').delete().eq('id', id)
      if (error) throw error

      setFotos(prev => prev.filter(f => f.id !== id))
      showToast('Foto removida da galeria.')
    } catch (e: any) {
      showToast('Erro ao excluir foto: ' + e.message, 'info')
    }
  }

  const baixarFoto = async (url: string, id: string | number) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `foto-${id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
      showToast('Download concluído!')
    } catch {
      // Falha no fetch (CORS ou Base64 longo) -> tenta via link direto
      try {
        const link = document.createElement('a')
        link.href = url
        link.download = `foto-${id}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToast('Download iniciado!')
      } catch (e) {
        showToast('Erro ao baixar foto.')
      }
    }
  }

  return (
    <div className="rt-legacy-refresh rt-director-media space-y-4 dw-director-media"><div className="dw-only"><WorkspaceHeading eyebrow="Acervo da base" title="Galeria e registros" description="Consulte as fotos publicadas pela equipe e organize o acervo por categoria e período."/></div>
      
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
              <p className="rt-legacy-type rt-legacy-caption text-[11px] font-black leading-snug text-slate-900 dark:text-white">
                {toast.msg}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. TÍTULO EM PÍLULA TRANSLÚCIDA */}
      <div className="flex justify-center">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-full py-2 px-5 inline-flex items-center gap-2 border border-white/60 dark:border-slate-800 shadow-sm">
          <span className="text-base"><BrandIcon name="camera"/></span>
          <p className="rt-legacy-type rt-legacy-caption text-[10px] font-black text-blue-950 dark:text-white uppercase tracking-wider italic leading-none"><VisualText id="copy-ba801959ac9d" defaultText={"MARKETING (EQUIPE ÁGUA)"}/></p>
        </div>
      </div>

      {/* 2. FILTROS PRINCIPAIS */}
      <div className="flex flex-wrap gap-2 justify-center dw-director-filters">
        {[
          { id: 'all', label: 'TODAS' },
          { id: 'Paisagem', label: 'PAISAGENS' },
          { id: 'Segurança', label: 'SEGURANÇA' }
        ].map(cat => {
          const active = tipoFiltro === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTipoFiltro(cat.id as any)}
              className={`rt-legacy-type rt-legacy-control px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-blue-500/25 scale-105'
                  : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* 3. FILTROS SECUNDÁRIOS DE DATA E INSTRUTOR */}
      <div className="flex flex-wrap gap-2 justify-center items-center dw-director-filters">
        <button
          type="button"
          onClick={() => setDataFiltro('all')}
          className={`rt-legacy-type rt-legacy-control px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
            dataFiltro === 'all'
              ? 'bg-cyan-500 text-white shadow-cyan-500/20'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 border border-white/60 dark:border-slate-800'
          }`}
        ><VisualText id="copy-c131fa20ebeb" defaultText={"TODAS DATAS"}/></button>

        <button
          type="button"
          onClick={() => setDataFiltro('hoje')}
          className={`rt-legacy-type rt-legacy-control px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
            dataFiltro === 'hoje'
              ? 'bg-cyan-500 text-white shadow-cyan-500/20'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 border border-white/60 dark:border-slate-800'
          }`}
        ><VisualText id="copy-33d38d6c7dd7" defaultText={"HOJE"}/></button>

        {autores.length > 0 && (
          <div className="relative inline-block">
            <div 
              onClick={() => setAutorFiltroDrop(!autorFiltroDrop)}
              className="py-1.5 px-3 rounded-full text-[9px] font-black uppercase bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-slate-800 outline-none shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <span><VisualLabel text={autorFiltro === 'all' ? 'TODOS INSTRUTORES' : autorFiltro}/></span>
              <span className="rt-legacy-caption text-[7px]">▼</span>
            </div>

            {autorFiltroDrop && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1 min-w-[150px]">
                <div 
                  onClick={() => { setAutorFiltro('all'); setAutorFiltroDrop(false); }}
                  className={`p-2 rounded-xl flex justify-between items-center cursor-pointer text-[10px] uppercase font-black tracking-wider ${
                    autorFiltro === 'all' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span><VisualText id="copy-c631b27697c3" defaultText={"TODOS INSTRUTORES"}/></span>
                  <span>{autorFiltro === 'all' ? '✓' : ''}</span>
                </div>
                {autores.map(a => {
                  const isSel = autorFiltro === a
                  return (
                    <div 
                      key={a}
                      onClick={() => { setAutorFiltro(a); setAutorFiltroDrop(false); }}
                      className={`p-2 rounded-xl flex justify-between items-center cursor-pointer text-[10px] uppercase font-black tracking-wider ${
                        isSel ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{a}</span>
                      <span>{isSel ? '✓' : ''}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. CARDS DE CONTAGEM ELEVADOS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rt-legacy-card bg-white/95 dark:bg-slate-900/95 p-4 rounded-[1.8rem] border-t-4 !border-t-cyan-500 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/5 flex items-center justify-between">
          <div>
            <p className="rt-legacy-type rt-legacy-caption text-[9px] font-black text-slate-400 uppercase tracking-wider"><VisualText id="copy-7e4325371ce7" defaultText={"PAISAGENS"}/></p>
            <p className="rt-legacy-type text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-0.5">{totalPaisagem}</p>
          </div>
          <span className="text-3xl select-none"><BrandIcon name="umbrella"/></span>
        </div>

        <div className="rt-legacy-card bg-white/95 dark:bg-slate-900/95 p-4 rounded-[1.8rem] border-t-4 !border-t-orange-500 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/5 flex items-center justify-between">
          <div>
            <p className="rt-legacy-type rt-legacy-caption text-[9px] font-black text-slate-400 uppercase tracking-wider"><VisualText id="copy-5147e41a2145" defaultText={"SEGURANÇA"}/></p>
            <p className="rt-legacy-type text-3xl font-black text-orange-500 dark:text-orange-400 mt-0.5">{totalSeguranca}</p>
          </div>
          <span className="text-3xl select-none"><BrandIcon name="warning"/></span>
        </div>
      </div>

      {/* 5. GRADE DE FOTOS COM VISUAL NÁUTICO MODERNO */}
      <div className="grid grid-cols-2 gap-3 pb-8 dw-director-gallery">
        {fotosFiltradas.map(f => {
          const isSeguranca = f.categoria?.toLowerCase() === 'segurança'
          return (
            <div 
              key={f.id} 
              className="rt-legacy-card bg-white/95 dark:bg-slate-900/95 rounded-[1.8rem] p-2.5 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/5 flex flex-col justify-between group hover:scale-[1.02] transition-all"
            >
              {/* IMAGEM COM ETIQUETA FLUTUANTE */}
              <div 
                className="w-full h-40 rounded-2xl overflow-hidden relative cursor-pointer group-hover:opacity-95"
                onClick={() => setFotoModal(f)}
              >
                <img 
                  src={f.url} 
                  alt={f.categoria} 
                  className="w-full h-full object-cover"
                />
                <span className={`rt-legacy-type rt-legacy-caption absolute bottom-2 left-2 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm border ${
                  isSeguranca 
                    ? 'bg-orange-500/90 text-white border-white/40' 
                    : 'bg-cyan-500/90 text-white border-white/40'
                }`}>
                  <BrandLabel text={isSeguranca ? '⚠️ SEGURANÇA' : '🏝️ PAISAGEM'}/>
                </span>
              </div>

              {/* RODAPÉ DO CARD: AUTOR, HORÁRIO E EXCLUIR */}
              <div className="pt-2 px-1 flex justify-between items-center text-[9px] font-black text-slate-600 dark:text-slate-300">
                <div className="min-w-0 flex-1">
                  <p className="rt-legacy-type truncate uppercase font-black">{f.autor.split(' ')[0]}</p>
                  <p className="rt-legacy-caption text-[8px] text-slate-400 font-bold">{formatarHora(f.criado_em)}</p>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => baixarFoto(f.url, f.id)}
                    className="rt-legacy-control p-1.5 text-slate-300 hover:text-blue-500 rounded-lg transition-colors cursor-pointer"
                    title="Baixar foto"
                  >
                    ⬇️
                  </button>
                  <button
                    type="button"
                    onClick={() => excluirFoto(f.id)}
                    className="rt-legacy-control p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                    title="Excluir foto"
                  >
                    <BrandIcon name="trash"/>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL DE VISUALIZAÇÃO EM TELA CHEIA */}
      {fotoModal && (
        <div data-rt-modal 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          onClick={() => setFotoModal(null)}
        >
          <div 
            className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl p-4 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full h-80 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img src={fotoModal.url} alt="Foto Ampliada" className="w-full h-full object-contain" />
            </div>

            <div className="flex justify-between items-center px-1">
              <div>
                <p className="rt-legacy-type text-xs font-black text-slate-900 dark:text-white uppercase">
                  {fotoModal.categoria}
                </p>
                <p className="rt-legacy-caption text-[9px] font-bold text-slate-400 uppercase"><VisualText id="copy-edd12cf98b48" defaultText={"Por "}/>{fotoModal.autor} · {formatarHora(fotoModal.criado_em)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFotoModal(null)}
                className="rt-legacy-type rt-legacy-control px-4 py-2 bg-slate-900 text-white dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              ><VisualText id="copy-947eb6f92733" defaultText={"FECHAR"}/></button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}



