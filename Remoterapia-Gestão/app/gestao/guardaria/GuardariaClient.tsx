'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppBottomNav from '@/components/AppBottomNav'

interface CaiaqueItem {
  id: string
  nome: string
  tipo: string
  dono?: string
  status?: string
}

interface AgendamentoItem {
  id: string
  cliente: string
  tipo: string
  horario: string
  saida: string
  caiaque: string
  caiaque_id?: string
  status: string
  data: string
  guarda_volume_nome?: string
  telefone?: string
}

interface ClienteItem {
  id: string
  nome: string
  telefone: string
  tipo_plano: 'mensalista' | 'guardaria'
  data_vencimento: string // YYYY-MM-DD
  bloqueado: boolean
  caiaque_vinculado?: string
}

export default function GuardariaClient() {
  const [tab, setTab] = useState<'frota' | 'agendamentos' | 'bloqueios' | 'clientes'>('frota')

  // FROTA
  const [caiaques, setCaiaques] = useState<CaiaqueItem[]>([])
  const [locacoesAtivas, setLocacoesAtivas] = useState<string[]>([])
  const [verMaisFrota, setVerMaisFrota] = useState(false)

  // AGENDAMENTOS
  const [dataAgendamento, setDataAgendamento] = useState<Date>(new Date())
  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>([])

  // BLOQUEIOS
  const [mesAtual, setMesAtual] = useState<Date>(new Date())
  const [diasBloqueados, setDiasBloqueados] = useState<string[]>([])
  const [modalConfirmarBloqueio, setModalConfirmarBloqueio] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  // CLIENTES (MENSALISTAS & GUARDARIA)
  const [clientes, setClientes] = useState<ClienteItem[]>([])
  const [filtroCliente, setFiltroCliente] = useState<'todos' | 'ativo' | 'pendente' | 'debito' | 'bloqueado'>('todos')
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  const [modalExcluirCliente, setModalExcluirCliente] = useState<ClienteItem | null>(null)
  
  // FORMULÁRIO DO CLIENTE
  const [formId, setFormId] = useState<string | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formPlano, setFormPlano] = useState<'mensalista' | 'guardaria'>('mensalista')
  const [formPlanoDrop, setFormPlanoDrop] = useState(false)
  const [formVencimento, setFormVencimento] = useState('')
  const [formCaiaque, setFormCaiaque] = useState('')

  // ESTADOS PARA O MODAL DE DETALHES DO AGENDAMENTO
  const [modalDetalhesAg, setModalDetalhesAg] = useState<any | null>(null)

  // CAMPO DE E-MAIL NO FORMULÁRIO DE CLIENTE
  const [formEmail, setFormEmail] = useState('')

  // 1. LANÇAR P/ ÁGUA: ALIMENTA O MONITORAMENTO DO MAR E ENTRA NO FECHAMENTO DIÁRIO
  const lancarAgendamentoAoMar = async (ag: any) => {
    try {
      const supabase = createClient()
      
      // 1. Gera registro na tabela locacoes (entra automaticamente no fechamento diário)
      const caiId = ag.caiaque_id || ag.caiaque
      await supabase.from('locacoes').insert({
        cliente: ag.cliente,
        telefone: ag.telefone || null,
        tipo: 'mensalista',
        mensalista_id: ag.mensalista_id || null,
        caiaques_ids: caiId ? [String(caiId)] : [],
        entrada: new Date().toISOString(),
        qtd_pessoas: 1,
        status: 'ativo',
      })

      // 2. Atualiza agendamento no Supabase para em_navegacao
      if (ag.id) {
        await supabase.from('agendamentos').update({ status: 'em_navegacao' }).eq('id', ag.id)
      }
      setAgendamentos(prev => prev.map(item => item.id === ag.id ? { ...item, status: 'em_navegacao' } : item))
      
      // 3. Atualiza caiaque na frota para "Na Água"
      const idCai = String(ag.caiaque_id || ag.caiaque).replace(/\D/g, '')
      if (idCai) setLocacoesAtivas(prev => [...prev, idCai])

      showToast(`Embarque de ${ag.cliente} iniciado! ${ag.guarda_volume_nome || 'Armário'} ocupado e registrado no fechamento do dia.`)
    } catch {
      showToast('Embarque iniciado localmente.')
    }
  }

  const finalizarRetornoAgendamento = async (ag: any) => {
    try {
      const supabase = createClient()
      if (ag.id) {
        await supabase.from('agendamentos').update({ status: 'concluido' }).eq('id', ag.id)
      }
      const caiId = ag.caiaque_id || ag.caiaque
      if (caiId) {
        await supabase.from('locacoes')
          .update({ saida: new Date().toISOString(), status: 'finalizado' })
          .contains('caiaques_ids', [String(caiId)])
          .is('saida', null)
      }
    } catch {}
    setAgendamentos(prev => prev.map(item => item.id === ag.id ? { ...item, status: 'concluido' } : item))
    const idCai = String(ag.caiaque_id || ag.caiaque).replace(/\D/g, '')
    if (idCai) setLocacoesAtivas(prev => prev.filter(id => id !== idCai))
    showToast(`Retorno de ${ag.cliente} concluído!`)
  }

  // 2. DISPARO DAS INSTRUÇÕES DE 1º ACESSO NO WHATSAPP DO CLIENTE
  const enviarInstrucoesWhatsApp = (c: ClienteItem) => {
    const limpo = c.telefone.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `🌊 *Bem-vindo(a) à Remoterapia!* 🛶\n\n` +
      `Olá, *${c.nome}*! Seu plano *${c.tipo_plano === 'guardaria' ? 'Guardaria' : 'Mensalista'}* já está ativo no nosso sistema.\n\n` +
      `Para agendar seus horários e escolher seu caiaque pelo celular, acesse nosso portal exclusivo:\n` +
      `🔗 https://agendamento.remoterapia.com.br\n\n` +
      `📱 *Login:* Seu WhatsApp (${c.telefone})\n` +
      `🔑 *Primeiro Acesso:* Basta entrar no link, confirmar seu número e cadastrar sua senha pessoal.\n\n` +
      `Qualquer dúvida, estamos à disposição na base da praia! ☀️`
    )
    window.open(`https://wa.me/55${limpo}?text=${msg}`, '_blank')
  }

  // 3. FRASE OFICIAL DE CONTATO SOBRE AGENDAMENTO
  const abrirWhatsAppAgendamento = (ag: any) => {
    const limpo = String(ag.telefone || '13997814422').replace(/\D/g, '')
    const msg = encodeURIComponent(`Olá ${ag.cliente}, somos da Remoterapia e gostaria de falar sobre seu agendamento.`)
    window.open(`https://wa.me/55${limpo}?text=${msg}`, '_blank')
  }

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const carregarTudo = async () => {
    try {
      const supabase = createClient()

      // Caiaques
      const { data: cData } = await supabase.from('caiaques').select('*').order('id')
      if (cData && cData.length > 0) {
        setCaiaques(cData)
      } else {
        setCaiaques([])
      }

      // Locações ativas no mar (com saida nula)
      const { data: lData } = await supabase
        .from('locacoes')
        .select('caiaques_ids, saida')
        .is('saida', null)

      const naAgua: string[] = []
      if (lData) {
        lData.forEach((l: any) => {
          if (Array.isArray(l.caiaques_ids)) l.caiaques_ids.forEach((id: any) => naAgua.push(String(id)))
        })
      }
      setLocacoesAtivas(naAgua)

      // Dias Fechados
      const { data: bData } = await supabase.from('dias_fechados').select('data')
      if (bData && bData.length > 0) {
        setDiasBloqueados(bData.map((d: any) => d.data))
      } else {
        try {
          const stored = localStorage.getItem('plorix_dias_fechados')
          if (stored) setDiasBloqueados(JSON.parse(stored))
        } catch {}
      }

      // Clientes
      const { data: cliData } = await supabase.from('mensalistas').select('*').order('nome')
      if (cliData && cliData.length > 0) {
        setClientes(cliData.map((c: any) => ({
          id: c.id,
          nome: c.nome,
          telefone: c.telefone || '(13) 99999-9999',
          tipo_plano: c.tipo_plano || 'mensalista',
          data_vencimento: c.data_vencimento || '2026-10-21',
          bloqueado: !!c.bloqueado,
          caiaque_vinculado: c.caiaque_vinculado
        })))
      } else {
        setClientes([])
      }

      // Agendamentos reais a partir de hoje
      const hoje = new Date()
      const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
      const { data: agData } = await supabase
        .from('agendamentos')
        .select('*, mensalista:mensalistas(*)')
        .gte('data_reserva', hojeIso)
        .neq('status', 'cancelado')
        .order('data_reserva', { ascending: true })

      if (agData && agData.length > 0) {
        setAgendamentos(agData.map((a: any) => {
          const mensObj = Array.isArray(a.mensalista) ? a.mensalista[0] : a.mensalista
          return {
            id: a.id,
            cliente: mensObj?.nome || a.mensalista_nome || 'Aluno',
            tipo: mensObj?.tipo_plano || 'mensalista',
            horario: a.horario_inicio || '06:00',
            saida: a.horario_fim || '07:30',
            caiaque: a.caiaque_id ? `#${a.caiaque_id}` : 'Caiaque Clube',
            caiaque_id: a.caiaque_id,
            status: a.status || 'confirmado',
            data: a.data_reserva,
            guarda_volume_nome: a.guarda_volume_nome || (a.observacoes && a.observacoes.includes('Armário') ? a.observacoes.replace('Armário Locker:', 'Armário').trim() : (a.observacoes || null)),
            telefone: mensObj?.telefone || a.telefone,
            mensalista_id: a.mensalista_id
          }
        }))
      } else {
        setAgendamentos([])
      }
    } catch {
      setAgendamentos([])
    }
  }

  useEffect(() => {
    carregarTudo()
  }, [])

  // CÁLCULO INTELIGENTE DO STATUS FINANCEIRO
  const getStatusCliente = (c: ClienteItem): { status: 'ativo' | 'pendente' | 'debito'; label: string; cor: string } => {
    if (c.bloqueado) {
      return { status: 'debito', label: 'BLOQUEADO', cor: 'bg-slate-800 text-white' }
    }
    if (!c.data_vencimento) {
      return { status: 'ativo', label: 'ATIVO', cor: 'bg-emerald-100 text-emerald-800' }
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const [anoV, mesV, diaV] = c.data_vencimento.split('-').map(Number)
    const dataVenc = new Date(anoV, mesV - 1, diaV)

    const diffDias = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDias < 0) {
      return { status: 'debito', label: `EM DÉBITO (${Math.abs(diffDias)}d atrás)`, cor: 'bg-red-100 text-red-700 border-red-200' }
    }
    if (diffDias <= 5) {
      return { status: 'pendente', label: `VENCE EM ${diffDias === 0 ? 'HOJE' : `${diffDias}d`}`, cor: 'bg-amber-100 text-amber-800 border-amber-200' }
    }
    return { status: 'ativo', label: 'ATIVO (EM DIA)', cor: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  }

  // FILTRAGEM
  const clientesFiltrados = clientes.filter(c => {
    if (filtroCliente === 'todos') return true
    if (filtroCliente === 'bloqueado') return c.bloqueado
    const st = getStatusCliente(c).status
    return st === filtroCliente
  })

  // AÇÕES DE CLIENTES
  const abrirModalNovoCliente = () => {
    setFormId(null)
    setFormNome('')
    setFormTelefone('')
    setFormPlano('mensalista')
    const proxMes = new Date()
    proxMes.setDate(proxMes.getDate() + 30)
    setFormVencimento(proxMes.toISOString().split('T')[0])
    setFormCaiaque('')
    setModalClienteAberto(true)
  }

  const abrirModalEditarCliente = (c: ClienteItem) => {
    setFormId(c.id)
    setFormNome(c.nome)
    setFormTelefone(c.telefone)
    setFormPlano(c.tipo_plano)
    setFormVencimento(c.data_vencimento)
    setFormCaiaque(c.caiaque_vinculado || '')
    setModalClienteAberto(true)
  }

  const salvarCliente = async () => {
    if (!formNome.trim()) return showToast('Informe o nome completo do cliente.', 'warning')
    const telLimpo = formTelefone.replace(/\D/g, '')
    if (!telLimpo || telLimpo.length < 10) return showToast('Informe o WhatsApp (login) com DDD.', 'warning')

    try {
      const supabase = createClient()
      const dataVenc = formVencimento || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

      if (formId) {
        const { error } = await supabase.from('mensalistas').update({
          nome: formNome.toUpperCase().trim(),
          telefone: formTelefone.trim(),
          tipo_plano: formPlano,
          data_vencimento: dataVenc,
          caiaque_vinculado: formPlano === 'guardaria' ? formCaiaque : null
        }).eq('id', formId)
        if (error) throw error

        setClientes(prev => prev.map(c => c.id === formId ? {
          ...c, nome: formNome.toUpperCase().trim(), telefone: formTelefone.trim(),
          tipo_plano: formPlano, data_vencimento: dataVenc,
          caiaque_vinculado: formPlano === 'guardaria' ? formCaiaque : undefined
        } : c))
        showToast('Cliente atualizado no Supabase!')
      } else {
        const { data, error } = await supabase.from('mensalistas').insert({
          nome: formNome.toUpperCase().trim(),
          telefone: formTelefone.trim(),
          tipo_plano: formPlano,
          creditos: formPlano === 'mensalista' ? 8 : 0,
          status_pagamento: 'ativo',
          data_vencimento: dataVenc,
          caiaque_vinculado: formPlano === 'guardaria' ? formCaiaque : null,
          bloqueado: false, primeiro_acesso: true, precisa_trocar_senha: true
        }).select().single()
        if (error) throw error

        setClientes(prev => [{
          id: data.id, nome: data.nome, telefone: data.telefone,
          tipo_plano: data.tipo_plano, data_vencimento: data.data_vencimento,
          bloqueado: false, caiaque_vinculado: data.caiaque_vinculado
        }, ...prev])
        showToast('Cliente cadastrado no Supabase!')
      }
      setModalClienteAberto(false)
    } catch (e: any) {
      showToast('Erro Supabase: ' + (e.message || 'Falha ao salvar.'), 'error')
    }
  }

  const alternarBloqueioCliente = (id: string) => {
    setClientes(prev => prev.map(c => {
      if (c.id === id) {
        const novo = !c.bloqueado
        showToast(novo ? 'Cliente bloqueado para novos agendamentos.' : 'Cliente desbloqueado.', novo ? 'warning' : 'success')
        return { ...c, bloqueado: novo }
      }
      return c
    }))
  }

  const renovarMensalidadeManual = (id: string) => {
    setClientes(prev => prev.map(c => {
      if (c.id === id) {
        const baseDate = c.data_vencimento ? new Date(c.data_vencimento) : new Date()
        baseDate.setDate(baseDate.getDate() + 30)
        const novaData = baseDate.toISOString().split('T')[0]
        showToast(`Mensalidade renovada até ${baseDate.toLocaleDateString('pt-BR')}!`, 'success')
        return { ...c, data_vencimento: novaData, bloqueado: false }
      }
      return c
    }))
  }

  const excluirClienteConfirmado = async () => {
    if (!modalExcluirCliente) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('mensalistas').delete().eq('id', modalExcluirCliente.id)
      if (error) throw error

      setClientes(prev => prev.filter(c => c.id !== modalExcluirCliente.id))
      setModalExcluirCliente(null)
      showToast('Cliente removido com sucesso.', 'success')
    } catch (e: any) {
      showToast('Erro ao excluir cliente: ' + (e.message || 'Falha de conexão.'), 'error')
    }
  }

  // FROTA HELPERS
  const qtdNaAgua = caiaques.filter(c => locacoesAtivas.includes(String(c.id))).length
  const qtdNaBase = Math.max(0, caiaques.length - qtdNaAgua)
  const caiaquesExibidos = verMaisFrota ? caiaques : caiaques.slice(0, 8)

  // CALENDÁRIO HELPERS
  const ano = mesAtual.getFullYear()
  const mesIndex = mesAtual.getMonth()
  const primeiroDiaSemana = new Date(ano, mesIndex, 1).getDay()
  const totalDiasMes = new Date(ano, mesIndex + 1, 0).getDate()
  const nomeMes = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <>
      {/* TOAST NÁUTICO PLORIX COM ALTO CONTRASTE */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 pointer-events-none animate-bounce">
          <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-xl border bg-white/95 dark:bg-slate-900/95 flex items-center justify-between gap-3 border-l-[6px] ${
            toast.tipo === 'success' ? '!border-l-emerald-500 border-emerald-100 dark:border-slate-800' :
            toast.tipo === 'warning' ? '!border-l-amber-500 border-amber-100 dark:border-slate-800' :
            toast.tipo === 'error' ? '!border-l-red-500 border-red-100 dark:border-slate-800' :
            '!border-l-blue-600 border-blue-100 dark:border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-lg shrink-0">
                {toast.tipo === 'success' ? '✅' : toast.tipo === 'warning' ? '⚠️' : toast.tipo === 'error' ? '❌' : '🛶'}
              </span>
              <p className="text-[11px] font-black leading-snug text-slate-900 dark:text-white">
                {toast.msg}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36 no-scrollbar w-full min-h-0">
        
        {/* ============================================================== */}
        {/* ABA 4: CLIENTES & ACESSOS (REESTRUTURADA E PROFISSIONAL)       */}
        {/* ============================================================== */}
        {tab === 'clientes' && (
          <div className="space-y-4">
            
            {/* CABEÇALHO DA ABA COM BOTÃO ADICIONAR */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-blue-900/70 dark:text-cyan-400 uppercase tracking-widest">GERENCIAR ACESSOS</p>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  CLIENTES ({clientes.length})
                </h3>
              </div>
              
              <button
                type="button"
                onClick={abrirModalNovoCliente}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span> ADICIONAR
              </button>
            </div>

            {/* FILTROS POR PÍLULAS (SEM O BOTÃO PENDENTES) */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'todos', label: 'TODOS' },
                { id: 'ativo', label: 'ATIVOS' },
                { id: 'debito', label: 'DÉBITO' },
                { id: 'bloqueado', label: 'BLOQUEADOS' }
              ].map(f => {
                const active = filtroCliente === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroCliente(f.id as any)}
                    className={`py-1.5 px-3.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                      active
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-black'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* LISTA DE CARDS DE CLIENTES */}
            <div className="space-y-3.5">
              {clientesFiltrados.length === 0 ? (
                <div className="bg-white/95 dark:bg-slate-900/95 p-8 rounded-[2rem] text-center border border-white/60 text-slate-400 text-xs font-bold">
                  Nenhum cliente encontrado neste filtro.
                </div>
              ) : (
                clientesFiltrados.map(c => {
                  const infoStatus = getStatusCliente(c)
                  const [anoV, mesV, diaV] = (c.data_vencimento || '2026-10-21').split('-')
                  const dataFormatada = `${diaV}/${mesV}/${anoV}`
                  const isGuardaria = c.tipo_plano === 'guardaria'

                  return (
                    <div 
                      key={c.id} 
                      className={`bg-white/95 dark:bg-slate-900/95 p-5 rounded-[2.2rem] shadow-xl border border-white/80 dark:border-slate-800 border-l-[6px] space-y-3.5 ${
                        c.bloqueado 
                          ? '!border-l-slate-700' 
                          : isGuardaria 
                            ? '!border-l-purple-600' 
                            : '!border-l-blue-600'
                      }`}
                    >
                      {/* TOPO: BADGES DO PLANO E STATUS + BOTÃO EDITAR */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                            isGuardaria 
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300' 
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-cyan-300'
                          }`}>
                            {isGuardaria ? 'GUARDARIA' : 'MENSALISTA'}
                          </span>
                          
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${infoStatus.cor}`}>
                            {infoStatus.label}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => abrirModalEditarCliente(c)}
                          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xs border border-slate-200 dark:border-slate-700 cursor-pointer transition-all active:scale-95"
                          title="Editar cadastro"
                        >
                          ✏️
                        </button>
                      </div>

                      {/* NOME DO CLIENTE E BARCO VINCULADO */}
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase leading-tight">
                          {c.nome}
                        </h3>
                        {c.caiaque_vinculado && (
                          <span className="text-[9.5px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wide block mt-1">
                            🛶 Vaga {c.caiaque_vinculado} (Exclusivo)
                          </span>
                        )}
                      </div>

                      {/* BANDEJA DE DADOS DE ALTO CONTRASTE (PADRÃO NÁUTICO NÍTIDO) */}
                      <div className={`p-3 rounded-2xl border grid grid-cols-2 gap-2 text-xs ${
                        isGuardaria 
                          ? 'bg-[#f5eefc] dark:bg-slate-800/80 border-purple-100 dark:border-slate-700' 
                          : 'bg-[#eaf4fc] dark:bg-slate-800/80 border-blue-100 dark:border-slate-700'
                      }`}>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider block ${
                            isGuardaria ? 'text-purple-700 dark:text-purple-300' : 'text-blue-600 dark:text-cyan-400'
                          }`}>
                            📱 WHATSAPP / LOGIN
                          </span>
                          <span className="font-black text-slate-900 dark:text-white text-xs mt-1 block">
                            {c.telefone}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider block ${
                            isGuardaria ? 'text-purple-700 dark:text-purple-300' : 'text-blue-600 dark:text-cyan-400'
                          }`}>
                            📅 VENCIMENTO
                          </span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs mt-1 block">
                            {dataFormatada}
                          </span>
                        </div>
                      </div>

                      {/* LINHA DE AÇÕES DO CLIENTE */}
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => enviarInstrucoesWhatsApp(c)}
                          className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        >
                          <span>💬</span> 1º Acesso Zap
                        </button>

                        <button
                          type="button"
                          onClick={() => renovarMensalidadeManual(c.id)}
                          className="py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                        >
                          Renovar
                        </button>

                        <button
                          type="button"
                          onClick={() => alternarBloqueioCliente(c.id)}
                          className="py-2.5 px-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-red-200 dark:border-red-800 transition-all cursor-pointer active:scale-95"
                        >
                          {c.bloqueado ? 'Desbloq.' : 'Bloquear'}
                        </button>
                      </div>

                    </div>
                  )
                })
              )}
            </div>

          </div>
        )}

        {/* ABA 1: FROTA */}
        {tab === 'frota' && (
          <div className="space-y-5">
            <div className="bg-white/95 dark:bg-slate-900/95 p-5 border-t-4 !border-t-emerald-500 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/10 rounded-[2.2rem]">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3.5">
                EMBARCAÇÕES
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/90 dark:bg-emerald-950/40 rounded-2xl p-4 text-center border-2 border-emerald-400 dark:border-emerald-600 shadow-sm">
                  <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                    NA BASE
                  </p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                    {qtdNaBase}
                  </p>
                </div>
                <div className="bg-sky-50/90 dark:bg-sky-950/40 rounded-2xl p-4 text-center border-2 border-sky-400 dark:border-sky-600 shadow-sm">
                  <p className="text-[10px] font-black text-sky-800 dark:text-cyan-400 uppercase tracking-wider">
                    NA ÁGUA
                  </p>
                  <p className="text-3xl font-black text-sky-600 dark:text-cyan-400 tabular-nums mt-1">
                    {qtdNaAgua}
                  </p>
                </div>
              </div>
            </div>

            {/* STATUS DA FROTA COM CAIAQUE EM BLOCO SEPARADO */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/10 rounded-[2.5rem]">
              
              {/* CABEÇALHO COM BADGE TEMPO REAL */}
              <div className="flex justify-between items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white leading-none">
                    STATUS DA FROTA
                  </h4>
                  <p className="text-[8.5px] font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-widest mt-1">
                    MONITORAMENTO E VÍNCULOS
                  </p>
                </div>
                <span className="text-[8.5px] font-black text-blue-700 dark:text-cyan-300 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> TEMPO REAL
                </span>
              </div>

              {/* LISTA DE EMBARCAÇÕES (CARDS ESPAÇOSOS E ROBUSTOS) */}
              <div className="space-y-3">
                {caiaquesExibidos.map(c => {
                  const naAgua = locacoesAtivas.includes(String(c.id))
                  const isGuardaria = !!c.dono

                  // CORES E ESTILOS CONFORME O STATUS E TIPO
                  let statusTexto = '🟢 NA BASE'
                  let badgeStatusCor = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  let boxIconeCor = 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-cyan-300'
                  let cardBorda = '!border-l-blue-600'

                  if (naAgua) {
                    statusTexto = '🌊 NA ÁGUA'
                    badgeStatusCor = 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-cyan-300 border-sky-300 dark:border-sky-800 animate-pulse'
                    boxIconeCor = 'bg-sky-50 dark:bg-sky-950/80 border-sky-300 dark:border-sky-700 text-sky-700'
                    cardBorda = '!border-l-sky-500'
                  } else if (isGuardaria) {
                    statusTexto = '⚓ NA BASE'
                    badgeStatusCor = 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    boxIconeCor = 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-700'
                    cardBorda = '!border-l-purple-600'
                  }

                  return (
                    <div 
                      key={c.id} 
                      className={`bg-white dark:bg-slate-900 rounded-[1.8rem] p-4 border border-slate-100 dark:border-slate-800 border-l-[5px] ${cardBorda} shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3.5`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        
                        {/* 1. BLOCO SEPARADO PARA O DESENHO DO CAIAQUE E NÚMERO */}
                        <div className={`w-14 h-14 rounded-2xl ${boxIconeCor} border flex flex-col items-center justify-center shrink-0 shadow-inner`}>
                          <span className={`text-2xl select-none ${naAgua ? 'animate-pulse' : ''}`}>🛶</span>
                          <span className="text-[8px] font-black uppercase leading-none mt-0.5">#{c.id}</span>
                        </div>

                        {/* 2. DADOS DA EMBARCAÇÃO E VÍNCULO */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {c.dono ? (
                              <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                🏢 {c.dono}
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                ⚓ FROTA BASE
                              </span>
                            )}

                            {isGuardaria && (
                              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                GUARDARIA
                              </span>
                            )}
                          </div>

                          <h5 className="font-black text-sm text-slate-900 dark:text-white uppercase leading-tight truncate mt-1">
                            {c.nome}
                          </h5>

                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mt-0.5">
                            {naAgua ? '🌊 Navegando no Mar' : (c.tipo ? `Modelo: ${c.tipo}` : 'Disponível na Base')}
                          </span>
                        </div>
                      </div>

                      {/* 3. STATUS NÁUTICO À DIREITA */}
                      <div className="shrink-0 text-right">
                        <span className={`text-[9.5px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border inline-block shadow-xs ${badgeStatusCor}`}>
                          {statusTexto}
                        </span>
                      </div>

                    </div>
                  )
                })}
              </div>

              {/* BOTÃO VER MAIS / VER MENOS */}
              {caiaques.length > 4 && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button 
                    type="button" 
                    onClick={() => setVerMaisFrota(!verMaisFrota)} 
                    className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400 inline-flex items-center gap-1.5 cursor-pointer hover:underline"
                  >
                    <span>{verMaisFrota ? '▲' : '▼'}</span>
                    <span>{verMaisFrota ? 'VER MENOS EMBARCAÇÕES' : 'VER MAIS EMBARCAÇÕES'}</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 2: AGENDAMENTOS (REGRAS OFICIAIS, GUARDA-VOLUMES E COTA)   */}
        {/* ============================================================== */}
        {tab === 'agendamentos' && (
          <div className="space-y-3.5">
            
            {/* SELETOR DE DATA NÁUTICO DIRETO */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-[2rem] shadow-xl border border-white/60 dark:border-slate-800 flex justify-between items-center">
              <button 
                type="button" 
                onClick={() => { const d = new Date(dataAgendamento); d.setDate(d.getDate() - 1); setDataAgendamento(d); }} 
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
              >
                ◀
              </button>
              <div className="text-center cursor-pointer" onClick={() => setDataAgendamento(new Date())}>
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">AGENDAMENTOS DE</p>
                <p className="text-xs font-black text-blue-600 dark:text-cyan-400 uppercase">
                  {dataAgendamento.toLocaleDateString('pt-BR')} {dataAgendamento.toDateString() === new Date().toDateString() ? '(HOJE)' : ''}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => { const d = new Date(dataAgendamento); d.setDate(d.getDate() + 1); setDataAgendamento(d); }} 
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
              >
                ▶
              </button>
            </div>

            {/* STATUS RESUMO DO DIA */}
            <div className="flex justify-between items-center px-2">
              <span className="text-[9.5px] font-black text-blue-950 dark:text-cyan-300 uppercase tracking-wider">
                SAÍDAS AGENDADAS ({agendamentos.length})
              </span>
              <span className="text-[8.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Entra no Fechamento do Dia
              </span>
            </div>

            {/* LISTA DE SAÍDAS DO DIA */}
            <div className="space-y-3.5">
              {agendamentos.length === 0 ? (
                <div className="bg-white/95 dark:bg-slate-900/95 p-8 rounded-[2rem] text-center border border-white/60 dark:border-slate-800 text-slate-400 text-xs font-bold">
                  Nenhum agendamento para esta data.
                </div>
              ) : (
                agendamentos.map(ag => {
                  const isGuardaria = ag.tipo === 'guardaria'
                  const emNavegacao = ag.status === 'em_navegacao'

                  return (
                    <div 
                      key={ag.id} 
                      className={`bg-white/95 dark:bg-slate-900/95 rounded-[2.2rem] p-4 shadow-xl border border-white/80 dark:border-slate-800 border-l-[6px] space-y-3.5 ${
                        emNavegacao 
                          ? '!border-l-emerald-500' 
                          : isGuardaria 
                            ? '!border-l-purple-600' 
                            : '!border-l-blue-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        
                        {/* BLOCO SEPARADO DE HORÁRIO E CAIAQUE */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-inner border ${
                            isGuardaria 
                              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-700' 
                              : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-blue-700'
                          }`}>
                            <span className="text-xs font-black leading-none">{ag.horario}</span>
                            <span className="text-[8.5px] font-bold opacity-75 mt-0.5">{isGuardaria ? 'Guardaria' : ag.horario === '06:00' ? 'Turno 1' : 'Turno 2'}</span>
                            <span className="text-lg leading-none mt-0.5 select-none">🛶</span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                isGuardaria 
                                  ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300' 
                                  : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-cyan-300'
                              }`}>
                                {isGuardaria ? 'GUARDARIA' : 'MENSALISTA'}
                              </span>
                              <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                SOLO (1 PESSOA)
                              </span>
                            </div>

                            <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase leading-tight truncate mt-1">
                              {ag.cliente}
                            </h4>

                            <p className={`text-[9.5px] font-black uppercase mt-0.5 ${isGuardaria ? 'text-purple-700 dark:text-purple-300' : 'text-blue-600 dark:text-cyan-400'}`}>
                              {ag.caiaque} {isGuardaria ? '(Barco Próprio)' : '(Frota Clube)'}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[8.5px] font-black uppercase px-2.5 py-1 rounded-lg border shrink-0 ${
                          emNavegacao 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {emNavegacao ? 'EM NAVEGAÇÃO' : 'AGENDADO'}
                        </span>
                      </div>

                      {/* BANDEJA ESTRUTURADA: GUARDA-VOLUMES, COTA SEMANAL E HORÁRIO */}
                      <div className="bg-[#f8fafc] dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 grid grid-cols-3 gap-1 text-[9px] font-bold text-slate-600 dark:text-slate-300 text-center">
                        <div className="border-r border-slate-200 dark:border-slate-700">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block">GUARDA-VOLUMES</span>
                          <span className="font-black text-blue-900 dark:text-cyan-300">
                            🗄️ {ag.guarda_volume_nome || 'ARMÁRIO #03'}
                          </span>
                        </div>
                        <div className="border-r border-slate-200 dark:border-slate-700">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block">
                            {isGuardaria ? 'PLANO' : 'COTA SEMANAL'}
                          </span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400">
                            {isGuardaria ? 'LIVRE (TER-DOM)' : '⏱️ 1/2 SEMANA'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block">TURNO OFICIAL</span>
                          <span className="font-black text-slate-800 dark:text-white">
                            {isGuardaria ? '06h às 10h' : ag.horario === '06:00' ? '06h às 08h' : '08h às 10h'}
                          </span>
                        </div>
                      </div>

                      {/* BOTÕES DE AÇÃO */}
                      <div className="pt-1 flex gap-2">
                        {emNavegacao ? (
                          <button 
                            type="button" 
                            onClick={() => finalizarRetornoAgendamento(ag)}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer text-center"
                          >
                            ⚓ FINALIZAR RETORNO (BASE)
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => lancarAgendamentoAoMar(ag)}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 transition-all cursor-pointer text-center"
                          >
                            🌊 LANÇAR P/ ÁGUA (EMBARCAR)
                          </button>
                        )}

                        <button 
                          type="button" 
                          onClick={() => setModalDetalhesAg(ag)}
                          className="px-3.5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          📋 Detalhes
                        </button>
                      </div>

                    </div>
                  )
                })
              )}
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 3: BLOQUEIOS (CABEÇALHO NÁUTICO REFINADO)                  */}
        {/* ============================================================== */}
        {tab === 'bloqueios' && (
          <div className="space-y-4">
            <div className="bg-white/95 dark:bg-slate-900/95 shadow-xl border border-white/80 dark:border-slate-800 rounded-[2.5rem] overflow-hidden">
              
              {/* CABEÇALHO NÁUTICO INTEGRADO EM CAPS LOCK EM LINHA ÚNICA */}
              <div className="bg-[#eaf4fc] dark:bg-slate-800/80 px-4 py-4 border-b border-blue-100 dark:border-slate-700 text-center">
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-950 dark:text-white leading-tight">
                  CALENDÁRIO DE DISPONIBILIDADE E BLOQUEIOS
                </h3>
                <p className="text-[8.5px] font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-wider whitespace-nowrap mt-1 block">
                  DIAS SELECIONADOS FICAM INDISPONÍVEIS NO SITE DE AGENDAMENTO
                </p>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center bg-[#f2f8fc] dark:bg-slate-800/80 p-2 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-inner">
                  <button type="button" onClick={() => setMesAtual(new Date(ano, mesIndex - 1, 1))} className="w-9 h-9 flex items-center justify-center text-slate-500 bg-white dark:bg-slate-700 rounded-xl shadow-xs font-black text-xs cursor-pointer">◀</button>
                  <span className="text-xs font-black uppercase text-blue-950 dark:text-white tracking-widest">{nomeMes}</span>
                  <button type="button" onClick={() => setMesAtual(new Date(ano, mesIndex + 1, 1))} className="w-9 h-9 flex items-center justify-center text-slate-500 bg-white dark:bg-slate-700 rounded-xl shadow-xs font-black text-xs cursor-pointer">▶</button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-black text-slate-400 uppercase">
                  <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-black">
                  {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2 opacity-0" />
                  ))}

                  {Array.from({ length: totalDiasMes }, (_, i) => i + 1).map(dia => {
                    const dObj = new Date(ano, mesIndex, dia)
                    const iso = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`
                    const isBloqueado = diasBloqueados.includes(iso)
                    const isToday = iso === todayIso

                    let estiloDia = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                    if (isBloqueado) estiloDia = 'bg-red-600 text-white font-black shadow-md border-red-600'
                    else if (isToday) estiloDia = 'bg-white text-blue-600 font-black border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20'

                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => setDiasBloqueados(prev => prev.includes(iso) ? prev.filter(d => d !== iso) : [...prev, iso])}
                        className={`h-11 w-full rounded-2xl flex flex-col items-center justify-center font-black text-xs transition-all active:scale-90 cursor-pointer relative ${estiloDia}`}
                      >
                        <span>{dia}</span>
                        {isBloqueado && (
                          <span className="text-[6px] uppercase tracking-tighter leading-none">Bloq.</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setModalConfirmarBloqueio(true)}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs tracking-wider rounded-2xl shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer text-center"
                >
                  CONFIRMAR E SINCRONIZAR COM O SITE
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* BARRA INFERIOR PADRONIZADA COM AS 4 ABAS DA GUARDARIA */}
      <AppBottomNav 
        items={[
          { label: 'FROTA', icon: '🛶', active: tab === 'frota', onClick: () => setTab('frota') },
          { label: 'AGENDAMENTOS', icon: '📅', active: tab === 'agendamentos', onClick: () => setTab('agendamentos') },
          { label: 'BLOQUEIOS', icon: '🚫', active: tab === 'bloqueios', onClick: () => setTab('bloqueios') },
          { label: 'CLIENTES', icon: '👥', active: tab === 'clientes', onClick: () => setTab('clientes') },
        ]}
      />

      {/* MODAL PROFISSIONAL DE CADASTRO E EDIÇÃO DE CLIENTES */}
      {modalClienteAberto && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-white/80 dark:border-slate-800 overflow-hidden animate-scale-up">
            <div className="bg-[#eaf4fc] dark:bg-slate-800/90 px-6 py-4 border-b border-blue-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-[8.5px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest leading-none">ACESSO DO CLIENTE</p>
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-950 dark:text-white mt-1">
                  {formId ? 'EDITAR CLIENTE' : 'CADASTRAR NOVO CLIENTE'}
                </h3>
              </div>
              <button onClick={() => setModalClienteAberto(false)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 hover:bg-blue-50 text-slate-500 rounded-full text-xs font-bold shadow-xs cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Nome Completo</label>
                <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: Maria Silveira" className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs outline-none" />
              </div>

              <div>
                <label className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Telefone / WhatsApp (Login)</label>
                <input type="tel" value={formTelefone} onChange={e => setFormTelefone(e.target.value)} placeholder="(13) 99999-9999" className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Tipo de Plano</label>
                  <select value={formPlano} onChange={e => setFormPlano(e.target.value as any)} className="w-full py-3 px-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs cursor-pointer">
                    <option value="mensalista">Clube Mensalista</option>
                    <option value="guardaria">Clube Guardaria</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Vencimento</label>
                  <select 
                    onChange={e => {
                      const hoje = new Date()
                      const d = new Date(hoje.getFullYear(), hoje.getMonth() + (hoje.getDate() >= parseInt(e.target.value) ? 1 : 0), parseInt(e.target.value), 12, 0, 0)
                      setFormVencimento(d.toISOString().split('T')[0])
                    }}
                    className="w-full py-3 px-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs cursor-pointer text-center"
                  >
                    {[5, 10, 15, 20, 25, 30].map(dia => (
                      <option key={dia} value={dia}>Todo Dia {String(dia).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-[#f0f7fc] dark:bg-slate-800/80 p-2.5 rounded-2xl border border-blue-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-[8px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-wider">PRÓXIMA COBRANÇA</span>
                <span className="font-black text-slate-900 dark:text-white text-xs">
                  {formVencimento ? formVencimento.split('-').reverse().join('/') : 'Automático Supabase'}
                </span>
              </div>

              {formPlano === 'guardaria' && (
                <div>
                  <label className="text-[9.5px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider ml-1 mb-1 block">Caiaque Vinculado (Barco Próprio)</label>
                  <input type="text" value={formCaiaque} onChange={e => setFormCaiaque(e.target.value)} placeholder="Ex: #99 SOLO VERMELHO" className="w-full py-3 px-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/40 border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500 text-xs font-black text-purple-950 dark:text-purple-200 shadow-xs outline-none" />
                </div>
              )}

              <div className="pt-2 flex gap-2">
                {formId && (
                  <button type="button" onClick={() => { setModalClienteAberto(false); setModalExcluirCliente(clientes.find(c => c.id === formId) || null); }} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl border border-red-200 shadow-xs cursor-pointer active:scale-95" title="Excluir">🗑️</button>
                )}
                <button type="button" onClick={salvarCliente} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center">
                  SALVAR CLIENTE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* MODAL DE EXCLUSÃO DE CLIENTE */}
      {modalExcluirCliente && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-red-500 rounded-[2rem] shadow-2xl space-y-3">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">EXCLUSÃO DE CLIENTE</p>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">REMOVER CLIENTE</h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Deseja realmente remover o cliente <strong>{modalExcluirCliente.nome}</strong>? Ele perderá o acesso ao app cliente e histórico de agendamentos.
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalExcluirCliente(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase cursor-pointer">CANCELAR</button>
              <button type="button" onClick={excluirClienteConfirmado} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer">EXCLUIR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POP-UP DE DETALHES DO AGENDAMENTO */}
      {modalDetalhesAg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl border border-white/80 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 flex justify-between items-center text-white">
              <h3 className="text-xs font-black uppercase tracking-wider">
                DETALHES DO AGENDAMENTO
              </h3>
              <button onClick={() => setModalDetalhesAg(null)} className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-0.5">
                <p className="text-[8.5px] font-black text-slate-400 uppercase">CLIENTE</p>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{modalDetalhesAg.cliente}</h4>
                <p className="text-xs font-bold text-blue-600 dark:text-cyan-400">{modalDetalhesAg.telefone || '(13) 99781-4422'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[8px] font-black text-slate-400 uppercase">TIPO DE PLANO</p>
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase mt-0.5">{modalDetalhesAg.tipo}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[8px] font-black text-slate-400 uppercase">HORÁRIO</p>
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase mt-0.5">{modalDetalhesAg.horario} às {modalDetalhesAg.saida || '10:00'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 dark:bg-blue-950/60 p-3 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <p className="text-[8px] font-black text-blue-800 dark:text-cyan-300 uppercase">EMBARCAÇÃO (SOLO)</p>
                  <p className="text-xs font-black text-blue-950 dark:text-white uppercase mt-0.5">{modalDetalhesAg.caiaque}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[8px] font-black text-emerald-800 dark:text-emerald-300 uppercase">GUARDA-VOLUMES</p>
                  <p className="text-xs font-black text-emerald-950 dark:text-white uppercase mt-0.5">{modalDetalhesAg.guarda_volume_nome || 'ARMÁRIO #03'}</p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button 
                  type="button" 
                  onClick={() => abrirWhatsAppAgendamento(modalDetalhesAg)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  💬 CONTATAR NO WHATSAPP
                </button>
                <button 
                  type="button" 
                  onClick={() => setModalDetalhesAg(null)} 
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

