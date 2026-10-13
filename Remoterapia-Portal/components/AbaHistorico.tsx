'use client'

import PortalHistoryDesktop from './desktop/PortalHistoryDesktop'
import { useState, useMemo } from 'react'
import { registrarAvaliacaoEstrelas } from '@/lib/actions/aluno'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



interface AbaHistoricoProps {
  alunoData: any
  agendamentos: any[]
  onReagendar?: () => void
  onAgendarEventos?: () => void
  onVerMeusEventos?: () => void
  onToast?: (msg: string, tipo?: 'success' | 'warning' | 'error') => void
}

export default function AbaHistorico({ 
  alunoData, 
  agendamentos, 
  onReagendar, 
  onAgendarEventos,
  onVerMeusEventos,
  onToast 
}: AbaHistoricoProps) {
  const [filtro, setFiltro] = useState<'todas' | 'concluidas' | 'canceladas' | 'eventos'>('todas')
  const [avaliacoes, setAvaliacoes] = useState<Record<string, number>>({})
  const [loadingAvaliacao, setLoadingAvaliacao] = useState<string | null>(null)

  const itensHistorico = useMemo(() => {
    return (agendamentos || []).filter((a: any) => 
      a.status === 'concluido' || 
      a.status === 'realizado' || 
      a.status === 'cancelado_clima' || 
      a.status === 'cancelado' || 
      a.status === 'cancelado_aluno' ||
      a.status === 'reembolso_solicitado' ||
      a.status === 'reagendado' ||
      a.is_evento
    )
  }, [agendamentos])

  const totalConcluidas = itensHistorico.filter((a: any) => a.status === 'concluido' || a.status === 'realizado').length
  const totalEventos = itensHistorico.filter((a: any) => a.is_evento || a.status === 'reembolso_solicitado').length
  const totalCanceladas = itensHistorico.filter((a: any) => a.status === 'cancelado_clima' || a.status === 'cancelado' || a.status === 'cancelado_aluno' || a.status === 'reagendado').length

  const itensFiltrados = useMemo(() => {
    if (filtro === 'concluidas') return itensHistorico.filter((a: any) => a.status === 'concluido' || a.status === 'realizado')
    if (filtro === 'canceladas') return itensHistorico.filter((a: any) => a.status === 'cancelado_clima' || a.status === 'cancelado' || a.status === 'cancelado_aluno' || a.status === 'reagendado')
    if (filtro === 'eventos') return itensHistorico.filter((a: any) => a.is_evento || a.status === 'reembolso_solicitado')
    return itensHistorico
  }, [itensHistorico, filtro])

  // Agrupamento cronológico por Mês (Ano-Mês)
  const gruposPorMes = useMemo(() => {
    const map: Record<string, { label: string; itens: any[] }> = {}

    itensFiltrados.forEach((item: any) => {
      const dataStr = item.data_reserva || item.data || new Date().toISOString().split('T')[0]
      const dataObj = new Date(dataStr + 'T12:00:00')
      const chaveMes = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}`
      
      const nomeMes = dataObj.toLocaleDateString('pt-BR', { month: 'long' })
      const label = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${dataObj.getFullYear()}`

      if (!map[chaveMes]) {
        map[chaveMes] = { label, itens: [] }
      }
      map[chaveMes].itens.push(item)
    })

    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [itensFiltrados])

  const handleAvaliar = async (itemId: string, nota: number) => {
    if (loadingAvaliacao) return
    setLoadingAvaliacao(itemId)
    try {
      const res = await registrarAvaliacaoEstrelas(itemId, nota)
      if (res.ok) { setAvaliacoes(prev => ({ ...prev, [itemId]: nota })); onToast?.('Avaliação registrada com sucesso!', 'success') }
      else onToast?.('Não foi possível salvar a avaliação. Tente novamente.', 'error')
    } catch { onToast?.('Não foi possível salvar a avaliação. Tente novamente.', 'error') }
    finally { setLoadingAvaliacao(null) }
  }

  const linkSuporteWhats = "https://wa.me/5513997421804?text=Olá,%20gostaria%20de%20informações%20sobre%20meu%20reembolso%20de%20evento."

  const handleBotaoAgendarEmptyState = () => {
    if (onAgendarEventos) {
      onAgendarEventos()
    } else if (onReagendar) {
      onReagendar()
    }
  }

  return (
    <>
<PortalHistoryDesktop items={itensHistorico} filter={filtro} onFilter={setFiltro} ratings={avaliacoes} busy={loadingAvaliacao} onRate={handleAvaliar} onBook={onReagendar} onEvents={onAgendarEventos} onMyEvents={onVerMeusEventos}/>
<div className="rt-mobile-history space-y-3 pb-8 animate-fade-up">
      
      {/* 1. FILTROS SEGMENTADOS NÁUTICOS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 pb-1 no-scrollbar text-[8.5px] font-black uppercase tracking-wider">
        <button 
          type="button" 
          onClick={() => setFiltro('todas')}
          className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
            filtro === 'todas' 
              ? 'bg-gradient-to-r from-[#0284c7] to-[#034480] text-white shadow-md shadow-sky-600/30' 
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-800'
          }`}
        ><VisualText id="copy-4e7d6cd2096f" defaultText={"Todas ("}/>{itensHistorico.length})
        </button>
        <button 
          type="button" 
          onClick={() => setFiltro('concluidas')}
          className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
            filtro === 'concluidas' 
              ? 'bg-gradient-to-r from-[#0284c7] to-[#034480] text-white shadow-md shadow-sky-600/30' 
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-800'
          }`}
        ><VisualText id="copy-63a8c55152dc" defaultText={"Concluídas ("}/>{totalConcluidas})
        </button>
        <button 
          type="button" 
          onClick={() => setFiltro('eventos')}
          className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
            filtro === 'eventos' 
              ? 'bg-gradient-to-r from-[#0284c7] to-[#034480] text-white shadow-md shadow-sky-600/30' 
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-800'
          }`}
        ><VisualText id="copy-0d338a47ba2d" defaultText={"Expedições ("}/>{totalEventos})
        </button>
        <button 
          type="button" 
          onClick={() => setFiltro('canceladas')}
          className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
            filtro === 'canceladas' 
              ? 'bg-gradient-to-r from-[#0284c7] to-[#034480] text-white shadow-md shadow-sky-600/30' 
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-800'
          }`}
        ><VisualText id="copy-9f301b3f5c95" defaultText={"Canceladas ("}/>{totalCanceladas})
        </button>
      </div>

      {/* 2. LISTAGEM DO HISTÓRICO AGRUPADA POR MESES */}
      <div className="space-y-4 pt-1">
        {itensFiltrados.length === 0 ? (
          /* EMPTY STATE LIMPO: SEM BOTÃO AGENDAR */
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200/80 dark:border-slate-800 p-8 text-center flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 mb-1">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            
            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wide"><VisualText id="copy-55954b15e407" defaultText={"Sem histórico no momento"}/></h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed"><VisualText id="copy-d69f7b04413b" defaultText={"Suas remadas e atividades concluídas serão registradas aqui."}/></p>
          </div>
        ) : (
          gruposPorMes.map(([chaveMes, grupo]) => (
            <div key={chaveMes} className="space-y-2">
              {/* CABEÇALHO DO MÊS */}
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-1.5 text-[#0284c7] dark:text-sky-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {grupo.label}
                  </span>
                </div>
                <span className="text-[8.5px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {grupo.itens.length} <VisualLabel text={grupo.itens.length === 1 ? 'atividade' : 'atividades'}/>
                </span>
              </div>

              {/* LISTA DE CARDS DO MÊS */}
              <div className="space-y-2">
                {grupo.itens.map((item: any) => {
                  const dataRaw = item.data_reserva || item.data || new Date().toISOString().split('T')[0]
                  const dataObj = new Date(dataRaw.split('T')[0] + 'T12:00:00')
                  const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()
                  const diaMes = dataObj.getDate()
                  const mesNome = dataObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()

                  const isClima = item.status === 'cancelado_clima'
                  const isReembolso = item.status === 'reembolso_solicitado' || (item.is_evento && item.status?.includes('cancelado'))
                  const isCanceladoAluno = item.status === 'cancelado' || item.status === 'cancelado_aluno'
                  const isConcluido = item.status === 'concluido' || item.status === 'realizado'
                  const isEvento = item.is_evento

                  // Checa se já houve reagendamento efetuado
                  const jaReagendado = item.reagendado === true || item.status === 'reagendado'

                  const notaAvaliada = avaliacoes[String(item.id)] || item.avaliacao || 0

                  return (
                    <div 
                      key={item.id}
                      className={`bg-white dark:bg-slate-900 rounded-[1.6rem] p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-800 border-l-[4px] space-y-2.5 transition-all ${
                        isConcluido ? '!border-l-emerald-500' :
                        isClima ? '!border-l-amber-500' :
                        isEvento ? '!border-l-[#0284c7]' :
                        isReembolso ? '!border-l-sky-400' :
                        '!border-l-slate-400 opacity-80'
                      }`}
                    >
                      {/* LINHA PRINCIPAL DO CARD */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          
                          {/* BLOCO DE DATA NÁUTICO */}
                          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[7.5px] font-black uppercase leading-none text-[#0284c7] dark:text-sky-400">
                              {diaSemana}
                            </span>
                            <span className="text-base font-black text-slate-900 dark:text-white leading-none mt-0.5">
                              {diaMes}
                            </span>
                            <span className="text-[6.5px] font-bold text-slate-400 leading-none uppercase">
                              {mesNome}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white truncate leading-tight">
                              {item.titulo_evento || item.titulo || `Remada · ${item.horario_reserva || 'Horário agendado'}`}
                            </h3>
                            <p className={`text-[9.5px] font-medium mt-0.5 truncate ${isClima ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                              <VisualLabel text={isClima ? 'Cancelamento por Condições de Maré' :
                               isReembolso ? 'Cancelamento de inscrição' :
                               isCanceladoAluno ? 'Cancelado por desistência' :
                               item.is_evento ? `Expedição · Canto do Forte` :
                               item.caiaque_nome || (alunoData?.tipo_plano === 'guardaria' ? 'Equipamento Próprio' : 'Caiaque Solo')}/>
                            </p>
                          </div>
                        </div>

                        {/* BADGE STATUS */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase shrink-0 border ${
                          isConcluido ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          isClima ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' :
                          isEvento ? 'bg-sky-50 text-[#0284c7] border-sky-200 dark:bg-sky-950/60 dark:text-sky-300' :
                          isReembolso ? 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300' :
                          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          <VisualLabel text={isConcluido ? 'Concluída' :
                           isClima ? 'Condição Maré' :
                           isEvento ? 'Expedição' :
                           isReembolso ? 'Reembolso' : 'Cancelada'}/>
                        </span>
                      </div>

                      {/* RODAPÉ 1: EVENTOS -> BOTÃO "MEUS EVENTOS" (DIRECIONA PARA O PERFIL) */}
                      {isEvento && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400"><VisualText id="copy-3c20038413fa" defaultText={"Inscrição confirmada na expedição"}/></span>
                          <button 
                            type="button"
                            onClick={() => {
                              if (onVerMeusEventos) onVerMeusEventos()
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-[#0284c7] to-[#034480] text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-xs hover:brightness-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span><VisualText id="copy-03fe43816fcd" defaultText={"Meus Eventos"}/></span>
                            <span>➔</span>
                          </button>
                        </div>
                      )}

                      {/* RODAPÉ 2: REMADAS CONCLUÍDAS -> AVALIAÇÃO DE ESTRELAS */}
                      {isConcluido && !isEvento && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9px]">
                          <span className="font-bold text-slate-400">
                            <VisualLabel text={notaAvaliada > 0 ? 'Sua avaliação:' : 'Como foi a remada?'}/>
                          </span>
                          <div className="flex items-center gap-1 bg-amber-50/70 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg border border-amber-200/50">
                            <div className="flex gap-1 text-xs">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  disabled={loadingAvaliacao === String(item.id)}
                                  onClick={() => handleAvaliar(String(item.id), star)}
                                  className={`cursor-pointer transition-all duration-150 hover:scale-125 active:scale-95 ${
                                    star <= notaAvaliada 
                                      ? 'text-amber-400 drop-shadow-xs' 
                                      : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                                  }`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            {notaAvaliada > 0 && (
                              <span className="text-[8.5px] font-black text-amber-700 dark:text-amber-300 ml-1">
                                {notaAvaliada}.0
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* RODAPÉ 3: REAGENDAMENTO PARA GUARDARIA / MENSALISTAS (CLIMA / MARÉ) */}
                      {isClima && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className="text-[8.5px] font-bold text-slate-400">
                            <VisualLabel text={jaReagendado ? 'Crédito utilizado' : 'Crédito disponível para reagendar'}/>
                          </span>

                          {jaReagendado ? (
                            /* QUANDO JÁ REAGENDADO: BOTÃO SAI E ENTRA BADGE CONFIRMADO */
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span><VisualText id="copy-df3572a88cbf" defaultText={"Agendamento Feito"}/></span>
                            </span>
                          ) : (
                            /* QUANDO PENDENTE: BOTÃO REAGENDAR DIRECIONA PARA ABA AGENDAMENTO */
                            <button 
                              type="button"
                              onClick={() => {
                                if (onReagendar) onReagendar()
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-[#0284c7] to-[#034480] text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-xs hover:brightness-105 active:scale-95 transition flex items-center gap-1 cursor-pointer"
                            >
                              <span><VisualText id="copy-92883d3b187c" defaultText={"Reagendar"}/></span>
                              <span>➔</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* RODAPÉ 4: REEMBOLSO / SUPORTE */}
                      {isReembolso && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className="text-[8.5px] font-medium text-slate-400"><VisualText id="copy-27580e34597e" defaultText={"Dúvidas sobre o reembolso?"}/></span>
                          <a 
                            href={linkSuporteWhats}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-gradient-to-r from-[#0284c7] to-[#034480] text-white font-black text-[8.5px] uppercase tracking-wider rounded-lg shadow-xs hover:brightness-105 transition flex items-center gap-1"
                          >
                            <span><VisualText id="copy-69cd78bdc879" defaultText={"Falar no WhatsApp"}/></span>
                            <span>➔</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

    </div></>
  )
}