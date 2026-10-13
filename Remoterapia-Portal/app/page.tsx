'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'

import { loginAluno, carregarPainelAluno, logoutAluno, alterarSenhaAluno, confirmarAgendamento, cancelarReserva, cadastrarAluno, getAlunoAtual, requestrecuperacaoAluno } from '@/lib/actions/aluno'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
const senhaSegura = (senha: string) => senha.length >= 12
import { 
  Calendar, Clock, User, LogOut, Info, AlertTriangle, CheckCircle, 
  Ship, Ticket, ChevronLeft, ChevronRight, Bell, CreditCard, Lock, Smartphone, 
  MessageCircle, X, Moon, Sun, Eye, EyeOff, Check, Phone, Mail, Waves
, Trash
} from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { PortalDesktopNavigation } from '@/components/desktop/PortalDesktop'
import DesktopLoginBrand from '@/components/desktop/DesktopLoginBrand'
import AbaInicio from '@/components/AbaInicio'
import AgendamentoWizard from '@/components/AgendamentoWizard'
import AbaHistorico from '@/components/AbaHistorico'
import AbaPerfil from '@/components/AbaPerfil'
import AbaPagamentos from '@/components/AbaPagamentos'
import ModuloEventos from '@/components/ModuloEventos'
import ThemeToggle from '@/components/ThemeToggle'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'
import {localPreviewEnabled} from '@/lib/local-preview-client'



