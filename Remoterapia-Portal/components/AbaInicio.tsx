'use client'

import BrandIcon from '@/components/ui/BrandIcon'
import { useState } from 'react'
import { Calendar, X, Info } from 'lucide-react'
import { PortalDesktopInicio } from '@/components/desktop/PortalDesktop'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



interface AbaInicioProps {
  alunoData: any
  agendamentos: any[]
  reservasSemana: number
  maxMensalista?: number
  disponiveisSemana?: number
  caiaques: any[]
  lockers: any[]
  onSolicitarNovo: () => void
  onExplorarEventos: () => void
  onCancelar: (id: string, dataStr: string) => void
}

export default function AbaInicio({
  alunoData,
  agendamentos,
  reservasSemana,
  maxMensalista,
  disponiveisSemana,
  caiaques,
  lockers,
  onSolicitarNovo,
  onExplorarEventos,
  onCancelar
}: AbaInicioProps) {
  // Modal interno de motivo de cancelamento (Blindado, não depende de page.tsx)
  const [detalhesCancelado, setDetalhesCancelado] = useState<{ motivo: string, obs: string } | null>(null)

  // Cotas semanais seguras
  const maxCotas = maxMensalista ?? (alunoData?.max_reservas_semana || 2)
  const livres = disponiveisSemana ?? Math.max(0, maxCotas - reservasSemana)

  // Filtra agendamentos ativos/relevantes
  const agendamentosAtivos = (agendamentos || []).filter(
    (a: any) => a.status === 'pendente' || a.status === 'confirmado' || a.status === 'cancelado_clima' || a.status === 'cancelado'
  )

  return (
    <>
      <PortalDesktopInicio alunoData={alunoData} agendamentos={agendamentos} reservasSemana={reservasSemana} maxMensalista={maxMensalista} disponiveisSemana={disponiveisSemana} caiaques={caiaques} lockers={lockers} onSolicitarNovo={onSolicitarNovo} onExplorarEventos={onExplorarEventos} onCancelar={onCancelar}/>
    <div className="rt-mobile-home space-y-4 animate-fade-up" data-rt-area="area-d738a233a857">
      
      {/* 1. CARD DE COTAS SEMANAIS E BOTÃO DE AGENDAR */}
      {alunoData && ['mensalista', 'guardaria', 'combo_mensalista_guardaria'].includes(alunoData.tipo_plano) && (
        <div className="flex flex-col gap-4">
          {/* COTAS SEMANAIS (SOMENTE PARA MENSALISTA) */}
          {alunoData.tipo_plano === 'mensalista' && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[1.8rem] shadow-md border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-slate-800 text-[#1D70B8] dark:text-cyan-400 flex items-center justify-center text-base">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block"><VisualText id="copy-83048eebb62d" defaultText={"Reservas da Semana"}/></span>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider"><VisualText id="copy-b592c9455a78" defaultText={"Ciclo Segunda a Domingo"}/></span>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-wider shadow-xs">
                  {livres} de {maxCotas}<VisualText id="copy-4fc1bd8f337c" defaultText={" disponível"}/></span>
              </div>
              
              {/* Pílulas visuais de status */}
              <div className="flex gap-2 mt-0.5">
                {Array.from({ length: maxCotas }).map((_, idx) => {
                  const isUsed = (idx + 1) <= reservasSemana;
                  return (
                    <div 
                      key={idx} 
                      className={`flex-1 h-2.5 rounded-full ${
                        isUsed 
                          ? 'bg-gradient-to-r from-[#E52E87] to-[#be185d] shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* BOTÃO SOLICITAR NOVO AGENDAMENTO */}
          <button 
            type="button"
            onClick={onSolicitarNovo}
            className="w-full py-3.5 bg-gradient-to-r from-[#E52E87] to-[#be185d] hover:opacity-95 text-white font-black rounded-2xl shadow-lg shadow-pink-500/25 active:scale-95 transition-all uppercase tracking-wider text-xs flex justify-center items-center gap-2 cursor-pointer"
          >
            <span><VisualText id="copy-10ce5cc4c0c8" defaultText={"SOLICITAR NOVO AGENDAMENTO"}/></span>
            <span className="text-sm">➔</span>
          </button>
        </div>
      )}

      {/* 2. SEUS AGENDAMENTOS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="bg-[#032b57] dark:bg-[#0284c7] text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xs"><VisualText id="copy-ba6bfe18c851" defaultText={"SEUS AGENDAMENTOS ("}/>{agendamentosAtivos.length})
          </span>
          <span className="text-[10px] font-bold text-slate-400"><VisualText id="copy-0644b70352ba" defaultText={"Próximas remadas"}/></span>
        </div>

        {agendamentosAtivos.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5 p-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-400 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white"><VisualText id="copy-aabea1141484" defaultText={"Nenhum agendamento ativo no momento"}/></h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                <VisualLabel text={alunoData && ['mensalista', 'guardaria', 'combo_mensalista_guardaria'].includes(alunoData.tipo_plano)
                  ? 'Escolha uma data e horário disponível para realizar sua remada da semana.'
                  : 'Quando você reservar uma remada ou evento, os horários e detalhes aparecerão aqui.'}/>
              </p>
            </div>
            <button 
              type="button"
              onClick={() => {
                const temPlano = alunoData && ['mensalista', 'guardaria', 'combo_mensalista_guardaria'].includes(alunoData.tipo_plano);
                if (temPlano) {
                  onSolicitarNovo();
                } else {
                  onExplorarEventos();
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-[#0284c7] to-[#034480] text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-md shadow-sky-600/25 cursor-pointer hover:brightness-105 transition active:scale-95 flex items-center gap-2 mt-2"
            >
              <span><VisualLabel text={alunoData && ['mensalista', 'guardaria', 'combo_mensalista_guardaria'].includes(alunoData.tipo_plano) ? 'Agendar Horário' : 'Ver Próximos Eventos'}/></span>
              <span className="text-sm">➔</span>
            </button>
          </div>
        ) : (
          agendamentosAtivos.map((ag: any) => {
            const isCancelado = ag.status === 'cancelado_clima' || ag.status === 'cancelado';
            const dataObj = new Date(ag.data_reserva + 'T00:00:00');
            const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
            const diaMes = dataObj.getDate();

            // Identificação amigável do Locker
            const lockerInfo = ag.locker_numero 
              ? `Locker #${ag.locker_numero}` 
              : (ag.observacoes && ag.observacoes.toLowerCase().includes('locker')) 
                ? ag.observacoes 
                : lockers?.find((l: any) => String(l.id) === String(ag.locker_id))?.numero 
                  ? `Locker #${lockers.find((l: any) => String(l.id) === String(ag.locker_id))?.numero}` 
                  : null;

            const nomeEmbarcacao = (caiaques || []).find((c: any) => String(c.id) === String(ag.caiaque_id))?.nome || 'Caiaque Solo';

            return (
              <div 
                key={ag.id} 
                className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.8rem] p-4 shadow-xl border border-white/60 dark:border-slate-800 border-l-[6px] flex flex-col gap-3 transition-all hover:scale-[1.01] ${
                  isCancelado 
                    ? '!border-l-red-500 opacity-95' 
                    : ag.is_evento 
                      ? '!border-l-[#E52E87]' 
                      : '!border-l-[#1D70B8]'
                }`}
              >
                {/* LINHA SUPERIOR: DATA + TÍTULO E SOMENTE O HORÁRIO + STATUS */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    
                    {/* QUADRADO DA DATA */}
                    <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 shadow-xs flex flex-col items-center justify-center shrink-0 ${
                      isCancelado 
                        ? 'border-slate-200 dark:border-slate-700' 
                        : ag.is_evento 
                          ? 'border-pink-200 dark:border-pink-900/50' 
                          : 'border-blue-200 dark:border-blue-900/50'
                    }`}>
                      <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                        isCancelado 
                          ? 'text-slate-400 dark:text-slate-500' 
                          : ag.is_evento 
                            ? 'text-[#E52E87] dark:text-pink-400' 
                            : 'text-[#1D70B8] dark:text-cyan-400'
                      }`}>
                        {diaSemana}
                      </span>
                      <span className={`text-xl font-black leading-none mt-1 ${
                        isCancelado 
                          ? 'text-slate-600 dark:text-slate-400' 
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {diaMes}
                      </span>
                    </div>

                    {/* TÍTULO E SOMENTE HORÁRIO */}
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate leading-tight">
                        {ag.titulo_evento || (alunoData?.tipo_plano === 'guardaria' ? 'Clube Guardaria' : (alunoData?.tipo_plano ? 'Clube Mensalista' : 'Remada Avulsa'))}
                      </p>
                      <p className={`text-base font-black tracking-tight leading-none mt-1 ${
                        isCancelado 
                          ? 'text-slate-500 dark:text-slate-400' 
                          : ag.is_evento 
                            ? 'text-[#E52E87] dark:text-pink-400' 
                            : 'text-[#1D70B8] dark:text-cyan-400'
                      }`}>
                        {ag.horario_reserva}
                      </p>
                    </div>
                  </div>

                  {/* STATUS EM PÍLULA */}
                  <span className={`shrink-0 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs border ${
                    isCancelado 
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50' 
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isCancelado ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                    <VisualLabel text={isCancelado ? 'Cancelado' : 'Confirmado'}/>
                  </span>
                </div>

                {/* LINHA INFERIOR: EMBARCAÇÃO COM LOCKER / TICKET + BOTÃO DE AÇÃO */}
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1.5 border ${
                    ag.is_evento
                      ? 'bg-pink-50/80 dark:bg-pink-950/30 text-[#E52E87] dark:text-pink-300 border-pink-100 dark:border-pink-900/40'
                      : 'bg-blue-50/80 dark:bg-blue-950/30 text-[#1D70B8] dark:text-cyan-400 border-blue-100 dark:border-blue-900/40'
                  }`}>
                    {ag.is_evento ? (
                      <>
                        <span><BrandIcon name="ticket"/></span>
                        <span><VisualText id="copy-288dfe65a73a" defaultText={"Inscrição Confirmada"}/></span>
                      </>
                    ) : (
                      <>
                        <span><BrandIcon name="ship"/></span>
                        <span>{nomeEmbarcacao}</span>
                        {lockerInfo && (
                          <>
                            <span className="text-blue-300 dark:text-slate-600">·</span>
                            <span className="text-slate-700 dark:text-slate-200"><BrandIcon name="key"/> {lockerInfo}</span>
                          </>
                        )}
                      </>
                    )}
                  </span>

                  {isCancelado ? (
                    <button 
                      type="button"
                      onClick={() => setDetalhesCancelado({
                        motivo: ag.motivo_cancelamento || 'Condições climáticas desfavoráveis',
                        obs: ag.observacoes || 'Cancelado pela equipe para a segurança de todos.'
                      })}
                      className="text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 px-3 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <span>ℹ️</span><VisualText id="copy-d624bd0e8b71" defaultText={" Ver Motivo / Detalhes"}/></button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => onCancelar(ag.id, ag.data_reserva)}
                      className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider bg-red-50 dark:bg-red-950/40 hover:bg-red-100 border border-red-200 dark:border-red-800/50 px-3 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <span>✕</span><VisualText id="copy-7918475cc18e" defaultText={" Cancelar"}/></button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL INTERNO: DETALHES DE CANCELAMENTO */}
      {detalhesCancelado && (
        <div data-rt-modal className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 rounded-[2.2rem] shadow-2xl w-full max-w-sm border border-white/80 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase text-purple-700 dark:text-purple-400 flex items-center gap-2">
                <Info className="w-4 h-4" /><VisualText id="copy-5f0164bb24e5" defaultText={" Detalhes do Cancelamento"}/></h3>
              <button aria-label="Fechar janela" 
                type="button"
                onClick={() => setDetalhesCancelado(null)} 
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider"><VisualText id="copy-f46a77b1dac8" defaultText={"Motivo Informado"}/></p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{detalhesCancelado.motivo}</p>
              </div>
              {detalhesCancelado.obs && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider"><VisualText id="copy-cdf61afff59a" defaultText={"Orientações da Equipe"}/></p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">{detalhesCancelado.obs}</p>
                </div>
              )}
            </div>
            <button 
              type="button"
              onClick={() => setDetalhesCancelado(null)} 
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black rounded-xl text-xs uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            ><VisualText id="copy-18652f8c2a4a" defaultText={"Fechar"}/></button>
          </div>
        </div>
      )}

    <VisualContentSlot id="area-d738a233a857"/></div>
    </>
  )
}
