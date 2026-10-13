'use client'
import {Plus,RefreshCw,Trash2} from 'lucide-react'
import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



interface FilaItem {
  id: string
  nome: string
  telefone: string | null
  created_at: string
}

const idValido = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
const linhaValida = (value: unknown): value is FilaItem => {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<FilaItem>
  return typeof row.id === 'string' && idValido(row.id) && typeof row.nome === 'string' &&
    (row.telefone === null || typeof row.telefone === 'string') && typeof row.created_at === 'string'
}

export default function RecepcaoFilaClient() {
  const [fila, setFila] = useState<FilaItem[]>([])
  const [modalFila, setModalFila] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoWhats, setNovoWhats] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [consultaConcluida, setConsultaConcluida] = useState(false)
  const [temFilaAntiga, setTemFilaAntiga] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'warning' } | null>(null)
  const travaMutacao = useRef(false)
  const consultaAtual = useRef(0)
  const showToast = useCallback((msg: string, tipo: 'success' | 'error' | 'warning') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const carregarFila = useCallback(async (): Promise<boolean> => {
    const consulta = ++consultaAtual.current
    setCarregando(true)
    try {
      const supabase = createClient()
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('Entre novamente para consultar a fila.')
      const { data, error } = await supabase.from('fila_espera')
        .select('id, nome, telefone, created_at').order('created_at', { ascending: true }).order('id', { ascending: true })
      if (error || !Array.isArray(data) || !data.every(linhaValida)) throw new Error('Não foi possível consultar a fila do banco.')
      if (consulta !== consultaAtual.current) return false
      setFila(data)
      setConsultaConcluida(true)
      return true
    } catch (e: unknown) {
      if (consulta === consultaAtual.current) {
        setConsultaConcluida(false)
        showToast(e instanceof Error ? e.message : 'Não foi possível consultar a fila.', 'error')
      }
      return false
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false)
    }
  }, [showToast])

  useEffect(() => {
    let ativo = true
    void Promise.resolve().then(() => {
      if (!ativo) return
      try {
        const saved = localStorage.getItem('recepcao_fila_espera')
        const legacy: unknown = saved ? JSON.parse(saved) : []
        setTemFilaAntiga(Array.isArray(legacy) && legacy.length > 0)
      } catch {}
      return carregarFila()
    })
    return () => { ativo = false; consultaAtual.current += 1 }
  }, [carregarFila])

  const abrirModalFila = (item?: FilaItem) => {
    if (salvando || carregando) return
    setEditandoId(item?.id || null)
    setNovoNome(item?.nome || '')
    setNovoWhats(item?.telefone || '')
    setModalFila(true)
  }

  const handleAdicionarFila = async (event: React.FormEvent) => {
    event.preventDefault()
    if (travaMutacao.current || carregando) return
    const nome = novoNome.trim()
    const telefone = novoWhats.replace(/\D/g, '')
    if (nome.length < 2 || nome.length > 120) return showToast('Informe um nome entre 2 e 120 caracteres.', 'warning')
    if (telefone && !/^\d{10,13}$/.test(telefone)) return showToast('Informe o telefone com DDD ou deixe em branco.', 'warning')
    if (editandoId && !idValido(editandoId)) return showToast('A entrada selecionada não é válida.', 'error')
    travaMutacao.current = true
    setSalvando(true)
    try {
      const supabase = createClient()
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('Sua sessão expirou. Entre novamente.')
      const tabela = supabase.from('fila_espera')
      const mutation = editandoId ? tabela.update({ nome, telefone: telefone || null }).eq('id', editandoId) : tabela.insert({ nome, telefone: telefone || null })
      const { data, error } = await mutation.select('id, nome, telefone, created_at').maybeSingle()
      if (error || !linhaValida(data) || (editandoId && data.id !== editandoId)) throw new Error('A entrada não foi salva. Confira seu acesso e tente novamente.')
      setFila(prev => editandoId ? prev.map(item => item.id === data.id ? data : item) : [...prev, data])
      setModalFila(false)
      setNovoNome('')
      setNovoWhats('')
      setEditandoId(null)
      const atualizada = await carregarFila()
      showToast(atualizada ? 'Fila salva no sistema.' : 'Entrada salva. Use Atualizar fila para consultar os dados atuais.', atualizada ? 'success' : 'warning')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'A entrada não foi salva.', 'error')
    } finally { travaMutacao.current = false; setSalvando(false) }
  }

  const removerFila = async (id: string) => {
    if (travaMutacao.current || carregando) return
    if (!idValido(id)) return showToast('A entrada selecionada não é válida.', 'error')
    travaMutacao.current = true
    setSalvando(true)
    try {
      const supabase = createClient()
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('Sua sessão expirou. Entre novamente.')
      const { data, error } = await supabase.from('fila_espera').delete().eq('id', id).select('id').maybeSingle()
      if (error || !data || data.id !== id) throw new Error('A remoção não foi confirmada. A fila foi preservada.')
      setFila(prev => prev.filter(item => item.id !== id))
      const atualizada = await carregarFila()
      showToast(atualizada ? 'Entrada removida da fila.' : 'Entrada removida. Use Atualizar fila para consultar os dados atuais.', atualizada ? 'success' : 'warning')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Não foi possível remover a entrada.', 'error')
    } finally { travaMutacao.current = false; setSalvando(false) }
  }

  return (
    <>
      {toast && <div role="status" className={`fixed top-4 left-1/2 -translate-x-1/2 z-[10010] w-[calc(100%-2rem)] max-w-sm p-4 rounded-2xl border shadow-xl text-xs font-bold ${toast.tipo === 'error' ? 'bg-red-50 text-red-700 border-red-200' : toast.tipo === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{toast.msg}</div>}
      {/* 1. FILA DE ESPERA */}
      <div className="rt-mobile-queue bg-white/95 dark:bg-slate-900/95 p-5 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-3.5">
        
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block"><VisualText id="copy-6e92de8c65f5" defaultText={"Operação na areia"}/></span>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider"><VisualText id="copy-ea3d7453642b" defaultText={"Fila de espera ("}/>{fila.length})
            </h3>
          </div>

          <button 
            type="button" 
            disabled={carregando || salvando}
            onClick={() => abrirModalFila()}
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          ><Plus size={17} aria-hidden="true"/><VisualText id="copy-22649232e5b6" defaultText={"Adicionar à fila"}/></button>
        </div>

        <div className="flex justify-end">
          <button type="button" disabled={carregando || salvando} onClick={() => void carregarFila()} className="text-[9px] font-black uppercase text-blue-600 dark:text-cyan-400 disabled:opacity-50"><RefreshCw size={15} aria-hidden="true"/><VisualLabel text={carregando ? 'Atualizando...' : 'Atualizar fila'}/></button>
        </div>
        {consultaConcluida && fila.length === 0 && temFilaAntiga && (
          <div role="status" className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs">
            Há uma fila antiga salva neste navegador. Ela foi preservada. Recadastre as pessoas que ainda estão aguardando; uma importação assistida poderá ser adicionada depois.
          </div>
        )}
        {fila.length === 0 ? (
          <div className="bg-[#f4f9fc] dark:bg-slate-800/80 p-4 rounded-2xl border border-blue-100 dark:border-slate-700 text-center">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <VisualLabel text={carregando ? 'Carregando fila...' : consultaConcluida ? 'Nenhum cliente aguardando na fila.' : 'Fila não consultada. Use Atualizar fila.'}/>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {fila.map((item, idx) => (
              <div 
                key={item.id} 
                className="p-3 bg-[#f8fafc] dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">
                    {idx + 1}º
                  </span>
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">
                    {item.nome}<BrandLabel text={item.telefone ? ' · 📱 '+item.telefone : ''}/>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" disabled={salvando || carregando} onClick={() => abrirModalFila(item)} aria-label={'Editar '+item.nome} className="text-[10px] font-black text-blue-600 p-1 cursor-pointer disabled:opacity-50"><BrandIcon name="edit"/></button>
                  <button type="button" disabled={salvando || carregando} onClick={() => void removerFila(item.id)} aria-label={'Remover '+item.nome+' da fila'} className="text-[10px] font-black text-red-500 hover:text-red-700 p-1 cursor-pointer disabled:opacity-50"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* MODAL ADICIONAR FILA */}
      {modalFila && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4">
          <form onSubmit={handleAdicionarFila} role="dialog" aria-modal="true" className="bg-white dark:bg-slate-900 p-6 w-full max-w-sm rounded-[2.2rem] shadow-2xl border-t-4 !border-t-blue-600 border border-white/40 space-y-4">
            <div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest"><VisualText id="copy-8df6444f0580" defaultText={"Operação na areia"}/></p>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase"><VisualLabel text={editandoId ? 'EDITAR ENTRADA' : 'ADICIONAR À FILA'}/></h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block"><VisualText id="copy-b9880c9144c6" defaultText={"Nome do Cliente"}/></label>
                <input 
                  type="text" 
                  value={novoNome} 
                  onChange={e => setNovoNome(e.target.value)} 
                  placeholder="Ex: Família Silva" 
                  maxLength={120}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block"><VisualText id="copy-dcdbd1e65463" defaultText={"WhatsApp (Opcional)"}/></label>
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
                disabled={salvando}
                onClick={() => setModalFila(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              ><VisualText id="copy-9f8e2abbbdb9" defaultText={"Cancelar"}/></button>
              <button 
                type="submit"
                disabled={salvando} 
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              >
                <VisualLabel text={salvando ? 'Salvando...' : editandoId ? 'Salvar alteração' : 'Adicionar'}/>
              </button>
            </div>
          </form>
        </div>
      )}

    </>
  )
}
