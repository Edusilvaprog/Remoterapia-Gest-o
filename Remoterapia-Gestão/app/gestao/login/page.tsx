'use client'
import BrandIcon from '@/components/ui/BrandIcon'
import BrandLabel from '@/components/ui/BrandLabel'
import DesktopLoginBrand from '@/components/desktop/DesktopLoginBrand'
import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { loginStaff, solicitarRecuperacaoSenha } from '@/lib/actions/auth'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'
import {localPreviewEnabled} from '@/lib/local-preview-client'
import Link from 'next/link'



export default function LoginGestao() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // MODAIS
  const [modalRecuperar, setModalRecuperar] = useState(false)
  const [emailRecuperar, setEmailRecuperar] = useState('')
  const [recuperando, setRecuperando] = useState(false)
  const [modalInstalar, setModalInstalar] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3800)
  }

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await loginStaff(email, password)
      if (!res.ok) setError(res.error || 'E-mail ou senha incorretos.')
      else router.push(window.matchMedia('(min-width: 1024px)').matches ? '/gestao/painel' : '/gestao/selecionar-area')
    } catch { setError('Não foi possível entrar. Tente novamente.') }
    finally { setLoading(false) }
  }

  async function handleEnviarRecuperacao() {
    if (!emailRecuperar || !emailRecuperar.includes('@')) {
      showToast('Informe um e-mail válido para recuperação.', 'warning')
      return
    }
    setRecuperando(true)
    const res = await solicitarRecuperacaoSenha(emailRecuperar)
    setRecuperando(false)
    if (res.ok) {
      showToast(`Se a conta puder receber a recuperação, você receberá um link por e-mail.`, 'success')
      setModalRecuperar(false)
    } else {
      showToast(res.error || 'Erro ao enviar e-mail de recuperação.', 'error')
    }
  }

  const dispararInstalacaoPwa = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null))
    } else {
      setModalInstalar(true)
    }
  }

  return (
    <>
    <DesktopLoginBrand area="gestao"/>
    <section className="rt-login-form flex-1 flex flex-col items-center justify-center min-h-[100dvh] w-full overflow-y-auto px-6 py-8 z-[100] relative" data-rt-area="area-95f716f186bd">
      {localPreviewEnabled()&&<div className="rt-local-entry"><strong>Prévia de design sem senha</strong><p>Acesse todas as áreas com exemplos locais, sem usar contas ou dados reais.</p><Link href="/gestao/painel">Abrir a Gestão de demonstração</Link></div>}
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
            <span><BrandLabel text={toast.tipo === 'success' ? '✓' : toast.tipo === 'error' ? '✕' : 'ℹ'}/></span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
      
      {/* 1. BLOCO DA MARCA: LOGO OFICIAL & TÍTULOS EM NEGRITO */}
      <div className="w-full flex flex-col items-center text-center flex-shrink-0 mb-4 space-y-2">
        
        {/* LOGO REMOTERAPIA OFICIAL */}
        <div className="relative w-28 h-28 rounded-full bg-white/95 p-1.5 shadow-xl border-2 border-white flex items-center justify-center backdrop-blur-md">
          <img 
            src="/logo.webp" 
            alt="Remoterapia" 
            className="w-full h-full object-contain rounded-full"
          />
        </div>

        {/* TÍTULOS EM NEGRITO PESADO */}
        <div>
          <h1 className="leading-tight">
            <span className="block text-2xl font-black text-blue-950 uppercase tracking-tight drop-shadow-xs"><VisualText id="copy-140888663ec0" defaultText={"REMOTERAPIA"}/></span>
            <span className="block text-lg font-black text-blue-600 dark:text-cyan-400 uppercase tracking-wide mt-0.5"><VisualText id="copy-b9af1b03e668" defaultText={"SISTEMA DE GESTÃO"}/></span>
          </h1>

          <div className="inline-block mt-2 px-4 py-1.5 rounded-full bg-white/85 dark:bg-slate-900/60 backdrop-blur-md border border-blue-200/80 dark:border-slate-700 shadow-xs whitespace-nowrap">
            <p className="text-[9.5px] font-black uppercase tracking-widest text-blue-900 dark:text-cyan-400 whitespace-nowrap"><VisualText id="copy-4fe123bff7ba" defaultText={"Controle e Monitoramento do Mar"}/></p>
          </div>
        </div>

      </div>

      {/* 2. CARD VIDRO FOSCO NÁUTICO */}
      <div className="w-full max-w-sm bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-7 rounded-[2.5rem] shadow-2xl border border-white/80 dark:border-slate-800 space-y-4">
        
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-600 text-xs font-black text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          
          {/* CAMPO E-MAIL */}
          <div>
            <label className="text-[9.5px] font-black text-slate-700 dark:text-slate-300 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-0fd4b955075b" defaultText={"E-mail de Acesso"}/></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu.email@remoterapia.com"
              required
              className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* CAMPO SENHA */}
          <div>
            <label className="text-[9.5px] font-black text-slate-700 dark:text-slate-300 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-18212d191f24" defaultText={"Senha"}/></label>
            <div className="relative"><input
              id="senha-gestao"
              autoComplete="current-password"
              disabled={loading}
              type={mostrarSenha ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full py-3.5 pl-4 pr-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs outline-none transition-all placeholder:text-slate-400"
            /><button type="button" aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha} aria-controls="senha-gestao" onClick={() => setMostrarSenha(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 rounded-lg hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500">{mostrarSenha ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div>
          </div>

          {/* BOTÃO ENTRAR */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-95 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 transition-all uppercase tracking-wider text-xs cursor-pointer disabled:opacity-70 mt-1"
          >
            <VisualLabel text={loading ? 'ENTRANDO...' : 'ENTRAR NO SISTEMA'}/>
          </button>
        </form>

        {/* LINK ESQUECI MINHA SENHA */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setEmailRecuperar(email)
              setModalRecuperar(true)
            }}
            className="text-[10px] font-black text-slate-500 hover:text-blue-600 dark:hover:text-cyan-400 uppercase tracking-wider transition-colors cursor-pointer"
          ><VisualText id="copy-0faf61fc7f51" defaultText={"Esqueci minha senha"}/></button>
        </div>

        {/* BOTÃO INSTALAR APLICATIVO (TELA CHEIA PWA) */}
        <button
          type="button"
          onClick={dispararInstalacaoPwa}
          className="w-full py-3 bg-[#eaf4fc] dark:bg-slate-800/60 hover:bg-blue-100/80 active:scale-95 text-blue-900 dark:text-cyan-400 font-black rounded-2xl border border-blue-200 dark:border-slate-700 text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <span>📲</span><VisualText id="copy-016100702655" defaultText={" Instalar Aplicativo (Tela Cheia)"}/></button>

      </div>

      {/* 3. ASSINATURA DE PRODUÇÃO OFICIAL EM BLOCO ÚNICO SEM QUEBRA */}
      <div className="pt-4">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border border-white/90 dark:border-slate-800 shadow-xs whitespace-nowrap">
          <img 
            src="/images/plorix_logo.png" 
            alt="Plorix Gestão" 
            className="w-5 h-5 object-contain shrink-0"
            onError={(e: any) => { e.target.style.display = 'none' }}
          />
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-950 dark:text-white whitespace-nowrap"><VisualText id="copy-f4006be9e50e" defaultText={"PRODUZIDO POR PLORIX GESTÃO"}/></span>
        </div>
      </div>

      {/* MODAL 1: RECUPERAÇÃO DE SENHA */}
      {modalRecuperar && (
        <div data-rt-modal className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl border border-white/80 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 flex justify-between items-center text-white">
              <h3 className="text-xs font-black uppercase tracking-wider"><VisualText id="copy-d26413b8142b" defaultText={"RECUPERAR SENHA"}/></h3>
              <button aria-label="Fechar janela" onClick={() => setModalRecuperar(false)} className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed"><VisualText id="copy-9146015d6e61" defaultText={"Informe seu e-mail cadastrado. Enviaremos um link de redefinição seguro pelo Supabase para você criar uma nova senha."}/></p>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider ml-1 mb-1 block"><VisualText id="copy-0371458f8582" defaultText={"E-mail Cadastrado"}/></label>
                <input
                  type="email"
                  value={emailRecuperar}
                  onChange={e => setEmailRecuperar(e.target.value)}
                  placeholder="exemplo@remoterapia.com.br"
                  className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-black text-slate-900 dark:text-white shadow-xs outline-none"
                />
              </div>

              <button
                type="button"
                disabled={recuperando}
                onClick={handleEnviarRecuperacao}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-70"
              >
                <VisualLabel text={recuperando ? 'ENVIANDO LINK...' : 'ENVIAR LINK DE REDEFINIÇÃO'}/>
              </button>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[9px] font-bold text-slate-400 mb-2"><VisualText id="copy-54c2645463c9" defaultText={"Precisa de acesso imediato na base?"}/></p>
                <button
                  type="button"
                  onClick={() => {
                    const texto = encodeURIComponent('Olá, preciso de suporte para recuperar meu acesso no Sistema Remoterapia.')
                    window.open(`https://wa.me/5513997814422?text=${texto}`, '_blank')
                    setModalRecuperar(false)
                  }}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[9.5px] uppercase tracking-wider rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span><BrandIcon name="message"/></span><VisualText id="copy-24f57fc2d5e2" defaultText={" Pedir Suporte via WhatsApp"}/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSTRUÇÕES DE INSTALAÇÃO PWA */}
      {modalInstalar && (
        <div data-rt-modal className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl border border-white/80 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-scale-up">
            <div className="bg-[#eaf4fc] dark:bg-slate-800 px-5 py-4 border-b border-blue-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-[8.5px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest leading-none"><VisualText id="copy-ab9ec8eea086" defaultText={"APLICATIVO PWA"}/></p>
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-950 dark:text-white mt-0.5"><VisualText id="copy-6c285e1f0d27" defaultText={"INSTALAR NA TELA INICIAL"}/></h3>
              </div>
              <button aria-label="Fechar janela" onClick={() => setModalInstalar(false)} className="w-7 h-7 bg-white dark:bg-slate-700 text-slate-500 rounded-full flex items-center justify-center text-xs font-bold shadow-xs cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed"><VisualText id="copy-b3b9f28b6fc8" defaultText={"Instale o sistema como um aplicativo no seu celular ou computador para usar em "}/><strong><VisualText id="copy-32a4b3834796" defaultText={"tela cheia"}/></strong><VisualText id="copy-5eff2a2ff802" defaultText={", sem a barra de endereços do navegador!"}/></p>

              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                  <span className="text-lg">🍏</span>
                  <div>
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-944e71ac7ed0" defaultText={"iPhone ou iPad (Safari)"}/></p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5"><VisualText id="copy-99c9c7f6d2af" defaultText={"Toque no botão "}/><strong><VisualText id="copy-86752b2ff16e" defaultText={"Compartilhar"}/></strong><VisualText id="copy-c3137f6706e7" defaultText={" (ícone com seta para cima) e selecione "}/><strong><VisualText id="copy-f8f2066253c3" defaultText={"&quot;Adicionar à Tela de Início&quot;"}/></strong>.</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                  <span className="text-lg">🤖</span>
                  <div>
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-c1bdca472352" defaultText={"Android ou PC (Chrome / Edge)"}/></p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5"><VisualText id="copy-3bc056d4de92" defaultText={"Toque nos "}/><strong><VisualText id="copy-fd4d711df9f4" defaultText={"3 pontinhos"}/></strong><VisualText id="copy-a9d9716d541e" defaultText={" do navegador e selecione "}/><strong><VisualText id="copy-6c02eba1b7e2" defaultText={"&quot;Instalar aplicativo&quot;"}/></strong> ou <strong><VisualText id="copy-bb03c9128b0f" defaultText={"&quot;Adicionar à tela inicial&quot;"}/></strong>.</p>
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setModalInstalar(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
              ><VisualText id="copy-9a5686c3f374" defaultText={"Entendido"}/></button>
            </div>
          </div>
        </div>
      )}

    <VisualContentSlot id="area-95f716f186bd"/></section>
    </>
  )
}




