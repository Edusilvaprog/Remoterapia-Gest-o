'use client'

import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useTransition } from 'react'
import { criarMensalista, bloquearMensalista, resetarPinMensalista } from '@/lib/actions/mensalistas'
import { Mensalista } from '@/lib/types'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



export default function ClientesClient({ mensalistasIniciais }: { mensalistasIniciais: Mensalista[] }) {
  const [mensalistas, setMensalistas] = useState<Mensalista[]>(mensalistasIniciais)
  const [filtro, setFiltro] = useState<'todos' | 'em_dia' | 'vencidos' | 'bloqueados'>('todos')
  const [busca, setBusca] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3800)
  }

  // Form states
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipoPlano, setTipoPlano] = useState<'mensalista' | 'guardaria'>('mensalista')
  const [tipoPlanoDrop, setTipoPlanoDrop] = useState(false)

  const filteredList = mensalistas.filter(m => {
    // Busca
    if (busca && !m.nome.toLowerCase().includes(busca.toLowerCase()) && !(m.telefone || '').includes(busca)) return false
    // Filtro
    if (filtro === 'bloqueados') return m.bloqueado
    if (filtro === 'vencidos') return !m.bloqueado && (new Date(m.data_vencimento || 0) < new Date())
    if (filtro === 'em_dia') return !m.bloqueado && (new Date(m.data_vencimento || 0) >= new Date())
    return true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      // Data padrão: +30 dias
      const d = new Date()
      d.setDate(d.getDate() + 30)
      const res = await criarMensalista({
        nome,
        telefone,
        tipo_plano: tipoPlano,
        data_vencimento: d.toISOString().split('T')[0]
      })
      if (res.ok && res.data) {
        setMensalistas([...mensalistas, res.data])
        setShowForm(false)
        setNome('')
        setTelefone('')
        showToast('Cliente cadastrado com sucesso!', 'success')
      } else {
        showToast(res.error || 'Erro ao cadastrar cliente.', 'error')
      }
    })
  }

  const toggleBlock = (id: string, current: boolean) => {
    if (!confirm(current ? 'Desbloquear cliente?' : 'Bloquear cliente?')) return
    startTransition(async () => {
      const res = await bloquearMensalista(id, !current)
      if (res.ok) {
        setMensalistas(mensalistas.map(m => m.id === id ? { ...m, bloqueado: !current } : m))
        showToast(current ? 'Cliente desbloqueado!' : 'Cliente bloqueado!', 'warning')
      } else {
        showToast(res.error || 'Erro ao alterar bloqueio.', 'error')
      }
    })
  }

  const handleResetPin = (m: Mensalista) => {
    if (!confirm(`Deseja resetar o PIN de ${m.nome}? O PIN atual deixará de funcionar imediatamente.`)) return
    
    startTransition(async () => {
      const res = await resetarPinMensalista(m.id)
      if (res.ok && res.data) {
        showToast(`Novo PIN gerado: ${res.data}. Redirecionando para WhatsApp...`, 'success')
        if (m.telefone) {
          const num = m.telefone.replace(/\D/g, '')
          const msg = encodeURIComponent(`Olá ${m.nome}, seu novo PIN de acesso ao app da Remoterapia é: ${res.data}`)
          window.open(`https://wa.me/55${num}?text=${msg}`, '_blank')
        }
      } else {
        showToast(res.error || 'Erro ao resetar PIN.', 'error')
      }
    })
  }

  return (
    <div className="relative space-y-4">
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

      {/* BARRA DE BUSCA + BOTÃO ADICIONAR */}
      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="🔍 Buscar nome ou telefone..." 
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/60 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-4 font-black text-xl active:scale-95 transition-transform shadow-sm cursor-pointer"
        >
          {showForm ? '×' : '+'}
        </button>
      </div>

      {showForm && (
        <div className="glass-card backdrop-blur-md bg-white/95 dark:bg-slate-800/95 border border-white/60 dark:border-slate-700 rounded-3xl p-5 shadow-lg animate-fade-down">
          <h3 className="text-sm font-black uppercase italic tracking-tighter text-slate-800 dark:text-white mb-4"><VisualText id="copy-ec9bf8fd7f1d" defaultText={"Novo Cadastro"}/></h3>
          <form onSubmit={handleSubmit} className="rt-reception-clients space-y-3">
            <input required type="text" placeholder="Nome Completo" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            <input required type="text" placeholder="WhatsApp (ex: 13999999999)" value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            <div className="relative">
              <div 
                onClick={() => setTipoPlanoDrop(!tipoPlanoDrop)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm flex justify-between items-center cursor-pointer font-bold"
              >
                <span><VisualLabel text={tipoPlano === 'mensalista' ? 'Mensalista (Clube)' : 'Guardaria (Dono de Caiaque)'}/></span>
                <span className="text-[9px] text-slate-400">▼</span>
              </div>
              
              {tipoPlanoDrop && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1">
                  {[
                    { v: 'mensalista', l: 'Mensalista (Clube)' },
                    { v: 'guardaria', l: 'Guardaria (Dono de Caiaque)' }
                  ].map(opt => {
                    const isSel = tipoPlano === opt.v
                    return (
                      <div 
                        key={opt.v}
                        onClick={() => { setTipoPlano(opt.v as any); setTipoPlanoDrop(false); }}
                        className={`p-3 rounded-xl flex justify-between items-center cursor-pointer text-sm font-bold ${
                          isSel ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{opt.l}</span>
                        <span>{isSel ? '✓' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <button disabled={isPending} className="w-full mt-2 py-3 bg-[#10b981] text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
              <VisualLabel text={isPending ? 'SALVANDO...' : 'CRIAR MENSALISTA'}/>
            </button>
          </form>
        </div>
      )}

      {/* FILTROS */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setFiltro('todos')} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${filtro === 'todos' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-transparent border-slate-300 text-slate-500'}`}><VisualText id="copy-08d7fd9fc981" defaultText={"TODOS"}/></button>
        <button onClick={() => setFiltro('em_dia')} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${filtro === 'em_dia' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-transparent border-slate-300 text-slate-500'}`}><VisualText id="copy-75d9fa18e78f" defaultText={"EM DIA"}/></button>
        <button onClick={() => setFiltro('vencidos')} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${filtro === 'vencidos' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-transparent border-slate-300 text-slate-500'}`}><VisualText id="copy-bb0e23d705ff" defaultText={"VENCIDOS"}/></button>
        <button onClick={() => setFiltro('bloqueados')} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${filtro === 'bloqueados' ? 'bg-red-500 border-red-500 text-white' : 'bg-transparent border-slate-300 text-slate-500'}`}><VisualText id="copy-abeaa61c1cf8" defaultText={"BLOQUEADOS"}/></button>
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {filteredList.map(m => {
          const isVencido = new Date(m.data_vencimento || 0) < new Date()
          return (
            <div key={m.id} className={`glass-card backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border border-white/60 dark:border-slate-700 rounded-3xl p-4 transition-all ${m.bloqueado ? 'opacity-60 grayscale' : ''} ${isVencido && !m.bloqueado ? 'border-l-4 border-l-amber-500' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter truncate">{m.nome}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{m.telefone}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${m.tipo_plano === 'guardaria' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {m.tipo_plano}
                </span>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest"><VisualText id="copy-e65c2ff1c527" defaultText={"Créditos"}/></p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">{m.creditos} <span className="text-[9px]"><VisualText id="copy-3fffaaeb2f41" defaultText={"restantes"}/></span></p>
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest"><VisualText id="copy-e0258586d419" defaultText={"Vencimento"}/></p>
                  <p className={`text-xs font-black uppercase ${isVencido ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    <VisualLabel text={m.data_vencimento ? new Date(m.data_vencimento).toLocaleDateString('pt-BR') : 'N/A'}/>
                  </p>
                </div>
                <button 
                  disabled={isPending}
                  onClick={() => toggleBlock(m.id, m.bloqueado)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 cursor-pointer ${m.bloqueado ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                >
                  <BrandLabel text={m.bloqueado ? '🔓' : '🔒'}/>
                </button>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <button 
                  disabled={isPending}
                  onClick={() => handleResetPin(m)}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <BrandIcon name="key"/><VisualText id="copy-9bd36ad45adf" defaultText={" Resetar PIN de Acesso"}/></button>
              </div>
            </div>
          )
        })}
        {filteredList.length === 0 && (
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mt-4"><VisualText id="copy-878495c3e27d" defaultText={"Nenhum cliente encontrado."}/></p>
        )}
      </div>
    </div>
  )
}
