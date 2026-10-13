'use client'
import {WorkspaceHeading,WorkspaceMetric,WorkspacePanel,WorkspaceEmpty,WorkspaceNote} from '@/components/desktop/DesktopWorkspace'
import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppBottomNav from '@/components/AppBottomNav'
import { realizarCheckin, realizarCheckout } from '@/lib/actions/locacoes'
import { bloquearMensalista, renovarMensalista, arquivarMensalista, criarMensalista, listarMensalistas } from '@/lib/actions/mensalistas'
import { sincronizarDiasFechados } from '@/lib/actions/agendamentos'
import { getPerfilAtual } from '@/lib/actions/auth'
import {VisualText} from '@/components/ui/VisualContent'


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
  caiaque_id?: string | null
  mensalista_id?: string | null
  locacao_id?: string | null
  pagamento?: string | null
  status: string
  data: string
  guarda_volume_nome?: string
  telefone?: string
}

interface ClienteItem {
  id: string
  nome: string
  telefone: string
  email?: string | null
  creditos: number
  status_pagamento?: string
  tipo_plano: string | null
  data_vencimento: string | null // YYYY-MM-DD
  bloqueado: boolean
  caiaque_vinculado?: string | null
  arquivado?: boolean
  arquivado_em?: string | null
}

type ClienteRecord = Omit<ClienteItem, 'telefone'> & { telefone: string | null }

interface LocacaoAtiva {
  id: string
  agendamento_id: string | null
  caiaques_ids: string[]
  status: string
  pagamento: string | null
}

interface AgendamentoRecord {
  id: string
  mensalista_id: string | null
  mensalista_nome: string | null
  caiaque_id: string | null
  status: string
  data_reserva: string
  horario_reserva: string
  saida: string | null
  observacoes: string | null
  mensalista: { nome: string; telefone: string | null; tipo_plano: string | null } | { nome: string; telefone: string | null; tipo_plano: string | null }[] | null
}

