'use client'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { alterarSenha } from '@/lib/actions/auth'
import Link from 'next/link'
import {VisualText} from '@/components/ui/VisualContent'


export default function RedefinirSenha() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (senha !== confirmar) {
        setError('As senhas não coincidem.')
        return
    }
    if (senha.length < 12 || senha.length > 128) {
        setError('A senha deve ter de 12 a 128 caracteres.')
        return
    }

    setLoading(true)
    setError('')
    
    // Altera a senha do usuário atualmente autenticado pela sessão de recuperação
    const res = await alterarSenha(senha)
    
    setLoading(false)
    if (!res.ok) {
      setError(res.error || 'Erro ao alterar senha. O link pode ter expirado.')
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/gestao/login')
      }, 2000)
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative font-sans auth-screen p-4 justify-center items-center">
      
      <div className="glass-card p-6 w-full mt-4 max-w-sm rounded-3xl backdrop-blur-md bg-white/90 dark:bg-slate-900/90 shadow-2xl">
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800 dark:text-white text-center mb-1"><VisualText id="copy-57dd62483cb2" defaultText={"Redefinir Senha"}/></h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-6"><VisualText id="copy-cb5a9a56241b" defaultText={"Crie uma nova senha de acesso"}/></p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-xl text-xs font-bold text-center uppercase tracking-wider">
            {error}
          </div>
        )}

        {success ? (
            <div className="text-center p-4">
                <div className="text-4xl mb-2"><BrandIcon name="success"/></div>
                <h3 className="text-sm font-black uppercase text-emerald-600 tracking-wider"><VisualText id="copy-a5901c161edf" defaultText={"Senha Atualizada"}/></h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-2"><VisualText id="copy-a003454f79d6" defaultText={"Faça login com a nova senha..."}/></p>
            </div>
        ) : (
            <form onSubmit={handleReset} className="space-y-4">
                <input
                    type="password"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="Nova Senha"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="password"
                    value={confirmar}
                    onChange={e => setConfirmar(e.target.value)}
                    placeholder="Confirmar Nova Senha"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>

                <div className="text-center mt-4">
                    <Link href="/gestao/login" className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-colors"><VisualText id="copy-3be98b3278f0" defaultText={"Voltar para o Login"}/></Link>
                </div>
            </form>
        )}
      </div>
    </div>
  )
}

