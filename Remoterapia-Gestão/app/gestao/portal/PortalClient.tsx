'use client'
import PlansWorkspace from '@/components/desktop/PlansWorkspace'
import {WorkspaceHeading,WorkspaceMetric,WorkspacePanel,WorkspaceEmpty,WorkspaceNote} from '@/components/desktop/DesktopWorkspace'
import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { realizarCheckin } from '@/lib/actions/locacoes'
import { sincronizarDiasFechados } from '@/lib/actions/agendamentos'
import {salvarConfiguracaoOperacao} from '@/lib/actions/configuracoes'
import CustomersDesktop from '@/components/desktop/CustomersDesktop'
import AppBottomNav from '@/components/AppBottomNav'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



// ─── Interfaces ────────────────────────────────────────────────────────────
interface AgendamentoItem {
  id: string
  cliente: string
  tipo: 'mensalista' | 'guardaria' | 'evento'
  horario: string
  saida: string
  caiaque: string
  caiaque_id?: string
  locker_id?: string
  status: string
  data: string
  telefone?: string
  mensalista_id?: string
  evento_id?: string
  voucher?: string
  is_novo_cliente?: boolean
}

type TipoPlanoCliente = 'mensalista' | 'guardaria' | 'combo_mensalista_guardaria' | null

function normalizarTipoPlano(valor: unknown): TipoPlanoCliente {
  if (valor === null || valor === 'mensalista' || valor === 'guardaria' || valor === 'combo_mensalista_guardaria') return valor
  throw new Error('Tipo de plano não reconhecido.')
}

interface ClienteItem {
  id: string
  nome: string
  telefone: string
  email?: string
  cpf?: string
  tipo_plano: TipoPlanoCliente
  plano_valor: number
  valor_primeiro_mes?: number | null
  creditos?: number
  dia_vencimento?: number
  data_vencimento?: string
  bloqueado: boolean
  caiaque_vinculado?: string
  precisa_trocar_senha?: boolean
  codigo_provisorio?: string
  is_online?: boolean
  created_at?: string
}

interface EventoItem {
  id: string
  titulo: string
  descricao?: string
  data_evento: string
  horario_inicio?: string
  horario_fim?: string
  horario: string
  local: string
  vagas_total: number
  vagas_ocupadas: number
  preco: number
  status: 'aberto' | 'lotado' | 'cancelado' | 'encerrado' | 'pendente'
  roteiro?: RoteiroPasso[] | null
  itens_inclusos?: string
  o_que_levar?: string
  observacoes?: string
}

interface RoteiroPasso {
  hora: string
  descricao: string
}

interface InscricaoItem {
  id: string
  evento_id: string
  nome?: string
  nome_completo?: string
  telefone?: string
  telefone_whatsapp?: string
  email?: string
  voucher?: string
  codigo_voucher?: string
  valor_pago?: number
  valor_total?: number
  metodo_pagamento?: string
  caiaque_alocado?: string
  embarcacoes_alocadas?: string
  status_pagamento?: string
  created_at?: string
  is_novo_cliente?: boolean
}

