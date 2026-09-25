'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const dateStr = selectedDate.toLocaleDateString('pt-BR')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toLocaleDateString('pt-BR')
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR')
  const isToday = dateStr === todayStr

  let relativeLabel = ''
  if (dateStr === todayStr) relativeLabel = 'HOJE'
  else if (dateStr === yesterdayStr) relativeLabel = 'ONTEM'
  else {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' }
    relativeLabel = selectedDate.toLocaleDateString('pt-BR', options).split('-')[0].toUpperCase()
  }

  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + offset)
    newDate.setHours(0, 0, 0, 0)
    if (newDate > today) return
    setSelectedDate(newDate)
    setBusca('')
  }

  const carregarDados = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('locacoes')
        .select('*')
        .eq('status', 'finalizado')
        .order('entrada', { ascending: false })

      let savedFechamentos: FechamentoInfo[] = []
      try {
        const stored = localStorage.getItem('plorix_fechamentos')
        if (stored) savedFechamentos = JSON.parse(stored)
      } catch {}

      // Busca fechamento oficial no Supabase (tabela fechamentos_caixa)
      try {
        const { data: fDb } = await supabase
          .from('fechamentos_caixa')
          .select('*')
          .eq('data_fechamento', dateStr)
          .order('created_at', { ascending: false })
          .limit(1)

        if (fDb && fDb.length > 0) {
          const itemDb = fDb[0]
          setFechamentoInfo({
            data: itemDb.data_fechamento,
            fechadoPor: itemDb.fechado_por,
            fechadoEm: itemDb.horario_fechamento ? new Date(itemDb.horario_fechamento).toLocaleString('pt-BR') : dateStr,
            total: Number(itemDb.total_faturado) || 0,
            visitantes: itemDb.total_visitantes || 0
          })
        } else {
          const fechadoHoje = savedFechamentos.find(f => f.data === dateStr)
          setFechamentoInfo(fechadoHoje || null)
        }
      } catch {
        const fechadoHoje = savedFechamentos.find(f => f.data === dateStr)
        setFechamentoInfo(fechadoHoje || null)
      }

      if (data && data.length > 0) {
        const filtrados = data.filter((item: any) => {
          const itemData = new Date(item.entrada).toLocaleDateString('pt-BR')
          return itemData === dateStr
        })

        if (filtrados.length > 0) {
          setItens(filtrados.map((item: any) => ({
            id: item.id,
            cliente: item.cliente || 'Cliente Não Informado',
            caiaque: Array.isArray(item.caiaques_ids) ? item.caiaques_ids.join(', ') : (item.caiaque || 'N/A'),
            entrada: item.entrada ? new Date(item.entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '13:06',
            saida: item.saida ? new Date(item.saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '13:40',
            valor: item.valor_final !== undefined ? item.valor_final : 70,
            pagamento: item.pagamento || 'Crédito',
            data: dateStr,
            categoria: (item.tipo === 'mensalista' || item.pagamento === 'Clube') ? 'Mensalista' : 'Avulso'
          })))
          return
        }
      }

      setItens([])
    } catch {
      setItens([])
    }
  }

  useEffect(() => {
    carregarDados()
  }, [selectedDate])

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
  let qtdAvulsos = 0
  let qtdMensalistas = 0
  let qtdGuardaria = 0

  itens.forEach(i => {
    if (i.categoria === 'Guardaria') qtdGuardaria++
    else if (i.categoria === 'Mensalista') qtdMensalistas++
    else qtdAvulsos++
  })

  const handleFecharCaixa = async () => {
    if (!confirm('Deseja fechar o caixa de hoje? Os dados serão consolidados e enviados para auditoria.')) return
    
    const now = new Date()
    const totalCaixa = itens.reduce((acc, curr) => acc + curr.valor, 0)
    
    const novoFechamento: FechamentoInfo = {
      data: dateStr,
      fechadoPor: nomeUsuario || 'Administrador',
      fechadoEm: now.toLocaleString('pt-BR'),
      total: totalCaixa,
      visitantes: itens.length
    }

    try {
      const supabase = createClient()
      
      // Salva o resumo na tabela correta 'fechamentos_caixa'
      const { error } = await supabase.from('fechamentos_caixa').insert({
        data_fechamento: dateStr,
        fechado_por: nomeUsuario || 'Administrador',
        horario_fechamento: now.toISOString(),
        total_faturado: totalCaixa,
        total_visitantes: itens.length,
        qtd_avulsos: qtdAvulsos,
        qtd_mensalistas: qtdMensalistas,
        qtd_guardaria: qtdGuardaria
      })

      if (error) {
        console.warn('Erro ao inserir em fechamentos_caixa:', error.message)
      }

      // Atualiza o cache local como fallback de visualização rápida
      setFechamentoInfo(novoFechamento)
      const stored = localStorage.getItem('plorix_fechamentos')
      const list = stored ? JSON.parse(stored) : []
      localStorage.setItem('plorix_fechamentos', JSON.stringify([...list, novoFechamento]))
      
      showToast('Caixa fechado e enviado com sucesso!', 'success')
    } catch (e: any) {
      showToast('Erro ao processar fechamento: ' + e.message, 'error')
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
        <td style="padding: 10px 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 11px;">${it.cliente}</td>
        <td style="padding: 10px 14px; text-align: center; color: #64748b; font-weight: 700; font-size: 11px;">${it.entrada} às ${it.saida}</td>
        <td style="padding: 10px 14px; text-align: center;"><span style="background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 900; border: 1px solid #e2e8f0;">${it.pagamento}</span></td>
        <td style="padding: 10px 14px; text-align: right; font-weight: 900; color: #059669; font-size: 12px;">R$ ${Number(it.valor || 0).toFixed(2).replace('.', ',')}</td>
      </tr>
    `).join('')

    const totalCalculado = Object.values(totaisPag).reduce((acc, v) => acc + v, 0)
    const totalExibir = fechamentoInfo?.total || totalCalculado || totalFaturado

    w.document.write(`<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Fechamento de Caixa — ${dateStr}</title>
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
                    <h1>Fechamento de Caixa — ${dateStr}</h1>
                    <p>${horaFechamento}</p>
                </div>
            </div>

            <!-- REGISTRO DE AUDITORIA DO CAIXA -->
            <div class="auditoria-badge">
              FECHADO POR: ${fechamentoInfo?.fechadoPor || nomeUsuario || 'ADMINISTRADOR'} ÀS ${horaFechamento}
            </div>

            <!-- 2. CATEGORIAS DE EMBARQUE (SEM MENSALISTAS E SEM GUARDARIA) -->
            <div class="section-tray">
                <p class="section-title">CATEGORIAS DE EMBARQUE</p>
                <table>
                    <thead>
                        <tr><th>Categoria</th><th style="text-align: right;">Quantidade</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Caiaques Solo (Autônomo)</td><td style="text-align: right;"><span class="badge-qty">${qtdSolo}</span></td></tr>
                        <tr><td>Caiaques Duplo (Locação Comercial)</td><td style="text-align: right;"><span class="badge-qty">${qtdDuplo}</span></td></tr>
                        <tr style="background: #f0f9ff; font-weight: 900;">
                          <td style="color: #0c4a6e;">Total de Embarques</td>
                          <td style="text-align: right;"><span class="badge-qty-total">${totalViagens}</span></td>
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
                        <tr><td>Pix</td><td style="text-align: right; font-weight: 900; color: #059669;">R$ ${totaisPag.Pix.toFixed(2).replace('.', ',')}</td></tr>
                        <tr><td>Crédito</td><td style="text-align: right; font-weight: 900; color: #059669;">R$ ${totaisPag.Crédito.toFixed(2).replace('.', ',')}</td></tr>
                        <tr><td>Débito</td><td style="text-align: right; font-weight: 900; color: #059669;">R$ ${totaisPag.Débito.toFixed(2).replace('.', ',')}</td></tr>
                        <tr><td>Dinheiro</td><td style="text-align: right; font-weight: 900; color: #059669;">R$ ${totaisPag.Dinheiro.toFixed(2).replace('.', ',')}</td></tr>
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
                <h3>R$ ${Number(totalExibir).toFixed(2).replace('.', ',')}</h3>
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
    <div className="space-y-4">
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
      
      {/* 1. SELETOR DE DATA PADRONIZADO (IDÊNTICO AO REGISTRO) */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-3.5 flex justify-between items-center rounded-2xl shadow-sm border-t-4 !border-t-cyan-400 border border-white/60 dark:border-slate-800 mb-2">
        <button 
          type="button" 
          onClick={() => changeDate(-1)}
          className="w-10 h-10 flex items-center justify-center text-blue-600 dark:text-cyan-400 bg-[#f2f8fc] dark:bg-slate-800 hover:bg-blue-100 rounded-xl transition-all shadow-sm text-sm font-black active:scale-90 border border-blue-100 dark:border-slate-700 cursor-pointer"
        >
          &lt;
        </button>
        
        <div className="text-center flex-1 cursor-pointer" onClick={() => setSelectedDate(new Date())}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
            {relativeLabel}
          </p>
          <p className="text-sm font-black text-blue-950 dark:text-white uppercase flex items-center justify-center gap-1.5 leading-tight">
            <span>📅</span> {dateStr}
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
        >
          &gt;
        </button>
      </div>

      {/* 2. CARD RESUMO: VISITANTES E FATURAMENTO CONECTADOS */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-5 rounded-[2.2rem] text-center border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/5">
        <span className="text-[9px] font-black text-blue-700 dark:text-cyan-300 uppercase tracking-widest px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 inline-block mb-1">
          VISITANTES DO DIA
        </span>
        
        <p className="text-5xl font-black text-slate-900 dark:text-white leading-none my-2 drop-shadow-sm tabular-nums">
          {totalVisitantes}
        </p>

        <div className="inline-flex items-center gap-1.5 bg-[#f2f8fc] dark:bg-slate-800 px-4 py-1.5 rounded-full border border-blue-100 dark:border-slate-700 mt-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Faturamento:</span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            R$ {totalFaturado.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

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
          🔍
        </span>
      </div>

      {/* 4. TABELA DE ITENS COM IDENTIFICAÇÃO, TURNO E VALOR */}
      <div className="bg-white/95 dark:bg-slate-900/95 overflow-hidden rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/5">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f2f8fc] dark:bg-slate-800/80 text-blue-900/80 dark:text-cyan-400 font-black uppercase text-[8px] tracking-wider border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">IDENTIFICAÇÃO</th>
              <th className="py-3 px-2 text-center">TURNO</th>
              <th className="py-3 px-4 text-right">VALOR</th>
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
                        #{item.caiaque} · SOLO
                      </span>
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
                      ⏱️ 34 MIN
                    </span>
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
      </div>

      {/* 5. AÇÕES DE FECHAMENTO */}
      {fechamentoInfo ? (
        <div className="mt-4 space-y-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 p-5 rounded-[2rem] text-center font-black uppercase tracking-wider text-[10px] border border-emerald-300 dark:border-emerald-800 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl">✅</span> CAIXA CONCLUÍDO E ENVIADO
            </div>
            <p className="text-[8px] font-bold normal-case text-emerald-600 dark:text-emerald-400">
              Fechado por {fechamentoInfo.fechadoPor} · {fechamentoInfo.fechadoEm}
            </p>
          </div>
          
          <button 
            type="button" 
            onClick={exportarRelatorioPdfA4} 
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider active:scale-95 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>📄</span> BAIXAR RELATÓRIO EM PDF
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="bg-slate-900 text-white p-4 rounded-[2rem] shadow-xl flex items-center justify-between gap-3 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shrink-0">
              🔒
            </div>
            <button 
              type="button" 
              onClick={handleFecharCaixa} 
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer text-center"
            >
              FECHAR CAIXA DO DIA
            </button>
          </div>
        </div>
      )}

    </div>
  )
}



