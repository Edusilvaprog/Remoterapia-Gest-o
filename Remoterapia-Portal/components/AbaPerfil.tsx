'use client'

import PortalProfileLayout from './PortalProfileLayout'
import React, { useState, useEffect } from 'react'
import { 
  Lock, X,
  MessageCircle, 
  Smartphone, 
  LogOut, 
  ChevronRight, 
  Camera,
  Compass,
  Clock,
  ShieldCheck,
  Calendar
} from 'lucide-react'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



interface AlunoData {
  id?: string | number
  nome?: string
  telefone?: string
  tipo_plano?: string
  dia_vencimento?: number | string
  foto_url?: string
  tipo_embarcacao?: string
  modelo_embarcacao?: string
  cor_embarcacao?: string
  status?: string
  [key: string]: any
}

interface AbaPerfilProps {
  onPagamentos?:()=>void
  abrirInscricoes?: boolean
  onInscricoesAbertas?: () => void
  alunoData: AlunoData | null
  agendamentos?: any[]
  onAbrirTrocarSenha: () => void
  onInstalarApp: () => void
  onLogout: () => void
  onTrocarFoto?: () => void
  onIrParaEventos?: () => void
}

export default function AbaPerfil({
  abrirInscricoes = false,
  onInscricoesAbertas,
  alunoData,
  agendamentos = [],
  onAbrirTrocarSenha,
  onInstalarApp,
  onLogout,
  onTrocarFoto,
  onIrParaEventos,
  onPagamentos
}: AbaPerfilProps) {
  useEffect(() => { if (abrirInscricoes) { setModalMeusEventos(true); onInscricoesAbertas?.() } }, [abrirInscricoes, onInscricoesAbertas])
  const [modalAssinatura, setModalAssinatura] = useState(false)
  const [modalMeusEventos, setModalMeusEventos] = useState(false)
  const [modalRoteiro, setModalRoteiro] = useState<any>(null)
  const [isAtendimentoOnline, setIsAtendimentoOnline] = useState(true)
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false)
  const [cancelamentoAgendado] = useState(false)

  // 1. Verificação de Horário Comercial de Atendimento (Terça a Domingo das 06:00 às 18:00)
  useEffect(() => {
    const verificarHorario = () => {
      const now = new Date()
      const diaSemana = now.getDay() // 0 = Domingo, 1 = Segunda (fechado)
      const hora = now.getHours()
      const online = (diaSemana !== 1) && (hora >= 6 && hora < 18)
      setIsAtendimentoOnline(online)
    }

    verificarHorario()
    const timer = setInterval(verificarHorario, 60000)
    return () => clearInterval(timer)
  }, [])

  // 2. Classificação precisa dos Perfis
  const plano = (alunoData?.tipo_plano || '').toLowerCase()
  const temGuardaria = plano.includes('guardaria')
  const isMensalista = plano.includes('mensalista')
  const isCombo = temGuardaria && isMensalista
  const isApenasGuardaria = temGuardaria && !isMensalista
  const isApenasMensalista = isMensalista && !temGuardaria
  const isAluno = !temGuardaria && !isMensalista

  const diaVenc = alunoData?.dia_vencimento 
    ? String(alunoData.dia_vencimento).padStart(2, '0') 
    : '05'

  // Monograma de Iniciais
  const nomeAluno = alunoData?.nome || 'Aluno Remoterapia'
  const partesNome = nomeAluno.trim().split(' ')
  const iniciais = partesNome.length >= 2 
    ? `${partesNome[0][0]}${partesNome[partesNome.length - 1][0]}`.toUpperCase()
    : nomeAluno.slice(0, 2).toUpperCase()

  // Eventos em que o aluno está inscrito
  const eventosInscritos = agendamentos.filter((a: any) => a.is_evento || a.titulo_evento)

  // Links oficiais de WhatsApp
  const suporteWhatsappUrl = `https://wa.me/5513997421804?text=${encodeURIComponent(
    `Olá! Sou o aluno ${nomeAluno} (ID #${alunoData?.id || ''}) e preciso de suporte com minha conta.`
  )}`

  const cancelarAssinaturaWhatsappUrl = `https://wa.me/5513997421804?text=${encodeURIComponent(
    `Olá! Sou o aluno ${nomeAluno} e gostaria de atendimento referente à minha assinatura/plano.`
  )}`

  const matricula = alunoData?.id 
    ? (typeof alunoData.id === 'string' && alunoData.id.length > 8
        ? `#REM-${alunoData.id.slice(-4).toUpperCase()}`
        : `#REM-${String(alunoData.id).padStart(4, '0')}`)
    : '#REM-0001'

  const formatarTelefone = (tel?: string) => {
    if (!tel) return 'Telefone não cadastrado'
    const limpo = tel.replace(/\D/g, '')
    if (limpo.length === 11) {
      return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`
    }
    if (limpo.length === 10) {
      return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`
    }
    return tel
  }

  // Status financeiro
  const statusPagamento = (alunoData?.status_pagamento || 'ativo').toLowerCase()
  const isPendente = statusPagamento === 'pendente' || statusPagamento === 'vencido'
  const isCancelado = alunoData?.status === 'bloqueado' || alunoData?.status === 'inativo' || statusPagamento === 'cancelado'

  const rotuloClassificacao = isApenasMensalista 
    ? 'Mensalista' 
    : isApenasGuardaria 
    ? 'Guardaria' 
    : isCombo
    ? 'Mensalista & Guardaria'
    : 'Cliente'

  return (
    <div className="rt-profile-area space-y-3 animate-fade-in pb-2">
<PortalProfileLayout aluno={alunoData} registration={matricula} phone={formatarTelefone(alunoData?.telefone)} planName={rotuloClassificacao} onPhoto={onTrocarFoto} onPassword={onAbrirTrocarSenha} onInstall={onInstalarApp} onLogout={onLogout} onPlan={onPagamentos||(()=>setModalAssinatura(true))} onEvents={()=>setModalMeusEventos(true)} support={suporteWhatsappUrl}/>
      {/* MODAL 1: MINHA ASSINATURA */}
      {modalAssinatura && (
        <div data-rt-modal 
          className="fixed inset-0 z-[100] flex items-start pt-16 justify-center bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          onClick={() => {
            setModalAssinatura(false)
            setConfirmandoCancelamento(false)
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-b shadow-2xl w-full max-w-md border-t border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden slide-down-enter"
          >
            {/* Puxador de Bottom Sheet */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0"></div>

            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-[#0284c7] border border-sky-200 dark:border-sky-800"><VisualText id="copy-92f2b5fa3c2d" defaultText={"ASSINATURA"}/></span>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white mt-1">
                  <VisualLabel text={isAluno 
                    ? 'Clubes Remoterapia' 
                    : isCombo 
                      ? 'Mensalista + Guardaria' 
                      : isApenasGuardaria 
                        ? 'Clube Guardaria' 
                        : 'Clube Mensalista'}/>
                </h3>
              </div>
              <button aria-label="Fechar janela" 
                type="button" 
                onClick={() => {
                  setModalAssinatura(false)
                  setConfirmandoCancelamento(false)
                }} 
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center text-xs transition cursor-pointer"
              >
                <X size={18} aria-hidden="true"/>
              </button>
            </div>

            <div className="p-5 overflow-y-auto no-scrollbar space-y-3.5">
              
              {/* CASO 1: SEM ASSINATURA ATIVA (CLIENTE) */}
              {isAluno && (
                <>
                  {/* PLANO MENSALISTA */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                    <span className="text-[8.5px] font-black uppercase text-slate-400 block"><VisualText id="copy-3301df8562d7" defaultText={"Clubes Remoterapia"}/></span>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white"><VisualText id="copy-34f88bec0e0d" defaultText={"Clube Mensalista"}/></h4>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5"><VisualText id="copy-20b84079c8f2" defaultText={"2 remadas por semana com caiaque e colete inclusos."}/></p>
                      </div>
                      <div className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 shrink-0">
                        <span className="text-xs font-black text-[#034480] dark:text-sky-400"><VisualText id="copy-ba74157ec9c1" defaultText={"R$ 150"}/></span>
                        <span className="text-[9px] font-bold text-slate-400"><VisualText id="copy-8bdbb10ed511" defaultText={"/mês"}/></span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setModalAssinatura(false)
                        onIrParaEventos?.()
                      }} 
                      className="w-full py-2.5 bg-[#034480] hover:bg-[#0284c7] text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
                    ><VisualText id="copy-9d41eefb4df8" defaultText={"Assinar Clube Mensalista"}/></button>
                  </div>

                  {/* PLANO GUARDARIA */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                    <span className="text-[8.5px] font-black uppercase text-slate-400 block"><VisualText id="copy-3e228e20076d" defaultText={"Clubes Remoterapia"}/></span>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white"><VisualText id="copy-6cea7244f22a" defaultText={"Clube Guardaria"}/></h4>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5"><VisualText id="copy-718f3dae8b6d" defaultText={"Vaga na areia para seu caiaque ou prancha com apoio e ducha doce."}/></p>
                      </div>
                      <div className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 shrink-0">
                        <span className="text-xs font-black text-[#034480] dark:text-sky-400"><VisualText id="copy-967c7fceae0d" defaultText={"R$ 150"}/></span>
                        <span className="text-[9px] font-bold text-slate-400"><VisualText id="copy-99490134b513" defaultText={"/mês"}/></span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setModalAssinatura(false)
                        onIrParaEventos?.()
                      }} 
                      className="w-full py-2.5 bg-[#034480] hover:bg-[#0284c7] text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
                    ><VisualText id="copy-813060355adb" defaultText={"Assinar Clube Guardaria"}/></button>
                  </div>
                </>
              )}

              {/* CASO 2: ASSINANTE ATIVO */}
              {!isAluno && (
                <>
                  {/* RESUMO DO PLANO */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                            {isCombo 
                              ? 'Mensalista + Guardaria' 
                              : isApenasGuardaria 
                                ? 'Clube Guardaria' 
                                : 'Clube Mensalista'}
                          </h4>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                            cancelamentoAgendado
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          }`}>
                            <span className="w-1 h-1 rounded-full bg-current"></span>
                            <VisualLabel text={cancelamentoAgendado ? `Encerra dia ${diaVenc}` : 'Ativo'}/>
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                          <VisualLabel text={isApenasGuardaria 
                            ? 'Vaga de caiaque na areia com apoio e ducha doce.'
                            : '2 remadas por semana com caiaque e colete inclusos.'}/>
                        </p>
                      </div>

                      <div className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 shrink-0">
                        <span className="text-xs font-black text-[#034480] dark:text-sky-400"><VisualText id="copy-385c356dd263" defaultText={"R$ 150"}/></span>
                        <span className="text-[9px] font-bold text-slate-400"><VisualText id="copy-e75daf3d17cd" defaultText={"/mês"}/></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-400 block"><VisualText id="copy-ad0edc24c61e" defaultText={"Vencimento"}/></span>
                        <span className="text-xs font-black text-slate-900 dark:text-white"><VisualText id="copy-ec3e5d3a63f9" defaultText={"Dia "}/>{diaVenc}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-400 block"><VisualText id="copy-ccbf6c5c8ab0" defaultText={"Situação"}/></span>
                        <span className={`text-xs font-black ${cancelamentoAgendado ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          <VisualLabel text={cancelamentoAgendado ? `Cancela dia ${diaVenc}` : 'Em dia'}/>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ESTADO 1: BOTÃO PARA INICIAR CANCELAMENTO */}
                  {!confirmandoCancelamento && !cancelamentoAgendado && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block"><VisualText id="copy-871339dd0188" defaultText={"Gerenciar Assinatura"}/></span>
                      <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-relaxed"><VisualText id="copy-46a2ed7c1bc5" defaultText={"Você pode cancelar a qualquer momento sem fidelidade."}/></p>
                      <button 
                        type="button" 
                        onClick={() => setConfirmandoCancelamento(true)}
                        className="w-full py-2.5 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                      ><VisualText id="copy-fdddf4c64001" defaultText={"Cancelar Assinatura"}/></button>
                    </div>
                  )}

                  {/* ESTADO 2: DIÁLOGO DE CONFIRMAÇÃO */}
                  {confirmandoCancelamento && (
                    <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-2.5 animate-scale-in">
                      <div className="text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wide">
                        Solicitar cancelamento à equipe?
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium"><VisualText id="copy-a90c9e459f80" defaultText={"A solicitação será aberta no WhatsApp. A equipe precisa confirmar o encerramento e as condições do plano; esta tela não cancela cobranças automaticamente."}/></p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button 
                          type="button" 
                          onClick={() => setConfirmandoCancelamento(false)} 
                          className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-[10px] uppercase border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        ><VisualText id="copy-90e1015099d4" defaultText={"Voltar"}/></button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setConfirmandoCancelamento(false)
                            window.open(cancelarAssinaturaWhatsappUrl, '_blank', 'noopener,noreferrer')
                          }} 
                          className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-[10px] uppercase transition cursor-pointer"
                        ><VisualText id="copy-a878f5e347be" defaultText={"Solicitar atendimento"}/></button>
                      </div>
                    </div>
                  )}

                  {/* ESTADO 3: CANCELAMENTO AGENDADO (SEM BOTÃO DE REATIVAR) */}
                  {cancelamentoAgendado && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400"><VisualText id="copy-3e8b677b1420" defaultText={"● Cancelamento agendado"}/></span>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"><VisualText id="copy-d781b4cbc642" defaultText={"Até dia "}/>{diaVenc}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-relaxed"><VisualText id="copy-8a74e3cb6bd7" defaultText={"Sua assinatura permanecerá disponível até dia "}/>{diaVenc}<VisualText id="copy-a326e045ba21" defaultText={". Após essa data, o plano será encerrado definitivamente e nenhuma nova cobrança será realizada. Para retornar no futuro, será necessário assinar um novo plano."}/></p>
                      <button 
                        type="button" 
                        onClick={() => setModalAssinatura(false)} 
                        className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
                      ><VisualText id="copy-2d0ea9e118b0" defaultText={"Entendido"}/></button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MEUS EVENTOS & INSCRIÇÕES */}
      {modalMeusEventos && (
        <div data-rt-modal 
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setModalMeusEventos(false)}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-2xl w-full max-w-md border-t border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden slide-up-enter"
          >
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0"></div>

            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-[#034480] dark:text-sky-400 border border-blue-200 dark:border-blue-800"><VisualText id="copy-be3e3e82fd17" defaultText={"MINHAS INSCRIÇÕES"}/></span>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white mt-1"><VisualText id="copy-2980f78a96f0" defaultText={"Meus Eventos"}/></h3>
              </div>
              <button aria-label="Fechar janela" 
                type="button" 
                onClick={() => setModalMeusEventos(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center text-xs transition cursor-pointer"
              >
                <X size={18} aria-hidden="true"/>
              </button>
            </div>

            <div className="p-5 overflow-y-auto no-scrollbar space-y-3.5">
              {eventosInscritos.length > 0 ? (
                eventosInscritos.map((ev: any, idx: number) => {
                  const titulo = ev.titulo_evento || ev.observacoes?.split('·')?.[0]?.replace('Evento:', '')?.trim() || 'Remada Especial'
                  const voucher = ev.observacoes?.match(/Voucher:\s*([^\s·]+)/)?.[1] || `#EV-${ev.id || 8841}`
                  const dataFormatada = ev.data_reserva 
                    ? new Date(ev.data_reserva + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
                    : 'Data Agendada'

                  const statusInscricao = ({confirmado:'Vaga confirmada',pendente:'Aguardando confirmação',concluido:'Evento concluído',realizado:'Evento concluído',cancelado:'Inscrição cancelada',cancelado_aluno:'Inscrição cancelada',cancelado_clima:'Cancelado pelo clima',reembolso_solicitado:'Reembolso solicitado',reagendado:'Reagendado'} as Record<string,string>)[ev.status] || 'Situação não informada'
                  const inscricaoCancelada = ['cancelado','cancelado_aluno','cancelado_clima','reembolso_solicitado'].includes(ev.status)
                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={'rt-base-badge '+(inscricaoCancelada?'is-warn':'is-good')}>{statusInscricao}</span>
                        <span className="text-[8.5px] font-mono font-bold text-slate-400">{voucher}</span>
                      </div>

                      <div className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                          <img 
                            src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=300&auto=format&fit=crop" 
                            alt={titulo} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white leading-tight truncate">
                            {titulo}
                          </h4>
                          <p className="text-[9px] font-bold text-[#0284c7] dark:text-sky-400 mt-0.5"><VisualText id="copy-cf48b9c61438" defaultText={"Canto do Forte · Praia Grande"}/></p>
                          <p className="text-[8.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {dataFormatada} · {ev.horario_reserva || '06:00'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button 
                          type="button" 
                          onClick={() => setModalRoteiro({ titulo, voucher, data: dataFormatada, hora: ev.horario_reserva })}
                          className="py-2.5 bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-400 hover:bg-sky-100 font-black rounded-xl text-[9px] uppercase tracking-wider transition border border-sky-200 dark:border-sky-800 cursor-pointer"
                        ><VisualText id="copy-fbe4e321ae72" defaultText={"Ver Roteiro"}/></button>
                        <a 
                          href={`https://wa.me/5513997421804?text=${encodeURIComponent(`Olá! Gostaria de informações ou auxílio/reembolso sobre a inscrição ${voucher} (${titulo}). Aluno: ${nomeAluno}`)}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-black rounded-xl text-[9px] uppercase tracking-wider transition text-center border border-rose-200 dark:border-rose-900"
                        ><VisualText id="copy-196862a82bcf" defaultText={"Reembolso"}/></a>
                      </div>
                    </div>
                  )
                })
              ) : (
                /* EMPTY STATE QUANDO NÃO HÁ EVENTOS */
                <div className="p-6 text-center space-y-3 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/50">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white"><VisualText id="copy-d4d711d1dbcd" defaultText={"Nenhuma inscrição ativa no momento"}/></h4>
                    <p className="text-[9.5px] font-medium text-slate-400 mt-1 max-w-xs mx-auto"><VisualText id="copy-39519349ef26" defaultText={"Suas inscrições em eventos e expedições aparecerão aqui."}/></p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setModalMeusEventos(false)
                      onIrParaEventos?.()
                    }} 
                    className="px-4 py-2.5 bg-gradient-to-r from-[#0284c7] to-[#034480] text-white text-[9.5px] font-black rounded-xl uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
                  ><VisualText id="copy-81dd28f8547c" defaultText={"Explorar Próximos Eventos ➔"}/></button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2.5: ROTEIRO DA SAÍDA */}
      {modalRoteiro && (
        <div data-rt-modal 
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setModalRoteiro(null)}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-2xl w-full max-w-md border-t border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden slide-up-enter"
          >
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0"></div>

            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-[#0284c7] border border-sky-200 dark:border-sky-800"><VisualText id="copy-d388b782de1e" defaultText={"PROGRAMAÇÃO"}/></span>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white mt-1 truncate max-w-[280px]">
                  {modalRoteiro.titulo}
                </h3>
              </div>
              <button aria-label="Fechar janela" 
                type="button" 
                onClick={() => setModalRoteiro(null)} 
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center text-xs transition cursor-pointer"
              >
                <X size={18} aria-hidden="true"/>
              </button>
            </div>

            <div className="p-5 overflow-y-auto no-scrollbar space-y-3.5">
              
              {/* CRONOGRAMA DA SAÍDA */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="text-[9px] font-black uppercase text-[#0284c7] dark:text-sky-400 block tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /><VisualText id="copy-b4cd3f8e13a1" defaultText={" Cronograma da Saída"}/></span>
                <div className="space-y-2 text-[9.5px]">
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#0284c7] text-white text-[8px] font-black shrink-0"><VisualText id="copy-5859ff8dcaa1" defaultText={"05:15"}/></span>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong><VisualText id="copy-e22afa26f4a6" defaultText={"Ponto de Encontro:"}/></strong><VisualText id="copy-375e4522c1d1" defaultText={" Recepção no Canto do Forte e regulagem dos coletes salva-vidas."}/></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#0284c7] text-white text-[8px] font-black shrink-0"><VisualText id="copy-165be3613512" defaultText={"05:30"}/></span>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong><VisualText id="copy-ac052d5e29ea" defaultText={"Entrada na Água:"}/></strong><VisualText id="copy-2ec6eaef66e0" defaultText={" Início da remada em grupo para contemplação do nascer do sol."}/></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#0284c7] text-white text-[8px] font-black shrink-0"><VisualText id="copy-8864fbcace32" defaultText={"07:00"}/></span>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong><VisualText id="copy-0434c027e179" defaultText={"Café Caiçara:"}/></strong><VisualText id="copy-c76e521a2c9e" defaultText={" Pausa na areia com frutas frescas, água de coco e pães."}/></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#0284c7] text-white text-[8px] font-black shrink-0"><VisualText id="copy-965e0d59abfa" defaultText={"07:45"}/></span>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong><VisualText id="copy-db4cccc00435" defaultText={"Retorno:"}/></strong><VisualText id="copy-8ad684b59527" defaultText={" Encerramento da atividade, ducha de água doce e fotos do grupo."}/></p>
                  </div>
                </div>
              </div>

              {/* EQUIPAMENTOS FORNECIDOS */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 block tracking-wider"><VisualText id="copy-d398f156ca87" defaultText={"Equipamentos Fornecidos"}/></span>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed"><VisualText id="copy-23bb069ce10f" defaultText={"• Caiaque individual ou duplo revisado"}/><br /><VisualText id="copy-581b2ab32160" defaultText={"• Remo e colete salva-vidas homologado"}/><br /><VisualText id="copy-109cfb0abf87" defaultText={"• Instrutor experiente acompanhando todo o trajeto"}/></p>
              </div>

              {/* RECOMENDAÇÕES */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 block tracking-wider"><VisualText id="copy-6fa8e6870f56" defaultText={"Recomendações"}/></span>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed"><VisualText id="copy-051511e02e2d" defaultText={"Recomendamos traje de banho ou lycra UV, protetor solar, garrafa de hidratação e bolsa impermeável para celular. O uso do colete salva-vidas é obrigatório durante todo o trajeto."}/></p>
              </div>

              <button 
                type="button" 
                onClick={() => setModalRoteiro(null)} 
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              ><VisualText id="copy-f929737713ae" defaultText={"Voltar para Minhas Inscrições"}/></button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