export default function PortalAgendamento() {
  const [toast, setToast] = useState<{ msg: string, tipo: 'success'|'warning'|'error'|'info' } | null>(null)
  const showToast = (msg: string, tipo: 'success'|'warning'|'error'|'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const authenticatedRef = useRef(false)
    
  const [view, _setView] = useState<'login' | 'trocar_senha' | 'home' | 'agendar' | 'historico' | 'perfil' | 'eventos_out' | 'eventos' | 'pagamentos'>('login')
  const [abrirInscricoes, setAbrirInscricoes] = useState(false)
  
  const setView = (v: typeof view, skipHistory = false) => {
    _setView(v)
    if (!skipHistory && typeof window !== 'undefined' && v !== 'login' && v !== 'trocar_senha') {
      try { window.history.pushState(null, '', '#' + v) } catch(e) {}
    }
  }
  const [alunoId, setAlunoId] = useState<string>('')
  
  // LOGIN HÍBRIDO SEM TRAVAS DESNECESSÁRIAS
  const [loginTipo, setLoginTipo] = useState<'whatsapp' | 'email'>('email')
  const [loginTelefone, setLoginTelefone] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Dados Painel
  const [alunoData, setAlunoData] = useState<any>(null)
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [configTabelaClubes, setConfigTabelaClubes] = useState<any>(null)
  const [diasFechados, setDiasFechados] = useState<string[]>([])


  const reservasSemana = useMemo(() => {
    if (!agendamentos) return 0;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Segunda-feira
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo
    endOfWeek.setHours(23,59,59,999);
    
    return agendamentos.filter((a: any) => {
      if (!['confirmado','pendente','concluido'].includes(a.status) || a.is_evento) return false;
      const d = new Date(a.data_reserva + 'T00:00:00');
      return d >= startOfWeek && d <= endOfWeek;
    }).length;
  }, [agendamentos]);
  
  const maxMensalista = configTabelaClubes?.remadas_semanais || 2;
  const disponiveisSemana = Math.max(0, maxMensalista - (reservasSemana || 0));
  const [caiaques, setCaiaques] = useState<any[]>([])
  const [lockers, setLockers] = useState<any[]>([])

  // MODAIS
  const [modalNotificacoes, setModalNotificacoes] = useState(false)
  const [modalTrocarSenha, setModalTrocarSenha] = useState(false)
  const [modalInstalarPwa, setModalInstalarPwa] = useState(false)
  const [modalLogout, setModalLogout] = useState(false)
  const [modalConfirmCancelar, setModalConfirmCancelar] = useState<{ id: string, dataStr: string } | null>(null)
  const [modalDetalhesCancelamento, setModalDetalhesCancelamento] = useState<{ motivo: string, observacao: string } | null>(null)

  // SENHA NO MODAL PERFIL (AQUI SIM VALIDA SEGURANÇA)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaNovaSenha, setConfirmaNovaSenha] = useState('')
  const [mostrarSenhaModal, setMostrarSenhaModal] = useState(false)

  // CRIAR CONTA MODAL & FORM
  const [modalCriarConta, setModalCriarConta] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [novoCpf, setNovoCpf] = useState('')
  const [novaSenhaCadastro, setNovaSenhaCadastro] = useState('')
  const [confirmaNovaSenhaCadastro, setConfirmaNovaSenhaCadastro] = useState('')
  const [termoAceito, setTermoAceito] = useState(false)
  const [loadingCadastro, setLoadingCadastro] = useState(false)
  
  // Lógica de Notificações Inteligentes (com persistência local)
  const [notificacoesLimpas, setNotificacoesLimpas] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse((() => { try { return localStorage.getItem('remoterapia_notifs_limpas') } catch(e) { return null } })() || '[]')
      } catch { return [] }
    }
    return []
  })
  
  // Gerador dinâmico de avisos da base e da agenda do aluno
  const proximoConfirmado = agendamentos?.find(a => 
    a.status === 'confirmado' && a.data_reserva >= new Date().toISOString().split('T')[0]
  )
  const notificacoesAtivas = [
    // 1. Aviso de Agendamento Ativo (se houver)
    ...(proximoConfirmado ? [{
      id: `agendamento_${proximoConfirmado.id}`,
      categoria: 'Sua Reserva',
      titulo: 'Próxima Remada Confirmada',
      cor: 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
      dotCor: 'bg-emerald-500',
      texto: `Seu agendamento para ${proximoConfirmado.data_reserva || 'a data escolhida'} (${proximoConfirmado.horario_reserva || 'Manhã'}) está confirmado na base!`,
      hora: 'Ativo'
    }] : []),
    // 2. Condições do Mar na Base (Canto do Forte - PG)
    {
      id: 'mar_canto_forte',
      categoria: 'Canto do Forte · PG',
      titulo: 'Condição do Mar & Vento',
      cor: 'border-sky-100 dark:border-sky-900/40 bg-sky-50/70 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-400',
      dotCor: 'bg-sky-500',
      texto: 'Mar calmo e ventos favoráveis para navegação no Canto do Forte. Lembre-se do colete e hidratação.',
      hora: 'Hoje · 06:00'
    },
    // 3. Regra Operacional de Corte
    {
      id: 'regra_corte_19h',
      categoria: 'Regra Operacional',
      titulo: 'Horário de Agendamento',
      cor: 'border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300',
      dotCor: 'bg-slate-400',
      texto: 'Reservas para o dia seguinte devem ser feitas até as 19h da véspera para liberação da frota.',
      hora: 'Aviso Geral'
    }
  ].filter(item => !notificacoesLimpas.includes(item.id))
  
  const handleLimparTudo = () => {
    const todosIds = notificacoesAtivas.map(a => a.id)
    const atualizadas = [...notificacoesLimpas, ...todosIds]
    setNotificacoesLimpas(atualizadas)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('remoterapia_notifs_limpas', JSON.stringify(atualizadas)) } catch(e) {}
    }
  }
  
  const handleRemoverNotificacao = (id: string) => {
    const atualizadas = [...notificacoesLimpas, id]
    setNotificacoesLimpas(atualizadas)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('remoterapia_notifs_limpas', JSON.stringify(atualizadas)) } catch(e) {}
    }
  }

  // PWA Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  
  useEffect(() => {
    if (typeof window === 'undefined') return

    let disposed = false
    const initApp = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get('error')) showToast('Não foi possível concluir o acesso. Tente novamente.', 'error')
        // O identificador vem da sessão validada no servidor.
        const session = await getAlunoAtual()
        if (disposed) return
        if (!session.ok || !session.alunoId) {
          authenticatedRef.current = false
          setAlunoId('')
          setAlunoData(null)
          setView('login', true)
          return
        }
        setAlunoId(session.alunoId)
        if (session.precisa_trocar_senha) {
          authenticatedRef.current = true
          setView('trocar_senha', true)
          return
        }
        const res = await carregarPainelAluno(session.alunoId)
        if (disposed) return
        if (!res.ok) {
          authenticatedRef.current = false
          setAlunoId('')
          setAlunoData(null)
          setView('login', true)
          showToast('Não foi possível carregar seu perfil. Tente entrar novamente.', 'error')
          return
        }
        authenticatedRef.current = true
        setAlunoData(res.aluno)
        setCaiaques(res.caiaques || [])
        setLockers(res.lockers || [])
        setAgendamentos(res.agendamentos || [])
        setConfigTabelaClubes(res.configTabelaClubes)
        setDiasFechados(res.diasFechados || [])
        const hash = window.location.hash.replace('#', '')
        const validViews = ['home', 'agendar', 'eventos', 'historico', 'perfil', 'pagamentos']
        setView(localPreviewEnabled()&&hash==='login'?'login':validViews.includes(hash) ? hash as typeof view : 'home', true)
        if (params.has('oauth_aluno_id') || params.has('error')) window.history.replaceState({}, '', window.location.pathname + window.location.hash)
      } catch {
        if (!disposed) {
          authenticatedRef.current = false
          setView('login', true)
          showToast('Não foi possível verificar sua sessão. Tente novamente.', 'error')
        }
      } finally {
        if (!disposed) setIsCheckingSession(false)
      }
    }

    initApp()

    const handlePopState = () => {
      if (!authenticatedRef.current) return
      const hash = window.location.hash.replace('#', '')
      const validViews = ['home', 'agendar', 'eventos', 'historico', 'perfil', 'pagamentos']
      if (validViews.includes(hash)) {
        setView(hash as any, true)
      }
    }
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('hashchange', handlePopState)

    return () => {
      disposed = true
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handlePopState)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstalarApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null))
    } else {
      setModalInstalarPwa(true)
    }
  }

  // Máscara inteligente para qualquer DDD do Brasil
  const formatarTelefoneLivre = (v: string) => {
    const limpo = v.replace(/\D/g, '').slice(0, 11)
    if (limpo.length === 0) return ''
    if (limpo.length <= 2) return `(${limpo}`
    if (limpo.length <= 7) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`
  }

  const handleLoginGoogle = async () => {
    try {
      setLoading(true)
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`
        }
      })
      if (error) {
        showToast(error.message || 'Erro ao conectar com o Google', 'error')
        setLoading(false)
      }
    } catch (err) {
      showToast('Erro inesperado ao conectar com o Google', 'error')
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    if (!loginEmail || !loginEmail.includes('@')) {
      return showToast('Informe um e-mail válido.', 'warning')
    }
    if (!loginSenha) {
      return showToast('Digite sua senha de acesso.', 'warning')
    }

    setLoading(true)
    const identificador = loginEmail.trim().toLowerCase()

    try {
      const res = await loginAluno(identificador, loginSenha)
      if (res.ok) {
        authenticatedRef.current = true
        if (res.alunoId) setAlunoId(res.alunoId)
        if (res.precisa_trocar_senha) {
          setView('trocar_senha')
        } else if (await fetchPainel(res.alunoId, 'home')) {
          showToast(res.nome ? `Bem-vindo(a), ${res.nome.split(' ')[0]}!` : 'Bem-vindo ao Remoterapia!', 'success')
        }
      } else {
        setLoginError(res.error || 'Dados de acesso incorretos.')
        showToast(res.error || 'Dados de acesso incorretos.', 'error')
      }
    } catch {
      setLoginError('Não foi possível acessar o Portal. Tente novamente.')
      showToast('Não foi possível acessar o Portal. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRecuperarSenha = async () => {
    if (!loginEmail.trim() || !loginEmail.includes('@')) return showToast('Informe seu e-mail de acesso para recuperar a senha.', 'warning')
    setLoading(true)
    try {
      const res = await requestrecuperacaoAluno(loginEmail.trim().toLowerCase())
      showToast(res.ok ? 'Se houver uma conta para este e-mail, você receberá as instruções de recuperação.' : 'Não foi possível solicitar a recuperação. Tente novamente.', res.ok ? 'info' : 'error')
    } catch {
      showToast('Não foi possível solicitar a recuperação. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) return showToast('Informe seu nome completo.', 'warning')
    if (!novoEmail.trim() || !novoEmail.includes('@')) return showToast('Informe um e-mail válido.', 'warning')
    if (novoTelefone.replace(/\D/g, '').length < 10) return showToast('Informe seu WhatsApp com DDD.', 'warning')
    if (!senhaSegura(novaSenhaCadastro)) {
      return showToast('A senha deve ter no mínimo 12 caracteres.', 'warning')
    }
    if (novaSenhaCadastro !== confirmaNovaSenhaCadastro) return showToast('As senhas digitadas não conferem.', 'warning')
    if (!termoAceito) return showToast('Você precisa aceitar os termos de uso e LGPD para continuar.', 'warning')

    setLoadingCadastro(true)
    const res = await cadastrarAluno({
      nome: novoNome,
      email: novoEmail,
      telefone: novoTelefone,
      cpf: novoCpf,
      senha: novaSenhaCadastro,
      termoAceito: true
    })

    if (res.ok) {
      if (res.requiresEmailConfirmation || !res.alunoId) {
        setModalCriarConta(false)
        setNovaSenhaCadastro('')
        setConfirmaNovaSenhaCadastro('')
        setLoginEmail(novoEmail.trim().toLowerCase())
        showToast('Confira seu e-mail para confirmar o cadastro antes de entrar.', 'info')
        setLoadingCadastro(false)
        return
      }
      authenticatedRef.current = true
      setAlunoId(res.alunoId)
      setModalCriarConta(false)
      setNovoNome('')
      setNovoEmail('')
      setNovoTelefone('')
      setNovoCpf('')
      setNovaSenhaCadastro('')
      setConfirmaNovaSenhaCadastro('')
      setTermoAceito(false)
      await fetchPainel(res.alunoId, 'home')
      showToast(res.nome ? `Conta criada com sucesso! Bem-vindo(a), ${res.nome.split(' ')[0]}!` : 'Conta criada com sucesso! Bem-vindo(a)!', 'success')
    } else {
      showToast(res.error || 'Erro ao criar conta.', 'error')
    }
    setLoadingCadastro(false)
  }

  const handleSalvarSenhaModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!senhaAtual) return showToast('Digite a senha atual.', 'warning')
    if (!senhaSegura(novaSenha)) {
      return showToast('A nova senha deve ter no mínimo 12 caracteres.', 'warning')
    }
    if (novaSenha !== confirmaNovaSenha) return showToast('As senhas não coincidem.', 'warning')
    
    setLoading(true)
    const res = await alterarSenhaAluno(alunoId, senhaAtual, novaSenha, confirmaNovaSenha)
    if (res.ok) {
      showToast('Senha alterada com sucesso!', 'success')
      setModalTrocarSenha(false)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmaNovaSenha('')
    } else {
      showToast(res.error || 'Erro ao alterar senha.', 'error')
    }
    setLoading(false)
  }

  const fetchPainel = async (idParam?: string, targetView?: typeof view) => {
    const targetId = idParam || alunoId
    if (!targetId) return false
    const res = await carregarPainelAluno(targetId)
    if (res.ok) {
      authenticatedRef.current = true
      setAlunoData(res.aluno)
      setCaiaques(res.caiaques || [])
      setLockers(res.lockers || [])
      setAgendamentos(res.agendamentos || [])
      setConfigTabelaClubes(res.configTabelaClubes)
      setDiasFechados(res.diasFechados || [])
      setView(targetView || 'home')
      return true
    } else {
      showToast(res.error || 'Erro ao carregar dados.', 'error')
      return false
    }
  }

  const handleConfirmarAgendamento = async (payload: any) => {
    setLoading(true)
    const res = await confirmarAgendamento({
      mensalista_id: alunoId,
      data_reserva: payload.data,
      horario_reserva: payload.hora,
      caiaque_id: payload.caiaque,
      locker_id: payload.locker
    })
    if (res.ok) {
      showToast('Agendamento confirmado com sucesso!', 'success')
      await fetchPainel(alunoId)
      setView('home')
    } else {
      showToast(res.error || 'Erro ao confirmar agendamento.', 'error')
    }
    setLoading(false)
  }

  const handleEfetivarCancelamento = async () => {
    if (!modalConfirmCancelar) return
    setLoading(true)
    const res = await cancelarReserva(modalConfirmCancelar.id, alunoId)
    if (res.ok) {
      showToast('Reserva cancelada com sucesso.', 'info')
      await fetchPainel(alunoId)
    } else {
      showToast(res.error || 'Erro ao cancelar reserva.', 'error')
    }
    setModalConfirmCancelar(null)
    setLoading(false)
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      const res = await logoutAluno()
      if (!res.ok) return showToast(res.error || 'Não foi possível sair. Tente novamente.', 'error')
      authenticatedRef.current = false
      setAlunoId('')
      setAlunoData(null)
      setAgendamentos([])
      setModalLogout(false)
      setView('login')
    } catch {
      showToast('Não foi possível sair. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="rt-portal-app w-full h-[100dvh] max-h-[100dvh] overflow-hidden relative text-slate-900 dark:text-slate-100 bg-gradient-to-b from-sky-100 via-sky-50 to-pink-50 dark:from-[#0a1128] dark:via-[#0c192e] dark:to-[#162544] selection:bg-[#E52E87] selection:text-white transition-colors duration-300">
      
      {/* WRAPPER CENTRALIZADO FLUIDO */}
      <div className={`rt-portal-wrapper w-full mx-auto h-full flex flex-col relative overflow-hidden ${view === 'login' || view === 'trocar_senha' ? 'max-w-md sm:max-w-lg' : 'max-w-md sm:max-w-lg lg:max-w-7xl'}`}>

        {/* TOAST PREMIUM GLASSMORPHISM */}
        {toast && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-xs px-4 pointer-events-none toast-novo-enter">
              <div className={`flex items-center gap-3 p-3 rounded-2xl backdrop-blur-md shadow-xl border border-white/50 dark:border-slate-700/50 ring-1 ${
                toast.tipo === 'success' ? 'bg-emerald-50/90 dark:bg-emerald-950/80 shadow-emerald-900/10 ring-emerald-500/20' :
                toast.tipo === 'warning' ? 'bg-amber-50/90 dark:bg-amber-950/80 shadow-amber-900/10 ring-amber-500/20' :
                toast.tipo === 'error' ? 'bg-rose-50/90 dark:bg-rose-950/80 shadow-rose-900/10 ring-rose-500/20' :
                'bg-sky-50/90 dark:bg-sky-950/80 shadow-sky-900/10 ring-sky-500/20'
              }`}>
                <div className={`w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm ${
                  toast.tipo === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                  toast.tipo === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                  toast.tipo === 'error' ? 'text-rose-700 dark:text-rose-400' :
                  'text-sky-700 dark:text-sky-400'
                }`}>
                  {toast.tipo === 'success' ? <Check className="w-5 h-5" /> : 
                   toast.tipo === 'warning' ? <AlertTriangle className="w-5 h-5" /> : 
                   toast.tipo === 'error' ? <X className="w-5 h-5" /> : 
                   <Info className="w-5 h-5" />}
                </div>
                <p className={`text-[13px] font-bold flex-1 mr-2 leading-tight ${
                  toast.tipo === 'success' ? 'text-emerald-700 dark:text-emerald-300' :
                  toast.tipo === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                  toast.tipo === 'error' ? 'text-rose-700 dark:text-rose-300' :
                  'text-sky-700 dark:text-sky-300'
                }`}>{toast.msg}</p>
              </div>
            </div>
        )}

        {/* MODAL NOTIFICAÇÕES */}
        {/* MODAL DE NOTIFICAÇÕES — PADRÃO NÁUTICO PRO */}
        {modalNotificacoes && (
          <div data-rt-modal className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              
              {/* HEADER DO MODAL COM BOTÃO LIMPAR TUDO */}
              <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider"><VisualText id="copy-ac308a1ef1b9" defaultText={"Avisos da Base"}/></h3>
                      {notificacoesAtivas.length > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-[#0284c7] dark:text-sky-300">
                          {notificacoesAtivas.length}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400"><VisualText id="copy-6177d2ca5923" defaultText={"Canto do Forte · PG"}/></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {notificacoesAtivas.length > 0 && (
                    <button
                      type="button"
                      onClick={handleLimparTudo}
                      className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline cursor-pointer"
                    ><VisualText id="copy-e37f064327ae" defaultText={"Limpar tudo"}/></button>
                  )}
                  <button aria-label="Fechar janela" 
                    onClick={() => setModalNotificacoes(false)} 
                    className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* LISTA DINÂMICA DE NOTIFICAÇÕES */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {notificacoesAtivas.length === 0 ? (
                  <div className="text-center py-6 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mb-2">
                      <Check className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300"><VisualText id="copy-415798bb31cb" defaultText={"Tudo limpo por aqui!"}/></p>
                    <p className="text-[10px] text-slate-400 mt-0.5"><VisualText id="copy-1b0e22d32313" defaultText={"Você não possui novos avisos ou notificações no momento."}/></p>
                  </div>
                ) : (
                  notificacoesAtivas.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-3 rounded-2xl border space-y-1 relative group transition-all ${notif.cor}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black uppercase flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${notif.dotCor}`}></span>
                          {notif.categoria}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-bold text-slate-400">{notif.hora}</span>
                          <button aria-label="Fechar janela"
                            onClick={() => handleRemoverNotificacao(notif.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                            title="Dispensar aviso"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-100">{notif.titulo}</h4>
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-snug">
                        {notif.texto}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={() => setModalNotificacoes(false)} 
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              ><VisualText id="copy-8208921d7e33" defaultText={"Fechar"}/></button>
            </div>
          </div>
        )}

        {/* MODAL MUDAR SENHA (COM PADRÃO SEGURO) */}
        {/* MODAL TROCAR SENHA (BOTTOM SHEET NÁUTICO PRO) */}
        {modalTrocarSenha && (
          <div data-rt-modal 
            className="absolute inset-0 z-[100] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setModalTrocarSenha(false)}
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-2xl w-full max-w-md border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar animate-slide-up"
            >
              {/* Puxador de Bottom Sheet */}
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-2 shrink-0"></div>

              <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-[#0284c7] border border-sky-200 dark:border-sky-800"><VisualText id="copy-a0eefa81ed69" defaultText={"SEGURANÇA DA CONTA"}/></span>
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-[#0284c7] dark:text-sky-400"/><VisualText id="copy-9830f8b0c17e" defaultText={" Alterar Senha de Acesso"}/></h3>
                </div>
                <button aria-label="Fechar janela" 
                  onClick={() => setModalTrocarSenha(false)} 
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center text-xs transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSalvarSenhaModal} className="space-y-3">
                <div>
                  <label className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 block"><VisualText id="copy-6239b36d942e" defaultText={"Senha Atual"}/></label>
                  <input 
                    type={mostrarSenhaModal ? 'text' : 'password'} 
                    required 
                    value={senhaAtual} 
                    onChange={e => setSenhaAtual(e.target.value)} 
                    placeholder="Sua senha atual" 
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-[#0284c7]"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 block"><VisualText id="copy-277af37f3b7c" defaultText={"Nova Senha"}/></label>
                  <div className="relative">
                    <input 
                      type={mostrarSenhaModal ? 'text' : 'password'} 
                      required 
                      value={novaSenha} 
                      onChange={e => setNovaSenha(e.target.value)} 
                      placeholder="Mínimo 12 caracteres" 
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-[#0284c7]"
                    />
                    <button aria-label={mostrarSenhaModal?"Ocultar senha":"Mostrar senha"} aria-pressed={mostrarSenhaModal} type="button" onClick={() => setMostrarSenhaModal(!mostrarSenhaModal)} className="absolute right-3 top-2.5 text-slate-400 cursor-pointer">
                      {mostrarSenhaModal ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1 block"><VisualText id="copy-50c15daa2c97" defaultText={"Confirmar Nova Senha"}/></label>
                  <input 
                    type={mostrarSenhaModal ? 'text' : 'password'} 
                    required 
                    value={confirmaNovaSenha} 
                    onChange={e => setConfirmaNovaSenha(e.target.value)} 
                    placeholder="Repita a nova senha" 
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-[#0284c7]"
                  />
                </div>

                {/* Requisitos visuais */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase"><VisualText id="copy-acab61514a25" defaultText={"Padrão de Segurança:"}/></p>
                  <div className="flex items-center gap-2 text-[9px] font-black">
                    <span className={senhaSegura(novaSenha) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                      {senhaSegura(novaSenha) ? '✓' : '○'}<VisualText id="copy-efea21499d9f" defaultText={" 12+ caracteres"}/></span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !senhaSegura(novaSenha) || novaSenha !== confirmaNovaSenha} 
                  className="w-full mt-2 py-3 bg-gradient-to-r from-[#0284c7] to-[#034480] hover:brightness-105 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  <VisualLabel text={loading ? 'Salvando...' : 'Salvar Nova Senha'}/>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CRIAR CONTA — NÁUTICO MOBILE FRIENDLY */}
        {modalCriarConta && (
          <div data-rt-modal className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-200/80 dark:border-slate-800 space-y-4 my-auto">
              
              {/* HEADER DO MODAL */}
              <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-[#0284c7] dark:text-sky-400" /><VisualText id="copy-8028984e8344" defaultText={"Criar Minha Conta"}/></h3>
                  <p className="text-[10px] font-semibold text-slate-400"><VisualText id="copy-8b519c49f508" defaultText={"Rápido e gratuito para agendar remadas"}/></p>
                </div>
                <button aria-label="Fechar janela" 
                  onClick={() => setModalCriarConta(false)} 
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition"
                >
                  <X className="w-4 h-4"/>
                </button>
              </div>

              {/* FORMULÁRIO DE CADASTRO */}
              <form onSubmit={handleCadastrar} className="space-y-3">
                
                {/* NOME COMPLETO */}
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-0.5 block mb-1"><VisualText id="copy-526853efbb3f" defaultText={"Nome Completo"}/></label>
                  <input 
                    type="text" 
                    required 
                    value={novoNome} 
                    onChange={e => setNovoNome(e.target.value)} 
                    placeholder="Seu nome completo" 
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 transition"
                  />
                </div>

                {/* E-MAIL */}
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-0.5 block mb-1"><VisualText id="copy-2eaab9782b0d" defaultText={"E-mail Principal"}/></label>
                  <input 
                    type="email" 
                    required 
                    value={novoEmail} 
                    onChange={e => setNovoEmail(e.target.value)} 
                    placeholder="seu.email@exemplo.com" 
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 transition"
                  />
                </div>

                {/* WHATSAPP & CPF LADO A LADO */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-0.5 block mb-1"><VisualText id="copy-fa12b2a8e135" defaultText={"WhatsApp"}/></label>
                    <input 
                      type="tel" 
                      required 
                      value={novoTelefone} 
                      onChange={e => setNovoTelefone(formatarTelefoneLivre(e.target.value))} 
                      placeholder="(13) 99999-9999" 
                      className="w-full py-2.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-0.5 block mb-1"><VisualText id="copy-2f505532f464" defaultText={"CPF (Opcional)"}/></label>
                    <input 
                      type="text" 
                      value={novoCpf} 
                      onChange={e => {
                        const limpo = e.target.value.replace(/\D/g, '').slice(0, 11)
                        const cpfMascara = limpo.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (m, a, b, c, d) => {
                          let r = a
                          if (b) r += '.' + b
                          if (c) r += '.' + c
                          if (d) r += '-' + d
                          return r
                        })
                        setNovoCpf(cpfMascara)
                      }} 
                      placeholder="000.000.000-00" 
                      className="w-full py-2.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 transition"
                    />
                  </div>
                </div>

                {/* SENHA */}
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-0.5 block mb-1"><VisualText id="copy-e8a64d1cc5cf" defaultText={"Senha de Acesso"}/></label>
                  <input 
                    type="password" 
                    required 
                    value={novaSenhaCadastro} 
                    onChange={e => setNovaSenhaCadastro(e.target.value)} 
                    placeholder="Mínimo 12 caracteres" 
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 transition"
                  />
                </div>

                {/* REQUISITOS VISUAIS DE SENHA */}
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[9px] font-extrabold">
                  <span className={senhaSegura(novaSenhaCadastro) ? 'text-emerald-500 font-black' : 'text-slate-400'}>
                    {senhaSegura(novaSenhaCadastro) ? '✓' : '○'}<VisualText id="copy-792a3ca1337f" defaultText={" 12+ caracteres"}/></span>
                </div>

                {/* CONFIRMAR SENHA */}
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-0.5 block mb-1"><VisualText id="copy-aa8189610fa8" defaultText={"Confirmar Senha"}/></label>
                  <input 
                    type="password" 
                    required 
                    value={confirmaNovaSenhaCadastro} 
                    onChange={e => setConfirmaNovaSenhaCadastro(e.target.value)} 
                    placeholder="Repita sua senha" 
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 transition"
                  />
                </div>

                {/* TERMO LGPD & NORMAS NÁUTICAS */}
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={termoAceito} 
                    onChange={e => setTermoAceito(e.target.checked)} 
                    className="mt-0.5 rounded text-[#0284c7] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                  />
                  <span className="text-[9.5px] font-semibold text-slate-600 dark:text-slate-300 leading-snug"><VisualText id="copy-727e23a6f462" defaultText={"Declaro que li e concordo com as "}/><strong><VisualText id="copy-62092c920940" defaultText={"Normas Náuticas"}/></strong><VisualText id="copy-0f585b2b3cca" defaultText={" e a "}/><strong><VisualText id="copy-f06992b614b2" defaultText={"Política de Privacidade (LGPD)"}/></strong><VisualText id="copy-0a1db2c24026" defaultText={" do Remoterapia."}/></span>
                </label>

                {/* BOTÃO ENVIAR CADASTRO */}
                <button 
                  type="submit" 
                  disabled={loadingCadastro || !termoAceito || !senhaSegura(novaSenhaCadastro) || novaSenhaCadastro !== confirmaNovaSenhaCadastro} 
                  className="w-full mt-2 py-3 bg-gradient-to-r from-[#0284c7] to-[#034480] hover:brightness-105 active:scale-[0.98] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-sky-600/25 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <VisualLabel text={loadingCadastro ? 'Criando Conta...' : 'Criar Minha Conta'}/>
                </button>

              </form>
            </div>
          </div>
        )}

        {/* MODAL INSTALAR PWA (BOTTOM SHEET) */}
        {modalInstalarPwa && (
          <div data-rt-modal 
            className="absolute inset-0 z-[100] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setModalInstalarPwa(false)}
          >
            <div 
              onClick={e => e.stopPropagation()} 
              className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-2xl w-full max-w-md border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar animate-slide-up"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-2 shrink-0"></div>
              
              <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-[#0284c7] border border-sky-200 dark:border-sky-800"><VisualText id="copy-082eb1348df8" defaultText={"APLICATIVO NÁUTICO WEB"}/></span>
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white mt-1"><VisualText id="copy-275d5f6e7581" defaultText={"Instalar no Celular"}/></h3>
                </div>
                <button aria-label="Fechar janela" 
                  onClick={() => setModalInstalarPwa(false)} 
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center text-xs transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0284c7] text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white"><VisualText id="copy-88a4872af273" defaultText={"Acesso Rápido Sem Lojas"}/></h4>
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400"><VisualText id="copy-4bb9aa399737" defaultText={"Funciona como aplicativo nativo direto na tela inicial com carregamento instantâneo."}/></p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[8.5px] font-black uppercase text-[#0284c7] block"><VisualText id="copy-c4e1827b4a63" defaultText={"No iPhone / iPad (Safari)"}/></span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed"><VisualText id="copy-c3f223e397d9" defaultText={"1. Toque no botão de "}/><strong><VisualText id="copy-7cbd2055c838" defaultText={"Compartilhar"}/></strong><VisualText id="copy-4bb230c0782f" defaultText={" (quadrado com seta para cima)"}/><br/><VisualText id="copy-8901280cb285" defaultText={"2. Role e selecione "}/><strong><VisualText id="copy-bffc584ca38e" defaultText={"\"Adicionar à Tela de Início\""}/></strong>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[8.5px] font-black uppercase text-[#034480] dark:text-sky-400 block"><VisualText id="copy-e0bc91675e61" defaultText={"No Android / Chrome"}/></span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed"><VisualText id="copy-2c85d7c4ede4" defaultText={"1. Toque nos "}/><strong><VisualText id="copy-be4a8695c95f" defaultText={"três pontinhos (⋮)"}/></strong><VisualText id="copy-3848fbbd25d6" defaultText={" no topo direito"}/><br/><VisualText id="copy-b2f84ce8061e" defaultText={"2. Selecione "}/><strong><VisualText id="copy-66acb4777aca" defaultText={"\"Instalar Aplicativo\""}/></strong><VisualText id="copy-bad78ee6ec47" defaultText={" ou \"Adicionar à Tela Inicial\""}/></p>
                </div>
              </div>

              <button 
                onClick={() => setModalInstalarPwa(false)} 
                className="w-full py-3 bg-gradient-to-r from-[#0284c7] to-[#034480] hover:brightness-105 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition cursor-pointer"
              ><VisualText id="copy-c29e1044490b" defaultText={"Entendido"}/></button>
            </div>
          </div>
        )}

        {/* MODAL LOGOUT (BOTTOM SHEET) */}
        {modalLogout && (
          <div data-rt-modal className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm modal-backdrop-enter" onClick={() => setModalLogout(false)}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-800 modal-card-enter flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-4">
                    <LogOut className="w-8 h-8 ml-1" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1"><VisualText id="copy-cc787042f0b5" defaultText={"Sair da Sessão"}/></h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6"><VisualText id="copy-8b919bfa2c2d" defaultText={"Tem certeza que deseja sair da sua conta neste dispositivo?"}/></p>
                
                <div className="flex flex-col w-full gap-2">
                    <button className="w-full py-3.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold transition active:scale-95" onClick={handleLogout}><VisualText id="copy-688c6e8c8594" defaultText={"Sair da Conta"}/></button>
                    <button className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition active:scale-95" onClick={() => setModalLogout(false)}><VisualText id="copy-16b8d63feb86" defaultText={"Voltar"}/></button>
                </div>
            </div>
          </div>
        )}

        {/* MODAL CANCELAR RESERVA */}
        {modalConfirmCancelar && (
          <div data-rt-modal className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm modal-backdrop-enter" onClick={() => setModalConfirmCancelar(null)}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-800 modal-card-enter flex flex-col items-center text-center" onClick={e => e.stopPropagation()}>
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 flex items-center justify-center mb-4">
                    <Trash className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1"><VisualText id="copy-7dc767b6991c" defaultText={"Cancelar Reserva?"}/></h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6"><VisualText id="copy-ed41dc9662f9" defaultText={"Você está prestes a cancelar seu agendamento para "}/><b>{new Date(modalConfirmCancelar.dataStr + 'T00:00:00').toLocaleDateString('pt-BR')}</b><VisualText id="copy-8f30f9bf6f2c" defaultText={". Esta ação não pode ser desfeita."}/></p>
                
                <div className="flex flex-col w-full gap-2">
                    <button onClick={handleEfetivarCancelamento} disabled={loading} className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition active:scale-95 disabled:opacity-50">
                        <VisualLabel text={loading ? 'Aguarde...' : 'Sim, quero cancelar'}/>
                    </button>
                    <button onClick={() => setModalConfirmCancelar(null)} className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition active:scale-95"><VisualText id="copy-f54666f134e0" defaultText={"Manter Agendamento"}/></button>
                </div>
            </div>
          </div>
        )}

        {/* ====================== TELA TROCAR SENHA (PRIMEIRO ACESSO) ====================== */}
        {view === 'trocar_senha' && (
          <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0284c7] to-[#034480] rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-sky-600/20">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white"><VisualText id="copy-5ce889dd2c85" defaultText={"Criar Nova Senha"}/></h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400"><VisualText id="copy-f01eb34004f0" defaultText={"Por segurança, crie uma senha pessoal para o seu primeiro acesso."}/></p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!novaSenha) return showToast('Digite a nova senha.', 'warning')
                if (!senhaSegura(novaSenha)) return showToast('Use no mínimo 12 caracteres.', 'warning')
                if (novaSenha !== confirmaNovaSenha) return showToast('As senhas não coincidem.', 'warning')
                setLoading(true)
                const { salvarNovaSenha } = await import('@/lib/actions/aluno')
                const res = await salvarNovaSenha(alunoId, novaSenha)
                if (res.ok) {
                  showToast('Senha criada com sucesso!', 'success')
                  setNovaSenha('')
                  setConfirmaNovaSenha('')
                  await fetchPainel(alunoId, 'home')
                } else {
                  showToast(res.error || 'Erro ao salvar senha.', 'error')
                }
                setLoading(false)
              }} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500"><VisualText id="copy-3acc8f7be021" defaultText={"Nova Senha"}/></label>
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-hidden">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 12 caracteres"
                      required
                      className="w-full py-3 px-3 text-xs font-bold text-slate-800 dark:text-white bg-transparent outline-none placeholder:text-slate-400"
                    />
                    <button type="button" aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"} aria-pressed={mostrarSenha} onClick={() => setMostrarSenha(!mostrarSenha)} className="pr-3 text-slate-400 p-1">
                      {mostrarSenha ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500"><VisualText id="copy-dd3f196a55c8" defaultText={"Confirmar Senha"}/></label>
                  <input
                    type="password"
                    value={confirmaNovaSenha}
                    onChange={e => setConfirmaNovaSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    className="w-full py-3 px-3 text-xs font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !novaSenha || !confirmaNovaSenha}
                  className="w-full py-3.5 bg-gradient-to-r from-[#0284c7] to-[#034480] text-white font-extrabold rounded-xl shadow-lg shadow-sky-600/25 transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 active:scale-[0.98]"
                >
                  <VisualLabel text={loading ? 'SALVANDO...' : 'CRIAR SENHA E ENTRAR'}/>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TELA DE LOGIN HÍBRIDA & DESBLOQUEADA */}
        {view === 'login' && isCheckingSession && (
        <div className="flex flex-col items-center justify-center min-h-[85vh]">
            <div className="w-16 h-16 border-4 border-[#1D70B8] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#1D70B8] dark:text-cyan-400 font-black tracking-widest text-xs uppercase animate-pulse"><VisualText id="copy-f1fc69282eaa" defaultText={"Restaurando Sessão..."}/></p>
        </div>
    )}
        {/* TELA DE LOGIN — FOCO MOBILE & DESIGN NÁUTICO REFINADO */}
        {view === 'login' && !isCheckingSession && (
          <>
          <DesktopLoginBrand area="portal"/>
          <main className="rt-login-form flex flex-col items-center justify-center min-h-[90dvh] p-4 animate-fade-in relative z-10 w-full max-w-sm mx-auto" data-rt-area="area-f18b2335f3c1">
            
            {/* LOGO CIRCULAR NÁUTICA & TÍTULO */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-20 h-20 rounded-full bg-white p-1 border-[3px] border-[#0284c7] shadow-lg shadow-sky-500/20 flex items-center justify-center overflow-hidden mb-3">
                <Image 
                  src="/logo.webp" 
                  alt="Remoterapia" 
                  width={80} 
                  height={80} 
                  priority 
                  className="w-full h-full object-contain" 
                />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white"><VisualText id="copy-8f3dc9d949cd" defaultText={"REMOTERAPIA"}/></h1>
              <span className="text-[9.5px] font-extrabold text-[#0284c7] dark:text-sky-400 uppercase tracking-[0.2em] bg-sky-50 dark:bg-sky-950/60 px-3 py-0.5 rounded-full border border-sky-200 dark:border-sky-800/80 mt-1"><VisualText id="copy-fab78428d9a6" defaultText={"Portal do Aluno"}/></span>
            </div>
            
            {/* CARD DE LOGIN PRINCIPAL */}
            <div className="w-full bg-white dark:bg-slate-900/95 p-6 rounded-[2rem] shadow-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              
              <form onSubmit={handleLogin} className="space-y-3.5">
                {localPreviewEnabled()&&<div className="rt-local-entry"><strong>Prévia de design sem senha</strong><p>Os exemplos ficam apenas na memória local.</p><button type="button" onClick={()=>setView('home')}>Abrir o Portal de demonstração</button></div>}
                {loginError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{loginError}</p>}
                {/* CAMPO: APENAS E-MAIL */}
                <div className="space-y-1">
                  <label htmlFor="portal-email" className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block"><VisualText id="copy-6e93ad1f287c" defaultText={"E-mail"}/></label>
                  <div className="relative flex items-center rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all overflow-hidden">
                    <span className="pl-3.5 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input 
                      id="portal-email" autoComplete="username" type="email"
                      placeholder="seu.email@exemplo.com"
                      value={loginEmail} 
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                      className="w-full py-3 px-3 text-xs font-bold text-slate-800 dark:text-white bg-transparent outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* CAMPO: SENHA DE ACESSO */}
                <div className="space-y-1">
                  <label htmlFor="portal-password" className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block"><VisualText id="copy-dc6ad6c7baaa" defaultText={"Senha de Acesso"}/></label>
                  <div className="relative flex items-center rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-[#0284c7]/20 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all overflow-hidden">
                    <span className="pl-3.5 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input 
                      id="portal-password" autoComplete="current-password" type={mostrarSenha ? 'text' : 'password'} 
                      value={loginSenha} 
                      onChange={e => setLoginSenha(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                      className="w-full py-3 px-3 text-xs font-bold text-slate-800 dark:text-white bg-transparent outline-none tracking-widest placeholder:text-slate-400 placeholder:tracking-normal"
                    />
                    <button aria-label={mostrarSenha?"Ocultar senha":"Mostrar senha"} aria-pressed={mostrarSenha} 
                      type="button" 
                      onClick={() => setMostrarSenha(!mostrarSenha)} 
                      className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
                    >
                      {mostrarSenha ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                {/* BOTÃO ENTRAR NOVO ESTILO NÁUTICO */}
                <button aria-label="Entrar no Portal" 
                  type="submit"
                  disabled={loading || !loginEmail || !loginSenha}
                  className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#0284c7] to-[#034480] hover:brightness-105 active:scale-[0.98] text-white font-extrabold rounded-xl shadow-lg shadow-sky-600/25 transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span><VisualLabel text={loading ? 'ENTRANDO...' : 'ENTRAR NO PORTAL'}/></span>
                  {!loading && <ChevronRight className="w-4 h-4" />}
                </button>
              </form>

              <button type="button" onClick={handleRecuperarSenha} disabled={loading} className="w-full mt-3 text-xs font-bold text-[#0284c7] dark:text-sky-400 hover:underline disabled:opacity-50"><VisualText id="copy-35ea19efdfe4" defaultText={"Esqueci minha senha"}/></button>

              {/* BOTÃO LOGIN SOCIAL (GOOGLE) */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleLoginGoogle}
                  disabled={loading}
                  className="w-full py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-xl shadow-sm transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span><VisualText id="copy-181d97e6abb8" defaultText={"Continuar com o Google"}/></span>
                </button>
              </div>

              {/* DIVISOR & CHAMADA PARA CRIAR CONTA */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-center mt-3">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight"><VisualText id="copy-356ddfa37e6e" defaultText={"Ainda não é mensalista? Quer participar?"}/><br /><VisualText id="copy-5cb08c11efe4" defaultText={"Crie sua conta grátis"}/></p>
                <button
                  type="button"
                  onClick={() => setModalCriarConta(true)}
                  className="w-full py-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#0284c7] dark:text-sky-400" />
                  <span><VisualText id="copy-f92d40caaf6d" defaultText={"Criar Conta"}/></span>
                </button>
              </div>

              {/* SUPORTE WHATSAPP */}
              <div className="text-center pt-1">
                <p className="text-[10px] font-semibold text-slate-400"><VisualText id="copy-ea0ab6331a85" defaultText={"Problemas de acesso?"}/>{' '}
                  <a 
                    href="https://wa.me/5513997421804" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[#0284c7] dark:text-sky-400 hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3 inline" /><VisualText id="copy-82177e3f582f" defaultText={"Fale no WhatsApp"}/></a>
                </p>
              </div>
            </div>

          <VisualContentSlot id="area-f18b2335f3c1"/></main>
          </>
        )}

        {/* CABEÇALHO SUPERIOR - MODELO 1: FLOATING GLASS PRO */}
        {view !== 'login' && view !== 'trocar_senha' && (
          <>
            <PortalDesktopNavigation view={view} onNavigate={setView} nome={alunoData?.nome} canBook={!!alunoData && ['mensalista','guardaria','combo_mensalista_guardaria'].includes(alunoData.tipo_plano)} onNotificacoes={() => setModalNotificacoes(true)} onLogout={() => setModalLogout(true)}/>
            <header className="rt-portal-mobile-header shrink-0 z-20 m-3 lg:ml-[15rem] lg:mr-6 lg:mt-6 p-3.5 bg-gradient-to-r from-[#032b57] via-[#0284c7] to-[#034480] rounded-[2rem] shadow-lg shadow-sky-950/25 border border-white/20 text-white transition-all">
              <div className="flex justify-between items-center gap-3">
                
                {/* ESQUERDA: AVATAR ÂNCORA COM INICIAIS/FOTO + HIERARQUIA DE TEXTO */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={() => setView('perfil')}>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9.5px] font-black text-sky-200/90 uppercase tracking-widest block leading-none truncate">
                      <VisualLabel text={alunoData ? `Olá, ${alunoData.nome.split(' ')[0]}` : 'Portal do Aluno'}/>
                    </span>
                    <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wide leading-tight mt-0.5 truncate drop-shadow-xs">
                      <VisualLabel text={view === 'home' ? 'Início' : view === 'agendar' ? 'Agendar' : view === 'eventos' || view === 'eventos_out' ? 'Eventos' : view === 'historico' ? 'Histórico' : view === 'pagamentos' ? 'Pagamentos' : 'Meu Perfil'}/>
                    </h2>
                  </div>
                </div>

                {/* DIREITA: DOCK CONSOLIDADO DE COMANDOS */}
                <div className="flex items-center bg-white/15 backdrop-blur-md p-1 rounded-2xl border border-white/20 shrink-0 gap-0.5 shadow-xs">
                  <ThemeToggle className="w-8 h-8 rounded-xl flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition cursor-pointer" />
                  
                  {alunoData && (
                    <button 
                      type="button"
                      onClick={() => setModalNotificacoes(true)} 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition relative cursor-pointer"
                      title="Avisos e Notificações"
                    >
                      <Bell className="w-4 h-4 text-white" />
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-300 shadow-[0_0_6px_#38bdf8]"></span>
                    </button>
                  )}

                  {alunoData && (
                    <button 
                      type="button"
                      onClick={() => setModalLogout(true)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white hover:bg-rose-500/40 active:scale-90 transition cursor-pointer"
                      title="Sair da Conta"
                    >
                      <LogOut className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              </div>
            </header>

            {/* CONTEÚDO PRINCIPAL DAS ABAS */}
            <main className="rt-portal-content flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-3 lg:pl-[15rem] lg:pr-6 py-2 lg:py-4 space-y-4 pb-28 lg:pb-24" data-rt-area="area-bd087d12648a">
              
              {/* ABA INÍCIO (COMPONENTE BLINDADO) */}
              {view === 'home' && (
                <AbaInicio 
                  alunoData={alunoData}
                  agendamentos={agendamentos}
                  reservasSemana={reservasSemana}
                  maxMensalista={maxMensalista}
                  disponiveisSemana={disponiveisSemana}
                  caiaques={caiaques}
                  lockers={lockers}
                  onSolicitarNovo={() => setView('agendar')}
                  onExplorarEventos={() => setView('eventos')}
                  onCancelar={(id, dataStr) => setModalConfirmCancelar({ id, dataStr })}
                />
              )}

              {view === 'agendar' && (
                <AgendamentoWizard 
                  alunoData={alunoData} 
                  configTabelaClubes={configTabelaClubes} 
                  diasFechados={diasFechados} 
                  caiaques={caiaques} 
                  lockers={lockers} 
                  onConfirm={handleConfirmarAgendamento}
                  onCancel={() => setView('home')}
                  onError={(msg) => showToast(msg, 'warning')}
                  loading={loading}
                />
              )}

              {/* ABA EVENTOS */}
              {(view === 'eventos' || view === 'eventos_out') && (
                <ModuloEventos onPlan={()=>setView("pagamentos")} 
                  isLoggedIn={!!alunoData}
                  alunoData={alunoData}
                  caiaques={caiaques}
                  onBack={() => setView(alunoData ? 'home' : 'login')}
                  onEventoAgendado={(novo) => {
                    setAgendamentos((prev) => [novo, ...prev])
                    setView('home')
                  }}
                  onError={(msg) => showToast(msg, 'warning')}
                />
              )}

              {/* ABA HISTÓRICO (MODULARIZADA) */}
              {view === 'historico' && (
                <AbaHistorico 
                  alunoData={alunoData}
                  agendamentos={agendamentos}
                  onReagendar={() => setView('agendar')}
                  onAgendarEventos={() => setView('eventos')}
                  onVerMeusEventos={() => {
                    setAbrirInscricoes(true)
                    setView('perfil')
                  }}
                  onToast={showToast}
                />
              )}

              {/* ABA PERFIL (REESTRUTURADA E UNIFICADA) */}
              {view === 'pagamentos' && <AbaPagamentos aluno={alunoData} precos={configTabelaClubes} onEvents={()=>setView('eventos')}/>}
              {view === 'perfil' && (
                <>
                  <input
                    type="file"
                    id="foto-upload"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 4 * 1024 * 1024) {
                        return showToast('A imagem deve ter no máximo 4MB.', 'warning')
                      }
                      
                      showToast('Aguarde, enviando foto...', 'info')
                      
                      const reader = new FileReader()
                      reader.readAsDataURL(file)
                      reader.onload = async () => {
                        const base64 = reader.result as string
                        try {
                          const res = await fetch('/api/upload-foto-perfil', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ alunoId: alunoData?.id, base64 })
                          })
                          const data = await res.json()
                          
                          if (res.ok && data.url) {
                            showToast('Foto atualizada com sucesso!', 'success')
                            setAlunoData((prev: any) => prev ? { ...prev, foto_url: data.url } : prev)
                          } else {
                            showToast(data.error || 'Erro ao enviar foto.', 'error')
                          }
                        } catch (err) {
                          showToast('Erro de conexão ao enviar foto.', 'error')
                        }
                      }
                    }}
                  />
                  <AbaPerfil onPagamentos={()=>setView("pagamentos")}
                    abrirInscricoes={abrirInscricoes}
                    onInscricoesAbertas={()=>setAbrirInscricoes(false)}
                    alunoData={alunoData}
                    agendamentos={agendamentos}
                    onAbrirTrocarSenha={() => setModalTrocarSenha(true)}
                    onInstalarApp={handleInstalarApp}
                    onLogout={() => setModalLogout(true)}
                    onIrParaEventos={() => setView('eventos')}
                    onTrocarFoto={() => {
                      document.getElementById('foto-upload')?.click()
                    }}
                  />
                </>
              )}

            <VisualContentSlot id="area-bd087d12648a"/></main>

                    {/* MODAL DETALHES DE CANCELAMENTO */}
        {modalDetalhesCancelamento && (
          <div data-rt-modal className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 backdrop-blur-xl p-6 rounded-[2.2rem] shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black uppercase text-red-500 flex items-center gap-2"><Info className="w-4 h-4"/><VisualText id="copy-6b1bf357e77d" defaultText={" Agendamento Cancelado"}/></h3>
                <button aria-label="Fechar janela" onClick={() => setModalDetalhesCancelamento(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"><X className="w-4 h-4"/></button>
              </div>
              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1"><VisualText id="copy-4bde00bb433b" defaultText={"Motivo do Cancelamento"}/></p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">{modalDetalhesCancelamento.motivo}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1"><VisualText id="copy-855aceffd51b" defaultText={"Observação da Base"}/></p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">{modalDetalhesCancelamento.observacao}</p>
                </div>
              </div>
              <button 
                onClick={() => setModalDetalhesCancelamento(null)} 
                className="w-full mt-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black rounded-2xl active:scale-95 transition-all uppercase tracking-wider text-xs cursor-pointer"
              ><VisualText id="copy-d2340e40efa5" defaultText={"FECHAR"}/></button>
            </div>
          </div>
        )}

            {/* BOTTOM NAV */}
            <BottomNav view={view} setView={setView} alunoData={alunoData} />
          </>
        )}

      </div>
    </div>
  )
}
