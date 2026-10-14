'use client'

import PortalHistoryLayout from './PortalHistoryLayout'
import { useState, useMemo } from 'react'
import { registrarAvaliacaoEstrelas } from '@/lib/actions/aluno'



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

  return <PortalHistoryLayout items={itensHistorico} filter={filtro} onFilter={setFiltro} ratings={avaliacoes} busy={loadingAvaliacao} onRate={handleAvaliar} onBook={onReagendar} onEvents={onAgendarEventos} onMyEvents={onVerMeusEventos} support={linkSuporteWhats}/>
}
