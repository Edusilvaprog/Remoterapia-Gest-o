'use client'

import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {VisualText} from '@/components/ui/VisualContent'


interface Inscricao {
  id: string
  evento_id: string
  nome_completo: string
  telefone_whatsapp: string
  email?: string | null
  qtd_vagas: number
  embarcacoes_alocadas?: string | null
  valor_total: number
  codigo_voucher: string
  status_pagamento: string
  metodo_pagamento: string
  created_at: string
}

interface EventoItem {
  id: string
  titulo: string
  data_evento: string
  horario: string
  local: string
  ponto_saida?: string | null
  duracao?: string | null
  nivel?: string | null
  preco: number
  vagas_totais: number
  vagas_ocupadas: number
  foto_url?: string | null
  itens_inclusos?: string[] | null
  roteiro?: string | null
  o_que_levar?: string | null
  descricao?: string | null
  ativo?: boolean
  created_at?: string
  inscricoes_eventos?: { count: number }[]
}

interface Props {
  eventosIniciais: EventoItem[]
}

export default function EventosClient({ eventosIniciais }: Props) {
  const [eventos, setEventos] = useState<EventoItem[]>(eventosIniciais)
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'encerrados'>('todos')
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  // Modal Criar / Editar
  const [modalFormAberto, setModalFormAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  
  // Campos do formulário
  const [formTitulo, setFormTitulo] = useState('')
  const [formData, setFormData] = useState('')
  const [formHorario, setFormHorario] = useState('08:00 - 10:30')
  const [formLocal, setFormLocal] = useState('Ponta da Praia - Santos / SP')
  const [formPontoSaida, setFormPontoSaida] = useState('Base Remoterapia Náutica')
  const [formVagas, setFormVagas] = useState<number>(12)
  const [formPreco, setFormPreco] = useState<number>(85)
  const [formDuracao, setFormDuracao] = useState('2h30min')
  const [formNivel, setFormNivel] = useState('Iniciante')
  const [formDescricao, setFormDescricao] = useState('')
  const [formRoteiro, setFormRoteiro] = useState('')
  const [formOQueLevar, setFormOQueLevar] = useState('')
  const [formFotoUrl, setFormFotoUrl] = useState('')

  // Modal Inscritos
  const [modalInscritosAberto, setModalInscritosAberto] = useState(false)
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoItem | null>(null)
  const [inscritos, setInscritos] = useState<Inscricao[]>([])
  const [carregandoInscritos, setCarregandoInscritos] = useState(false)

  // Modal Cancelamento
  const [modalCancelarAberto, setModalCancelarAberto] = useState<EventoItem | null>(null)

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3800)
  }

  // ABRIR FORMULÁRIO DE NOVO EVENTO
  const abrirCriarEvento = () => {
    setEditandoId(null)
    setFormTitulo('')
    setFormData(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0])
    setFormHorario('08:00 - 10:30')
    setFormLocal('Ponta da Praia - Santos / SP')
    setFormPontoSaida('Base Remoterapia')
    setFormVagas(12)
    setFormPreco(85)
    setFormDuracao('2h30min')
    setFormNivel('Iniciante')
    setFormDescricao('Experiência exclusiva de remada em águas calmas com acompanhamento de instrutores náuticos.')
    setFormRoteiro('08:00 - Recepção e briefing de segurança\n08:30 - Embarque e início da remada\n10:00 - Parada contemplativa\n10:30 - Retorno à base')
    setFormOQueLevar('Roupas leves de secagem rápida, protetor solar, boné e garrafa d\'água.')
    setFormFotoUrl('https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1200&auto=format&fit=crop')
    setModalFormAberto(true)
  }

  // ABRIR FORMULÁRIO DE EDIÇÃO
  const abrirEditarEvento = (ev: EventoItem) => {
    setEditandoId(ev.id)
    setFormTitulo(ev.titulo)
    setFormData(ev.data_evento)
    setFormHorario(ev.horario)
    setFormLocal(ev.local)
    setFormPontoSaida(ev.ponto_saida || '')
    setFormVagas(ev.vagas_totais)
    setFormPreco(Number(ev.preco) || 0)
    setFormDuracao(ev.duracao || '2h')
    setFormNivel(ev.nivel || 'Iniciante')
    setFormDescricao(ev.descricao || '')
    setFormRoteiro(ev.roteiro || '')
    setFormOQueLevar(ev.o_que_levar || '')
    setFormFotoUrl(ev.foto_url || '')
    setModalFormAberto(true)
  }

  // SALVAR (INSERT / UPDATE)
  const salvarEvento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) return showToast('Informe o título do evento.', 'warning')
    if (!formData) return showToast('Informe a data do evento.', 'warning')
    if (formVagas <= 0) return showToast('O número de vagas deve ser maior que zero.', 'warning')

    setSalvando(true)
    try {
      const supabase = createClient()
      const payload = {
        titulo: formTitulo.trim(),
        data_evento: formData,
        horario: formHorario.trim(),
        local: formLocal.trim(),
        ponto_saida: formPontoSaida.trim() || null,
        vagas_totais: Number(formVagas),
        preco: Number(formPreco),
        duracao: formDuracao.trim(),
        nivel: formNivel,
        descricao: formDescricao.trim(),
        roteiro: formRoteiro.trim(),
        o_que_levar: formOQueLevar.trim(),
        foto_url: formFotoUrl.trim() || null,
        ativo: true
      }

      if (editandoId) {
        const { data, error } = await supabase
          .from('eventos')
          .update(payload)
          .eq('id', editandoId)
          .select('*, inscricoes_eventos(count)')
          .single()

        if (error) throw error

        setEventos(prev => prev.map(item => item.id === editandoId ? { ...item, ...data } : item))
        showToast('Evento atualizado com sucesso!', 'success')
      } else {
        const { data, error } = await supabase
          .from('eventos')
          .insert({ ...payload, vagas_ocupadas: 0 })
          .select('*, inscricoes_eventos(count)')
          .single()

        if (error) throw error

        setEventos(prev => [data, ...prev])
        showToast('Novo evento criado e disponível no Portal do Aluno!', 'success')
      }

      setModalFormAberto(false)
    } catch (err: any) {
      showToast('Erro ao salvar evento: ' + err.message, 'error')
    } finally {
      setSalvando(false)
    }
  }

  // ALTERNAR STATUS (ENCERRAR / REABRIR)
  const alternarStatusAtivo = async (ev: EventoItem) => {
    const novoStatus = !ev.ativo
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('eventos')
        .update({ ativo: novoStatus })
        .eq('id', ev.id)

      if (error) throw error

      setEventos(prev => prev.map(item => item.id === ev.id ? { ...item, ativo: novoStatus } : item))
      showToast(
        novoStatus ? 'Inscrições reabertas com sucesso!' : 'Inscrições do evento encerradas.',
        novoStatus ? 'success' : 'info'
      )
    } catch (err: any) {
      showToast('Erro ao atualizar status: ' + err.message, 'error')
    }
  }

  // CARREGAR INSCRITOS
  const abrirInscritos = async (ev: EventoItem) => {
    setEventoSelecionado(ev)
    setModalInscritosAberto(true)
    setCarregandoInscritos(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('inscricoes_eventos')
        .select('*')
        .eq('evento_id', ev.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInscritos(data || [])
    } catch (err: any) {
      showToast('Erro ao buscar inscritos: ' + err.message, 'error')
    } finally {
      setCarregandoInscritos(false)
    }
  }

  // CANCELAR EVENTO
  const confirmarCancelarEvento = async () => {
    if (!modalCancelarAberto) return
    const ev = modalCancelarAberto
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('eventos')
        .update({ ativo: false, descricao: `[CANCELADO] ${ev.descricao || ''}` })
        .eq('id', ev.id)

      if (error) throw error

      setEventos(prev => prev.map(item => item.id === ev.id ? { ...item, ativo: false } : item))
      showToast('Evento cancelado. Inscrições bloqueadas.', 'warning')
      setModalCancelarAberto(null)
    } catch (err: any) {
      showToast('Erro ao cancelar: ' + err.message, 'error')
    }
  }

  // FILTRAGEM
  const eventosFiltrados = eventos.filter(ev => {
    if (filtro === 'ativos') return ev.ativo !== false
    if (filtro === 'encerrados') return ev.ativo === false
    return true
  })

  // ESTATÍSTICAS
  const totalEventos = eventos.length
  const totalVagas = eventos.reduce((acc, ev) => acc + (ev.vagas_totais || 0), 0)
  const totalOcupadas = eventos.reduce((acc, ev) => acc + (ev.vagas_ocupadas || 0), 0)

  return (
    <div className="rt-reception-events space-y-4 pb-20">
      
      {/* TOAST FLUTUANTE */}
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

      {/* CABEÇALHO DO MÓDULO */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-5 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-cyan-500 border border-white/60 dark:border-slate-800 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block"><VisualText id="copy-7885fedf3ba2" defaultText={"GESTÃO DE EXPERIÊNCIAS & REMADAS"}/></span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic"><VisualText id="copy-acd3e2ff5be5" defaultText={"EVENTOS NÁUTICOS"}/></h2>
          </div>

          <button
            type="button"
            onClick={abrirCriarEvento}
            className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span><VisualText id="copy-8c6dd0bc1584" defaultText={" Novo Evento"}/></button>
        </div>

        {/* MÉTRICAS RÁPIDAS */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[8px] font-black text-slate-400 uppercase block"><VisualText id="copy-d520547fd6ca" defaultText={"Total"}/></span>
            <span className="text-base font-black text-blue-600 dark:text-cyan-400 leading-none">
              {totalEventos}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[8px] font-black text-slate-400 uppercase block"><VisualText id="copy-71080f477835" defaultText={"Inscritos"}/></span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">
              {totalOcupadas}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[8px] font-black text-slate-400 uppercase block"><VisualText id="copy-d170121d7220" defaultText={"Vagas Livres"}/></span>
            <span className="text-base font-black text-amber-500 leading-none">
              {Math.max(0, totalVagas - totalOcupadas)}
            </span>
          </div>
        </div>

        {/* ABAS DE FILTRO */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
          {(['todos', 'ativos', 'encerrados'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFiltro(tab)}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filtro === tab
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
              }`}
            >
              {tab === 'todos' ? 'Todos' : tab === 'ativos' ? 'Ativos' : 'Encerrados'}
            </button>
          ))}
        </div>
      </div>

      {/* LISTAGEM DE EVENTOS */}
      <div className="space-y-4">
        {eventosFiltrados.length === 0 ? (
          <div className="bg-white/90 dark:bg-slate-900/90 rounded-[2rem] p-8 text-center border border-white/60 dark:border-slate-800 shadow-sm space-y-2">
            <span className="text-3xl block"><BrandIcon name="ticket"/></span>
            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase"><VisualText id="copy-2f342b6f1b9a" defaultText={"Nenhum evento encontrado"}/></p>
            <p className="text-[10px] text-slate-400 font-bold"><VisualText id="copy-fc2be894ceea" defaultText={"Clique em \"+ Novo Evento\" para cadastrar a primeira remada ou vivência."}/></p>
          </div>
        ) : (
          eventosFiltrados.map(ev => {
            const isAtivo = ev.ativo !== false
            const vagasTotais = ev.vagas_totais || 1
            const vagasOcupadas = ev.vagas_ocupadas || 0
            const vagasRestantes = Math.max(0, vagasTotais - vagasOcupadas)
            const esgotado = vagasRestantes === 0
            const pct = Math.min(100, Math.round((vagasOcupadas / vagasTotais) * 100))

            return (
              <div
                key={ev.id}
                className="bg-white/95 dark:bg-slate-900/95 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border border-white/60 dark:border-slate-800 overflow-hidden transition-all hover:scale-[1.01]"
              >
                {/* BANNER / FOTO COM BADGES */}
                <div className="relative h-36 w-full bg-gradient-to-r from-blue-900 to-slate-900 overflow-hidden">
                  {ev.foto_url ? (
                    <img
                      src={ev.foto_url}
                      alt={ev.titulo}
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">
                      <BrandIcon name="ship"/>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* BADGES SUPERIORES */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm ${
                      !isAtivo
                        ? 'bg-slate-800/80 text-slate-300 border border-slate-600'
                        : esgotado
                        ? 'bg-red-600/90 text-white border border-red-400'
                        : 'bg-emerald-600/90 text-white border border-emerald-400'
                    }`}>
                      <BrandLabel text={!isAtivo ? '⏸️ Encerrado' : esgotado ? '🔴 Esgotado' : '🟢 Inscrições Abertas'}/>
                    </span>

                    <span className="text-xs font-black text-white px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md border border-white/30 shadow-md">
                      R$ {Number(ev.preco).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {/* TÍTULO E DATA SOBRE A IMAGEM */}
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight drop-shadow-md truncate">
                      {ev.titulo}
                    </h3>
                    <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mt-0.5 drop-shadow">
                      <BrandIcon name="calendar"/> {new Date(ev.data_evento + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} • <BrandIcon name="clock"/> {ev.horario}
                    </p>
                  </div>
                </div>

                {/* CORPO DO CARD */}
                <div className="p-4.5 space-y-3.5">
                  {/* LOCAL E NÍVEL */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <span><BrandIcon name="pin"/></span>
                      <span className="truncate">{ev.local}</span>
                    </div>
                    {ev.nivel && (
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-900 shrink-0">
                        {ev.nivel}
                      </span>
                    )}
                  </div>

                  {/* BARRA DE VAGAS */}
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase">
                      <span className="text-slate-500 dark:text-slate-400"><VisualText id="copy-0b915b0f1e46" defaultText={"Ocupação de Vagas"}/></span>
                      <span className={esgotado ? 'text-red-500 font-black' : 'text-blue-600 dark:text-cyan-400'}>
                        {vagasOcupadas} de {vagasTotais}<VisualText id="copy-023e5bd159df" defaultText={" preenchidas ("}/>{vagasRestantes}<VisualText id="copy-3eaf7130e1cb" defaultText={" livres)"}/></span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* BOTÕES DE AÇÃO */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {/* VER INSCRITOS */}
                    <button
                      type="button"
                      onClick={() => abrirInscritos(ev)}
                      className="col-span-2 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-800 rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span><BrandIcon name="users"/></span><VisualText id="copy-af9f479d6e35" defaultText={" Inscritos ("}/>{vagasOcupadas})
                    </button>

                    {/* EDITAR */}
                    <button
                      type="button"
                      onClick={() => abrirEditarEvento(ev)}
                      className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer text-center"
                      title="Editar informações do evento"
                    >
                      <BrandIcon name="edit"/><VisualText id="copy-050da11df011" defaultText={" Editar"}/></button>

                    {/* ENCERRAR / REABRIR */}
                    <button
                      type="button"
                      onClick={() => alternarStatusAtivo(ev)}
                      className={`py-2.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer text-center border ${
                        isAtivo
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
                      }`}
                      title={isAtivo ? 'Encerrar inscrições' : 'Reabrir inscrições'}
                    >
                      <BrandLabel text={isAtivo ? '⏸️ Pausar' : '▶️ Reabrir'}/>
                    </button>
                  </div>

                  {/* CANCELAR EVENTO */}
                  <div className="pt-0.5 text-right">
                    <button
                      type="button"
                      onClick={() => setModalCancelarAberto(ev)}
                      className="text-[8.5px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider cursor-pointer"
                    ><VisualText id="copy-d5e1d128d3d2" defaultText={"✕ Cancelar Evento Definitivamente"}/></button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODAL CRIAR / EDITAR EVENTO */}
      {modalFormAberto && (
        <div data-rt-modal className="fixed inset-0 z-[9990] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl border border-white/60 dark:border-slate-800 overflow-hidden my-auto">
            
            {/* CABEÇALHO DO MODAL */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base"><BrandIcon name="ticket"/></span>
                <h3 className="text-xs font-black uppercase tracking-wider">
                  {editandoId ? 'EDITAR EVENTO NÁUTICO' : 'CRIAR NOVO EVENTO'}
                </h3>
              </div>
              <button aria-label="Fechar janela"
                type="button"
                onClick={() => setModalFormAberto(false)}
                className="w-7 h-7 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* FORMULÁRIO */}
            <form onSubmit={salvarEvento} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto no-scrollbar">
              {/* TÍTULO */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-19b43183978b" defaultText={"Título do Evento *"}/></label>
                <input
                  type="text"
                  required
                  value={formTitulo}
                  onChange={e => setFormTitulo(e.target.value)}
                  placeholder="Ex: Remada Noturna Lua Cheia"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
                />
              </div>

              {/* DATA E HORÁRIO */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-9640b2be6946" defaultText={"Data do Evento *"}/></label>
                  <input
                    type="date"
                    required
                    value={formData}
                    onChange={e => setFormData(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-4288aaa5840a" defaultText={"Horário *"}/></label>
                  <input
                    type="text"
                    required
                    value={formHorario}
                    onChange={e => setFormHorario(e.target.value)}
                    placeholder="08:00 - 10:30"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* LOCAL E PONTO DE SAÍDA */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-770bd14582c7" defaultText={"Local / Ponto de Encontro *"}/></label>
                <input
                  type="text"
                  required
                  value={formLocal}
                  onChange={e => setFormLocal(e.target.value)}
                  placeholder="Ponta da Praia - Santos / SP"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
                />
              </div>

              {/* VAGAS E PREÇO */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-aa5d52d6c8d2" defaultText={"Vagas Totais *"}/></label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formVagas}
                    onChange={e => setFormVagas(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-33dbe31b1a0a" defaultText={"Valor por Pessoa (R$) *"}/></label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.50"
                    value={formPreco}
                    onChange={e => setFormPreco(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* DURAÇÃO E NÍVEL */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-04aa573f36f1" defaultText={"Duração Estimada"}/></label>
                  <input
                    type="text"
                    value={formDuracao}
                    onChange={e => setFormDuracao(e.target.value)}
                    placeholder="2h30min"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-0c86a6c75291" defaultText={"Nível de Experiência"}/></label>
                  <select
                    value={formNivel}
                    onChange={e => setFormNivel(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="Iniciante">Iniciante (Todos)</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>
              </div>

              {/* URL DA FOTO DE CAPA */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-37cc298b3787" defaultText={"URL da Foto de Capa (Opcional)"}/></label>
                <input
                  type="url"
                  value={formFotoUrl}
                  onChange={e => setFormFotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
                />
              </div>

              {/* DESCRIÇÃO */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-fc7ba9761924" defaultText={"Descrição Completa"}/></label>
                <textarea
                  rows={3}
                  value={formDescricao}
                  onChange={e => setFormDescricao(e.target.value)}
                  placeholder="Descreva os encantos e objetivos desta remada..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none resize-none"
                />
              </div>

              {/* ROTEIRO */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-b94beb3664d0" defaultText={"Roteiro / Cronograma (uma etapa por linha)"}/></label>
                <textarea
                  rows={3}
                  value={formRoteiro}
                  onChange={e => setFormRoteiro(e.target.value)}
                  placeholder="08:00 - Recepção&#10;08:30 - Embarque..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none resize-none font-mono text-[11px]"
                />
              </div>

              {/* O QUE LEVAR */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400"><VisualText id="copy-e4c47b550747" defaultText={"Recomendações (O que levar)"}/></label>
                <input
                  type="text"
                  value={formOQueLevar}
                  onChange={e => setFormOQueLevar(e.target.value)}
                  placeholder="Protetor solar, boné, água..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
                />
              </div>

              {/* BOTÕES DE SUBMIT */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalFormAberto(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                ><VisualText id="copy-a8119431b2c9" defaultText={"Cancelar"}/></button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : editandoId ? 'Atualizar Evento' : 'Publicar Evento'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL LISTA DE INSCRITOS */}
      {modalInscritosAberto && eventoSelecionado && (
        <div data-rt-modal className="fixed inset-0 z-[9990] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl border border-white/60 dark:border-slate-800 overflow-hidden my-auto space-y-4 p-5">
            
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block"><VisualText id="copy-750fdf79fdc6" defaultText={"LISTA DE PARTICIPANTES"}/></span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate max-w-[260px]">
                  {eventoSelecionado.titulo}
                </h3>
              </div>
              <button aria-label="Fechar janela"
                type="button"
                onClick={() => setModalInscritosAberto(false)}
                className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* LISTA */}
            {carregandoInscritos ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase">
                Carregando inscritos...
              </div>
            ) : inscritos.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <span className="text-3xl block"><BrandIcon name="users"/></span>
                <p className="text-xs font-bold text-slate-400 uppercase"><VisualText id="copy-21ce92e29fe2" defaultText={"Nenhuma inscrição registrada ainda."}/></p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto no-scrollbar">
                {inscritos.map(insc => {
                  const telLimpo = insc.telefone_whatsapp.replace(/\D/g, '')
                  const linkWhats = `https://wa.me/55${telLimpo}?text=Olá%20${encodeURIComponent(insc.nome_completo)},%20confirmamos%20sua%20inscrição%20para%20o%20evento%20${encodeURIComponent(eventoSelecionado.titulo)}!`

                  return (
                    <div
                      key={insc.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">
                            {insc.nome_completo}
                          </h4>
                          <span className="text-[7.5px] font-black px-1.5 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                            {insc.qtd_vagas}<VisualText id="copy-6a207b7e9dbd" defaultText={" vaga(s)"}/></span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">
                          {insc.telefone_whatsapp}<VisualText id="copy-0431ed916656" defaultText={" • Voucher: #"}/>{insc.codigo_voucher}
                        </p>
                      </div>

                      <a
                        href={linkWhats}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[8.5px] font-black uppercase tracking-wider shadow-sm active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <span><BrandIcon name="message"/></span><VisualText id="copy-e9e5a0773162" defaultText={" WhatsApp"}/></a>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-black">
              <span className="text-slate-400 uppercase text-[9px]"><VisualText id="copy-a64d9bebe297" defaultText={"Total de Inscrições:"}/></span>
              <span className="text-blue-600 dark:text-cyan-400">
                {inscritos.reduce((acc, i) => acc + (i.qtd_vagas || 1), 0)}<VisualText id="copy-4856eb07968a" defaultText={" vagas"}/></span>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE CANCELAMENTO DEFINITIVO */}
      {modalCancelarAberto && (
        <div data-rt-modal className="fixed inset-0 z-[9995] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] p-6 border-t-4 !border-t-red-500 shadow-2xl space-y-3">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider"><VisualText id="copy-069423276b9e" defaultText={"CANCELAMENTO DE EVENTO"}/></p>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-050a015896b0" defaultText={"CANCELAR REMADA?"}/></h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300"><VisualText id="copy-45d0a3f07f60" defaultText={"Deseja realmente cancelar o evento "}/><strong>{modalCancelarAberto.titulo}</strong><VisualText id="copy-20474f731d97" defaultText={"? As inscrições serão imediatamente suspensas no portal."}/></p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalCancelarAberto(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              ><VisualText id="copy-abd42c000724" defaultText={"Voltar"}/></button>
              <button
                type="button"
                onClick={confirmarCancelarEvento}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              ><VisualText id="copy-009e3424000c" defaultText={"Confirmar"}/></button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
