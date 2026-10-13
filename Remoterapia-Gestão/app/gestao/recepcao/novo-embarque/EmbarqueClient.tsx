'use client'
import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { realizarCheckin } from '@/lib/actions/locacoes'
import type { MetodoPagamento } from '@/lib/types'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



interface Caiaque {
  id: string
  tipo: string
  capacidade?: number
  preco_sem_instrutor?: number
  preco_com_instrutor?: number
  nome?: string
  status?: string
}

interface Locker {
  id: string
  status?: string
}

interface Instrutor {
  id: string
  nome: string
}

interface Props {
  caiaques?: Caiaque[]
  lockers?: Locker[]
  instrutores?: Instrutor[]
  precosConfig?: Record<string, number>
}

export default function EmbarqueClient({ 
  caiaques = [], 
  lockers = [], 
  instrutores = []
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [erroMsg, setErroMsg] = useState<string | null>(null)
  const travaEnvio = useRef(false)

  // FROTA COM CAPACIDADE DE LOTAÇÃO DEFINIDA
  const listaCaiaques: Caiaque[] = caiaques
  const listaLockers: Locker[] = lockers
  const listaInstrutores: Instrutor[] = instrutores

  // ESTADOS DO POP-UP
  const [caiaqueSelId, setCaiaqueSelId] = useState<string>(caiaques[0]?.id || '')
  const [lockersSel, setLockersSel] = useState<string[]>([])
  const [pagamento, setPagamento] = useState<string>('Crédito')
  const [instrutor, setInstrutor] = useState(instrutores[0]?.nome || 'Sem Instrutor')
  const [tempo, setTempo] = useState<number>(60)

  // NOMES DOS TRIPULANTES
  const [titular, setTitular] = useState('')
  const [segundoTripulante, setSegundoTripulante] = useState('')
  const [demaisTripulantes, setDemaisTripulantes] = useState<{ [key: number]: string }>({})

  // ESTADOS DOS DROPDOWNS CUSTOMIZADOS
  const [cDropOpen, setCDropOpen] = useState(false)
  const [lDropOpen, setLDropOpen] = useState(false)
  const [pDropOpen, setPDropOpen] = useState(false)
  const [iDropOpen, setIDropOpen] = useState(false)
  const [tDropOpen, setTDropOpen] = useState(false)

  const closeAllDrops = () => {
    setCDropOpen(false); setLDropOpen(false); setPDropOpen(false); setIDropOpen(false); setTDropOpen(false);
  }

  if(!listaCaiaques.length)return <section className="rt-card" style={{padding:24}} data-rt-area="area-6a2b73039c9c"><BrandIcon name="ship" size={32}/><h2 style={{fontSize:22,marginTop:15}}><VisualText id="copy-a94ffcbc8450" defaultText={"Cadastre a frota para começar"}/></h2><p style={{margin:"12px 0 22px",lineHeight:1.6}}><VisualText id="copy-083d3c6b2236" defaultText={"Nenhuma embarcação disponível foi carregada. A administração precisa cadastrar a frota ou conferir a disponibilidade antes de registrar um embarque."}/></p><Link className="rt-secondary" href="/gestao/recepcao/dashboard"><VisualText id="copy-bf3aef526a1d" defaultText={"Voltar para a base"}/></Link><VisualContentSlot id="area-6a2b73039c9c"/></section>

  // CAPACIDADE DO CAIAQUE SELECIONADO (COM BLINDAGEM CASO O BANCO ESTEJA VAZIO)
  const caiaqueFallback: Caiaque = { id: '01', nome: 'Caiaque Solo #01', tipo: 'individual' as const, status: 'livre' as const }
  const caiaqueAtual = listaCaiaques.find(c => String(c.id) === String(caiaqueSelId)) || listaCaiaques[0]
  const capacidadeMaxima = caiaqueAtual.capacidade || (caiaqueAtual?.tipo?.toLowerCase().includes('duplo') ? 2 : 1)

  // CÁLCULO DE TRIPULANTES EFETIVOS NA ÁGUA
  let qtdEfetiva = 0
  if (titular.trim()) qtdEfetiva++
  if (capacidadeMaxima >= 2 && segundoTripulante.trim()) qtdEfetiva++
  for (let i = 3; i <= capacidadeMaxima; i++) {
    if (demaisTripulantes[i]?.trim()) qtdEfetiva++
  }
  if (qtdEfetiva === 0) qtdEfetiva = 1

  // REGRAS DE PREÇO DINÂMICAS:
  const temInstrutor = Boolean(instrutor && instrutor !== 'Sem Instrutor')
  
  // Puxa a tarifa específica cadastrada para o caiaque
  const precoUnitario = temInstrutor
    ? (Number(caiaqueAtual?.preco_com_instrutor) || 70)
    : (Number(caiaqueAtual?.preco_sem_instrutor) || 60)

  // Tarifa Unitária × Quantidade Efetiva de Pessoas
  const valorBase = precoUnitario * qtdEfetiva
  const valorTotal = Math.round(valorBase * (tempo / 60))

  const toggleLocker = (id: string) => {
    setLockersSel(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (travaEnvio.current || isPending) return
    if (!titular.trim()) {
      setErroMsg('Informe o nome do titular / responsável!')
      setTimeout(() => setErroMsg(null), 3500)
      return
    }

    if (!listaCaiaques.some(c => String(c.id) === String(caiaqueAtual.id))) {
      setErroMsg('Nenhum caiaque cadastrado está disponível para este embarque.')
      return
    }
    setErroMsg(null)

    // COMPOSIÇÃO DO NOME DO EMBARQUE
    const nomes: string[] = [titular.trim()]
    if (capacidadeMaxima >= 2 && segundoTripulante.trim()) nomes.push(segundoTripulante.trim())
    for (let i = 3; i <= capacidadeMaxima; i++) {
      if (demaisTripulantes[i]?.trim()) nomes.push(demaisTripulantes[i].trim())
    }
    const nomeFinal = nomes.join(' e ')

    travaEnvio.current = true
    startTransition(async () => {
      try {
        const result = await realizarCheckin({
          cliente: nomeFinal,
          tipo: 'avulso',
          caiaques_ids: [caiaqueAtual.id],
          lockers_ids: lockersSel,
          com_instrutor: temInstrutor,
          instrutor_nome: temInstrutor ? instrutor : undefined,
          instrutor_agua: temInstrutor ? instrutor : undefined,
          pagamento: pagamento as MetodoPagamento,
          qtd_pessoas: qtdEfetiva,
          valor_final: valorTotal
        })
        if (!result.ok) {
          setErroMsg(result.error || 'Não foi possível confirmar o embarque. Tente novamente.')
          return
        }
        router.push('/gestao/recepcao/dashboard')
        router.refresh()
      } catch (e: unknown) {
        const mensagem = e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Falha ao confirmar o embarque.'
        setErroMsg(mensagem)
      } finally {
        travaEnvio.current = false
      }
    })
  }

  return (
    <div className="rt-boarding-workspace fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      
      <form 
        onSubmit={handleSubmit} 
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl border border-white/60 dark:border-slate-800 overflow-hidden flex flex-col my-auto"
      >
        
        {/* CABEÇALHO */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base"><BrandIcon name="ship"/></span>
            <h3 className="text-xs font-black uppercase tracking-wider"><VisualText id="copy-c9385c9ef932" defaultText={"REGISTRO DE EMBARQUE"}/></h3>
          </div>
          <Link 
            href="/gestao/recepcao/dashboard" 
            className="w-7 h-7 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
          >
            ✕
          </Link>
        </div>

        {erroMsg && (
          <div role="alert" className="bg-red-500 text-white text-[10px] font-black uppercase tracking-wider py-2 px-4 text-center">
            <BrandIcon name="warning"/> {erroMsg}
          </div>
        )}

        {/* CORPO DO POP-UP */}
        <div className="p-5 space-y-3.5 bg-white dark:bg-slate-900">
          
          {/* SELEÇÃO DO CAIAQUE */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block tracking-wider"><VisualText id="copy-4a19237705a0" defaultText={"EMBARCAÇÃO"}/></label>
              <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-900"><VisualText id="copy-894d58751798" defaultText={"CAPACIDADE: ATÉ "}/>{capacidadeMaxima} <VisualLabel text={capacidadeMaxima > 1 ? 'PESSOAS' : 'PESSOA'}/>
              </span>
            </div>
            
            <div className="relative">
              <div 
                onClick={() => { const wasOpen = cDropOpen; closeAllDrops(); setCDropOpen(!wasOpen); }}
                className="py-2.5 px-3 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer shadow-sm min-h-[40px]"
              >
                <span className="text-xs font-black truncate text-blue-700 dark:text-cyan-400">
                  #{caiaqueAtual.id} · {caiaqueAtual.nome || caiaqueAtual.tipo}
                </span>
                <span className="text-blue-500 text-[9px] font-black ml-1">▼</span>
              </div>

              {cDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto p-1">
                  {listaCaiaques.map(c => {
                    const isSel = caiaqueSelId === c.id
                    return (
                      <div 
                        key={c.id}
                        onClick={() => { setCaiaqueSelId(c.id); setCDropOpen(false); }}
                        className={`p-2 rounded-xl flex justify-between items-center cursor-pointer text-xs ${
                          isSel ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>#{c.id} · {c.nome || c.tipo}</span>
                        <span>{isSel ? '✓' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CAMPOS DINÂMICOS DE TRIPULANTES */}
          <div className="space-y-2.5 bg-[#fbfdff] dark:bg-slate-800/50 p-3 rounded-2xl border border-blue-100 dark:border-slate-700">
            
            {/* TITULAR */}
            <div>
              <label className="text-[9px] font-black text-blue-700 dark:text-cyan-400 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-8e8efd21efbf" defaultText={"1º TRIPULANTE (TITULAR / RESPONSÁVEL)"}/></label>
              <input 
                type="text" 
                value={titular}
                onChange={e => setTitular(e.target.value)}
                placeholder="Nome do cliente responsável"
                required
                className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            {/* 2º TRIPULANTE (LIBERADO SE FOR DUPLO) */}
            {capacidadeMaxima >= 2 && (
              <div>
                <div className="flex justify-between items-center mb-1 ml-1">
                  <label className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider"><VisualText id="copy-1a7166247554" defaultText={"2º TRIPULANTE (OPCIONAL)"}/></label>
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase"><VisualText id="copy-e9516f8edaaf" defaultText={"Se sozinho, deixe vazio"}/></span>
                </div>
                <input 
                  type="text" 
                  value={segundoTripulante}
                  onChange={e => setSegundoTripulante(e.target.value)}
                  placeholder="Nome do 2º passageiro (ou em branco)"
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
            )}

            {/* DEMAIS TRIPULANTES */}
            {capacidadeMaxima > 2 && Array.from({ length: capacidadeMaxima - 2 }, (_, idx) => {
              const num = idx + 3
              return (
                <div key={num}>
                  <label className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase ml-1 mb-1 block tracking-wider">
                    {num}<VisualText id="copy-7c5c93509a10" defaultText={"º TRIPULANTE (OPCIONAL)"}/></label>
                  <input 
                    type="text" 
                    value={demaisTripulantes[num] || ''}
                    onChange={e => setDemaisTripulantes({ ...demaisTripulantes, [num]: e.target.value })}
                    placeholder={`Nome do ${num}º passageiro`}
                    className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
              )
            })}
          </div>

          {/* GUARDA-VOLUMES & PAGAMENTO */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-9d59b98be5ec" defaultText={"GUARDA-VOLUMES"}/></label>
              <div 
                onClick={() => { const wasOpen = lDropOpen; closeAllDrops(); setLDropOpen(!wasOpen); }}
                className="py-2.5 px-3 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer shadow-sm min-h-[40px]"
              >
                <span className={`text-xs font-black truncate ${lockersSel.length === 0 ? 'text-slate-400' : 'text-amber-600'}`}>
                  <VisualLabel text={lockersSel.length === 0 ? 'Nenhum' : lockersSel.map(id => 'GV ' + id).join(', ')}/>
                </span>
                <span className="text-slate-400 text-[9px] font-black ml-1">▼</span>
              </div>

              {lDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto p-1">
                  {listaLockers.map(l => {
                    const isSel = lockersSel.includes(l.id)
                    return (
                      <div 
                        key={l.id}
                        onClick={() => toggleLocker(l.id)}
                        className={`p-2 rounded-xl flex justify-between items-center cursor-pointer text-xs ${
                          isSel ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span><VisualText id="copy-f2a850dcebd2" defaultText={"Armário GV-"}/>{l.id}</span>
                        <span>{isSel ? '✓' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-473401812ea2" defaultText={"PAGAMENTO"}/></label>
              <div 
                onClick={() => { const wasOpen = pDropOpen; closeAllDrops(); setPDropOpen(!wasOpen); }}
                className="py-2.5 px-3 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer shadow-sm min-h-[40px]"
              >
                <span className="text-xs font-black truncate text-slate-900 dark:text-white">
                  {pagamento || 'Selecione'}
                </span>
                <span className="text-slate-400 text-[9px] font-black ml-1">▼</span>
              </div>

              {pDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto p-1">
                  {['Pix', 'Crédito', 'Débito', 'Dinheiro', 'Clube Mensalista'].map(opt => {
                    const isSel = pagamento === opt
                    return (
                      <div 
                        key={opt}
                        onClick={() => { setPagamento(opt); setPDropOpen(false); }}
                        className={`p-2 rounded-xl flex justify-between items-center cursor-pointer text-xs ${
                          isSel ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{opt}</span>
                        <span>{isSel ? '✓' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* INSTRUTOR & TEMPO */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-9aa916a1790d" defaultText={"INSTRUTOR"}/></label>
              <div 
                onClick={() => { const wasOpen = iDropOpen; closeAllDrops(); setIDropOpen(!wasOpen); }}
                className="py-2.5 px-3 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer shadow-sm min-h-[40px]"
              >
                <span className="text-xs font-black truncate text-slate-900 dark:text-white">
                  <BrandLabel text={instrutor ? `👤 Inst. ${instrutor}` : 'Nenhum (Autônomo)'}/>
                </span>
                <span className="text-slate-400 text-[9px] font-black ml-1">▼</span>
              </div>

              {iDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto p-1">
                  <div 
                    onClick={() => { setInstrutor(''); setIDropOpen(false); }}
                    className={`p-2 rounded-xl flex justify-between items-center cursor-pointer text-xs ${
                      !instrutor ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span><VisualText id="copy-ab5a3987d875" defaultText={"Nenhum (Autônomo)"}/></span>
                    <span>{!instrutor ? '✓' : ''}</span>
                  </div>
                  {listaInstrutores.map(inst => {
                    const isSel = instrutor === inst.nome
                    return (
                      <div 
                        key={inst.id}
                        onClick={() => { setInstrutor(inst.nome); setIDropOpen(false); }}
                        className={`p-2 rounded-xl flex justify-between items-center cursor-pointer text-xs ${
                          isSel ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span><BrandIcon name="user"/><VisualText id="copy-a1aa0334ec1f" defaultText={" Inst. "}/>{inst.nome}</span>
                        <span>{isSel ? '✓' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-fa4ee93faa3e" defaultText={"TEMPO TOTAL"}/></label>
              <div 
                onClick={() => { const wasOpen = tDropOpen; closeAllDrops(); setTDropOpen(!wasOpen); }}
                className="py-2.5 px-3 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer shadow-sm min-h-[40px]"
              >
                <span className="text-xs font-black truncate text-slate-900 dark:text-white">
                  <VisualLabel text={tempo === 30 ? '30 Minutos' : tempo === 60 ? '1 Hora (60 min)' : tempo === 120 ? '2 Horas' : '3 Horas'}/>
                </span>
                <span className="text-slate-400 text-[9px] font-black ml-1">▼</span>
              </div>

              {tDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto p-1">
                  {[
                    { v: 30, l: '30 Minutos' },
                    { v: 60, l: '1 Hora (60 min)' },
                    { v: 120, l: '2 Horas' },
                    { v: 180, l: '3 Horas' }
                  ].map(opt => {
                    const isSel = tempo === opt.v
                    return (
                      <div 
                        key={opt.v}
                        onClick={() => { setTempo(opt.v); setTDropOpen(false); }}
                        className={`p-2 rounded-xl flex justify-between items-center cursor-pointer text-xs ${
                          isSel ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{opt.l}</span>
                        <span>{isSel ? '✓' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* INDICADOR DINÂMICO DE TRIPULAÇÃO NA ÁGUA */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#eaf4fc] dark:bg-slate-800 border border-blue-200 dark:border-slate-700">
            <span className="text-[9px] font-black uppercase text-blue-900 dark:text-cyan-400 tracking-wider"><VisualText id="copy-e9d9b73b00fa" defaultText={"TRIPULANTES DETECTADOS:"}/></span>
            <span className="text-xs font-black text-blue-700 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-blue-100 dark:border-slate-700 shadow-sm">
              {qtdEfetiva} <VisualLabel text={qtdEfetiva > 1 ? 'Pessoas' : 'Pessoa'}/>
            </span>
          </div>

        </div>

        {/* RODAPÉ DO POP-UP */}
        <div className="p-4 bg-[#f8fafc] dark:bg-slate-800/90 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block"><VisualText id="copy-6dbba48be8bf" defaultText={"VALOR TOTAL"}/></span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none tabular-nums">
              R$ {valorTotal.toFixed(2).replace('.', ',')}
            </span>
          </div>

          <button 
            type="submit"
            disabled={isPending}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer text-center disabled:opacity-50"
          >
            <VisualLabel text={isPending ? 'Liberando...' : 'VALIDAR E LIBERAR SAÍDA'}/>
          </button>
        </div>

      </form>

    </div>
  )
}



