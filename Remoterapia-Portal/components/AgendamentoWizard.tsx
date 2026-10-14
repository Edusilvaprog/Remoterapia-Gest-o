'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check, Key, Calendar as CalendarIcon, Clock, ArrowRight, RotateCcw } from 'lucide-react'
import gsap from 'gsap'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



interface AgendamentoWizardProps {
  alunoData: any
  caiaques: any[]
  lockers: any[]
  configTabelaClubes?: any
  diasFechados?: string[]
  onConfirm: (payload: { data: string, hora: string, caiaque: string, locker: string }) => void
  onCancel: () => void
  onError: (msg: string) => void
  loading: boolean
}

export default function AgendamentoWizard({ 
  alunoData, 
  caiaques, 
  lockers, 
  configTabelaClubes,
  diasFechados,
  onConfirm, 
  onCancel, 
  onError, 
  loading 
}: AgendamentoWizardProps) {
  const today = useMemo(() => new Date(), [])
  const isGuardaria = alunoData?.tipo_plano === 'guardaria'

  // Refs para animações GSAP e scroll automático em cascata
  const turnoRef = useRef<HTMLDivElement>(null)
  const embarcacaoRef = useRef<HTMLDivElement>(null)
  const lockerRef = useRef<HTMLDivElement>(null)
  const resumoRef = useRef<HTMLDivElement>(null)

  const mapDiaManutencao = () => {
    const d = configTabelaClubes?.dia_manutencao
    if (!d || d === 'Nenhum') return -1
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    return dias.findIndex(n => d.startsWith(n))
  }
  const diaManutencao = mapDiaManutencao()

  const getMinDateStr = () => {
    const now = new Date()
    const min = new Date()
    
    let corteHora = 19
    let corteMin = 0
    if (configTabelaClubes?.horario_corte) {
      const parts = configTabelaClubes.horario_corte.split(':')
      corteHora = parseInt(parts[0] || '19')
      corteMin = parseInt(parts[1] || '0')
    }
    
    const isPastCorte = now.getHours() > corteHora || (now.getHours() === corteHora && now.getMinutes() >= corteMin)
    
    if (isPastCorte) min.setDate(min.getDate() + 2)
    else min.setDate(min.getDate() + 1)
    
    while (true) {
      const minStr = min.toISOString().split('T')[0]
      const d = new Date(minStr + 'T12:00:00')
      if (d.getDay() === diaManutencao || (diasFechados && diasFechados.includes(minStr))) {
        min.setDate(min.getDate() + 1)
      } else {
        break
      }
    }
    
    return min.toISOString().split('T')[0]
  }

  const getMaxDateStr = (): string => {
    const minStr = getMinDateStr()
    const minDate = new Date(minStr + 'T12:00:00')
    
    // Calcular o próximo domingo a partir da data mínima
    const diaSemanaMin = minDate.getDay()
    const diasAteDomingo = diaSemanaMin === 0 ? 7 : 7 - diaSemanaMin
    const proximoDomingo = new Date(minDate)
    proximoDomingo.setDate(minDate.getDate() + diasAteDomingo)
    
    return proximoDomingo.toISOString().split('T')[0]
  }

  // Estado da seleção progressiva
  const [data, setData] = useState<string>('')
  const [hora, setHora] = useState<string>('')
  const [caiaque, setCaiaque] = useState<string>('')
  const [locker, setLocker] = useState<string>('')

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  // Animações GSAP de revelação suave em cascata quando o bloco surge
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (data && turnoRef.current) {
      gsap.fromTo(
        turnoRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
      if (window.matchMedia('(max-width: 1023px)').matches) setTimeout(() => {
        turnoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  }, [data])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (hora && embarcacaoRef.current) {
      gsap.fromTo(
        embarcacaoRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
      if (window.matchMedia('(max-width: 1023px)').matches) setTimeout(() => {
        embarcacaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  }, [hora])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const prontoParaLocker = isGuardaria ? !!hora : (!!hora && !!caiaque)
    if (prontoParaLocker && lockerRef.current) {
      gsap.fromTo(
        lockerRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
      if (window.matchMedia('(max-width: 1023px)').matches) setTimeout(() => {
        lockerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  }, [caiaque, hora, isGuardaria])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (locker && resumoRef.current) {
      gsap.fromTo(
        resumoRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
      if (window.matchMedia('(max-width: 1023px)').matches) setTimeout(() => {
        resumoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 80)
    }
  }, [locker])

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  
  const calendarDays = []
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i))

  const minDateStr = getMinDateStr()
  const maxDateStr = getMaxDateStr()

  const isLocked = (d: Date) => {
    const dStr = d.toISOString().split('T')[0]
    if (dStr < minDateStr) return true
    if (dStr > maxDateStr) return true
    if (d.getDay() === diaManutencao) return true 
    if (diasFechados && diasFechados.includes(dStr)) return true
    return false
  }

  const isToday = (d: Date) => {
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))

  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']

  const dataFormatada = useMemo(() => {
    if (!data) return ''
    const [ano, mes, dia] = data.split('-').map(Number)
    const dt = new Date(ano, mes - 1, dia)
    const diaSemana = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()
    const mesStr = dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    return `${diaSemana}, ${dia} ${mesStr}`
  }, [data])

  const caiaquesDisponiveis = useMemo(() => {
    return (caiaques || []).filter(c => (!c.status || c.status.toLowerCase() === 'livre') && (!c.tipo || c.tipo === 'individual'))
  }, [caiaques])

  const lockersDisponiveis = useMemo(() => {
    return (lockers || []).filter(l => !l.status || l.status.toLowerCase() === 'livre')
  }, [lockers])

  const caiaqueNomeSelecionado = useMemo(() => {
    if (isGuardaria) return alunoData?.caiaque_vinculado || 'Próprio na Guardaria'
    const achado = caiaques.find(c => String(c.id) === String(caiaque))
    return achado ? achado.nome : 'Pendente'
  }, [caiaque, caiaques, alunoData, isGuardaria])

  const lockerNomeSelecionado = useMemo(() => {
    const achado = lockers.find(l => String(l.id) === String(locker))
    return achado ? (achado.nome || `Armário #${achado.numero || achado.id}`) : 'Pendente'
  }, [locker, lockers])

  const handleSelectDate = (dStr: string) => {
    if (data === dStr) {
      // Deselecionar: fecha tudo abaixo
      setData('')
      setHora('')
      setCaiaque('')
      setLocker('')
    } else {
      setData(dStr)
      setHora(''); setCaiaque(''); setLocker('')
    }
  }

  const handleSelectTurno = (turnoStr: string) => {
    if (hora === turnoStr) {
      // Deselecionar turno: fecha embarcação e locker
      setHora('')
      setCaiaque('')
      setLocker('')
    } else {
      setHora(turnoStr)
      setCaiaque(''); setLocker('')
    }
  }

  const handleSelectBoat = (boatId: string) => {
    if (caiaque === boatId) {
      // Deselecionar embarcação: fecha o locker
      setCaiaque('')
      setLocker('')
    } else {
      setCaiaque(boatId)
      setLocker('')
    }
  }

  const handleSelectLocker = (lockerId: string) => {
    if (locker === lockerId) {
      // Deselecionar locker: fecha o resumo final
      setLocker('')
    } else {
      setLocker(lockerId)
    }
  }

  const handleReiniciar = () => {
    setData('')
    setHora('')
    setCaiaque('')
    setLocker('')
  }

  const handleSalvar = () => {
    if (!data) return onError('Selecione uma data disponível no calendário.')
    if (!hora) return onError('Selecione o horário desejado.')
    if (!isGuardaria && !caiaque) return onError('Selecione a embarcação.')
    if (!locker) return onError('Selecione o armário guarda-volumes.')

    onConfirm({
      data,
      hora,
      caiaque: caiaque || alunoData?.caiaque_vinculado || 'PROPRIO',
      locker
    })
  }

  return (
    <div className="rt-base-page rt-base-booking" data-rt-area="area-b3c408c4a001">
      
      {/* CABEÇALHO DO AGENDAMENTO COM STATUS */}
      <div className="rt-base-heading">
        <div>
          <h1><VisualText id="copy-b3c408c4a002" defaultText="Agendar remada"/></h1>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#0284c7] dark:text-cyan-400 block"><VisualText id="copy-af0ddd0abb42" defaultText={"Reserva de Vaga"}/></span>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400"><VisualText id="copy-d514f0c1816f" defaultText={"Preencha as opções abaixo para confirmar sua remada"}/></p>
        </div>
        <button type="button" className="rt-base-secondary" onClick={onCancel} disabled={loading}><ChevronLeft size={17}/><VisualText id="copy-b3c408c4a003" defaultText="Voltar ao início"/></button>
        {data && (
          <button
            type="button"
            onClick={handleReiniciar}
            className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3 h-3 text-[#0284c7]" />
            <span><VisualText id="copy-985d6714b415" defaultText={"Recomeçar"}/></span>
          </button>
        )}
      </div>

      <ol className="rt-base-booking-progress" aria-label="Etapas do agendamento">{[{label:'Data',ready:!!data},{label:'Horário',ready:!!hora},{label:'Embarcação',ready:!!caiaque||isGuardaria&&!!hora},{label:'Guarda-volumes',ready:!!locker}].map((step,index,steps)=><li key={step.label} className={step.ready?'is-complete':''} aria-current={!step.ready&&(index===0||steps[index-1].ready)?'step':undefined}><span>{step.ready?<Check size={16}/>:index+1}</span><strong>{step.label}</strong></li>)}</ol>
      <div className="rt-base-booking-grid"><div className="rt-base-booking-steps">
      {/* ========================================================================= */}
      {/* BLOCO 1: CALENDÁRIO (SEMPRE VISÍVEL) */}
      {/* ========================================================================= */}
      <div className="rt-booking-calendar rt-base-panel bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.8rem] p-4 shadow-xl border border-white/60 dark:border-slate-800 space-y-3 transition-all" data-rt-area="area-b3c408c4a004">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
              data ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#0284c7] text-white shadow-sm'
            }`}>
              {data ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight"><VisualText id="copy-df4e3abc23ef" defaultText={"Data da Remada"}/></span>
              <span className={`text-[10px] font-bold ${data ? 'text-[#0284c7] dark:text-cyan-400 font-extrabold' : 'text-slate-400'}`}>
                <VisualLabel text={data ? dataFormatada : 'Toque no dia desejado'}/>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button aria-label="Anterior" 
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase px-1.5 tracking-wider">
              {meses[currentMonth.getMonth()].slice(0, 3)} {currentMonth.getFullYear()}
            </span>
            <button aria-label="Próximo" 
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* DIAS DA SEMANA */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((dia, idx) => (
            <span 
              key={dia} 
              className={`text-[8.5px] font-black uppercase tracking-wider ${
                idx === 0 || idx === 6 ? 'text-[#0284c7]' : 
                idx === diaManutencao ? 'text-slate-400 dark:text-slate-600' : 
                'text-slate-600 dark:text-slate-300'
              }`}
            >
              {dia}
            </span>
          ))}
        </div>

        {/* GRADE DE DIAS DO MÊS */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {calendarDays.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="h-9"></div>
            
            const dStr = d.toISOString().split('T')[0]
            const hoje = isToday(d)
            const locked = isLocked(d)
            const selected = data === dStr

            let style = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 hover:border-[#0284c7] shadow-xs'
            
            if (locked) {
              style = 'bg-slate-100/60 dark:bg-slate-800/20 text-slate-300 dark:text-slate-600 border border-slate-200/50 dark:border-slate-800/40 cursor-not-allowed opacity-40'
            } else if (selected) {
              style = 'bg-[#0284c7] text-white font-black border-2 border-[#0284c7] shadow-md scale-105 z-10'
            }

            return (
              <button
                key={dStr}
                type="button"
                disabled={locked}
                onClick={() => handleSelectDate(dStr)}
                className={`h-9 rounded-xl flex flex-col items-center justify-center text-xs font-black transition-all relative cursor-pointer ${style}`}
              >
                {d.getDate()}
                {hoje && !selected && (
                  <span className="absolute inset-0 rounded-xl border-2 border-[#0284c7]"></span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-[8.5px] font-black uppercase text-slate-500 tracking-wider">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><VisualText id="copy-f5b03f14715a" defaultText={" Liberado"}/></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span><VisualText id="copy-80fac8c0afbd" defaultText={" Indisponível"}/></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border-2 border-[#0284c7]"></span><VisualText id="copy-28c6191c2a36" defaultText={" Hoje"}/></span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BLOCO 2: TURNO DA SAÍDA */}
      {/* ========================================================================= */}
      {data && (
        <div ref={turnoRef} className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.8rem] p-4 shadow-xl border border-white/60 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                hora ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#0284c7] text-white shadow-sm'
              }`}>
                {hora ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider block leading-tight"><VisualText id="copy-684828d99b97" defaultText={"Turno da Saída"}/></p>
                <span className={`text-[10px] font-bold ${hora ? 'text-[#0284c7] dark:text-cyan-400 font-extrabold' : 'text-slate-400'}`}>
                  {hora || 'Escolha o horário'}
                </span>
              </div>
            </div>
          </div>

          {isGuardaria ? (
            <button 
              type="button"
              onClick={() => handleSelectTurno('06:00 às 10:00')} 
              className={`w-full py-3.5 px-4 rounded-2xl border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                hora === '06:00 às 10:00' 
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-[#0284c7] text-[#0284c7] dark:text-cyan-400 shadow-sm' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            ><VisualText id="copy-daeb0910e15c" defaultText={"Janela Livre (06:00 às 10:00)"}/></button>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                type="button"
                onClick={() => handleSelectTurno('06:00 às 08:00')} 
                className={`py-3.5 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  hora === '06:00 às 08:00' 
                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-md' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400'
                }`}
              >
                {hora === '06:00 às 08:00' && <Check size={16} aria-hidden="true"/>}
                <span><VisualText id="copy-171d421ede1c" defaultText={"06:00 às 08:00"}/></span>
              </button>
              <button 
                type="button"
                onClick={() => handleSelectTurno('08:00 às 10:00')} 
                className={`py-3.5 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  hora === '08:00 às 10:00' 
                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-md' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400'
                }`}
              >
                {hora === '08:00 às 10:00' && <Check size={16} aria-hidden="true"/>}
                <span><VisualText id="copy-48706ded3b67" defaultText={"08:00 às 10:00"}/></span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BLOCO 3: EMBARCAÇÃO (LIMPO, SEM TAGS GENÉRICAS, 100% PROFISSIONAL) */}
      {/* ========================================================================= */}
      {hora && (
        <div ref={embarcacaoRef} className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.8rem] p-4 shadow-xl border border-white/60 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                caiaque || isGuardaria ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#0284c7] text-white shadow-sm'
              }`}>
                {caiaque || isGuardaria ? <Check className="w-4 h-4 stroke-[3]" /> : '3'}
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider block leading-tight">
                  <VisualLabel text={isGuardaria ? 'Equipamento Vinculado' : 'Embarcação'}/>
                </p>
                <span className={`text-[10px] font-bold ${caiaque || isGuardaria ? 'text-[#0284c7] dark:text-cyan-400 font-extrabold' : 'text-slate-400'}`}>
                  <VisualLabel text={isGuardaria ? 'Seu equipamento na guardaria' : (caiaque ? caiaqueNomeSelecionado : 'Escolha para sua remada')}/>
                </span>
              </div>
            </div>
            {!isGuardaria && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-[#0284c7] dark:text-cyan-400 rounded-lg">
                {caiaquesDisponiveis.length}<VisualText id="copy-a3988c0194bb" defaultText={" livres"}/></span>
            )}
          </div>

          {isGuardaria ? (
            <div className="w-full py-3.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black uppercase flex items-center justify-between">
              <span><VisualText id="copy-77c9e2942cac" defaultText={"Equipamento Próprio:"}/></span>
              <span className="text-[#0284c7] dark:text-cyan-400 font-black">{alunoData?.caiaque_vinculado || 'Próprio na Guardaria'}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {caiaquesDisponiveis.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  Nenhuma embarcação disponível para esta data e turno.
                </div>
              ) : (
                caiaquesDisponiveis.map(c => {
                  const isSelected = String(caiaque) === String(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectBoat(String(c.id))}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between relative cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 border-[#0284c7] shadow-md ring-2 ring-[#0284c7]/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#0284c7]/60'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
                          {c.nome}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider"><VisualText id="copy-c9dc707ff12a" defaultText={"Livre"}/></span>
                        </div>
                      </div>

                      <div className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                        isSelected 
                          ? 'bg-[#0284c7] border-[#0284c7] text-white shadow-sm' 
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-300'
                      }`}>
                        {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BLOCO 4: GUARDA-VOLUMES (PERFEITAMENTE CENTRALIZADO) */}
      {/* ========================================================================= */}
      {(isGuardaria ? !!hora : (!!hora && !!caiaque)) && (
        <div ref={lockerRef} className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[1.8rem] p-4 shadow-xl border border-white/60 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                locker ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#0284c7] text-white shadow-sm'
              }`}>
                {locker ? <Check className="w-4 h-4 stroke-[3]" /> : (isGuardaria ? '3' : '4')}
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider block leading-tight"><VisualText id="copy-be0786b7b68d" defaultText={"Guarda-Volumes"}/></p>
                <span className={`text-[10px] font-bold ${locker ? 'text-[#0284c7] dark:text-cyan-400 font-extrabold' : 'text-slate-400'}`}>
                  <VisualLabel text={locker ? lockerNomeSelecionado : 'Escolha seu armário'}/>
                </span>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-[#0284c7] dark:text-cyan-400 rounded-lg">
              {lockersDisponiveis.length}<VisualText id="copy-8fb3026a7379" defaultText={" livres"}/></span>
          </div>

          {lockersDisponiveis.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              Nenhum armário disponível no momento.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 pt-1">
              {lockersDisponiveis.map(l => {
                const isSelected = String(locker) === String(l.id)
                const numFormatado = l.numero 
                  ? `#${String(l.numero).padStart(2, '0')}` 
                  : (l.nome || `#${l.id}`)
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelectLocker(String(l.id))}
                    className={`py-3.5 px-2 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative active:scale-95 ${
                      isSelected
                        ? 'bg-blue-50/95 dark:bg-blue-950/60 border-[#0284c7] text-[#0284c7] dark:text-cyan-400 shadow-md ring-2 ring-[#0284c7]/20 scale-105 z-10'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-center">
                      {isSelected ? (
                        <Key className="w-5 h-5 text-[#0284c7] dark:text-cyan-400 animate-pulse" />
                      ) : (
                        <Key className="w-4 h-4 text-slate-400 opacity-60" />
                      )}
                    </div>
                    <span className="text-xs font-black leading-none">{numFormatado}</span>
                    <span className={`text-[8.5px] font-bold uppercase mt-1 ${isSelected ? 'text-[#0284c7] dark:text-cyan-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      <VisualLabel text={isSelected ? 'Escolhido' : 'Livre'}/>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BLOCO 5: RESUMO EXECUTIVO E FINALIZAÇÃO */}
      {/* ========================================================================= */}
      </div>
      <aside ref={resumoRef} className="rt-base-panel rt-base-booking-review" data-rt-area="area-b3c408c4a005">
       <div className="rt-base-panel-title"><div><h2><VisualText id="copy-1efcab19165c" defaultText="Resumo do agendamento"/></h2><p><VisualText id="copy-b3c408c4a006" defaultText="Confira suas escolhas antes de confirmar."/></p></div></div>
       <dl className="rt-base-booking-facts" aria-live="polite">
        <div><dt><CalendarIcon size={17}/><VisualText id="copy-b3c408c4a007" defaultText="Data"/></dt><dd>{data?dataFormatada:'Selecione uma data'}</dd></div>
        <div><dt><Clock size={17}/><VisualText id="copy-b3c408c4a008" defaultText="Horário"/></dt><dd>{hora||'Selecione um horário'}</dd></div>
        <div><dt><VisualText id="copy-b3c408c4a009" defaultText="Embarcação"/></dt><dd>{caiaque||isGuardaria?caiaqueNomeSelecionado:'Selecione uma embarcação'}</dd></div>
        <div><dt><Key size={17}/><VisualText id="copy-b3c408c4a010" defaultText="Guarda-volumes"/></dt><dd>{locker?lockerNomeSelecionado:'Selecione um armário'}</dd></div>
       </dl>
       <button type="button" className="rt-base-primary" disabled={loading||!data||!hora||(!caiaque&&!isGuardaria)||!locker} onClick={handleSalvar}>{loading?<VisualText id="copy-cec3901f9490" defaultText="Agendando…"/>:<><VisualText id="copy-bd502cbbe46a" defaultText="Confirmar agendamento"/><ArrowRight size={18}/></>}</button>
       <p className="rt-base-caption"><VisualText id="copy-b3c408c4a011" defaultText="A reserva será registrada depois da confirmação."/></p><VisualContentSlot id="area-b3c408c4a005"/>
      </aside></div><VisualContentSlot id="area-b3c408c4a001"/>

    </div>
  )
}
