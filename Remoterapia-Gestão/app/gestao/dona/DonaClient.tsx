'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ItemGestao {
  id: string | number
  cliente: string
  caiaque: string
  entrada: string
  saida: string
  valor: number
  pagamento: string
  data: string
  categoria: string
  horaNum: number
}

interface AvaliacaoItem {
  id: string
  nota: number | null
  comentario: string | null
  created_at: string
  mensalistas?: { nome: string } | null
}

export default function DonaClient({ 
  nomeUsuario
}: { 
  nomeUsuario: string
}) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [itens, setItens] = useState<ItemGestao[]>([])
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoItem[]>([])
  const [modalPeriodoOpen, setModalPeriodoOpen] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

        
  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3800)
  }

  const dateStr = selectedDate.toLocaleDateString('pt-BR')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toLocaleDateString('pt-BR')
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR')
  const isToday = dateStr === todayStr

  let dateLabel = 'HOJE'
  if (!isToday) {
    if (dateStr === yesterdayStr) dateLabel = 'ONTEM'
    else dateLabel = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0].toUpperCase()
  }

  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + offset)
    newDate.setHours(0, 0, 0, 0)
    if (newDate > today) return
    setSelectedDate(newDate)
  }

  const carregarDados = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('locacoes')
        .select('*')
        .order('entrada', { ascending: false })

      if (data && data.length > 0) {
        const filtrados = data.filter((item: any) => {
          const itemData = new Date(item.entrada).toLocaleDateString('pt-BR')
          return itemData === dateStr
        })

        if (filtrados.length > 0) {
          setItens(filtrados.map((item: any) => {
            const entDate = item.entrada ? new Date(item.entrada) : new Date()
            const saiDate = item.saida ? new Date(item.saida) : new Date()
            return {
              id: item.id,
              cliente: item.cliente || 'Cliente Não Informado',
              caiaque: Array.isArray(item.caiaques_ids) ? item.caiaques_ids.join(', ') : (item.caiaque || 'N/A'),
              entrada: entDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              saida: saiDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              valor: item.valor_final !== undefined ? item.valor_final : 70,
              pagamento: item.pagamento || 'Crédito',
              data: dateStr,
              categoria: (item.tipo === 'mensalista' || item.pagamento === 'Clube') ? 'Mensalista' : 'Avulso',
              horaNum: entDate.getHours()
            }
          }))
        } else {
          setItens([])
        }
      } else {
        setItens([])
      }

      // Carregar Avaliações
      const { data: avData } = await supabase
        .from('avaliacoes')
        .select('*, mensalistas(nome)')
        .order('created_at', { ascending: false })
        .limit(20)

      if (avData) setAvaliacoes(avData)

    } catch {
      setItens([])
    }
  }

  useEffect(() => {
    carregarDados()
  }, [dateStr])

  const faturamentoTotal = itens.reduce((acc, curr) => acc + (curr.valor || 0), 0)

  const pagamentosMetodos = ['Pix', 'Débito', 'Crédito', 'Cartão', 'Dinheiro']
  const valoresPorMetodo: Record<string, number> = {}
  pagamentosMetodos.forEach(m => (valoresPorMetodo[m] = 0))

  itens.forEach(item => {
    const pag = item.pagamento
    if (pag && valoresPorMetodo[pag] !== undefined) {
      valoresPorMetodo[pag] += item.valor || 0
    }
  })

  const horas = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
  const contagemHoras: Record<number, number> = {}
  horas.forEach(h => (contagemHoras[h] = 0))

  itens.forEach(item => {
    if (contagemHoras[item.horaNum] !== undefined) {
      contagemHoras[item.horaNum] += 1
    }
  })

  const exportarRelatorioGestao = (tituloDoc = `Relatório de Fechamento — ${dateStr}`) => {
    const agora = new Date()
    const horaGerado = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    // FILTRO EXCLUSIVO DA FROTA COMERCIAL (SEM MENSALISTAS E SEM GUARDARIA)
    const viagensComerciais = itens.filter(i => i.categoria !== 'Mensalista' && i.categoria !== 'Guardaria')
    const qtdSolo = viagensComerciais.filter(i => !i.caiaque?.toLowerCase().includes('duplo')).length
    const qtdDuplo = viagensComerciais.filter(i => i.caiaque?.toLowerCase().includes('duplo')).length
    const totalViagens = viagensComerciais.length

    // TOTAIS POR MÉTODO DE PAGAMENTO
    const totaisPag: Record<string, number> = { Pix: 0, Crédito: 0, Débito: 0, Dinheiro: 0 }
    itens.forEach(it => {
      if (totaisPag[it.pagamento] !== undefined) {
        totaisPag[it.pagamento] += it.valor || 0
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

    const totalFaturamento = Object.values(totaisPag).reduce((acc, v) => acc + v, 0)
    const isMensal = tituloDoc.toLowerCase().includes('mês') || tituloDoc.toLowerCase().includes('mensal') || tituloDoc.includes(' a ')

    const w = window.open('', '_blank')
    if (!w) {
      showToast('Permita pop-ups no seu navegador para gerar o relatório.', 'warning')
      return
    }

    w.document.write(`<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>${tituloDoc}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
            * { box-sizing: border-box; }
            body { font-family: 'Nunito', Arial, sans-serif; padding: 30px; color: #1e293b; background: #f8fafc; }
            .container { max-width: 780px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 24px; padding: 36px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
            
            /* CABEÇALHO COM LOGO PLORIX */
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0284c7; padding-bottom: 18px; margin-bottom: 22px; }
            .logo-area { display: flex; align-items: center; gap: 14px; }
            .brand-title { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; line-height: 1; letter-spacing: -0.5px; }
            .brand-subtitle { font-size: 11px; font-weight: 800; color: #0284c7; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .doc-meta { text-align: right; }
            .doc-meta h1 { margin: 0; font-size: 13px; font-weight: 900; color: #0369a1; text-transform: uppercase; }
            .doc-meta p { margin: 4px 0 0 0; font-size: 13px; font-weight: 900; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; }

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
            
            <!-- 1. CABEÇALHO -->
            <div class="header">
                <div class="logo-area">
                    <img src="/images/plorix_logo.png" style="width: 52px; height: 52px; object-fit: contain;" alt="Plorix Logo" />
                    <div>
                        <p class="brand-title">PLORIX GESTÃO</p>
                        <p class="brand-subtitle">Sistema de Gestão e Controle Remoterapia</p>
                    </div>
                </div>
                <div class="doc-meta">
                    <h1>${tituloDoc}</h1>
                    <p>${horaGerado}</p>
                </div>
            </div>

            <!-- 2. CATEGORIAS DE EMBARQUE -->
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
                        ${rowsViagens || '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 16px;">Nenhum registro no período.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- 5. BANDEJA DO FATURAMENTO TOTAL -->
            <div class="total-box">
                <div>
                  <p>${isMensal ? 'FATURAMENTO CONSOLIDADO DO MÊS' : 'FATURAMENTO TOTAL DO DIA'}</p>
                </div>
                <h3>R$ ${totalFaturamento.toFixed(2).replace('.', ',')}</h3>
            </div>

            <!-- RODAPÉ -->
            <div class="footer">
                Plorix Gestão © 2026 — Controle e Monitoramento Remoterapia
            </div>

            <button class="print-btn" onclick="window.print()">🖨️ IMPRIMIR / SALVAR PDF</button>
        </div>
    </body>
    </html>`)
    w.document.close()
  }

  const handleRelatorioMes = () => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const mesNome = meses[selectedDate.getMonth()].toUpperCase()
    const titulo = `Relatório Mensal — ${mesNome} DE ${selectedDate.getFullYear()}`
    exportarRelatorioGestao(titulo)
  }

  const handleConfirmarPeriodo = () => {
    if (!dataInicio || !dataFim) return
    const fmt = (d: string) => {
      const [y, m, dia] = d.split('-')
      return `${dia}/${m}/${y}`
    }
    const titulo = `Relatório Período — ${fmt(dataInicio)} a ${fmt(dataFim)}`
    setModalPeriodoOpen(false)
    exportarRelatorioGestao(titulo)
  }

  return (
    <div className="space-y-4 relative">
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
            <span>{toast.tipo === 'success' ? '✓' : toast.tipo === 'error' ? '✕' : 'ℹ'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
      
                {/* 1. SELETOR DE DATA PADRONIZADO (IDÊNTICO AO REGISTRO E FECHAMENTO) */}
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
            {dateLabel}
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

      {/* 2. CARD FATURAMENTO DIÁRIO COM DESIGN ELEVADO */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-6 rounded-[2.2rem] text-center border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-500/5 space-y-4">
        
        <div className="inline-block bg-blue-50 dark:bg-blue-950/60 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-900 shadow-sm">
          <span className="text-[10px] font-black text-blue-700 dark:text-cyan-300 uppercase tracking-widest">
            FATURAMENTO DIÁRIO
          </span>
        </div>

        <h3 className="text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tight my-1 drop-shadow-sm tabular-nums">
          <span className="text-2xl text-blue-600 dark:text-cyan-400 mr-1 font-bold">R$</span>
          {faturamentoTotal.toFixed(2).replace('.', ',')}
        </h3>

        {/* BOTÕES DE AÇÃO DO FATURAMENTO */}
        <div className="space-y-2 pt-2">
          <button 
            type="button" 
            onClick={() => exportarRelatorioGestao()} 
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📄</span> RELATÓRIO DO DIA
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              type="button" 
              onClick={handleRelatorioMes} 
              className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🗓️</span> MÊS ATUAL
            </button>
            <button 
              type="button" 
              onClick={() => setModalPeriodoOpen(true)} 
              className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>📅</span> ESCOLHER DIAS
            </button>
          </div>
        </div>

      </div>

      {/* 3. CARD GRÁFICO: ENTRADAS POR MÉTODO COM BANDEJA AZULADA */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-cyan-500 border border-white/60 dark:border-slate-800 space-y-4">
        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider text-center">
          ENTRADAS POR MÉTODO DE PAGAMENTO
        </h4>
        
        {/* BANDEJA AZULADA QUE DESTACA OS VALORES */}
        <div className="bg-[#eaf4fc] dark:bg-slate-800/80 p-4 rounded-2xl border border-blue-100 dark:border-slate-700/60 shadow-inner">
          <div className="flex items-end justify-between gap-2 h-44 px-2 pt-4 pb-1">
            {pagamentosMetodos.map(m => {
              const val = valoresPorMetodo[m] || 0
              const maxVal = Math.max(...Object.values(valoresPorMetodo), 100)
              const heightPct = val > 0 ? Math.max((val / maxVal) * 100, 40) : 0

              return (
                <div key={m} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-[11px] font-black text-slate-800 dark:text-white mb-2 leading-none">
                    {val > 0 ? `R$ ${val}` : '—'}
                  </span>
                  
                  <div className="w-full flex items-end justify-center h-24">
                    {val > 0 ? (
                      <div 
                        className="w-full max-w-[40px] bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-xl transition-all duration-500 shadow-md"
                        style={{ height: `${heightPct}%` }}
                      />
                    ) : (
                      <div className="w-5 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mb-1" />
                    )}
                  </div>
                  
                  <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mt-3">
                    {m}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. CARD GRÁFICO: MAPA DE CALOR COM BANDEJA AZULADA */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-4">
        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider text-center">
          MAPA DE CALOR DE HORÁRIOS
        </h4>

        <div className="bg-[#eaf4fc] dark:bg-slate-800/80 p-4 rounded-2xl border border-blue-100 dark:border-slate-700/60 shadow-inner">
          <div className="relative h-44 flex items-end pt-4 pl-6 pr-1 pb-1">
            
            {/* LINHAS GUIA */}
            <div className="absolute inset-y-4 left-0 right-0 flex flex-col justify-between pointer-events-none opacity-20">
              {[1.0, 0.5, 0].map(n => (
                <div key={n} className="border-b border-slate-500 w-full relative">
                  <span className="absolute -left-6 -top-2 text-[8px] font-bold text-slate-500">{n}</span>
                </div>
              ))}
            </div>

            {/* BARRAS DE ATIVIDADE */}
            <div className="flex-1 flex items-end justify-between gap-1 h-full z-10">
              {horas.map(h => {
                const qtd = contagemHoras[h] || 0
                const maxQtd = Math.max(...Object.values(contagemHoras), 1)
                const heightPct = qtd > 0 ? Math.max((qtd / maxQtd) * 85, 35) : 0

                return (
                  <div key={h} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[9px] font-black text-slate-800 dark:text-white mb-1 leading-none">
                      {qtd > 0 ? qtd : ''}
                    </span>
                    <div className="w-full flex items-end justify-center h-24">
                      {qtd > 0 ? (
                        <div 
                          className="w-full max-w-[14px] bg-gradient-to-t from-cyan-500 to-sky-400 rounded-t-lg transition-all duration-500 shadow-sm"
                          style={{ height: `${heightPct}%` }}
                        />
                      ) : (
                        <div className="w-3 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full mb-1" />
                      )}
                    </div>
                    <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase mt-2 leading-none">
                      {String(h).padStart(2, '0')}h
                    </span>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>
      {/* 6. MODAL DE ESCOLHER DIAS (PERÍODO INÍCIO E FIM) */}
      {modalPeriodoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 w-full max-w-sm border-t-4 !border-t-blue-600 shadow-2xl rounded-[2.2rem] border border-white/40 space-y-4">
            <div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">RELATÓRIO PERSONALIZADO</p>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">ESCOLHER DIAS</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block">Data de Início</label>
                <input 
                  type="date" 
                  value={dataInicio} 
                  onChange={e => setDataInicio(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block">Data de Fim</label>
                <input 
                  type="date" 
                  value={dataFim} 
                  onChange={e => setDataFim(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setModalPeriodoOpen(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              >
                CANCELAR
              </button>
              <button 
                type="button" 
                onClick={handleConfirmarPeriodo}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              >
                GERAR RELATÓRIO
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}