// ─── Helpers monetários BRL ──────────────────────────────────────────────────
function formatarMoedaBRL(valor: number | string): string {
  const num = typeof valor === 'string' ? parseFloat(valor.replace(/\D/g, '')) / 100 : valor
  if (isNaN(num)) return '0,00'
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function parseMoedaBRL(valorFormatado: string): number {
  const limpo = valorFormatado.replace(/\D/g, '')
  return limpo ? parseFloat(limpo) / 100 : 0
}
function handleMoedaInput(e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) {
  const rawDigits = e.target.value.replace(/\D/g, '')
  if (!rawDigits) { setter(''); return }
  const num = parseFloat(rawDigits) / 100
  setter(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
}
// ─────────────────────────────────────────────────────────────────────────────

const ROTEIRO_NASCERSOL: RoteiroPasso[] = []

export type ManagementSection='agendamentos'|'bloqueios'|'clientes'|'eventos'|'planos'
export default function PortalClient({section}:{section?:ManagementSection}={}) {
  const [planosEditando, setPlanosEditando] = useState(false)
  const scrollRefAg = useRef<HTMLDivElement>(null)
  const [isDownAg, setIsDownAg] = useState(false)
  const [startXAg, setStartXAg] = useState(0)
  const [scrollLeftAg, setScrollLeftAg] = useState(0)

  const handleMouseDownAg = (e: React.MouseEvent) => {
    if (!scrollRefAg.current) return
    setIsDownAg(true)
    setStartXAg(e.pageX - scrollRefAg.current.offsetLeft)
    setScrollLeftAg(scrollRefAg.current.scrollLeft)
  }
  const handleMouseLeaveAg = () => setIsDownAg(false)
  const handleMouseUpAg = () => setIsDownAg(false)
  const handleMouseMoveAg = (e: React.MouseEvent) => {
    if (!isDownAg || !scrollRefAg.current) return
    e.preventDefault()
    const x = e.pageX - scrollRefAg.current.offsetLeft
    const walk = (x - startXAg) * 2
    scrollRefAg.current.scrollLeft = scrollLeftAg - walk
  }

  const scrollRefCl = useRef<HTMLDivElement>(null)
  const [isDownCl, setIsDownCl] = useState(false)
  const [startXCl, setStartXCl] = useState(0)
  const [scrollLeftCl, setScrollLeftCl] = useState(0)

  const handleMouseDownCl = (e: React.MouseEvent) => {
    if (!scrollRefCl.current) return
    setIsDownCl(true)
    setStartXCl(e.pageX - scrollRefCl.current.offsetLeft)
    setScrollLeftCl(scrollRefCl.current.scrollLeft)
  }
  const handleMouseLeaveCl = () => setIsDownCl(false)
  const handleMouseUpCl = () => setIsDownCl(false)
  const handleMouseMoveCl = (e: React.MouseEvent) => {
    if (!isDownCl || !scrollRefCl.current) return
    e.preventDefault()
    const x = e.pageX - scrollRefCl.current.offsetLeft
    const walk = (x - startXCl) * 2
    scrollRefCl.current.scrollLeft = scrollLeftCl - walk
  }

  const [legacyTab, setTab] = useState<'agendamentos' | 'bloqueios' | 'clientes' | 'eventos' | 'planos'>('agendamentos')
  const tab=section??legacyTab
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  // ── AGENDAMENTOS ──────────────────────────────────────────────────────────
  const [dataAgendamento, setDataAgendamento] = useState<Date>(new Date())
  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>([])
  const [filtroAg, setFiltroAg] = useState<'todos' | 'mensalista' | 'guardaria' | 'evento'>('todos')

  // ── BLOQUEIOS ─────────────────────────────────────────────────────────────
  const [mesAtual, setMesAtual] = useState<Date>(new Date())
  const [diasBloqueados, setDiasBloqueados] = useState<string[]>([])
  const [modalConfirmarBloqueio, setModalConfirmarBloqueio] = useState(false)

  // ── CLIENTES ──
  const [buscaCliente, setBuscaCliente] = useState('')
  const [filtroCliente, setFiltroCliente] = useState<'todos' | 'mensalista' | 'guardaria' | 'portal'>('todos')
  const [clientes, setClientes] = useState<ClienteItem[]>([])
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [formId, setFormId] = useState<string | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formCpf, setFormCpf] = useState('')
  const [formPlano, setFormPlano] = useState<'mensalista' | 'guardaria'>('mensalista')
  const [formPlanoAtual, setFormPlanoAtual] = useState<TipoPlanoCliente>(null)
  const [formDiaVencimentoAtual, setFormDiaVencimentoAtual] = useState(5)
  const [formValorStr, setFormValorStr] = useState('200,00')
  const [formCreditos, setFormCreditos] = useState(2)
  const [formDiaVencimento, setFormDiaVencimento] = useState(5)
  const [formVencimento, setFormVencimento] = useState('')
  const [formCaiaque, setFormCaiaque] = useState('')
  
  
  
  


  // ── PLANOS ────────────────────────────────────────────────────────────────
  const [planoMensalistaValor, setPlanoMensalistaValor] = useState('150,00')
  const [planoGuardariaValor, setPlanoGuardariaValor] = useState('150,00')
  const [planoRemadas, setPlanoRemadas] = useState(2)
  const [planoCorte, setPlanoCorte] = useState('19:00')
  const [planoManutencao, setPlanoManutencao] = useState('Segunda-feira')

  const precosSaving=useRef(false)
  const [salvandoPrecos,setSalvandoPrecos]=useState(false)
  const salvarPrecos = async () => {
    if(precosSaving.current)return
    precosSaving.current=true;setSalvandoPrecos(true)
    try {
      const result=await salvarConfiguracaoOperacao({mensalista:parseMoedaBRL(planoMensalistaValor),guardaria:parseMoedaBRL(planoGuardariaValor),remadas_semanais:planoRemadas,horario_corte:planoCorte.trim(),dia_manutencao:planoManutencao.trim()})
      if(!result.ok){showToast(result.error||'Configuração não confirmada.','error');return}
      showToast('Configurações salvas com sucesso!','success');setPlanosEditando(false)
    } catch {showToast('Não foi possível salvar as configurações.','error')}
    finally{precosSaving.current=false;setSalvandoPrecos(false)}
  }

  // ── EVENTOS ───────────────────────────────────────────────────────────────
  const [eventos, setEventos] = useState<EventoItem[]>([])
  const [modalEventoAberto, setModalEventoAberto] = useState(false)
  const [modalEventoModo, setModalEventoModo] = useState<'novo' | 'nascer' | 'editar'>('novo')
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null)
  const [formEvTitulo, setFormEvTitulo] = useState('')
  const [formEvData, setFormEvData] = useState('')
  const [formEvHoraInicio, setFormEvHoraInicio] = useState('05:00')
  const [formEvHoraFim, setFormEvHoraFim] = useState('08:00')
  const [formEvLocal, setFormEvLocal] = useState('')
  const [formEvPrecoStr, setFormEvPrecoStr] = useState('120,00')
  const [formEvVagas, setFormEvVagas] = useState(20)
  const [formEvObservacoes, setFormEvObservacoes] = useState('')
  const [formEvComRoteiro, setFormEvComRoteiro] = useState(false)
  const [formEvRoteiro, setFormEvRoteiro] = useState<RoteiroPasso[]>([...ROTEIRO_NASCERSOL])

  // ── PEDIDOS ───────────────────────────────────────────────────────────────
  const [eventoSelecionadoPedidos, setEventoSelecionadoPedidos] = useState<EventoItem | null>(null)
  const [inscricoes, setInscricoes] = useState<InscricaoItem[]>([])
  const [buscaPedido, setBuscaPedido] = useState('')

  // ── CANCELAMENTO ──────────────────────────────────────────────────────────
  const [eventoCancelando, setEventoCancelando] = useState<EventoItem | null>(null)

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // ─── Helpers de código provisório ─────────────────────────────────────────
  

  // ─── CARREGAR AGENDAMENTOS (apenas quando data muda) ──────────────────────
  const carregarAgendamentos = useCallback(async () => {
    try {
      const supabase = createClient()
      const dataIso = dataAgendamento.toISOString().split('T')[0]
      const { data: agData, error: agError } = await supabase
        .from('agendamentos')
        .select('*, mensalistas(nome, telefone, tipo_plano)')
        .eq('data_reserva', dataIso)
        .in('status', ['pendente','confirmado'])
        .order('created_at', { ascending: true })
      if (agError) throw agError
      if (agData) {
        setAgendamentos(agData.map((a: any) => ({
          id: a.id,
          cliente: a.mensalistas?.nome || a.cliente_nome || a.mensalista_nome || 'Aluno',
          tipo: (a.mensalistas?.tipo_plano === 'guardaria' ? 'guardaria' : a.is_evento ? 'evento' : 'mensalista') as AgendamentoItem['tipo'],
          horario: (a.horario_reserva || a.horario || 'Horário não informado').split(' às ')[0],
          saida: a.saida || a.horario_fim || (a.horario_reserva || a.horario || '').split(' às ')[1] || 'Fim não informado',
          caiaque: a.caiaque_vinculado || a.caiaque_id || 'Caiaque Solo',
          caiaque_id: a.caiaque_id, locker_id: a.locker_id,
          status: a.status || 'confirmado',
          data: a.data_reserva,
          telefone: a.mensalistas?.telefone || a.telefone,
          mensalista_id: a.mensalista_id,
          evento_id: a.evento_id,
          voucher: a.voucher,
          is_novo_cliente: !!a.is_novo_cliente,
        })))
      }
    } catch {
      showToast('Erro ao carregar agendamentos.', 'error')
    }
  }, [dataAgendamento])

  // ─── CARREGAR DADOS ESTÁTICOS (mount + mutações) ──────────────────────────
  const carregarDadosEstaticos = useCallback(async () => {
    try {
      const supabase = createClient()
      const [dfRes, mRes, evRes, confRes] = await Promise.all([
        supabase.from('dias_fechados').select('data'),
        supabase.from('mensalistas').select('id,nome,telefone,email,cpf,tipo_plano,plano_valor,creditos,dia_vencimento,data_vencimento,bloqueado,caiaque_vinculado,tipo_embarcacao,primeiro_acesso,precisa_trocar_senha,created_at').is('arquivado_em',null).order('nome', { ascending: true }),
        supabase.from('eventos').select('*').order('data_evento', { ascending: true }),
        supabase.from('configuracoes').select('valor').eq('chave', 'tabela_clubes').maybeSingle()
      ])
      if (dfRes.error||mRes.error||evRes.error||confRes.error) throw new Error('Consulta não concluída')
      if (dfRes.data) setDiasBloqueados(dfRes.data.map((d: any) => d.data))
      if (mRes.data) {
        setClientes(mRes.data.map(m => {
          const tipoPlano = normalizarTipoPlano(m.tipo_plano)
          const planoValor = Number(m.plano_valor ?? 0)
          if (!Number.isFinite(planoValor) || planoValor < 0) throw new Error('Valor de plano inválido.')
          return ({
          id: m.id, nome: m.nome, telefone: m.telefone, email: m.email || undefined,
          cpf: m.cpf || undefined,
          tipo_plano: tipoPlano, is_online: tipoPlano === null, created_at: m.created_at || undefined,
          plano_valor: planoValor,
          valor_primeiro_mes: null,
          creditos: tipoPlano === null ? 0 : (m.creditos ?? 0), dia_vencimento: m.dia_vencimento || undefined,
          data_vencimento: m.data_vencimento || undefined, bloqueado: !!m.bloqueado,
          caiaque_vinculado: m.caiaque_vinculado || m.tipo_embarcacao || undefined,
          precisa_trocar_senha: !!m.precisa_trocar_senha,
          codigo_provisorio: undefined,
          })
        }))
      }
            if (evRes.data) setEventos(evRes.data)
      if (confRes?.data?.valor) {
        const v = confRes.data.valor
        if (v.mensalista) setPlanoMensalistaValor(formatarMoedaBRL(v.mensalista))
        if (v.guardaria) setPlanoGuardariaValor(formatarMoedaBRL(v.guardaria))
        if (v.remadas_semanais) setPlanoRemadas(v.remadas_semanais)
        if (v.horario_corte) setPlanoCorte(v.horario_corte)
        if (v.dia_manutencao) setPlanoManutencao(v.dia_manutencao)
                      }
    } catch {
      showToast('Erro ao carregar dados do portal.', 'error')
    }
  }, [])

  useEffect(() => { carregarAgendamentos() }, [carregarAgendamentos])
  useEffect(() => { carregarDadosEstaticos() }, [carregarDadosEstaticos])

  // ─── AÇÕES AGENDAMENTOS ───────────────────────────────────────────────────
  const liberarSaidaAoMar = async (ag:AgendamentoItem) => {
 if(ag.tipo==='evento'||!ag.mensalista_id)return showToast('Use a recepção para conferir ingresso e pagamento do evento.','error')
 try {
 const res=await realizarCheckin({cliente:ag.cliente,telefone:ag.telefone,tipo:'mensalista',mensalista_id:ag.mensalista_id,agendamento_id:ag.id,caiaques_ids:ag.caiaque_id?[ag.caiaque_id]:[],lockers_ids:ag.locker_id?[ag.locker_id]:[],com_instrutor:false,qtd_pessoas:1})
 if(!res.ok)throw new Error(res.error||'Embarque não confirmado.')
 await carregarAgendamentos();showToast('Embarque confirmado.','success')
 }catch(e){showToast(e instanceof Error?e.message:'Falha ao liberar saída.','error')}
}

  // ─── AÇÕES BLOQUEIOS ──────────────────────────────────────────────────────
  const toggleBloqueioDia = (dataIso: string) => {
    setDiasBloqueados(prev => prev.includes(dataIso) ? prev.filter(d => d !== dataIso) : [...prev, dataIso])
  }
  const salvarBloqueiosSincronizados = async () => {
 const res=await sincronizarDiasFechados(diasBloqueados)
 if(!res.ok)return showToast(res.error||'Calendário não confirmado.','error')
 setModalConfirmarBloqueio(false);await carregarDadosEstaticos();showToast('Calendário salvo.','success')
}

  // ─── AÇÕES CLIENTES ───────────────────────────────────────────────────────
  

  

  const clienteSaving = useRef(false)
  const [salvandoCliente,setSalvandoCliente]=useState(false)
  const salvarCliente = async () => {
 if(clienteSaving.current)return
 if(!formNome.trim()||!formTelefone.trim())return showToast('Preencha nome e WhatsApp.','error')
 clienteSaving.current=true;setSalvandoCliente(true)
 try {
 const s=createClient()
 if(modoEdicao&&formId){
 const {data,error}=await s.from('mensalistas').update({nome:formNome.trim(),telefone:formTelefone.replace(/\D/g,''),email:formEmail.trim().toLowerCase()||null,cpf:formCpf.replace(/\D/g,'')||null}).eq('id',formId).select('id').maybeSingle()
 if(error||!data)throw new Error('Alteração não confirmada.')
 }else{
 if(!formPlano)return showToast('Selecione um plano.','error')
 const {data,error}=await s.from('mensalistas').insert({nome:formNome.trim(),telefone:formTelefone.replace(/\D/g,''),email:formEmail.trim().toLowerCase()||null,cpf:formCpf.replace(/\D/g,'')||null,tipo_plano:formPlano,plano_valor:parseMoedaBRL(formValorStr),creditos:0,dia_vencimento:formDiaVencimento,data_vencimento:formVencimento||null,tipo_embarcacao:formCaiaque||null,status_pagamento:'pendente',bloqueado:false,primeiro_acesso:true,precisa_trocar_senha:false}).select('id').single()
 if(error||!data)throw new Error('Cadastro não confirmado.')
 }
 setModalClienteAberto(false);await carregarDadosEstaticos();showToast('Dados salvos. O acesso usa cadastro com e-mail confirmado no Portal.','success')
 }catch(e){showToast(e instanceof Error?e.message:'Erro ao salvar cliente.','error')}finally{clienteSaving.current=false;setSalvandoCliente(false)}
}

  const abrirModalNovoAluno = () => {
    setFormId(null); setModoEdicao(false); setFormNome(''); setFormTelefone('')
    setFormEmail(''); setFormCpf(''); setFormPlano('mensalista'); setFormValorStr(planoMensalistaValor)
    setFormCreditos(2); setFormDiaVencimento(5); setFormVencimento(''); setFormCaiaque('')

    setModalClienteAberto(true)
  }
  const abrirModalEditarAluno = (c: ClienteItem) => {
    setFormId(c.id); setModoEdicao(true); setFormNome(c.nome); setFormTelefone(c.telefone)
    setFormEmail(c.email || ''); setFormCpf(c.cpf || '')
    setFormPlanoAtual(c.tipo_plano); setFormDiaVencimentoAtual(c.dia_vencimento || 5)
    setModalClienteAberto(true)
  }

  // ─── AÇÕES EVENTOS ────────────────────────────────────────────────────────
  const resetFormEvento = () => {
    setEventoEditandoId(null); setFormEvTitulo(''); setFormEvData('')
    setFormEvHoraInicio(''); setFormEvHoraFim('')
    setFormEvLocal(''); setFormEvPrecoStr('0,00'); setFormEvVagas(0)
    setFormEvObservacoes(''); setFormEvComRoteiro(false); setFormEvRoteiro([])
  }
  const abrirModalNovoEvento = () => { resetFormEvento(); setModalEventoModo('novo'); setModalEventoAberto(true); }
  const abrirModalNascerDoSol = () => { resetFormEvento(); setModalEventoModo('nascer'); setModalEventoAberto(true); }
  const abrirModalEditarEvento = (ev: EventoItem) => {
    setModalEventoModo('editar');
    setEventoEditandoId(ev.id); setFormEvTitulo(ev.titulo); setFormEvData(ev.data_evento)
    setFormEvHoraInicio(ev.horario_inicio || ev.horario?.split(' às ')[0] || '05:00')
    setFormEvHoraFim(ev.horario_fim || ev.horario?.split(' às ')[1] || '08:00')
    setFormEvLocal(ev.local); setFormEvPrecoStr(formatarMoedaBRL(ev.preco)); setFormEvVagas(ev.vagas_total || 20)
    setFormEvObservacoes(ev.observacoes || ev.itens_inclusos || '')
    const temRoteiro = Array.isArray(ev.roteiro) && ev.roteiro.length > 0
    setFormEvComRoteiro(temRoteiro)
    setFormEvRoteiro(temRoteiro ? ev.roteiro! : [...ROTEIRO_NASCERSOL])
    setModalEventoAberto(true)
  }

  const salvarEvento = async () => {
 if(!formEvTitulo.trim()||!formEvData||!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(formEvHoraInicio)||formEvVagas<1)return showToast('Confira título, data, horário e vagas.','error')
 try {
 const s=createClient();const payload={titulo:formEvTitulo.trim(),data_evento:formEvData,horario:formEvHoraInicio,horario_saida:formEvHoraInicio,local:formEvLocal.trim()||'Base Remoterapia',preco:parseMoedaBRL(formEvPrecoStr),vagas_total:formEvVagas,vagas_totais:formEvVagas,roteiro:formEvComRoteiro?formEvRoteiro:null,descricao:formEvObservacoes.trim()||null,status:'aberto',ativo:true}
 const result=eventoEditandoId?await s.from('eventos').update(payload).eq('id',eventoEditandoId).select('id').maybeSingle():await s.from('eventos').insert(payload).select('id').single()
 if(result.error||!result.data)throw new Error('Evento não confirmado.')
 setModalEventoAberto(false);await carregarDadosEstaticos();showToast('Evento salvo. Cobrança online ainda pendente de configuração.','success')
 }catch(e){showToast(e instanceof Error?e.message:'Erro ao salvar evento.','error')}
}

  // ─── PEDIDOS / INGRESSOS ──────────────────────────────────────────────────
  const abrirPedidos = async (ev: EventoItem) => {
    setEventoSelecionadoPedidos(ev)
    setBuscaPedido('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('inscricoes_eventos').select('*').eq('evento_id', ev.id).order('created_at', { ascending: false })
      if(error)throw error
      setInscricoes((data||[]).map(i=>({...i,nome:i.nome_cliente,telefone:i.telefone_cliente,voucher:i.codigo_voucher,valor_pago:i.valor_pago??0})))
    } catch { showToast('Erro ao carregar pedidos.', 'error') }
  }

  const pedidosFiltrados = inscricoes.filter(i => {
    if (!buscaPedido) return true
    const q = buscaPedido.toLowerCase()
    return (i.voucher || '').toLowerCase().includes(q) || (i.nome || '').toLowerCase().includes(q)
  })
  const totalArrecadado = inscricoes.reduce((acc, i) => acc + (i.valor_pago || 0), 0)

  const enviarZapInscrito = (i: InscricaoItem) => {
    const limpo = (i.telefone || '').replace(/\D/g, '')
    if (!limpo) return
    const msg = encodeURIComponent('Olá, *' + i.nome + '*! Obrigado por sua inscrição. 🌊')
    window.open('https://wa.me/55' + limpo + '?text=' + msg, '_blank')
  }

  // ─── CANCELAMENTO INTELIGENTE ─────────────────────────────────────────────
  const confirmarCancelamentoEvento = async () => {
 if(!eventoCancelando)return
 try {
 const s=createClient();const {data,error}=await s.rpc('cancelar_evento',{p_id:eventoCancelando.id})
 if(error||!data)throw new Error(error?.message||'Cancelamento não confirmado.')
 setEventoCancelando(null);await carregarDadosEstaticos();await carregarAgendamentos();showToast('Evento cancelado. Registros e valores recebidos foram preservados.','success')
 }catch(e){showToast(e instanceof Error?e.message:'Erro ao cancelar evento.','error')}
}

  // ─── Helpers de calendário ────────────────────────────────────────────────
  const ano = mesAtual.getFullYear()
  const mesIndex = mesAtual.getMonth()
  const totalDiasMes = new Date(ano, mesIndex + 1, 0).getDate()
  const nomeMes = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  // ─── Filtro de agendamentos ───────────────────────────────────────────────
  const agFiltrados = agendamentos.filter(ag => filtroAg === 'todos' || ag.tipo === filtroAg)
  const contFiltro = (t: typeof filtroAg) => agendamentos.filter(ag => t === 'todos' || ag.tipo === t).length

  // ─── Badge de status de evento ────────────────────────────────────────────
  const badgeEvento = (status: string) => {
    if (status === 'aberto') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (status === 'cancelado') return 'bg-red-100 text-red-800 border-red-200'
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }
  const labelEvento = (status: string) => {
    if (status === 'aberto') return '● Publicado no Site'
    if (status === 'cancelado') return '● Cancelado'
    return '● Pendente'
  }

  return (
    <>
      {!section&&<><div className="dw-only"><WorkspaceHeading eyebrow="Relacionamento com os alunos" title="Alunos e reservas" description="Consulte as reservas, organize os alunos e configure os serviços publicados no Portal."/></div><AppBottomNav
        items={[
          { label: 'AGENDAMENTOS', icon: '📅', active: tab === 'agendamentos', onClick: () => setTab('agendamentos') },
          { label: 'BLOQUEIOS', icon: '🚫', active: tab === 'bloqueios', onClick: () => setTab('bloqueios') },
          { label: 'CLIENTES', icon: '👥', active: tab === 'clientes', onClick: () => setTab('clientes') },
          { label: 'EVENTOS', icon: '🎟️', active: tab === 'eventos', onClick: () => setTab('eventos') },
          { label: 'PLANOS', icon: '💳', active: tab === 'planos', onClick: () => setTab('planos') },
        ]}
      /></>}
      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 pointer-events-none animate-fade-in slide-in-from-top-4 duration-300 ease-out">
          <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-xl border bg-white/95 dark:bg-slate-900/95 flex items-center gap-3 border-l-[6px] ${toast.tipo === 'success' ? '!border-l-emerald-500' : toast.tipo === 'warning' ? '!border-l-amber-500' : toast.tipo === 'error' ? '!border-l-red-500' : '!border-l-blue-600'}`}>
            <span className="text-lg shrink-0"><BrandLabel text={toast.tipo === 'success' ? '✅' : toast.tipo === 'warning' ? '⚠️' : toast.tipo === 'error' ? '❌' : '🛶'}/></span>
            <p className="text-[11px] font-black text-slate-900 dark:text-white">{toast.msg}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ABA 1: AGENDAMENTOS                                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'agendamentos' && (
        <div className="rt-module-agendamentos space-y-3"><div className="dw-only"><div className="dw-metrics"><WorkspaceMetric label="Reservas do dia" value={agendamentos.length} icon="calendar"/><WorkspaceMetric label="Mensalistas" value={agendamentos.filter(a=>a.tipo==='mensalista').length} icon="users"/><WorkspaceMetric label="Em navegação" value={agendamentos.filter(a=>a.status==='em_navegacao').length} icon="waves"/></div></div>
          {/* Seletor de data */}
          <div className="flex justify-between items-center bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dw-ag-date">
            <button aria-label="Anterior" onClick={() => { const d = new Date(dataAgendamento); d.setDate(d.getDate() - 1); setDataAgendamento(d) }} className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-xl font-black text-xs cursor-pointer"><BrandIcon name="left"/></button>
            <div className="text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block"><VisualText id="copy-6243e1ba13ab" defaultText={"AGENDAMENTOS DE"}/></span>
              <span className="text-xs font-black text-blue-950 dark:text-white uppercase">{dataAgendamento.toLocaleDateString('pt-BR')}</span>
            </div>
            <button aria-label="Próximo" onClick={() => { const d = new Date(dataAgendamento); d.setDate(d.getDate() + 1); setDataAgendamento(d) }} className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-xl font-black text-xs cursor-pointer"><BrandIcon name="right"/></button>
          </div>

          {/* Filtros rápidos */}
          <div 
            ref={scrollRefAg}
            onMouseDown={handleMouseDownAg}
            onMouseLeave={handleMouseLeaveAg}
            onMouseUp={handleMouseUpAg}
            onMouseMove={handleMouseMoveAg}
            className={`dw-ag-filters flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 scroll-smooth touch-pan-x pe-4 ${isDownAg ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          >
            {([['todos','Todos'], ['mensalista','🛶 Mensalista'], ['guardaria','🏖️ Guardaria'], ['evento','🎟️ Nascer do Sol']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFiltroAg(val)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${filtroAg === val ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
                <BrandLabel text={label}/> ({contFiltro(val as any)})
              </button>
            ))}
          </div>

          {/* Lista de agendamentos */}
          <div className="dw-mobile"><div className="space-y-3">
            {agFiltrados.length === 0 ? (
              <div className="bg-white/95 dark:bg-slate-900/95 p-8 rounded-[2rem] text-center border border-white/60 text-slate-400 text-xs font-bold">Nenhum agendamento para esta data.</div>
            ) : agFiltrados.map(ag => {
              const isMar = ag.status === 'em_navegacao'
              const borderColor = ag.tipo === 'guardaria' ? '!border-l-amber-500' : ag.tipo === 'evento' ? '!border-l-indigo-500' : '!border-l-blue-600'
              return (
                <div key={ag.id} className={`bg-white dark:bg-slate-900 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-800 border-l-[6px] ${borderColor} shadow-sm space-y-2.5`}>
                  {/* Horário + status */}
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-700 px-2 py-0.5 rounded"><BrandIcon name="clock"/> {ag.horario} às {ag.saida}</span>
                    <span className={`text-[8.5px] font-black uppercase px-2.5 py-1 rounded-lg ${isMar ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-emerald-50 text-emerald-700'}`}>
                      <BrandLabel text={isMar ? '🌊 Em Navegação' : '● Confirmado'}/>
                    </span>
                  </div>
                  {/* Nome + WhatsApp */}
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight">{ag.cliente}</h4>
                    {ag.telefone && <p className="text-[10px] font-bold text-blue-600 dark:text-cyan-400 mt-0.5"><BrandIcon name="smartphone"/> {ag.telefone}</p>}
                  </div>
                  {/* Tags: Tipo + Caiaque lado a lado */}
                  <div className="flex flex-wrap gap-1.5">
                    {ag.tipo === 'mensalista' && <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-cyan-300 border border-blue-100 dark:border-blue-900 px-2 py-0.5 rounded-lg"><BrandIcon name="ship"/><VisualText id="copy-08e9c4634334" defaultText={" Clube Mensalista"}/></span>}
                    {ag.tipo === 'guardaria' && <span className="text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg"><BrandIcon name="umbrella"/><VisualText id="copy-0cc3b2c69255" defaultText={" Clube Guardaria"}/></span>}
                    {ag.tipo === 'evento' && <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg"><BrandIcon name="ticket"/> <VisualLabel text={ag.voucher ? ag.voucher : 'Evento'}/></span>}
                    <span className="text-[9px] font-black bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg"><BrandIcon name="ship"/> {ag.caiaque}</span>
                  </div>
                  {/* Origem (só para eventos) */}
                  {ag.tipo === 'evento' && (
                    <p className="text-[9px] font-bold text-slate-500"><BrandLabel text={ag.is_novo_cliente ? '✨ 1ª Compra / Novo Cliente' : '🌊 Aluno Cadastrado (Portal)'}/></p>
                  )}
                  {/* Botão único de ação */}
                  {!isMar && (
                    <button onClick={() => liberarSaidaAoMar(ag)} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 transition-all">
                      <BrandIcon name="waves"/><VisualText id="copy-86c2c5ed6d63" defaultText={" Liberar Saída para o Mar"}/></button>
                  )}
                </div>
              )
            })}
          </div></div><div className="dw-only"><WorkspacePanel title="Agenda da base" description="Reservas da data e do filtro selecionados. O embarque é registrado pela equipe no celular."><div className="dw-table-scroll"><table className="dw-table"><thead><tr><th><VisualText id="copy-93cfbe07c7fb" defaultText={"Horário"}/></th><th><VisualText id="copy-718f5d3beb78" defaultText={"Aluno"}/></th><th><VisualText id="copy-42a68c6afd25" defaultText={"Serviço"}/></th><th><VisualText id="copy-49655cacb771" defaultText={"Embarcação"}/></th><th><VisualText id="copy-8bb68ca45828" defaultText={"Situação"}/></th><th><VisualText id="copy-f7bbe989efd6" defaultText={"Voucher"}/></th></tr></thead><tbody>{agFiltrados.map(a=><tr key={a.id}><td><strong>{a.horario} — {a.saida}</strong></td><td><strong>{a.cliente}</strong><small>{a.telefone||'Contato não informado'}</small></td><td><span className="dw-badge"><VisualLabel text={a.tipo==='evento'?'Evento':a.tipo==='guardaria'?'Guardaria':'Mensalista'}/></span></td><td>{a.caiaque}</td><td><span className={'dw-badge '+(a.status==='em_navegacao'?'is-good':'')}><VisualLabel text={a.status==='em_navegacao'?'Em navegação':a.status==='confirmado'?'Confirmado':a.status}/></span></td><td>{a.voucher||'—'}</td></tr>)}</tbody></table></div>{!agFiltrados.length&&<WorkspaceEmpty title="Nenhum registro nesta seleção"/>}</WorkspacePanel></div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ABA 2: BLOQUEIOS                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'bloqueios' && (
        <div className="rt-module-bloqueios space-y-4 dw-calendar-layout">
          <div className="bg-white/95 dark:bg-slate-900/95 shadow-xl border border-white/80 dark:border-slate-800 rounded-[2.5rem] p-5 space-y-4">
            <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase text-blue-950 dark:text-white"><VisualText id="copy-6e56c72bc947" defaultText={"CALENDÁRIO DE BLOQUEIOS"}/></h3>
              <p className="text-[8.5px] font-bold text-blue-600 dark:text-cyan-400 uppercase mt-0.5"><VisualText id="copy-8d15c65ae442" defaultText={"DIAS SELECIONADOS FICAM INDISPONÍVEIS NO APP"}/></p>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <button aria-label="Anterior" onClick={() => setMesAtual(new Date(ano, mesIndex - 1, 1))} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg text-xs font-black cursor-pointer"><BrandIcon name="left"/></button>
              <span className="text-xs font-black uppercase text-blue-950 dark:text-white">{nomeMes}</span>
              <button aria-label="Próximo" onClick={() => setMesAtual(new Date(ano, mesIndex + 1, 1))} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg text-xs font-black cursor-pointer"><BrandIcon name="right"/></button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center mt-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{diasBloqueados.length}<VisualText id="copy-11d2a22ef3c5" defaultText={" dia(s) bloqueado(s) neste mês"}/></span>
            </div>

            <div className="grid grid-cols-7 gap-2 mt-4 place-items-center">
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(wd => (
                <div key={wd} className="text-[10px] font-black text-slate-400 uppercase">{wd}</div>
              ))}
              {Array.from({ length: new Date(ano, mesIndex, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="w-10 h-10" />
              ))}
              {Array.from({ length: totalDiasMes }).map((_, idx) => {
                const diaNum = idx + 1;
                const dtStr = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                
                const today = new Date();
                const isTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                
                const isSelected = diasBloqueados.includes(dtStr);
                const isToday = dtStr === isTodayStr;
                
                let baseClasses = "w-10 h-10 rounded-2xl flex flex-col items-center justify-center font-bold text-xs cursor-pointer transition-all border relative ";
                if (isSelected) {
                  baseClasses += "bg-red-500 text-white shadow-md shadow-red-500/25 border-red-600";
                } else {
                  baseClasses += "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30";
                }
                if (isToday && !isSelected) {
                  baseClasses += " ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900";
                }
                
                return (
                  <button key={dtStr} onClick={() => toggleBloqueioDia(dtStr)} className={baseClasses}>
                    {diaNum}
                    {isSelected && <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[6px] font-black px-1 rounded-sm shadow-sm border border-red-200 uppercase tracking-tighter"><VisualText id="copy-936dc3eeb8bc" defaultText={"BLOQ"}/></span>}
                  </button>
                )
              })}
            </div>
            
            <div className="mt-6">
              <button onClick={() => setModalConfirmarBloqueio(true)} className="w-full py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-95"><VisualText id="copy-10572b5db230" defaultText={"Confirmar e Sincronizar com o Site"}/></button>
            </div>
          </div>
        <div className="dw-only"><WorkspaceNote title="Disponibilidade no Portal"><p><VisualText id="copy-1725f67a1873" defaultText={"Selecione os dias que devem ficar indisponíveis para os alunos. Depois, use o botão de sincronização para confirmar as alterações."}/></p><p><strong>{diasBloqueados.length}</strong><VisualText id="copy-3aa3a9f3174b" defaultText={" dia(s) selecionado(s)."}/></p><ul><li>Azul: data atual</li><li>Vermelho: dia bloqueado</li><li>Demais dias: disponibilidade normal</li></ul></WorkspaceNote></div></div>
      )}

                  {/* ═══════════════════════════════════════════════════════════ */}
      {/* ABA 3: CLIENTES                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'clientes' && (
        <div className="rt-module-clientes space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest"><VisualText id="copy-e64939f4e525" defaultText={"DIRETÓRIO"}/></p>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight"><VisualText id="copy-f87f226c6c89" defaultText={"CLIENTES CADASTRADOS ("}/>{clientes.length})</h3>
            </div><button type="button" className="rt-primary" onClick={abrirModalNovoAluno}><BrandIcon name="plus" size={18}/><VisualText id="copy-bc7a7a5fcb24" defaultText={"Novo aluno"}/></button>
          </div>
          
          <div className="space-y-3">
            {/* Campo de Busca */}
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400"><BrandIcon name="search"/></span>
              <input type="text" placeholder="Buscar por nome ou WhatsApp..." 
                value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
            </div>

            {/* Filtros Rápidos Deslizantes */}
            <div 
              ref={scrollRefCl}
              onMouseDown={handleMouseDownCl}
              onMouseLeave={handleMouseLeaveCl}
              onMouseUp={handleMouseUpCl}
              onMouseMove={handleMouseMoveCl}
              className={`flex gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth touch-pan-x pe-4 ${isDownCl ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
            >
              <button onClick={() => setFiltroCliente('todos')} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filtroCliente === 'todos' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}><VisualText id="copy-aa9258429314" defaultText={"Todos ("}/>{clientes.length})</button>
              <button onClick={() => setFiltroCliente('mensalista')} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filtroCliente === 'mensalista' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}><BrandIcon name="ship"/><VisualText id="copy-3f0f190d73f2" defaultText={" Mensalista ("}/>{clientes.filter(c => c.tipo_plano === 'mensalista' || c.tipo_plano === 'combo_mensalista_guardaria').length})</button>
              <button onClick={() => setFiltroCliente('guardaria')} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filtroCliente === 'guardaria' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}><BrandIcon name="umbrella"/><VisualText id="copy-607003c0ff41" defaultText={" Guardaria ("}/>{clientes.filter(c => c.tipo_plano === 'guardaria' || c.tipo_plano === 'combo_mensalista_guardaria').length})</button>
              <button onClick={() => setFiltroCliente('portal')} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filtroCliente === 'portal' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}><VisualText id="copy-e7df24d68605" defaultText={"Conta sem plano ("}/>{clientes.filter(c => c.is_online).length})</button>
            </div>
          </div>

          <CustomersDesktop clientes={clientes} filter={filtroCliente} search={buscaCliente} onEdit={id=>{const aluno=clientes.find(c=>c.id===id);if(aluno)abrirModalEditarAluno(aluno)}}/>
          <div className="rt-mobile-customer-list space-y-3.5">
            {(() => {
              const filtrados = clientes.filter(c => {
                if (filtroCliente !== 'todos') {
                  if (filtroCliente === 'portal' && !c.is_online) return false;
                  if (filtroCliente !== 'portal' && c.tipo_plano !== filtroCliente && c.tipo_plano !== 'combo_mensalista_guardaria') return false;
                }
                if (buscaCliente) {
                  const q = buscaCliente.toLowerCase()
                  return c.nome.toLowerCase().includes(q) || (c.telefone || '').includes(q)
                }
                return true
              });

              if (filtrados.length === 0) {
                return (
                  <div className="bg-white/95 dark:bg-slate-900/95 p-8 rounded-[2rem] text-center border border-white/60 dark:border-slate-800 text-slate-400 text-xs font-bold">
                    Nenhum cliente encontrado.
                  </div>
                )
              }

              return filtrados.map(c => {
                const isBloqueado = c.bloqueado
                const statusBg = isBloqueado ? 'bg-red-100 text-red-700 border-red-200' : c.tipo_plano === null ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                const statusText = isBloqueado ? '● Bloqueado' : c.tipo_plano === null ? 'Conta sem plano' : '● Ativo'
                
                let origemBg = 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                let origemIcon = '👤'
                let origemNome = 'Conta sem plano'
                
                if (c.tipo_plano === 'mensalista') {
                  origemBg = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-cyan-300 border-blue-100 dark:border-blue-900'
                  origemIcon = '🛶'
                  origemNome = 'Clube Mensalista'
                } else if (c.tipo_plano === 'guardaria') {
                  origemBg = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  origemIcon = '🏖️'
                  origemNome = 'Clube Guardaria'
                } else if (c.tipo_plano === 'combo_mensalista_guardaria') {
                  origemBg = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900'
                  origemIcon = '🛶'
                  origemNome = 'Mensalista + Guardaria'
                }

                const telFormatado = c.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')

                return (
                  <div key={c.id} className="bg-white dark:bg-slate-900 p-4 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-md space-y-3 transition-all relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${c.tipo_plano === 'guardaria' ? 'bg-amber-500' : (c.tipo_plano === 'mensalista' ? 'bg-blue-600' : 'bg-slate-400')}`} />
                    <div className="flex items-start justify-between pl-2">
                      <div className="flex-1 min-w-0">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 mb-2 ${origemBg}`}>
                          <BrandLabel text={origemIcon}/> {origemNome}
                        </span>
                        <h4 className="font-black text-base text-slate-900 dark:text-white uppercase leading-tight tracking-tight truncate">{c.nome}</h4>
                        <p className="text-[11px] font-bold text-blue-600 dark:text-cyan-400 mt-1"><BrandIcon name="smartphone"/> {telFormatado}</p>
                        {c.email && <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5"><BrandIcon name="mail"/> {c.email}</p>}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider border shrink-0 ml-2 ${statusBg}`}>
                        {statusText}
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700 ml-2">
                      {(c.tipo_plano === 'mensalista' || c.tipo_plano === 'combo_mensalista_guardaria') && (
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-blue-50/60 dark:bg-blue-950/40 p-2 rounded-xl border border-blue-100/60">
                            <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5"><VisualText id="copy-c10fc4790df2" defaultText={"Mensalidade"}/></span>
                            <span className="font-black text-blue-900 dark:text-cyan-300">R$ {formatarMoedaBRL(c.plano_valor)}</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700">
                            <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5"><VisualText id="copy-f20aca30b2de" defaultText={"Créditos"}/></span>
                            <span className="font-black text-slate-800 dark:text-white"><BrandIcon name="waves"/> {c.creditos ?? 2}<VisualText id="copy-cb9880ea3f50" defaultText={" / sem"}/></span>
                          </div>
                        </div>
                      )}
                      
                      {(c.tipo_plano === 'guardaria' || c.tipo_plano === 'combo_mensalista_guardaria') && (
                        <div className="grid grid-cols-1 gap-2 text-[10px]">
                          <div className="bg-amber-50/60 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-100/60">
                            <span className="text-[8px] font-black text-amber-700/70 uppercase block mb-0.5"><VisualText id="copy-d613a35361fd" defaultText={"Embarcação Vinculada"}/></span>
                            <span className="font-black text-amber-900 dark:text-amber-400 text-xs"><BrandIcon name="ship"/> {c.caiaque_vinculado || 'Nenhuma'}</span>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5"><VisualText id="copy-f6318feeabb8" defaultText={"Mensalidade"}/></span>
                              <span className="font-black text-slate-800 dark:text-white">R$ {formatarMoedaBRL(c.plano_valor)}</span>
                            </div>
                            <div className="flex-1 bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5"><VisualText id="copy-7d26a7b5451b" defaultText={"Vencimento"}/></span>
                              <span className="font-black text-slate-800 dark:text-white"><BrandIcon name="calendar"/><VisualText id="copy-13494da994eb" defaultText={" Dia "}/>{c.dia_vencimento || 5}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {c.is_online && (
                        <div className="grid grid-cols-1 gap-2 text-[10px]">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5"><VisualText id="copy-89c89124ea90" defaultText={"Plano / Vínculo"}/></span>
                              <span className="font-black text-slate-500"><VisualText id="copy-0636a0eb0c6f" defaultText={"Nenhum Vinculado"}/></span>
                            </div>
                            <div className="bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5"><VisualText id="copy-d4734bf28689" defaultText={"Data do Cadastro"}/></span>
                              <span className="font-black text-slate-800 dark:text-white"><VisualLabel text={c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '--/--/----'}/></span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="pl-2 pt-1">
                      <button onClick={() => window.open('https://wa.me/55' + c.telefone.replace(/\D/g, '') + '?text=' + encodeURIComponent('🌊 *Bem-vindo(a) à Remoterapia!* 🛶\n\nOlá, *' + c.nome + '*! Como podemos ajudar?'), '_blank')} className="w-full py-3.5 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20 active:scale-95 transition-all cursor-pointer">
                        <span className="text-sm"><BrandIcon name="message"/></span><VisualText id="copy-1082052a184c" defaultText={" Falar no WhatsApp"}/></button>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

{/* ═══════════════════════════════════════════════════════════ */}
      {/* ABA 4: EVENTOS                                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'eventos' && (
        <div className="rt-module-eventos space-y-4">
          {/* Cabeçalho compacto com 2 botões */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-indigo-600 uppercase"><VisualText id="copy-5157a7a5ae42" defaultText={"EXPEDIÇÕES & EXPERIÊNCIAS"}/></p>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-93cce274b1a1" defaultText={"EVENTOS ("}/>{eventos.length})</h3>
            </div>
            <div className="flex gap-1.5">
              <button onClick={abrirModalNascerDoSol} className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md cursor-pointer whitespace-nowrap"><BrandIcon name="sun"/><VisualText id="copy-17f59fd1bc07" defaultText={" Nascer do Sol"}/></button>
              <button onClick={abrirModalNovoEvento} className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase shadow-md cursor-pointer"><VisualText id="copy-f92b52622fab" defaultText={"+ Novo"}/></button>
            </div>
          </div>

          <div className="space-y-3">
            {eventos.length === 0 ? (
              <div className="bg-white/95 dark:bg-slate-900/95 p-8 rounded-[2rem] text-center border border-white/60 text-slate-400 text-xs font-bold">
                Nenhum evento. Clique em <strong><VisualText id="copy-7a8a0d0ea155" defaultText={"+ Novo"}/></strong> ou <strong><BrandIcon name="sun"/><VisualText id="copy-03bcc07167d7" defaultText={" Nascer do Sol"}/></strong>.
              </div>
            ) : eventos.map(ev => {
              const temRoteiro = Array.isArray(ev.roteiro) && ev.roteiro.length > 0
              const pctVagas = ev.vagas_total > 0 ? Math.round((ev.vagas_ocupadas / ev.vagas_total) * 100) : 0
              return (
                <div key={ev.id} className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border-2 border-indigo-100 dark:border-slate-800 shadow-sm space-y-3 dw-event-card">
                  {/* Status + título */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase ${badgeEvento(ev.status)}`}>
                        {labelEvento(ev.status)}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mt-1 leading-tight">{ev.titulo}</h4>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5"><BrandIcon name="calendar"/> {ev.data_evento} · <BrandIcon name="clock"/> {ev.horario} · <BrandIcon name="pin"/> {ev.local}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-black text-blue-900 dark:text-cyan-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-xl block">R$ {formatarMoedaBRL(ev.preco)}</span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5"><VisualText id="copy-f0b6d7e8fbd8" defaultText={"por pessoa"}/></span>
                    </div>
                  </div>

                  {/* Barra de vagas */}
                  <div>
                    <div className="flex justify-between text-[9px] font-black mb-1 text-slate-500">
                      <span><VisualText id="copy-d414ac23aadb" defaultText={"Vagas Vendidas"}/></span><span>{ev.vagas_ocupadas || 0} / {ev.vagas_total}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pctVagas >= 90 ? 'bg-red-500' : pctVagas >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: pctVagas + '%' }} />
                    </div>
                  </div>

                  {/* Roteiro (condicional) */}
                  {temRoteiro && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900 text-[9px] text-slate-700 dark:text-slate-300 space-y-1">
                      <span className="font-black text-indigo-700 dark:text-indigo-300 block uppercase"><VisualText id="copy-52d0721d979c" defaultText={"Roteiro:"}/></span>
                      {(ev.roteiro as RoteiroPasso[]).map((r, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="font-black text-indigo-800 dark:text-indigo-200 shrink-0">{r.hora}</span>
                          <span className="truncate">{r.descricao}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Observações */}
                  {(ev.observacoes || ev.itens_inclusos) && (
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      <BrandIcon name="clipboard"/> {ev.observacoes || ev.itens_inclusos}
                    </p>
                  )}

                  {/* Ações do card */}
                  <div className="flex gap-1.5 pt-1">
                    <button onClick={() => abrirModalEditarEvento(ev)} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase cursor-pointer"><BrandIcon name="edit"/><VisualText id="copy-6ba32c243d47" defaultText={" Editar"}/></button>
                    <button onClick={() => abrirPedidos(ev)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase cursor-pointer"><BrandIcon name="ticket"/><VisualText id="copy-7eaf6071a30c" defaultText={" Pedidos ("}/>{ev.vagas_ocupadas || 0})</button>
                    <button onClick={() => setEventoCancelando(ev)} className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-[9px] font-black uppercase cursor-pointer"><BrandIcon name="trash"/></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* BARRA INFERIOR */}
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ABA 5: PLANOS                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'planos' && (
        <><div className="dw-mobile"><div className="rt-module-planos space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <p className="text-[9px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest"><VisualText id="copy-e01790bc8de9" defaultText={"SISTEMA"}/></p>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight"><VisualText id="copy-c25ddb50ab68" defaultText={"CONFIGURAÇÃO DE PLANOS"}/></h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${planosEditando ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
              <BrandLabel text={planosEditando ? '✏️ Em Edição' : '🔒 Travado'}/>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Linha Mensalista */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm"><BrandIcon name="ship"/></span>
                <span className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider"><VisualText id="copy-c30fcb621f4a" defaultText={"Mensalista"}/></span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">R$</span>
                  <input type="text" value={planoMensalistaValor} onChange={e => handleMoedaInput(e, v => setPlanoMensalistaValor(v))} disabled={!planosEditando} className="w-24 h-9 pl-7 pr-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-emerald-700 dark:text-emerald-400 text-right outline-none disabled:opacity-60 text-xs" />
                </div>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 h-9">
                  <span className="text-[9px] font-black text-slate-400 uppercase"><VisualText id="copy-79e057836da9" defaultText={"Remadas:"}/></span>
                  <input type="number" value={planoRemadas} onChange={e => setPlanoRemadas(Number(e.target.value))} disabled={!planosEditando} className="w-6 bg-transparent font-black text-slate-800 dark:text-white text-center outline-none disabled:opacity-60 text-xs" />
                </div>
              </div>
            </div>

            {/* Linha Guardaria */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm"><BrandIcon name="umbrella"/></span>
                <span className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider"><VisualText id="copy-a8dd6e39aa55" defaultText={"Guardaria"}/></span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">R$</span>
                  <input type="text" value={planoGuardariaValor} onChange={e => handleMoedaInput(e, v => setPlanoGuardariaValor(v))} disabled={!planosEditando} className="w-24 h-9 pl-7 pr-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-emerald-700 dark:text-emerald-400 text-right outline-none disabled:opacity-60 text-xs" />
                </div>
              </div>
            </div>

            {/* REGRAS */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight"><VisualText id="copy-875d2df9a686" defaultText={"REGRAS"}/></h4>
              
              <div>
                <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-13d73fbfc15c" defaultText={"Horário de Corte dos Agendamentos"}/></label>
                <div className="flex items-center gap-3">
                  <input type="time" value={planoCorte} onChange={e => setPlanoCorte(e.target.value)} disabled={!planosEditando} className="w-24 h-10 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white text-center outline-none disabled:opacity-60" />
                  <span className="text-[9px] font-bold text-slate-400 leading-tight flex-1"><VisualText id="copy-2ee060790a81" defaultText={"Limite no dia anterior para confirmar remada no app"}/></span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-2"><VisualText id="copy-ba6fc22d04f9" defaultText={"Dia de manutenção"}/></label>
                <div className="flex flex-wrap gap-2">
                  {['Nenhum', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'].map(dia => (
                    <button
                      key={dia}
                      type="button"
                      disabled={!planosEditando}
                      onClick={() => setPlanoManutencao(dia)}
                      className={`px-3 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all disabled:opacity-70 ${planoManutencao === dia ? 'bg-blue-600 text-white shadow-md border border-blue-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                    >
                      <VisualLabel text={dia === 'Nenhum' ? 'Nenhum' : dia.split('-')[0]}/>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-2"><VisualText id="copy-b0a4e8a8c44b" defaultText={"Selecione o dia de manutenção da base para bloquear automaticamente os agendamentos no Portal do Aluno."}/></p>
              </div>
            </div>
            
            {/* Action Button */}
            {!planosEditando ? (
              <button type="button" onClick={() => setPlanosEditando(true)} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all cursor-pointer">
                <BrandIcon name="edit"/><VisualText id="copy-3dbc2591aa04" defaultText={" ALTERAR PLANOS E REGRAS"}/></button>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => setPlanosEditando(false)} className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all cursor-pointer"><VisualText id="copy-65c840ac5517" defaultText={"Cancelar"}/></button>
                <button type="button" onClick={salvarPrecos} disabled={salvandoPrecos} aria-busy={salvandoPrecos} className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"><VisualText id="copy-be00aa3add03" defaultText={"SALVAR"}/></button>
              </div>
            )}
          </div>
        </div></div><PlansWorkspace mensalista={planoMensalistaValor} guardaria={planoGuardariaValor} remadas={planoRemadas} corte={planoCorte} manutencao={planoManutencao} editing={planosEditando} saving={salvandoPrecos} onMensalista={e=>handleMoedaInput(e,v=>setPlanoMensalistaValor(v))} onGuardaria={e=>handleMoedaInput(e,v=>setPlanoGuardariaValor(v))} onRemadas={setPlanoRemadas} onCorte={setPlanoCorte} onManutencao={setPlanoManutencao} onEdit={()=>setPlanosEditando(true)} onCancel={()=>setPlanosEditando(false)} onSave={salvarPrecos}/></>
      )}



      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: CRIAÇÃO / EDIÇÃO DE EVENTO                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {modalEventoAberto && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-blue-100 dark:border-slate-800 p-5 space-y-3.5 max-h-[92vh] my-auto overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[8.5px] font-black text-indigo-600 uppercase"><VisualText id="copy-fcd52416aa2d" defaultText={"Portal de Alunos"}/></span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase"><VisualLabel text={modalEventoModo === 'editar' ? 'Editar Evento' : 'Novo Evento'}/></h3>
              </div>
              <button aria-label="Fechar janela" onClick={() => setModalEventoAberto(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs cursor-pointer flex items-center justify-center">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Título (100%) */}
              <div>
                <label htmlFor="rt-portalclient-1" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-c5fa42d25826" defaultText={"Título do Evento *"}/></label>
                <input id="rt-portalclient-1" type="text" value={formEvTitulo} onChange={e => setFormEvTitulo(e.target.value)} placeholder="Ex: Remada Nascer do Sol" className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>

              {/* Grid 2 col: Data + Horários */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rt-portalclient-2" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-7165c8abdae3" defaultText={"Data do Evento"}/></label>
                  <input id="rt-portalclient-2" type="date" value={formEvData} onChange={e => setFormEvData(e.target.value)} className="w-full h-9 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none text-center" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-38f6d3695af3" defaultText={"Horário Início / Fim"}/></label>
                  <div className="flex gap-1 items-center">
                    <input type="time" value={formEvHoraInicio} onChange={e => setFormEvHoraInicio(e.target.value)} className="flex-1 h-9 px-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none text-center text-[10px]" />
                    <span className="text-[9px] text-slate-400 font-bold">às</span>
                    <input type="time" value={formEvHoraFim} onChange={e => setFormEvHoraFim(e.target.value)} className="flex-1 h-9 px-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none text-center text-[10px]" />
                  </div>
                </div>
              </div>

              {/* Grid 2 col: Preço + Vagas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-6328859d5b05" defaultText={"Preço"}/></label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">R$</span>
                    <input
                      type="text" inputMode="numeric" value={formEvPrecoStr}
                      onChange={e => handleMoedaInput(e, setFormEvPrecoStr)}
                      className="w-full h-9 pl-8 pr-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-emerald-700 dark:text-emerald-300 text-center outline-none"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' } as any}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-27a4d916e84d" defaultText={"Vagas Totais"}/></label>
                  <div className="flex items-center justify-between w-full h-9 px-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={() => setFormEvVagas(Math.max(0, formEvVagas - 1))} className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-transform">−</button>
                    <span className="font-black text-slate-900 dark:text-white">{formEvVagas}</span>
                    <button type="button" onClick={() => setFormEvVagas(formEvVagas + 1)} className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-transform">+</button>
                  </div>
                </div>
              </div>

              {/* Local (100%) */}
              <div>
                <label htmlFor="rt-portalclient-3" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-06c7fd91f095" defaultText={"Local / Ponto de Encontro"}/></label>
                <input id="rt-portalclient-3" type="text" value={formEvLocal} onChange={e => setFormEvLocal(e.target.value)} placeholder="Ex: Base Santos · Canal 7" className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>

              {/* Observações */}
              <div>
                <label htmlFor="rt-portalclient-4" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-96b627d5f76f" defaultText={"Observações & Itens Inclusos"}/></label>
                <textarea id="rt-portalclient-4" rows={3} value={formEvObservacoes} onChange={e => setFormEvObservacoes(e.target.value)} placeholder="Ex: Café da manhã náutico incluído, equipamentos de segurança fornecidos, fotos GoPro." className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none" />
              </div>

              {/* Toggle: Roteiro opcional */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-2xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={formEvComRoteiro} onChange={e => setFormEvComRoteiro(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 cursor-pointer" />
                  <span className="text-[10px] font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wide"><VisualText id="copy-b8346ad3449b" defaultText={"Incluir Roteiro / Linha do Tempo (opcional)"}/></span>
                </label>
                {formEvComRoteiro && (
                  <div className="space-y-1.5 pt-1">
                    {formEvRoteiro.map((passo, idx) => (
                      <div key={idx} className="flex gap-1.5 items-center">
                        <input type="text" value={passo.hora} onChange={e => { const n = [...formEvRoteiro]; n[idx].hora = e.target.value; setFormEvRoteiro(n) }} className="w-16 h-8 px-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 text-center font-black text-indigo-800 dark:text-indigo-200 text-[10px] outline-none" />
                        <input type="text" value={passo.descricao} onChange={e => { const n = [...formEvRoteiro]; n[idx].descricao = e.target.value; setFormEvRoteiro(n) }} className="flex-1 h-8 px-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 font-bold text-slate-800 dark:text-white text-[10px] outline-none" />
                        <button aria-label="Fechar janela" type="button" onClick={() => setFormEvRoteiro(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 font-black text-xs cursor-pointer">✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setFormEvRoteiro(prev => [...prev, { hora: '08:00', descricao: '' }])} className="text-[9px] font-black text-indigo-600 hover:underline cursor-pointer"><VisualText id="copy-00290278bb03" defaultText={"+ Adicionar parada"}/></button>
                  </div>
                )}
              </div>

              <button type="button" onClick={salvarEvento} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md">
                <VisualLabel text={modalEventoModo === 'nascer' ? 'Publicar' : (modalEventoModo === 'editar' ? 'Atualizar Evento' : 'Publicar Evento no Site')}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: PEDIDOS / INGRESSOS                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {eventoSelecionadoPedidos && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-blue-100 dark:border-slate-800 p-5 space-y-3.5 max-h-[92vh] my-auto overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-start pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[8.5px] font-black text-indigo-600 uppercase block"><VisualText id="copy-0d9e432ef867" defaultText={"Pedidos & Ingressos"}/></span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight">{eventoSelecionadoPedidos.titulo}</h3>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5"><BrandIcon name="calendar"/> {eventoSelecionadoPedidos.data_evento} · {inscricoes.length}<VisualText id="copy-d25101f4ee48" defaultText={" ingresso(s)"}/></p>
              </div>
              <button aria-label="Fechar janela" onClick={() => setEventoSelecionadoPedidos(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs cursor-pointer flex items-center justify-center shrink-0">✕</button>
            </div>

            {/* Resumo financeiro */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900 text-center">
                <p className="text-[8px] font-black text-emerald-600 uppercase block"><VisualText id="copy-98b05eba62d3" defaultText={"Total Arrecadado"}/></p>
                <p className="text-base font-black text-emerald-800 dark:text-emerald-300">R$ {formatarMoedaBRL(totalArrecadado)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-200 dark:border-blue-900 text-center">
                <p className="text-[8px] font-black text-blue-600 uppercase block"><VisualText id="copy-6f59689c0ea8" defaultText={"Ocupação"}/></p>
                <p className="text-base font-black text-blue-800 dark:text-blue-300">{inscricoes.length} / {eventoSelecionadoPedidos.vagas_total}</p>
              </div>
            </div>

            {/* Busca */}
            <input type="text" value={buscaPedido} onChange={e => setBuscaPedido(e.target.value)} placeholder="🔍 Buscar por voucher ou nome..." className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none" />

            {/* Lista de pedidos */}
            <div className="space-y-2.5">
              {pedidosFiltrados.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-bold">Nenhum pedido encontrado.</div>
              ) : pedidosFiltrados.map(i => (
                <div key={i.id} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">#{i.voucher || ('PED-' + i.id.slice(0,4).toUpperCase())}</span>
                    <span className="text-[8.5px] font-black text-slate-400">{i.created_at ? new Date(i.created_at).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{i.nome}</p>
                  <p className="text-[10px] font-bold text-blue-600 dark:text-cyan-400"><BrandIcon name="smartphone"/> {i.telefone}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[9px] font-black bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-200"><BrandIcon name="ship"/> {i.caiaque_alocado || 'A definir'}</span>
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg">R$ {formatarMoedaBRL(i.valor_pago || 0)} {i.metodo_pagamento ? '· ' + i.metodo_pagamento : ''}</span>
                    {i.is_novo_cliente && <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg"><BrandIcon name="sparkles"/><VisualText id="copy-e90aba0f3020" defaultText={" 1ª Compra"}/></span>}
                  </div>
                  <button onClick={() => enviarZapInscrito(i)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9.5px] font-black uppercase cursor-pointer"><BrandIcon name="message"/><VisualText id="copy-6dffe946c59a" defaultText={" WhatsApp"}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: CANCELAMENTO / EXCLUSÃO DE EVENTO                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {eventoCancelando && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-5 rounded-[2rem] shadow-2xl space-y-3 my-auto">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
              <BrandLabel text={(eventoCancelando.vagas_ocupadas || 0) === 0 ? '🗑️ Excluir Evento?' : '⚠️ Cancelar Evento com Inscritos'}/>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {(eventoCancelando.vagas_ocupadas || 0) === 0
                ? `Confirma a exclusão permanente de "${eventoCancelando.titulo}"? Esta ação não pode ser desfeita.`
                : `Este evento possui ${eventoCancelando.vagas_ocupadas} ingresso(s) confirmado(s). Ao cancelar, o evento será despublicado e os inscritos orientados a solicitar reembolso via WhatsApp da recepção.`}
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEventoCancelando(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer"><VisualText id="copy-57ff40554d04" defaultText={"Cancelar"}/></button>
              <button onClick={confirmarCancelamentoEvento} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer">
                <VisualLabel text={(eventoCancelando.vagas_ocupadas || 0) === 0 ? 'Excluir' : 'Confirmar Cancelamento'}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: ALUNO (NOVO / EDITAR)                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {modalClienteAberto && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-blue-100 dark:border-slate-800 p-5 space-y-3.5 max-h-[92vh] my-auto overflow-y-auto no-scrollbar text-xs">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-black shadow-md shadow-blue-500/20"><BrandIcon name="user"/></div>
                <div>
                  <span className="text-[8px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest block"><VisualText id="copy-2c31f2f103ce" defaultText={"Portal de Alunos"}/></span>
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white leading-none"><VisualLabel text={modoEdicao ? 'Editar Aluno' : 'Novo Cadastro de Aluno'}/></h3>
                </div>
              </div>
              <button aria-label="Fechar janela" type="button" onClick={() => setModalClienteAberto(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs cursor-pointer flex items-center justify-center">✕</button>
            </div>
            {/* Cartão somente-leitura do plano (edição) */}
            {modoEdicao && (
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-200/60 dark:border-blue-900 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest"><VisualText id="copy-1c740588b426" defaultText={"Plano Contratado"}/></p>
                  <p className="text-sm font-black text-slate-900 dark:text-white"><BrandLabel text={formPlanoAtual === null ? 'Conta sem plano' : formPlanoAtual === 'guardaria' ? '🏖️ Clube Guardaria' : formPlanoAtual === 'combo_mensalista_guardaria' ? '🛶 Mensalista + Guardaria' : '🛶 Clube Mensalista'}/></p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase"><VisualText id="copy-ffcadf6de8b5" defaultText={"Vencimento"}/></p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200"><VisualLabel text={formPlanoAtual === null ? 'Não se aplica' : `Todo dia ${formDiaVencimentoAtual}`}/></p>
                </div>
              </div>
            )}
            {/* Dados pessoais */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
              <span className="text-[8.5px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest block"><VisualLabel text={modoEdicao ? 'Dados Pessoais' : '1. Identificação & Login do Aluno'}/></span>
              <div>
                <label htmlFor="rt-portalclient-5" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-c3887e22288d" defaultText={"Nome Completo *"}/></label>
                <input id="rt-portalclient-5" type="text" aria-label="Nome completo" value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: Eduardo Silva" className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rt-portalclient-6" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-88a32511695d" defaultText={"WhatsApp *"}/></label>
                  <input id="rt-portalclient-6" type="tel" aria-label="WhatsApp" value={formTelefone} onChange={e => setFormTelefone(e.target.value)} placeholder="(13) 99740-3331" className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label htmlFor="rt-portalclient-7" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-6489dda09273" defaultText={"CPF"}/></label>
                  <input id="rt-portalclient-7" type="text" aria-label="CPF" value={formCpf} onChange={e => setFormCpf(e.target.value)} placeholder="000.000.000-00" className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label htmlFor="rt-portalclient-8" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-d7b4bb877f73" defaultText={"E-mail"}/></label>
                <input id="rt-portalclient-8" type="email" aria-label="E-mail" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="aluno@remoterapia.com.br" className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500" />
              </div>
            </div>
            {/* Plano (apenas novo) */}
            {!modoEdicao && (
              <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3.5 rounded-2xl border border-blue-200/70 dark:border-blue-900 space-y-2.5">
                <span className="text-[8.5px] font-black text-blue-700 dark:text-cyan-300 uppercase tracking-widest block"><VisualText id="copy-782303c942b4" defaultText={"2. Plano & Mensalidade"}/></span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="rt-portalclient-9" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-686863288b04" defaultText={"Tipo de Plano"}/></label>
                    <select id="rt-portalclient-9" value={formPlano} onChange={e => setFormPlano(e.target.value as 'mensalista' | 'guardaria')} className="w-full py-2 px-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-white outline-none">
                      <option value="mensalista"> Clube Mensalista</option>
                      <option value="guardaria"> Clube Guardaria</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-040c003b7278" defaultText={"Mensalidade"}/></label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">R$</span>
                      <input type="text" inputMode="numeric" aria-label="Mensalidade" value={formValorStr} onChange={e => handleMoedaInput(e, setFormValorStr)} className="w-full py-2 pl-8 pr-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 font-black text-slate-800 dark:text-white text-right outline-none" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1.5"><VisualText id="copy-b54c93f6f85c" defaultText={"Dia de Vencimento"}/></label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 15, 20].map(dia => (
                      <button key={dia} type="button" onClick={() => setFormDiaVencimento(dia)}
                        className={`py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${formDiaVencimento === dia ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}><VisualText id="copy-fa31599decd9" defaultText={"Dia "}/>{String(dia).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
                {formPlano === 'guardaria' && (
                  <div>
                    <label htmlFor="rt-portalclient-10" className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase block mb-1"><VisualText id="copy-df8523b3d443" defaultText={"Tipo de embarcação"}/></label>
                    <input id="rt-portalclient-10" type="text" aria-label="Tipo de embarcação" value={formCaiaque} onChange={e => setFormCaiaque(e.target.value)} placeholder="Ex: Epic V7 — a vaga é confirmada pela base" className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white text-xs outline-none" />
                  </div>
                )}
              </div>
            )}
            {!modoEdicao&&<div className="rt-payment-message"><strong><VisualText id="copy-a0e33cfe3499" defaultText={"Acesso por e-mail confirmado"}/></strong><p><VisualText id="copy-bdd90d64e658" defaultText={"Este cadastro organiza os dados do aluno. Para entrar, ele deve usar o cadastro com confirmação de e-mail no Portal. Nenhuma senha ou código é criado nesta tela."}/></p></div>}
            {/* Botões */}
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={() => setModalClienteAberto(false)} className="w-1/3 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"><VisualText id="copy-2cea1c828f02" defaultText={"Cancelar"}/></button>
              <button type="button" onClick={salvarCliente} disabled={salvandoCliente} aria-busy={salvandoCliente} className="w-2/3 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                <span><BrandIcon name="save"/></span> <VisualLabel text={modoEdicao ? 'Salvar Alterações' : 'Cadastrar Aluno'}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: CONFIRMAR BLOQUEIOS                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {modalConfirmarBloqueio && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-[2rem] shadow-2xl space-y-3 my-auto">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-2e45eff38f95" defaultText={"Sincronizar Bloqueios"}/></h3>
            <p className="text-xs text-slate-600 dark:text-slate-300"><VisualText id="copy-3fc0b1133957" defaultText={"Deseja salvar e atualizar o calendário de agendamento dos alunos agora?"}/></p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalConfirmarBloqueio(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer"><VisualText id="copy-cea0d1cf50f1" defaultText={"Cancelar"}/></button>
              <button onClick={salvarBloqueiosSincronizados} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer"><VisualText id="copy-6fea81f5b302" defaultText={"Sincronizar"}/></button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
