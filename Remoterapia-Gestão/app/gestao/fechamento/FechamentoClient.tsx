'use client'
import {WorkspaceHeading,WorkspaceMetric,WorkspacePanel,WorkspaceEmpty,WorkspaceDate} from '@/components/desktop/DesktopWorkspace'
import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPerfilAtual } from '@/lib/actions/auth'
import type { Locacao } from '@/lib/types'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface ItemFinanceiro {
  id: string | number
  cliente: string
  caiaque: string
  entrada: string
  saida: string
  valor: number
  pagamento: string
  data: string
  categoria: string
}

interface FechamentoInfo {
  data: string
  fechadoPor: string
  fechadoEm: string
  total: number
  visitantes: number
}

export default function FechamentoClient({ nomeUsuario }: { nomeUsuario: string }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [busca, setBusca] = useState('')
  const [itens, setItens] = useState<ItemFinanceiro[]>([])
  const [fechamentoInfo, setFechamentoInfo] = useState<FechamentoInfo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [dadosProntos, setDadosProntos] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [confirmarFechamento, setConfirmarFechamento] = useState(false)
  const consultaAtual = useRef(0)
  const travaFechamento = useRef(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  const showToast = useCallback((msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const dateStr = selectedDate.toLocaleDateString('pt-BR')
  const dateIso = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toLocaleDateString('pt-BR')
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString('pt-BR')
  const isToday = dateStr === todayStr

  let relativeLabel = ''
  if (dateStr === todayStr) relativeLabel = 'HOJE'
  else if (dateStr === yesterdayStr) relativeLabel = 'ONTEM'
  else {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' }
    relativeLabel = selectedDate.toLocaleDateString('pt-BR', options).split('-')[0].toUpperCase()
  }

  const changeDate = (offset: number) => {
    if (travaFechamento.current) return
    setConfirmarFechamento(false)
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + offset)
    newDate.setHours(0, 0, 0, 0)
    if (newDate > today) return
    setCarregando(true)
    setDadosProntos(false)
    setFechamentoInfo(null)
    setItens([])
    setSelectedDate(newDate)
    setBusca('')
  }

  const carregarDados = useCallback(async () => {
    const consulta = ++consultaAtual.current
    try {
      const supabase = createClient()
      const inicio = new Date(selectedDate)
      inicio.setHours(0, 0, 0, 0)
      const fim = new Date(inicio)
      fim.setDate(fim.getDate() + 1)
      const [locacoesResult, fechamentoResult] = await Promise.all([
        supabase.from('locacoes')
          .select('*')
          .eq('status', 'finalizado').eq('tipo','avulso')
          .gte('saida', inicio.toISOString())
          .lt('saida', fim.toISOString())
          .order('entrada', { ascending: false }),
        supabase.from('fechamentos_caixa')
          .select('data_fechamento, fechado_por, fechado_em, total, visitantes')
          .eq('data_fechamento', dateIso)
          .order('fechado_em', { ascending: false })
          .limit(1)
      ])
      if (locacoesResult.error) throw locacoesResult.error
      if (fechamentoResult.error) throw fechamentoResult.error
      if (consulta !== consultaAtual.current) return

      const itemDb = fechamentoResult.data?.[0]
      setFechamentoInfo(itemDb ? {
        data: dateStr,
        fechadoPor: itemDb.fechado_por,
        fechadoEm: new Date(itemDb.fechado_em).toLocaleString('pt-BR'),
        total: Number(itemDb.total) || 0,
        visitantes: itemDb.visitantes || 0
      } : null)
      setItens((locacoesResult.data ?? []).map((item: Locacao) => ({
        id: item.id,
        cliente: item.cliente || 'Cliente Não Informado',
        caiaque: Array.isArray(item.caiaques_ids) ? item.caiaques_ids.join(', ') : 'N/A',
        entrada: item.entrada ? new Date(item.entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        saida: item.saida ? new Date(item.saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        valor: Number(item.valor_final ?? item.valor_original ?? 0),
        pagamento: item.pagamento || 'Pendente',
        data: dateStr,
        categoria: (item.tipo === 'mensalista' || String(item.pagamento) === 'Clube') ? 'Mensalista' : 'Avulso'
      })))
      setDadosProntos(true)
    } catch (e: unknown) {
      if (consulta !== consultaAtual.current) return
      setDadosProntos(false)
      setFechamentoInfo(null)
      setItens([])
      const mensagem = e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Falha ao carregar dados.'
      showToast('Não foi possível consultar o caixa: ' + mensagem, 'error')
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false)
    }
  }, [selectedDate, dateIso, dateStr, showToast])

  useEffect(() => {
    let ativo = true
    void Promise.resolve().then(() => { if (ativo) return carregarDados() })
    return () => {
      ativo = false
      consultaAtual.current += 1
    }
  }, [carregarDados])

  const itensFiltrados = itens.filter(i => {
    const q = busca.toLowerCase().trim()
    if (!q) return true
    return (
      i.cliente.toLowerCase().includes(q) ||
      i.caiaque.includes(q) ||
      i.pagamento.toLowerCase().includes(q)
    )
  })

  const totalVisitantes = itens.length

  const handleFecharCaixa = async () => {
    if (travaFechamento.current || !dadosProntos || carregando || fechamentoInfo) return
    travaFechamento.current = true
    setFechando(true)
    try {
      const perfil = await getPerfilAtual()
      if (!perfil?.ativo) throw new Error('Sua sessão expirou ou não tem acesso ao fechamento.')
      const supabase = createClient()
      const {data:row,error}=await supabase.rpc('fechar_caixa',{p_data:dateIso})
      if(error||!row)throw new Error(error?.message||'Fechamento não confirmado.')
      const novoFechamento:FechamentoInfo={data:dateStr,fechadoPor:row.fechado_por,fechadoEm:new Date(row.fechado_em).toLocaleString('pt-BR'),total:Number(row.total),visitantes:row.visitantes}
      setFechamentoInfo(novoFechamento)
      setConfirmarFechamento(false)
      // Cache apenas de registros já confirmados pelo banco; preserva o histórico anterior.
      try {
        const stored = localStorage.getItem('fechamento_caixa_historico')
        const list = stored ? JSON.parse(stored) : []
        if (Array.isArray(list)) {
          const atualizado = [...list.filter(f => f?.data !== dateStr && f?.data !== dateIso), novoFechamento]
          localStorage.setItem('fechamento_caixa_historico', JSON.stringify(atualizado))
        }
      } catch {}
      showToast('Caixa fechado e salvo com sucesso!', 'success')
    } catch (e: unknown) {
      const mensagem = e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Falha ao salvar.'
      showToast('O fechamento não foi confirmado: ' + mensagem, 'error')
    } finally {
      travaFechamento.current = false
      setFechando(false)
    }
  }

  // EXPORTAÇÃO OFICIAL DO FECHAMENTO DE CAIXA NO PADRÃO PLORIX GESTÃO A4
  const exportarRelatorioPdfA4 = () => {
    const w = window.open('', '_blank')
    if (!w) {
      showToast('Permita pop-ups no seu navegador para visualizar o relatório.', 'warning')
      return
    }

    const horaFechamento = fechamentoInfo?.fechadoEm 
      ? fechamentoInfo.fechadoEm.split(' ')[1] || fechamentoInfo.fechadoEm 
      : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    // FILTRO EXCLUSIVO DA FROTA COMERCIAL (SEM MENSALISTAS E SEM GUARDARIA)
    const viagensComerciais = itens.filter(i => i.categoria !== 'Mensalista' && i.categoria !== 'Guardaria')
    const qtdSolo = viagensComerciais.filter(i => !i.caiaque?.toLowerCase().includes('duplo')).length
    const qtdDuplo = viagensComerciais.filter(i => i.caiaque?.toLowerCase().includes('duplo')).length
    const totalViagens = viagensComerciais.length

    // TOTAIS POR MÉTODO DE PAGAMENTO
    const totaisPag: Record<string, number> = { Pix: 0, Crédito: 0, Débito: 0, Dinheiro: 0 }
    itens.forEach(it => {
      if (totaisPag[it.pagamento] !== undefined) {
        totaisPag[it.pagamento] += Number(it.valor) || 0
      }
    })

    const rowsViagens = itens.map(it => `
      <tr>
        <td style="padding: 10px 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 11px;">${escapeHtml(it.cliente)}</td>
        <td style="padding: 10px 14px; text-align: center; color: #64748b; font-weight: 700; font-size: 11px;">${escapeHtml(it.entrada)} às ${escapeHtml(it.saida)}</td>
        <td style="padding: 10px 14px; text-align: center;"><span style="background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 900; border: 1px solid #e2e8f0;">${escapeHtml(it.pagamento)}</span></td>
        <td style="padding: 10px 14px; text-align: right; font-weight: 900; color: #059669; font-size: 12px;">R$ ${escapeHtml(Number(it.valor || 0).toFixed(2).replace('.', ','))}</td>
      </tr>
    `).join('')

    const totalCalculado = Object.values(totaisPag).reduce((acc, v) => acc + v, 0)
    const totalExibir = fechamentoInfo?.total || totalCalculado || totalFaturado

    w.document.write(`<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Fechamento de Caixa — ${escapeHtml(dateStr)}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
            * { box-sizing: border-box; }
            body { font-family: 'Nunito', Arial, sans-serif; padding: 30px; color: #1e293b; background: #f8fafc; }
            .container { max-width: 780px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 24px; padding: 36px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
            
            /* CABEÇALHO COM LOGO PLORIX */
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0284c7; padding-bottom: 18px; margin-bottom: 18px; }
            .logo-area { display: flex; align-items: center; gap: 14px; }
            .brand-title { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; line-height: 1; letter-spacing: -0.5px; }
            .brand-subtitle { font-size: 11px; font-weight: 800; color: #0284c7; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .doc-meta { text-align: right; }
            .doc-meta h1 { margin: 0; font-size: 13px; font-weight: 900; color: #0369a1; text-transform: uppercase; }
            .doc-meta p { margin: 4px 0 0 0; font-size: 13px; font-weight: 900; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; }

            /* AUDITORIA DE FECHAMENTO */
            .auditoria-badge { font-size: 10.5px; font-weight: 800; color: #0369a1; text-transform: uppercase; background: #e0f2fe; padding: 5px 12px; border-radius: 8px; display: inline-block; margin-bottom: 16px; border: 1px solid #bae6fd; }

            /* BANDEJAS AZUIS NÁUTICAS DO SITE */
            .section-tray { background: #eaf4fc; border: 1px solid #bfdbfe; border-radius: 18px; padding: 18px; margin-bottom: 18px; box-shadow: inset 0 2px 4px rgba(2, 132, 199, 0.04); }
            .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #0369a1; margin: 0 0 12px 0; border-left: 4px solid #0284c7; padding-left: 10px; line-height: 1; letter-spacing: 0.5px; }

            /* TABELAS INTERNAS EM BRANCO ELEVADO */
            table { width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #dbeafe; font-size: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
            th { background: #e0f2fe; text-align: left; padding: 10px 14px; font-weight: 900; color: #0369a1; border-bottom: 1px solid #bfdbfe; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
            td { padding: 9px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 700; }
            tr:last-child td { border-bottom: none; }
            .badge-qty { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 900; background: #dbeafe; color: #1e40af; }
            .badge-qty-total { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 900; background: #0284c7; color: #ffffff; }

            /* BANDEJA DE FATURAMENTO TOTAL */
            .total-box { margin-top: 22px; background: #eaf4fc; border: 2px solid #93c5fd; border-radius: 18px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
            .total-box p { margin: 0; font-size: 11px; font-weight: 900; color: #0c4a6e; text-transform: uppercase; letter-spacing: 0.5px; }
            .total-box h3 { margin: 0; font-size: 28px; font-weight: 900; color: #0284c7; }

            .footer { margin-top: 26px; border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; }
            .print-btn { display: block; width: 100%; margin-top: 22px; padding: 14px; background: #0284c7; color: #fff; border: none; border-radius: 14px; font-weight: 900; font-size: 12px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
            
            @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .container { border: none; padding: 0; box-shadow: none; } @page { size: A4; margin: 15mm; } }
        </style>
    </head>
    <body>
        <div class="container">
            
            <!-- 1. CABEÇALHO OFICIAL COM LOGO PLORIX -->
            <div class="header">
                <div class="logo-area">
                    <img src="/images/plorix_logo.png" style="width: 52px; height: 52px; object-fit: contain;" alt="Plorix Logo" />
                    <div>
                        <p class="brand-title">PLORIX GESTÃO</p>
                        <p class="brand-subtitle">Sistema de Gestão e Controle Remoterapia</p>
                    </div>
                </div>
                <div class="doc-meta">
                    <h1>Fechamento de Caixa — ${escapeHtml(dateStr)}</h1>
                    <p>${escapeHtml(horaFechamento)}</p>
                </div>
            </div>

            <!-- REGISTRO DE AUDITORIA DO CAIXA -->
            <div class="auditoria-badge">
              FECHADO POR: ${escapeHtml(fechamentoInfo?.fechadoPor || nomeUsuario || 'ADMINISTRADOR')} ÀS ${escapeHtml(horaFechamento)}
            </div>

            <!-- 2. CATEGORIAS DE EMBARQUE (SEM MENSALISTAS E SEM GUARDARIA) -->
            <div class="section-tray">
                <p class="section-title">CATEGORIAS DE EMBARQUE</p>
                <table>
                    <thead>
                        <tr><th>Categoria</th><th style="text-align: right;">Quantidade</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Caiaques Solo (Autônomo)</td><td style="text-align: right;"><span class="badge-qty">${escapeHtml(qtdSolo)}</span></td></tr>
                        <tr><td>Caiaques Duplo (Locação Comercial)</td><td style="text-align: right;"><span class="badge-qty">${escapeHtml(qtdDuplo)}</span></td></tr>
                        <tr style="background: #f0f9ff; font-weight: 900;">
                          <td style="color: #0c4a6e;">Total de Embarques</td>
                          <td style="text-align: right;"><span class="badge-qty-total">${escapeHtml(totalViagens)}</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 3. MÉTODOS DE PAGAMENTO -->
            <div class="section-tray">
                <p class="section-title">MÉTODOS DE PAGAMENTO</p>
                <table>
                    <thead>
                        <tr><th>Método</th><th style="text-align: right;">Valor Total</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Pix</td><td style="text-align: right; font-weight: 900; color: #059669;">R$ ${escapeHtml(totaisPag.Pix.toFixed(2).replace('.', ','))}</td></tr>
                        <tr><td>Crédito</td><td style="text-align: right; font-weight: 900; color: #059669;">R$ ${escapeHtml(totaisPag.Crédito.toFixed(2).replace('.', ','))}</td></tr>
                        <tr><td>Débito</td><td style="text-align: right; font-weight: 900; color: #059669;">R$ ${escapeHtml(totaisPag.Débito.toFixed(2).replace('.', ','))}</td></tr>
                        <tr><td>Dinheiro</td><td style="text-align: right; font-weight: 900; color: #059669;">R$ ${escapeHtml(totaisPag.Dinheiro.toFixed(2).replace('.', ','))}</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- 4. ORDEM DE VIAGENS -->
            <div class="section-tray">
                <p class="section-title">ORDEM DE VIAGENS</p>
                <table>
                    <thead>
                        <tr>
                          <th>Cliente</th>
                          <th style="text-align: center;">Horário / Turno</th>
                          <th style="text-align: center;">Pagamento</th>
                          <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsViagens || '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 16px;">Nenhum registro nesta data.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- 5. BANDEJA DO FATURAMENTO TOTAL DO DIA -->
            <div class="total-box">
                <div>
                  <p>FATURAMENTO TOTAL DO DIA</p>
                </div>
                <h3>R$ ${escapeHtml(Number(totalExibir).toFixed(2).replace('.', ','))}</h3>
            </div>

            <!-- RODAPÉ -->
            <div class="footer">
                Plorix Gestão © 2026 — Controle e Monitoramento Remoterapia
            </div>

            <button class="print-btn" onclick="window.print()">🖨️ IMPRIMIR / SALVAR PDF</button>
        </div>
    </body>
    </html>`)
  }

  const totalFaturado = itens.reduce((acc, curr) => acc + curr.valor, 0)

  return (
    <div className="rt-cash-workspace space-y-4 dw-cash"><div className="dw-only"><WorkspaceHeading eyebrow="Financeiro da base" title="Conferência e fechamento" description="Revise os registros do dia antes de concluir o caixa." actions={<WorkspaceDate label={dateStr} prev={()=>changeDate(-1)} next={()=>changeDate(1)} nextDisabled={isToday}/>}/><div className="dw-metrics"><WorkspaceMetric label="Faturamento do dia" value={carregando?'—':totalFaturado.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} icon="wallet"/><WorkspaceMetric label="Visitantes registrados" value={carregando?'—':totalVisitantes} icon="users"/><WorkspaceMetric label="Situação do caixa" value={carregando?'Consultando':fechamentoInfo?'Concluído':'Em aberto'} icon="lock"/></div></div>
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
      
      {/* 1. SELETOR DE DATA PADRONIZADO (IDÊNTICO AO REGISTRO) */}
      <div className="dw-mobile"><div className="bg-white/95 dark:bg-slate-900/95 p-3.5 flex justify-between items-center rounded-2xl shadow-sm border-t-4 !border-t-cyan-400 border border-white/60 dark:border-slate-800 mb-2">
        <button 
          type="button" 
          onClick={() => changeDate(-1)}
          className="w-10 h-10 flex items-center justify-center text-blue-600 dark:text-cyan-400 bg-[#f2f8fc] dark:bg-slate-800 hover:bg-blue-100 rounded-xl transition-all shadow-sm text-sm font-black active:scale-90 border border-blue-100 dark:border-slate-700 cursor-pointer"
        ><VisualText id="copy-0bcac5594c19" defaultText={"&lt;"}/></button>
        
        <div className="text-center flex-1 cursor-pointer" onClick={() => setSelectedDate(new Date())}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
            {relativeLabel}
          </p>
          <p className="text-sm font-black text-blue-950 dark:text-white uppercase flex items-center justify-center gap-1.5 leading-tight">
            <span><BrandIcon name="calendar"/></span> {dateStr}
          </p>
        </div>

        <button 
          type="button" 
          onClick={() => changeDate(1)}
          disabled={isToday}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm text-sm font-black active:scale-90 border cursor-pointer ${
            isToday 
              ? 'text-slate-300 bg-slate-100 dark:bg-slate-800/40 border-transparent cursor-not-allowed' 
              : 'text-blue-600 dark:text-cyan-400 bg-[#f2f8fc] dark:bg-slate-800 hover:bg-blue-100 border-blue-100 dark:border-slate-700'
          }`}
        ><VisualText id="copy-805dd3c4021c" defaultText={"&gt;"}/></button>
      </div></div>

      {/* 2. CARD RESUMO: VISITANTES E FATURAMENTO CONECTADOS */}
      <div className="dw-mobile"><div className="bg-white/95 dark:bg-slate-900/95 p-5 rounded-[2.2rem] text-center border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/5">
        <span className="text-[9px] font-black text-blue-700 dark:text-cyan-300 uppercase tracking-widest px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 inline-block mb-1"><VisualText id="copy-6c704c9b28cd" defaultText={"VISITANTES DO DIA"}/></span>
        
        <p className="text-5xl font-black text-slate-900 dark:text-white leading-none my-2 drop-shadow-sm tabular-nums">
          {totalVisitantes}
        </p>

        <div className="inline-flex items-center gap-1.5 bg-[#f2f8fc] dark:bg-slate-800 px-4 py-1.5 rounded-full border border-blue-100 dark:border-slate-700 mt-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase"><VisualText id="copy-85e8bb6dcbc5" defaultText={"Faturamento:"}/></span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            R$ {totalFaturado.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div></div>

      {/* 3. BARRA DE BUSCA LIMPA SEM BORDAS PRETAS */}
      <div className="relative shadow-sm">
        <input 
          type="text" 
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar cliente ou data..." 
          className="w-full py-3.5 pl-12 pr-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-white/60 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-cyan-400 shadow-sm placeholder:text-slate-400 transition-colors"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">
          <BrandIcon name="search"/>
        </span>
      </div>

      {/* 4. TABELA DE ITENS COM IDENTIFICAÇÃO, TURNO E VALOR */}
      <div className="dw-mobile"><div className="bg-white/95 dark:bg-slate-900/95 overflow-hidden rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/5">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f2f8fc] dark:bg-slate-800/80 text-blue-900/80 dark:text-cyan-400 font-black uppercase text-[8px] tracking-wider border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4"><VisualText id="copy-5b431b43757a" defaultText={"IDENTIFICAÇÃO"}/></th>
              <th className="py-3 px-2 text-center"><VisualText id="copy-d9811349f066" defaultText={"TURNO"}/></th>
              <th className="py-3 px-4 text-right"><VisualText id="copy-e11dc4186686" defaultText={"VALOR"}/></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {itensFiltrados.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-400 font-bold">
                  {busca ? 'Nenhum resultado para a busca.' : 'Nenhum registro para esta data.'}
                </td>
              </tr>
            ) : (
              itensFiltrados.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  
                  {/* IDENTIFICAÇÃO (BARCO + PESSOA + DATA) */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-900">
                        #{item.caiaque}<VisualText id="copy-ca123e3010c6" defaultText={" · SOLO"}/></span>
                    </div>
                    <p className="font-black text-slate-900 dark:text-white leading-tight text-sm uppercase">
                      {item.cliente}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                      {item.data}
                    </p>
                  </td>

                  {/* TURNO (CICLO PADRONIZADO COM DURAÇÃO) */}
                  <td className="py-3.5 px-2 text-center">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 leading-tight">
                      {item.entrada} ➜ {item.saida}
                    </p>
                    <span className="inline-block text-[8px] font-black text-cyan-600 dark:text-cyan-400 uppercase mt-1 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-100 dark:border-cyan-900/60">
                      <BrandIcon name="clock"/><VisualText id="copy-3de502f933e4" defaultText={" 34 MIN"}/></span>
                  </td>

                  {/* VALOR + FORMA DE PAGAMENTO */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base leading-none">
                      R$ {item.valor}
                    </span>
                    <span className="block text-[8px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md mt-1 uppercase font-black tracking-wider w-fit ml-auto border border-slate-200 dark:border-slate-700">
                      {item.pagamento}
                    </span>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div></div><div className="dw-only"><WorkspacePanel title="Recebimentos do dia" description="Registros da data e da busca selecionadas"><div className="dw-table-scroll"><table className="dw-table"><thead><tr><th><VisualText id="copy-613dad53b27e" defaultText={"Cliente"}/></th><th><VisualText id="copy-df7181d69aeb" defaultText={"Embarcação"}/></th><th><VisualText id="copy-ac08d7a2e41f" defaultText={"Entrada"}/></th><th><VisualText id="copy-bb17e94d8dc8" defaultText={"Retorno"}/></th><th><VisualText id="copy-4cf4bb9964aa" defaultText={"Pagamento"}/></th><th><VisualText id="copy-b73440d3c123" defaultText={"Valor"}/></th></tr></thead><tbody>{itensFiltrados.map(i=><tr key={i.id}><td><strong>{i.cliente}</strong></td><td>{i.caiaque}</td><td>{i.entrada}</td><td>{i.saida}</td><td>{i.pagamento}</td><td>{i.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>)}</tbody></table></div>{!itensFiltrados.length&&<WorkspaceEmpty title={carregando?'Carregando os registros…':'Nenhum registro nesta seleção'}/>}</WorkspacePanel></div>

      {/* 5. AÇÕES DE FECHAMENTO */}
      {fechamentoInfo ? (
        <div className="mt-4 space-y-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 p-5 rounded-[2rem] text-center font-black uppercase tracking-wider text-[10px] border border-emerald-300 dark:border-emerald-800 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl"><BrandIcon name="success"/></span> CAIXA CONCLUÍDO E ENVIADO
            </div>
            <p className="text-[8px] font-bold normal-case text-emerald-600 dark:text-emerald-400"><VisualText id="copy-e6faa94919dc" defaultText={"Fechado por "}/>{fechamentoInfo.fechadoPor} · {fechamentoInfo.fechadoEm}
            </p>
          </div>
          
          <button 
            type="button" 
            onClick={exportarRelatorioPdfA4} 
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider active:scale-95 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>📄</span><VisualText id="copy-75fd4bd49eb9" defaultText={" BAIXAR RELATÓRIO EM PDF"}/></button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="bg-slate-900 text-white p-4 rounded-[2rem] shadow-xl flex items-center justify-between gap-3 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shrink-0">
              <BrandIcon name="lock"/>
            </div>
            <button 
              type="button" 
              onClick={() => setConfirmarFechamento(true)}
              disabled={carregando || fechando || !dadosProntos} 
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer text-center"
            >
              <VisualLabel text={carregando ? 'CARREGANDO CAIXA...' : fechando ? 'SALVANDO...' : 'FECHAR CAIXA DO DIA'}/>
            </button>
          </div>
        </div>
      )}

      {confirmarFechamento && (
        <div data-rt-modal className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="confirmar-fechamento-titulo" className="bg-white dark:bg-slate-900 p-6 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 id="confirmar-fechamento-titulo" className="text-sm font-black uppercase text-slate-900 dark:text-white"><VisualText id="copy-34f6d52aff14" defaultText={"Confirmar fechamento"}/></h3>
            <p className="text-xs text-slate-600 dark:text-slate-300"><VisualText id="copy-14053841ed30" defaultText={"Deseja consolidar o caixa de "}/>{dateStr}<VisualText id="copy-b606a0b9a06d" defaultText={"? O fechamento será confirmado após ser salvo no banco."}/></p>
            <div className="flex gap-3">
              <button type="button" disabled={fechando} onClick={() => setConfirmarFechamento(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase"><VisualText id="copy-46b6f68b2f32" defaultText={"Cancelar"}/></button>
              <button type="button" disabled={fechando} onClick={handleFecharCaixa} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase"><VisualLabel text={fechando ? 'Salvando...' : 'Confirmar'}/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