export default function GuardariaClient() {
  const [tab, setTab] = useState<'frota' | 'agendamentos' | 'bloqueios' | 'clientes'>('frota')
  const [operacaoPendente, setOperacaoPendente] = useState<string | null>(null)
  const travaOperacao = useRef(false)
  const consultaAtual = useRef(0)

  // FROTA
  const [caiaques, setCaiaques] = useState<CaiaqueItem[]>([])
  const [locacoesAtivas, setLocacoesAtivas] = useState<string[]>([])
  const [verMaisFrota, setVerMaisFrota] = useState(false)

  // AGENDAMENTOS
  const [dataAgendamento, setDataAgendamento] = useState<Date>(new Date())
  const dataConsultaIso = `${dataAgendamento.getFullYear()}-${String(dataAgendamento.getMonth() + 1).padStart(2, '0')}-${String(dataAgendamento.getDate()).padStart(2, '0')}`
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
  const [modalRenovarCliente, setModalRenovarCliente] = useState<ClienteItem | null>(null)
  
  // FORMULÁRIO DO CLIENTE
  const [formId, setFormId] = useState<string | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formPlano, setFormPlano] = useState<string | null>('mensalista')
  const [formVencimento, setFormVencimento] = useState('')
  const [formCaiaque, setFormCaiaque] = useState('')

  // ESTADOS PARA O MODAL DE DETALHES DO AGENDAMENTO
  const [modalDetalhesAg, setModalDetalhesAg] = useState<AgendamentoItem | null>(null)

  // CAMPO DE E-MAIL NO FORMULÁRIO DE CLIENTE
  const [formEmail, setFormEmail] = useState('')

  // Embarque e retorno usam os mesmos fluxos autenticados da recepção.
  const lancarAgendamentoAoMar = async (ag: AgendamentoItem) => {
    if (travaOperacao.current) return
    if (!ag.mensalista_id || (!ag.caiaque_id && !['guardaria','combo_mensalista_guardaria'].includes(ag.tipo))) return showToast('Vincule o aluno e um caiaque cadastrado antes de embarcar.', 'warning')
    if (ag.locacao_id || !['pendente', 'confirmado'].includes(ag.status)) return showToast('Este agendamento não está disponível para um novo embarque.', 'warning')
    travaOperacao.current = true
    setOperacaoPendente(ag.id)
    try {
      const result = await realizarCheckin({
        cliente: ag.cliente, telefone: ag.telefone || undefined, tipo: 'mensalista',
        mensalista_id: ag.mensalista_id, caiaques_ids: ag.caiaque_id ? [ag.caiaque_id] : [], lockers_ids: [],
        com_instrutor: false, agendamento_id: ag.id, qtd_pessoas: 1, valor_final: 0
      })
      if (!result.ok) throw new Error(result.error || 'O embarque não foi confirmado.')
      const atualizado = await carregarTudo()
      showToast(atualizado ? 'Embarque confirmado e registrado no sistema.' : 'Embarque confirmado. Recarregue a tela para atualizar os dados.', atualizado ? 'success' : 'warning')
    } catch (e: unknown) {
      showToast(mensagemErro(e, 'Não foi possível confirmar o embarque.'), 'error')
    } finally {
      travaOperacao.current = false
      setOperacaoPendente(null)
    }
  }

  const finalizarRetornoAgendamento = async (ag: AgendamentoItem) => {
    if (travaOperacao.current) return
    if (!ag.locacao_id) return showToast('Nenhuma locação ativa está vinculada a este agendamento.', 'warning')
    travaOperacao.current = true
    setOperacaoPendente(ag.id)
    try {
      const result = await realizarCheckout(ag.locacao_id, null, ag.pagamento || 'Pendente')
      if (!result.ok) throw new Error(result.error || 'O retorno não foi confirmado.')
      const atualizado = await carregarTudo()
      showToast(atualizado ? 'Retorno confirmado no sistema.' : 'Retorno confirmado. Recarregue a tela para atualizar os dados.', atualizado ? 'success' : 'warning')
    } catch (e: unknown) {
      showToast(mensagemErro(e, 'Não foi possível confirmar o retorno.'), 'error')
    } finally {
      travaOperacao.current = false
      setOperacaoPendente(null)
    }
  }

  // 2. DISPARO DAS INSTRUÇÕES DE 1º ACESSO NO WHATSAPP DO CLIENTE
  const enviarInstrucoesWhatsApp = (c: ClienteItem) => {
    const limpo = c.telefone.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `🌊 *Bem-vindo(a) à Remoterapia!* 🛶\n\n` +
      `Olá, *${c.nome}*! Seu plano *${c.tipo_plano === 'combo_mensalista_guardaria' ? 'Mensalista + Guardaria' : c.tipo_plano === 'guardaria' ? 'Guardaria' : 'Mensalista'}* já está ativo no nosso sistema.\n\n` +
      `Para agendar seus horários e escolher seu caiaque pelo celular, acesse nosso portal exclusivo:\n` +
      `🔗 https://agendamento.remoterapia.com.br\n\n` +
      `📧 *Login:* ${c.email || 'Solicite à equipe o cadastro do seu e-mail.'}\n` +
      `🔑 *Primeiro Acesso:* Use a opção de acesso ou recuperação no portal e siga as instruções enviadas ao seu e-mail.\n\n` +
      `Qualquer dúvida, estamos à disposição na base da praia! ☀️`
    )
    window.open(`https://wa.me/55${limpo}?text=${msg}`, '_blank')
  }

  // 3. FRASE OFICIAL DE CONTATO SOBRE AGENDAMENTO
  const abrirWhatsAppAgendamento = (ag: AgendamentoItem) => {
    const limpo = String(ag.telefone || '13997814422').replace(/\D/g, '')
    const msg = encodeURIComponent(`Olá ${ag.cliente}, somos da Remoterapia e gostaria de falar sobre seu agendamento.`)
    window.open(`https://wa.me/55${limpo}?text=${msg}`, '_blank')
  }

  const showToast = useCallback((msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const mensagemErro = (erro: unknown, fallback: string) => erro && typeof erro === 'object' && 'message' in erro ? String(erro.message) : fallback

  const carregarTudo = useCallback(async (): Promise<boolean> => {
    const consulta = ++consultaAtual.current
    try {
      const supabase = createClient()
      const resultados = await Promise.all([
        supabase.from('caiaques').select('*').order('id'),
        supabase.from('locacoes').select('id, agendamento_id, caiaques_ids, status, pagamento').in('status', ['ativo', 'retornando']),
        supabase.from('dias_fechados').select('data'),
        listarMensalistas(),
        supabase.from('agendamentos').select('*, mensalista:mensalistas(nome, telefone, tipo_plano)').eq('data_reserva', dataConsultaIso).order('horario_reserva', { ascending: true })
      ])
      for (const result of resultados) if (result.error) throw result.error
      if (consulta !== consultaAtual.current) return false
      const [frota, locacoes, dias, alunos, reservas] = resultados
      const ativas: LocacaoAtiva[] = locacoes.data ?? []
      setCaiaques(frota.data ?? [])
      setLocacoesAtivas(ativas.flatMap(l => l.caiaques_ids ?? []).map(String))
      setDiasBloqueados((dias.data ?? []).map((d: { data: string }) => d.data))
      setClientes((alunos.data ?? []).filter((c: ClienteRecord) => !c.arquivado && !c.arquivado_em).map((c: ClienteRecord) => ({
        id: c.id, nome: c.nome, telefone: c.telefone || '', email: c.email || null,
        tipo_plano: c.tipo_plano, creditos: Number(c.creditos) || 0, status_pagamento: c.status_pagamento,
        data_vencimento: c.data_vencimento || null, bloqueado: !!c.bloqueado,
        caiaque_vinculado: c.caiaque_vinculado || null
      })))
      setAgendamentos((reservas.data ?? []).map((a: AgendamentoRecord) => {
        const aluno = Array.isArray(a.mensalista) ? a.mensalista[0] : a.mensalista
        const locacao = ativas.find(l => l.agendamento_id === a.id)
        return {
          id: a.id, cliente: aluno?.nome || a.mensalista_nome || 'Aluno',
          tipo: aluno?.tipo_plano || '', horario: a.horario_reserva || '', saida: a.saida || '',
          caiaque: a.caiaque_id ? '#'+a.caiaque_id : 'Sem caiaque vinculado', caiaque_id: a.caiaque_id,
          status: a.status, data: a.data_reserva, telefone: aluno?.telefone || undefined,
          mensalista_id: a.mensalista_id, locacao_id: locacao?.id || null, pagamento: locacao?.pagamento || null,
          guarda_volume_nome: a.observacoes?.includes('Armário') ? a.observacoes : undefined
        }
      }))
      return true
    } catch (e: unknown) {
      if (consulta === consultaAtual.current) showToast(mensagemErro(e, 'Não foi possível carregar os dados da guardaria.'), 'error')
      return false
    }
  }, [dataConsultaIso, showToast])

  useEffect(() => {
    let ativo = true
    void Promise.resolve().then(() => { if (ativo) return carregarTudo() })
    return () => { ativo = false; consultaAtual.current += 1 }
  }, [carregarTudo])

  // CÁLCULO INTELIGENTE DO STATUS FINANCEIRO
  const getStatusCliente = (c: ClienteItem): { status: 'ativo' | 'pendente' | 'debito'; label: string; cor: string } => {
    if (c.bloqueado) {
      return { status: 'debito', label: 'BLOQUEADO', cor: 'bg-slate-800 text-white' }
    }
    if (c.status_pagamento && c.status_pagamento !== 'ativo') {
      return { status: 'pendente', label: 'AGUARDANDO PAGAMENTO', cor: 'bg-amber-100 text-amber-800 border-amber-200' }
    }
    if (!c.data_vencimento) {
      return { status: 'pendente', label: 'SEM VENCIMENTO DEFINIDO', cor: 'bg-amber-100 text-amber-800 border-amber-200' }
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
    setFormEmail('')
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
    setFormEmail(c.email || '')
    setFormPlano(c.tipo_plano)
    setFormVencimento(c.data_vencimento || '')
    setFormCaiaque(c.caiaque_vinculado || '')
    setModalClienteAberto(true)
  }

  const salvarCliente = async () => {
    if (travaOperacao.current) return
    if (!formNome.trim()) return showToast('Informe o nome completo do cliente.', 'warning')
    const telLimpo = formTelefone.replace(/\D/g, '')
    if (!telLimpo || telLimpo.length < 10) return showToast('Informe o WhatsApp (login) com DDD.', 'warning')

    travaOperacao.current = true
    setOperacaoPendente(formId || 'novo-cliente')
    try {
      const perfil = await getPerfilAtual()
      if (!perfil?.ativo) throw new Error('Sua sessão não permite alterar clientes.')
      const supabase = createClient()
      const dataVenc = formVencimento || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

      if (formId) {
        const { data: salvo, error } = await supabase.from('mensalistas').update({
          nome: formNome.toUpperCase().trim(),
          telefone: telLimpo,
          email: formEmail.trim().toLowerCase() || null,
          tipo_plano: formPlano,
          data_vencimento: dataVenc,
          caiaque_vinculado: ['guardaria', 'combo_mensalista_guardaria'].includes(formPlano || '') ? formCaiaque : null
        }).eq('id', formId).is('arquivado_em', null).select('id').maybeSingle()
        if (error || !salvo) throw new Error('A alteração do cliente não foi confirmada.')

        setClientes(prev => prev.map(c => c.id === formId ? {
          ...c, nome: formNome.toUpperCase().trim(), telefone: telLimpo, email: formEmail.trim().toLowerCase() || null,
          tipo_plano: formPlano, data_vencimento: dataVenc,
          caiaque_vinculado: ['guardaria', 'combo_mensalista_guardaria'].includes(formPlano || '') ? formCaiaque : undefined
        } : c))
        showToast('Cliente atualizado no Supabase!')
      } else {
        if (!formPlano) throw new Error('Selecione um plano para cadastrar o cliente.')
        const result = await criarMensalista({
          nome: formNome.toUpperCase().trim(), telefone: telLimpo, email: formEmail.trim().toLowerCase() || undefined,
          tipo_plano: formPlano as 'mensalista' | 'guardaria', data_vencimento: dataVenc,
          caiaque_vinculado: ['guardaria', 'combo_mensalista_guardaria'].includes(formPlano) ? formCaiaque : undefined
        })
        if (!result.ok || !result.data) throw new Error(result.error || 'Cadastro não confirmado.')
        const data = result.data as typeof result.data & { email?: string | null }

        setClientes(prev => [{
          id: data.id, nome: data.nome, telefone: data.telefone || '', email: data.email || null, creditos: Number(data.creditos) || 0,
          tipo_plano: data.tipo_plano, data_vencimento: data.data_vencimento, status_pagamento: data.status_pagamento,
          bloqueado: false, caiaque_vinculado: data.caiaque_vinculado
        }, ...prev])
        showToast('Cliente cadastrado no Supabase!')
      }
      setModalClienteAberto(false)
    } catch (e: unknown) {
      showToast(mensagemErro(e, 'Falha ao salvar o cliente.'), 'error')
    } finally { travaOperacao.current = false; setOperacaoPendente(null) }
  }

  const alternarBloqueioCliente = async (id: string) => {
    if (travaOperacao.current) return
    const cliente = clientes.find(c => c.id === id)
    if (!cliente) return
    travaOperacao.current = true
    setOperacaoPendente(id)
    try {
      const novo = !cliente.bloqueado
      const result = await bloquearMensalista(id, novo)
      if (!result.ok) throw new Error(result.error || 'O bloqueio não foi confirmado.')
      setClientes(prev => prev.map(c => c.id === id ? { ...c, bloqueado: novo } : c))
      showToast(novo ? 'Cliente bloqueado no sistema.' : 'Cliente desbloqueado no sistema.', novo ? 'warning' : 'success')
    } catch (e: unknown) {
      showToast(mensagemErro(e, 'Não foi possível atualizar o bloqueio.'), 'error')
    } finally { travaOperacao.current = false; setOperacaoPendente(null) }
  }

  const renovarMensalidadeManual = async (id: string) => {
    if (travaOperacao.current) return
    const cliente = clientes.find(c => c.id === id)
    if (!cliente) return
    travaOperacao.current = true
    setOperacaoPendente(id)
    try {
      const result = await renovarMensalista(id)
      if (!result.ok) throw new Error(result.error || 'A renovação não foi confirmada.')
      setModalRenovarCliente(null)
      const atualizado = await carregarTudo()
      showToast(atualizado ? 'Renovação manual confirmada no sistema.' : 'Renovação confirmada. Recarregue a tela para atualizar o vencimento.', atualizado ? 'success' : 'warning')
    } catch (e: unknown) {
      showToast(mensagemErro(e, 'Não foi possível renovar o cliente.'), 'error')
    } finally { travaOperacao.current = false; setOperacaoPendente(null) }
  }

  const excluirClienteConfirmado = async () => {
    if (!modalExcluirCliente || travaOperacao.current) return
    const cliente = modalExcluirCliente
    travaOperacao.current = true
    setOperacaoPendente(cliente.id)
    try {
      const result = await arquivarMensalista(cliente.id)
      if (!result.ok) throw new Error(result.error || 'O arquivamento não foi confirmado.')
      setClientes(prev => prev.filter(c => c.id !== cliente.id))
      setModalExcluirCliente(null)
      showToast('Cliente arquivado. O histórico foi preservado.', 'success')
    } catch (e: unknown) {
      showToast(mensagemErro(e, 'Não foi possível arquivar o cliente.'), 'error')
    } finally { travaOperacao.current = false; setOperacaoPendente(null) }
  }

  const sincronizarBloqueios = async () => {
    if (travaOperacao.current) return
    travaOperacao.current = true
    setOperacaoPendente('bloqueios')
    try {
      const result = await sincronizarDiasFechados(diasBloqueados)
      if (!result.ok) throw new Error(result.error || 'As alterações do calendário não foram confirmadas.')
      const atualizado = await carregarTudo()
      setModalConfirmarBloqueio(false)
      showToast(atualizado ? 'Disponibilidade sincronizada com o portal.' : 'Alterações confirmadas. Recarregue o calendário.', atualizado ? 'success' : 'warning')
    } catch (e: unknown) {
      await carregarTudo()
      showToast(mensagemErro(e, 'Não foi possível concluir a sincronização. Confira as datas salvas.'), 'error')
    } finally { travaOperacao.current = false; setOperacaoPendente(null) }
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
                <BrandLabel text={toast.tipo === 'success' ? '✅' : toast.tipo === 'warning' ? '⚠️' : toast.tipo === 'error' ? '❌' : '🛶'}/>
              </span>
              <p className="text-[11px] font-black leading-snug text-slate-900 dark:text-white">
                {toast.msg}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rt-guardaria-workspace flex-1 overflow-y-auto p-4 space-y-4 pb-36 no-scrollbar w-full min-h-0"><div className="dw-only"><WorkspaceHeading eyebrow="Embarcações e mensalistas" title="Guardaria" description="Acompanhe a frota, os vínculos dos clientes e o calendário da base."/></div>
        
        {/* ============================================================== */}
        {/* ABA 4: CLIENTES & ACESSOS (REESTRUTURADA E PROFISSIONAL)       */}
        {/* ============================================================== */}
        {tab === 'clientes' && (
          <div className="space-y-4">
            
            {/* CABEÇALHO DA ABA COM BOTÃO ADICIONAR */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-blue-900/70 dark:text-cyan-400 uppercase tracking-widest"><VisualText id="copy-fd304c7dcf77" defaultText={"GERENCIAR ACESSOS"}/></p>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight"><VisualText id="copy-7c20d3e6e010" defaultText={"CLIENTES ("}/>{clientes.length})
                </h3>
              </div>
              
              <button
                type="button"
                onClick={abrirModalNovoCliente}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span><VisualText id="copy-83bec46f3dba" defaultText={" ADICIONAR"}/></button>
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
                    onClick={() => setFiltroCliente(f.id as typeof filtroCliente)}
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
            <div className="dw-mobile"><div className="space-y-3.5">
              {clientesFiltrados.length === 0 ? (
                <div className="bg-white/95 dark:bg-slate-900/95 p-8 rounded-[2rem] text-center border border-white/60 text-slate-400 text-xs font-bold">
                  Nenhum cliente encontrado neste filtro.
                </div>
              ) : (
                clientesFiltrados.map(c => {
                  const infoStatus = getStatusCliente(c)
                  const dataFormatada = c.data_vencimento ? c.data_vencimento.split('-').reverse().join('/') : 'Não definido'
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
                          <BrandIcon name="edit"/>
                        </button>
                      </div>

                      {/* NOME DO CLIENTE E BARCO VINCULADO */}
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase leading-tight">
                          {c.nome}
                        </h3>
                        {c.caiaque_vinculado && (
                          <span className="text-[9.5px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wide block mt-1">
                            <BrandIcon name="ship"/><VisualText id="copy-79d7f2efb590" defaultText={" Vaga "}/>{c.caiaque_vinculado}<VisualText id="copy-e9fed59c27db" defaultText={" (Exclusivo)"}/></span>
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
                            <BrandIcon name="smartphone"/><VisualText id="copy-0cb82b514771" defaultText={" WHATSAPP / CONTATO"}/></span>
                          <span className="font-black text-slate-900 dark:text-white text-xs mt-1 block">
                            {c.telefone}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider block ${
                            isGuardaria ? 'text-purple-700 dark:text-purple-300' : 'text-blue-600 dark:text-cyan-400'
                          }`}>
                            <BrandIcon name="calendar"/><VisualText id="copy-d505a2a0f3c6" defaultText={" VENCIMENTO"}/></span>
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
                          <span><BrandIcon name="message"/></span><VisualText id="copy-f9950a7401d1" defaultText={" 1º Acesso Zap"}/></button>

                        <button
                          type="button"
                          disabled={Boolean(operacaoPendente)}
                          onClick={() => setModalRenovarCliente(c)}
                          className="py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                        ><VisualText id="copy-15096bdb043f" defaultText={"Renovar"}/></button>

                        <button
                          type="button"
                          disabled={Boolean(operacaoPendente)}
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
            </div></div>

          <div className="dw-only"><WorkspacePanel title="Clientes da guardaria" description="Edite o cadastro e consulte o plano de cada cliente."><div className="dw-table-scroll"><table className="dw-table"><thead><tr><th><VisualText id="copy-7e5c1c31a503" defaultText={"Cliente"}/></th><th><VisualText id="copy-febc9d3ad876" defaultText={"Plano / vínculo"}/></th><th><VisualText id="copy-8ebdb9026ec1" defaultText={"Vencimento"}/></th><th><VisualText id="copy-4cd2e20b06b4" defaultText={"Situação"}/></th><th><VisualText id="copy-e0bae5b225aa" defaultText={"Ações"}/></th></tr></thead><tbody>{clientesFiltrados.map(c=><tr key={c.id}><td><strong>{c.nome}</strong><small>{c.telefone}</small></td><td>{c.tipo_plano||'Não informado'}<small>{c.caiaque_vinculado?('Vaga '+c.caiaque_vinculado):'Sem vínculo'}</small></td><td>{c.data_vencimento?c.data_vencimento.split('-').reverse().join('/'):'Não definido'}</td><td><span className="dw-badge">{getStatusCliente(c).label}</span></td><td><div className="dw-actions"><button type="button" onClick={()=>abrirModalEditarCliente(c)} ><BrandIcon name="edit" size={15}/><VisualText id="copy-098194dd0f03" defaultText={"Editar"}/></button><button type="button" onClick={()=>enviarInstrucoesWhatsApp(c)} ><BrandIcon name="message" size={15}/><VisualText id="copy-c4d43fc6332f" defaultText={"Instruções"}/></button><button type="button" onClick={()=>setModalRenovarCliente(c)} disabled={Boolean(operacaoPendente)}><BrandIcon name="refresh" size={15}/><VisualText id="copy-788939bd9b44" defaultText={"Renovar"}/></button><button type="button" onClick={()=>alternarBloqueioCliente(c.id)} disabled={Boolean(operacaoPendente)}><BrandIcon name="lock" size={15}/>{c.bloqueado?'Desbloquear':'Bloquear'}</button></div></td></tr>)}</tbody></table></div>{!clientesFiltrados.length&&<WorkspaceEmpty title="Nenhum registro nesta seleção"/>}</WorkspacePanel></div></div>
        )}

        {/* ABA 1: FROTA */}
        {tab === 'frota' && (
          <div className="space-y-5"><div className="dw-only"><div className="dw-metrics"><WorkspaceMetric label="Embarcações na base" value={qtdNaBase} icon="anchor"/><WorkspaceMetric label="Embarcações na água" value={qtdNaAgua} icon="waves"/><WorkspaceMetric label="Frota cadastrada" value={caiaques.length} icon="ship"/></div></div><div className="dw-only"><WorkspacePanel title="Embarcações e vínculos" description="Consulta completa da frota e dos proprietários vinculados."><div className="dw-table-scroll"><table className="dw-table"><thead><tr><th><VisualText id="copy-e11dc9c052ae" defaultText={"Embarcação"}/></th><th><VisualText id="copy-0b34a8446ef9" defaultText={"Modelo"}/></th><th><VisualText id="copy-4814c87e7b03" defaultText={"Proprietário / vínculo"}/></th><th><VisualText id="copy-80032df4af84" defaultText={"Localização"}/></th></tr></thead><tbody>{caiaques.map(c=><tr key={c.id}><td><strong>{c.nome}</strong><small><VisualText id="copy-abee33907066" defaultText={"Identificação "}/>{c.id}</small></td><td>{c.tipo||'Não informado'}</td><td>{c.dono||'Frota da base'}</td><td><span className={'dw-badge '+(locacoesAtivas.includes(String(c.id))?'':'is-good')}>{locacoesAtivas.includes(String(c.id))?'Na água':'Na base'}</span></td></tr>)}</tbody></table></div>{!caiaques.length&&<WorkspaceEmpty title="Nenhum registro nesta seleção"/>}</WorkspacePanel></div>
            <div className="dw-mobile"><div className="bg-white/95 dark:bg-slate-900/95 p-5 border-t-4 !border-t-emerald-500 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/10 rounded-[2.2rem]">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3.5"><VisualText id="copy-68aa6dcee083" defaultText={"EMBARCAÇÕES"}/></h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/90 dark:bg-emerald-950/40 rounded-2xl p-4 text-center border-2 border-emerald-400 dark:border-emerald-600 shadow-sm">
                  <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider"><VisualText id="copy-4c6e3107528a" defaultText={"NA BASE"}/></p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                    {qtdNaBase}
                  </p>
                </div>
                <div className="bg-sky-50/90 dark:bg-sky-950/40 rounded-2xl p-4 text-center border-2 border-sky-400 dark:border-sky-600 shadow-sm">
                  <p className="text-[10px] font-black text-sky-800 dark:text-cyan-400 uppercase tracking-wider"><VisualText id="copy-903b803e0540" defaultText={"NA ÁGUA"}/></p>
                  <p className="text-3xl font-black text-sky-600 dark:text-cyan-400 tabular-nums mt-1">
                    {qtdNaAgua}
                  </p>
                </div>
              </div>
            </div></div>

            {/* STATUS DA FROTA COM CAIAQUE EM BLOCO SEPARADO */}
            <div className="dw-mobile"><div className="bg-white/95 dark:bg-slate-900/95 p-5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/10 rounded-[2.5rem]">
              
              {/* CABEÇALHO COM BADGE TEMPO REAL */}
              <div className="flex justify-between items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white leading-none"><VisualText id="copy-ec302612d3c3" defaultText={"STATUS DA FROTA"}/></h4>
                  <p className="text-[8.5px] font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-widest mt-1"><VisualText id="copy-76c0e263c038" defaultText={"MONITORAMENTO E VÍNCULOS"}/></p>
                </div>
                <span className="text-[8.5px] font-black text-blue-700 dark:text-cyan-300 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><VisualText id="copy-683444d52867" defaultText={" TEMPO REAL"}/></span>
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
                          <span className={`text-2xl select-none ${naAgua ? 'animate-pulse' : ''}`}><BrandIcon name="ship"/></span>
                          <span className="text-[8px] font-black uppercase leading-none mt-0.5">#{c.id}</span>
                        </div>

                        {/* 2. DADOS DA EMBARCAÇÃO E VÍNCULO */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {c.dono ? (
                              <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <BrandIcon name="users"/> {c.dono}
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <BrandIcon name="anchor"/><VisualText id="copy-6688ba2f748a" defaultText={" FROTA BASE"}/></span>
                            )}

                            {isGuardaria && (
                              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500"><VisualText id="copy-88bf879d0828" defaultText={"GUARDARIA"}/></span>
                            )}
                          </div>

                          <h5 className="font-black text-sm text-slate-900 dark:text-white uppercase leading-tight truncate mt-1">
                            {c.nome}
                          </h5>

                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mt-0.5">
                            <BrandLabel text={naAgua ? '🌊 Navegando no Mar' : (c.tipo ? `Modelo: ${c.tipo}` : 'Disponível na Base')}/>
                          </span>
                        </div>
                      </div>

                      {/* 3. STATUS NÁUTICO À DIREITA */}
                      <div className="shrink-0 text-right">
                        <span className={`text-[9.5px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border inline-block shadow-xs ${badgeStatusCor}`}>
                          <BrandLabel text={statusTexto}/>
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

            </div></div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 2: AGENDAMENTOS (REGRAS OFICIAIS, GUARDA-VOLUMES E COTA)   */}
        {/* ============================================================== */}
        {tab === 'agendamentos' && (
          <div className="space-y-3.5">
            
            {/* SELETOR DE DATA NÁUTICO DIRETO */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-[2rem] shadow-xl border border-white/60 dark:border-slate-800 flex justify-between items-center">
              <button aria-label="Anterior" 
                type="button" 
                onClick={() => { const d = new Date(dataAgendamento); d.setDate(d.getDate() - 1); setDataAgendamento(d); }} 
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
              >
                <BrandIcon name="left"/>
              </button>
              <div className="text-center cursor-pointer" onClick={() => setDataAgendamento(new Date())}>
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider"><VisualText id="copy-38595ef9ea48" defaultText={"AGENDAMENTOS DE"}/></p>
                <p className="text-xs font-black text-blue-600 dark:text-cyan-400 uppercase">
                  {dataAgendamento.toLocaleDateString('pt-BR')} {dataAgendamento.toDateString() === new Date().toDateString() ? '(HOJE)' : ''}
                </p>
              </div>
              <button aria-label="Próximo" 
                type="button" 
                onClick={() => { const d = new Date(dataAgendamento); d.setDate(d.getDate() + 1); setDataAgendamento(d); }} 
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
              >
                <BrandIcon name="right"/>
              </button>
            </div>

            {/* STATUS RESUMO DO DIA */}
            <div className="flex justify-between items-center px-2">
              <span className="text-[9.5px] font-black text-blue-950 dark:text-cyan-300 uppercase tracking-wider"><VisualText id="copy-ee71c6098f73" defaultText={"SAÍDAS AGENDADAS ("}/>{agendamentos.length})
              </span>
              <span className="text-[8.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800"><VisualText id="copy-c80041da291b" defaultText={"Entra no Fechamento do Dia"}/></span>
            </div>

            {/* LISTA DE SAÍDAS DO DIA */}
            <div className="dw-mobile"><div className="space-y-3.5">
              {agendamentos.length === 0 ? (
                <div className="bg-white/95 dark:bg-slate-900/95 p-8 rounded-[2rem] text-center border border-white/60 dark:border-slate-800 text-slate-400 text-xs font-bold">
                  Nenhum agendamento para esta data.
                </div>
              ) : (
                agendamentos.map(ag => {
                  const isGuardaria = ag.tipo === 'guardaria'
                  const emNavegacao = Boolean(ag.locacao_id)

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
                            <span className="text-lg leading-none mt-0.5 select-none"><BrandIcon name="ship"/></span>
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
                              <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><VisualText id="copy-87f8c86939ef" defaultText={"SOLO (1 PESSOA)"}/></span>
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
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block"><VisualText id="copy-353aa6ad0fc7" defaultText={"GUARDA-VOLUMES"}/></span>
                          <span className="font-black text-blue-900 dark:text-cyan-300">
                            <BrandIcon name="archive"/> {ag.guarda_volume_nome || 'ARMÁRIO #03'}
                          </span>
                        </div>
                        <div className="border-r border-slate-200 dark:border-slate-700">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block">
                            {isGuardaria ? 'PLANO' : 'COTA SEMANAL'}
                          </span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400">
                            <BrandLabel text={isGuardaria ? 'LIVRE (TER-DOM)' : '⏱️ 1/2 SEMANA'}/>
                          </span>
                        </div>
                        <div>
                          <span className="text-[7.5px] font-black text-slate-400 uppercase block"><VisualText id="copy-0f1c3e371e22" defaultText={"TURNO OFICIAL"}/></span>
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
                            disabled={Boolean(operacaoPendente)}
                            onClick={() => finalizarRetornoAgendamento(ag)}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer text-center"
                          >
                            <BrandIcon name="anchor"/><VisualText id="copy-52b5efb762aa" defaultText={" FINALIZAR RETORNO (BASE)"}/></button>
                        ) : (
                          <button 
                            type="button" 
                            disabled={Boolean(operacaoPendente) || !['pendente', 'confirmado'].includes(ag.status)}
                            onClick={() => lancarAgendamentoAoMar(ag)}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 transition-all cursor-pointer text-center"
                          >
                            <BrandIcon name="waves"/><VisualText id="copy-1918112a5cda" defaultText={" LANÇAR P/ ÁGUA (EMBARCAR)"}/></button>
                        )}

                        <button 
                          type="button" 
                          onClick={() => setModalDetalhesAg(ag)}
                          className="px-3.5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <BrandIcon name="clipboard"/><VisualText id="copy-98f794912065" defaultText={" Detalhes"}/></button>
                      </div>

                    </div>
                  )
                })
              )}
            </div></div>

          <div className="dw-only"><WorkspacePanel title="Reservas da guardaria" description="Consulte os detalhes. A operação de embarque e retorno fica no celular."><div className="dw-table-scroll"><table className="dw-table"><thead><tr><th><VisualText id="copy-29557db3458b" defaultText={"Horário"}/></th><th><VisualText id="copy-9a3a80ad40fe" defaultText={"Cliente"}/></th><th><VisualText id="copy-06b688f49919" defaultText={"Serviço"}/></th><th><VisualText id="copy-2da73ba56026" defaultText={"Embarcação"}/></th><th><VisualText id="copy-a30581e1f75e" defaultText={"Situação"}/></th><th><VisualText id="copy-9500b177b309" defaultText={"Ações"}/></th></tr></thead><tbody>{agendamentos.map(a=><tr key={a.id}><td>{a.horario} — {a.saida}</td><td><strong>{a.cliente}</strong></td><td>{a.tipo==='guardaria'?'Guardaria':'Mensalista'}</td><td>{a.caiaque}</td><td><span className="dw-badge">{a.locacao_id?'Em navegação':a.status}</span></td><td><div className="dw-actions"><button type="button" onClick={()=>setModalDetalhesAg(a)} ><BrandIcon name="clipboard" size={15}/><VisualText id="copy-4fb6881d3f05" defaultText={"Detalhes"}/></button></div></td></tr>)}</tbody></table></div>{!agendamentos.length&&<WorkspaceEmpty title="Nenhum registro nesta seleção"/>}</WorkspacePanel></div></div>
        )}

        {/* ============================================================== */}
        {/* ABA 3: BLOQUEIOS (CABEÇALHO NÁUTICO REFINADO)                  */}
        {/* ============================================================== */}
        {tab === 'bloqueios' && (
          <div className="space-y-4 dw-calendar-layout">
            <div className="bg-white/95 dark:bg-slate-900/95 shadow-xl border border-white/80 dark:border-slate-800 rounded-[2.5rem] overflow-hidden">
              
              {/* CABEÇALHO NÁUTICO INTEGRADO EM CAPS LOCK EM LINHA ÚNICA */}
              <div className="bg-[#eaf4fc] dark:bg-slate-800/80 px-4 py-4 border-b border-blue-100 dark:border-slate-700 text-center">
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-950 dark:text-white leading-tight"><VisualText id="copy-329cb55386e3" defaultText={"CALENDÁRIO DE DISPONIBILIDADE E BLOQUEIOS"}/></h3>
                <p className="text-[8.5px] font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-wider whitespace-nowrap mt-1 block"><VisualText id="copy-45e262fb97c6" defaultText={"DIAS SELECIONADOS FICAM INDISPONÍVEIS NO SITE DE AGENDAMENTO"}/></p>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center bg-[#f2f8fc] dark:bg-slate-800/80 p-2 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-inner">
                  <button aria-label="Anterior" type="button" onClick={() => setMesAtual(new Date(ano, mesIndex - 1, 1))} className="w-9 h-9 flex items-center justify-center text-slate-500 bg-white dark:bg-slate-700 rounded-xl shadow-xs font-black text-xs cursor-pointer"><BrandIcon name="left"/></button>
                  <span className="text-xs font-black uppercase text-blue-950 dark:text-white tracking-widest">{nomeMes}</span>
                  <button aria-label="Próximo" type="button" onClick={() => setMesAtual(new Date(ano, mesIndex + 1, 1))} className="w-9 h-9 flex items-center justify-center text-slate-500 bg-white dark:bg-slate-700 rounded-xl shadow-xs font-black text-xs cursor-pointer"><BrandIcon name="right"/></button>
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
                          <span className="text-[6px] uppercase tracking-tighter leading-none"><VisualText id="copy-325e8f4f0ea0" defaultText={"Bloq."}/></span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  disabled={Boolean(operacaoPendente)}
                          onClick={() => setModalConfirmarBloqueio(true)}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs tracking-wider rounded-2xl shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer text-center"
                ><VisualText id="copy-d48010fa30b6" defaultText={"CONFIRMAR E SINCRONIZAR COM O SITE"}/></button>
              </div>

            </div>
          <div className="dw-only"><WorkspaceNote title="Calendário da base"><p><VisualText id="copy-08da0d2f7349" defaultText={"As datas selecionadas ficam bloqueadas para agendamento depois da confirmação e sincronização."}/></p><p><strong>{diasBloqueados.length}</strong><VisualText id="copy-e59a3c8e0312" defaultText={" dia(s) selecionado(s)."}/></p><ul><li>Vermelho: dia bloqueado</li><li>Azul: data atual</li></ul></WorkspaceNote></div></div>
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
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-white/80 dark:border-slate-800 overflow-hidden animate-scale-up">
            <div className="bg-[#eaf4fc] dark:bg-slate-800/90 px-6 py-4 border-b border-blue-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-[8.5px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest leading-none"><VisualText id="copy-1930f4e78c63" defaultText={"ACESSO DO CLIENTE"}/></p>
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-950 dark:text-white mt-1">
                  {formId ? 'EDITAR CLIENTE' : 'CADASTRAR NOVO CLIENTE'}
                </h3>
              </div>
              <button aria-label="Fechar janela" onClick={() => setModalClienteAberto(false)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 hover:bg-blue-50 text-slate-500 rounded-full text-xs font-bold shadow-xs cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label htmlFor="rt-guardariaclient-1" className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block"><VisualText id="copy-98a1620da093" defaultText={"Nome Completo"}/></label>
                <input id="rt-guardariaclient-1" type="text" value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: Maria Silveira" className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs outline-none" />
              </div>

              <div>
                <label htmlFor="rt-guardariaclient-2" className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block"><VisualText id="copy-cccd710db5c5" defaultText={"Telefone / WhatsApp"}/></label>
                <input id="rt-guardariaclient-2" type="tel" value={formTelefone} onChange={e => setFormTelefone(e.target.value)} placeholder="(13) 99999-9999" className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs outline-none" />
              </div>

              <div>
                <label htmlFor="rt-guardariaclient-3" className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block"><VisualText id="copy-9bf9e02ea801" defaultText={"E-mail de acesso ao portal"}/></label>
                <input id="rt-guardariaclient-3" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="rt-guardariaclient-4" className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block"><VisualText id="copy-e8ea70261a4a" defaultText={"Tipo de Plano"}/></label>
                  <select id="rt-guardariaclient-4" value={formPlano || ''} onChange={e => setFormPlano(e.target.value || null)} className="w-full py-3 px-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs cursor-pointer">
                    <option value="">Sem plano</option>
                    <option value="combo_mensalista_guardaria">Mensalista + Guardaria</option>
                    <option value="mensalista">Clube Mensalista</option>
                    <option value="guardaria">Clube Guardaria</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="rt-guardariaclient-5" className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block"><VisualText id="copy-e1ef80499136" defaultText={"Vencimento"}/></label>
                  <select id="rt-guardariaclient-5" 
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
                <span className="text-[8px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-wider"><VisualText id="copy-d29cec6675b2" defaultText={"PRÓXIMA COBRANÇA"}/></span>
                <span className="font-black text-slate-900 dark:text-white text-xs">
                  {formVencimento ? formVencimento.split('-').reverse().join('/') : 'Automático Supabase'}
                </span>
              </div>

              {['guardaria', 'combo_mensalista_guardaria'].includes(formPlano || '') && (
                <div>
                  <label htmlFor="rt-guardariaclient-6" className="text-[9.5px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider ml-1 mb-1 block"><VisualText id="copy-2897aab83a3e" defaultText={"Caiaque Vinculado (Barco Próprio)"}/></label>
                  <input id="rt-guardariaclient-6" type="text" value={formCaiaque} onChange={e => setFormCaiaque(e.target.value)} placeholder="Ex: #99 SOLO VERMELHO" className="w-full py-3 px-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/40 border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500 text-xs font-black text-purple-950 dark:text-purple-200 shadow-xs outline-none" />
                </div>
              )}

              <div className="pt-2 flex gap-2">
                {formId && (
                  <button type="button" onClick={() => { setModalClienteAberto(false); setModalExcluirCliente(clientes.find(c => c.id === formId) || null); }} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl border border-red-200 shadow-xs cursor-pointer active:scale-95" title="Excluir"><BrandIcon name="trash"/></button>
                )}
                <button type="button" disabled={Boolean(operacaoPendente)} onClick={salvarCliente} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center"><VisualText id="copy-e5420ad39c4c" defaultText={"SALVAR CLIENTE"}/></button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* MODAL DE ARQUIVAMENTO DE CLIENTE */}
      {modalExcluirCliente && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-red-500 rounded-[2rem] shadow-2xl space-y-3">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider"><VisualText id="copy-e423bafd430f" defaultText={"ARQUIVAMENTO DE CLIENTE"}/></p>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-3cebee65ef62" defaultText={"ARQUIVAR CLIENTE"}/></h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300"><VisualText id="copy-c78d77deeb31" defaultText={"Deseja arquivar o cliente "}/><strong>{modalExcluirCliente.nome}</strong><VisualText id="copy-8b06fbf97345" defaultText={"? O acesso será desativado e o histórico de agendamentos será preservado."}/></p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalExcluirCliente(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase cursor-pointer"><VisualText id="copy-8b7147e8f980" defaultText={"CANCELAR"}/></button>
              <button type="button" disabled={Boolean(operacaoPendente)} onClick={excluirClienteConfirmado} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"><VisualText id="copy-9cf14ee457f8" defaultText={"ARQUIVAR"}/></button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POP-UP DE DETALHES DO AGENDAMENTO */}
      {modalDetalhesAg && (
        <div data-rt-modal className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl border border-white/80 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 flex justify-between items-center text-white">
              <h3 className="text-xs font-black uppercase tracking-wider"><VisualText id="copy-186cf52449f5" defaultText={"DETALHES DO AGENDAMENTO"}/></h3>
              <button aria-label="Fechar janela" onClick={() => setModalDetalhesAg(null)} className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-0.5">
                <p className="text-[8.5px] font-black text-slate-400 uppercase"><VisualText id="copy-ee5db35f8ca1" defaultText={"CLIENTE"}/></p>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{modalDetalhesAg.cliente}</h4>
                <p className="text-xs font-bold text-blue-600 dark:text-cyan-400">{modalDetalhesAg.telefone || '(13) 99781-4422'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[8px] font-black text-slate-400 uppercase"><VisualText id="copy-0321607e73c5" defaultText={"TIPO DE PLANO"}/></p>
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase mt-0.5">{modalDetalhesAg.tipo}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[8px] font-black text-slate-400 uppercase"><VisualText id="copy-cb72ec26ffda" defaultText={"HORÁRIO"}/></p>
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase mt-0.5">{modalDetalhesAg.horario} às {modalDetalhesAg.saida || '10:00'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 dark:bg-blue-950/60 p-3 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <p className="text-[8px] font-black text-blue-800 dark:text-cyan-300 uppercase"><VisualText id="copy-4eb2b0b46887" defaultText={"EMBARCAÇÃO (SOLO)"}/></p>
                  <p className="text-xs font-black text-blue-950 dark:text-white uppercase mt-0.5">{modalDetalhesAg.caiaque}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[8px] font-black text-emerald-800 dark:text-emerald-300 uppercase"><VisualText id="copy-92fa53533902" defaultText={"GUARDA-VOLUMES"}/></p>
                  <p className="text-xs font-black text-emerald-950 dark:text-white uppercase mt-0.5">{modalDetalhesAg.guarda_volume_nome || 'ARMÁRIO #03'}</p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button 
                  type="button" 
                  onClick={() => abrirWhatsAppAgendamento(modalDetalhesAg)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BrandIcon name="message"/><VisualText id="copy-b422fc810dd3" defaultText={" CONTATAR NO WHATSAPP"}/></button>
                <button 
                  type="button" 
                  onClick={() => setModalDetalhesAg(null)} 
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase rounded-xl cursor-pointer"
                ><VisualText id="copy-1b5b41289c6c" defaultText={"Fechar"}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
      {modalRenovarCliente && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-[2rem] shadow-2xl space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white"><VisualText id="copy-22be12b1bcf5" defaultText={"Confirmar recebimento manual"}/></h3>
            <p className="text-xs text-slate-600 dark:text-slate-300"><VisualText id="copy-deb27ad56998" defaultText={"Confirme apenas se você já recebeu a mensalidade de "}/><strong>{modalRenovarCliente.nome}</strong><VisualText id="copy-ad59558704da" defaultText={". O sistema registrará o pagamento manual e renovará o plano."}/></p>
            <div className="flex gap-2">
              <button type="button" disabled={Boolean(operacaoPendente)} onClick={() => setModalRenovarCliente(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase"><VisualText id="copy-23fe4088ca98" defaultText={"Cancelar"}/></button>
              <button type="button" disabled={Boolean(operacaoPendente)} onClick={() => renovarMensalidadeManual(modalRenovarCliente.id)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">{operacaoPendente ? 'Salvando...' : 'Já recebi a mensalidade'}</button>
            </div>
          </div>
        </div>
      )}
      {modalConfirmarBloqueio && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-[2rem] shadow-2xl space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white"><VisualText id="copy-49a8844dec8e" defaultText={"Sincronizar calendário"}/></h3>
            <p className="text-xs text-slate-600 dark:text-slate-300"><VisualText id="copy-1df77f8b8ef7" defaultText={"Confirmar as alterações de disponibilidade para o portal de alunos?"}/></p>
            <div className="flex gap-2">
              <button type="button" disabled={Boolean(operacaoPendente)} onClick={() => setModalConfirmarBloqueio(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase"><VisualText id="copy-db6d708fa021" defaultText={"Cancelar"}/></button>
              <button type="button" disabled={Boolean(operacaoPendente)} onClick={sincronizarBloqueios} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase">{operacaoPendente ? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

