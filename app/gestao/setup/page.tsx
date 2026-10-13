'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {VisualText} from '@/components/ui/VisualContent'


export default function SetupMaster() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Verificamos pelo cliente mesmo
    const supabase = createClient()
    
    // 1. Verifica se já existe alguém
    const { data: users, error: errUsers } = await supabase.from('perfis_staff').select('id').limit(1)
    
    if (errUsers) {
      setError('Erro ao conectar com o banco. O SQL foi rodado no Supabase?')
      setLoading(false)
      return
    }

    if (users && users.length > 0) {
      setError('O sistema já tem um Admin master. Esta tela foi desativada por segurança.')
      setLoading(false)
      return
    }

    // 2. Cria o usuário no Supabase Auth
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, role: 'admin' }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    
    // Redireciona para o login em 3 segundos
    setTimeout(() => {
      router.push('/gestao/login')
    }, 4000)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative font-sans auth-screen p-4">
      <div className="auth-brand">
         <img src="/logo.png" className="anchor-logo" alt="Remoterapia" />
         <p className="auth-brand-title">
           <span className="auth-brand-name"><VisualText id="copy-a6848b477db3" defaultText={"Sistema Novo"}/></span>
           <span className="auth-brand-tagline"><VisualText id="copy-8d5cb418e660" defaultText={"Configuração"}/></span>
           <span className="auth-brand-sub"><VisualText id="copy-8c0b735d8875" defaultText={"Criar Admin Master"}/></span>
         </p>
      </div>

      <div className="glass-card p-6 w-full mt-4">
        {success ? (
          <div style={{ padding: '1rem', backgroundColor: '#ecfccb', border: '1px solid #84cc16', borderRadius: '1rem', color: '#4d7c0f', textAlign: 'center' }}>
            <h3 style={{fontWeight: 900, marginBottom: '0.5rem'}}><VisualText id="copy-42376ee2766c" defaultText={"Master Criado com Sucesso!"}/></h3>
            <p style={{fontSize: '0.875rem'}}><VisualText id="copy-fff1500b2b34" defaultText={"Se o e-mail não precisar de confirmação no Supabase, você já pode logar. Redirecionando..."}/></p>
          </div>
        ) : (
          <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {error && (
              <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '1rem', color: '#ef4444', fontSize: '0.875rem', fontWeight: 'bold', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{fontSize:'0.75rem', fontWeight: 'bold', color:'#334155', marginLeft:'0.5rem', textTransform:'uppercase'}}><VisualText id="copy-7ecd0ad1882c" defaultText={"Nome do Admin"}/></label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} required className="custom-input" placeholder="Seu Nome" />
            </div>
            <div>
              <label style={{fontSize:'0.75rem', fontWeight: 'bold', color:'#334155', marginLeft:'0.5rem', textTransform:'uppercase'}}><VisualText id="copy-a48f3ade4c4d" defaultText={"Email de Acesso"}/></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="custom-input" placeholder="admin@remoterapia.com" />
            </div>
            <div>
              <label style={{fontSize:'0.75rem', fontWeight: 'bold', color:'#334155', marginLeft:'0.5rem', textTransform:'uppercase'}}><VisualText id="copy-3132de6b13e4" defaultText={"Senha Segura"}/></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="custom-input" placeholder="Mínimo 6 caracteres" />
            </div>
            
            <button type="submit" disabled={loading} className="plorix-btn-login" style={{backgroundColor: '#10b981'}}>
              {loading ? 'Criando...' : 'Registrar Master e Trancar Sistema'}
            </button>
            <p style={{textAlign:'center', fontSize:'0.7rem', color:'#64748b', marginTop:'0.5rem'}}><VisualText id="copy-bb9c01e2e25e" defaultText={"Atenção: Essa tela só funciona 1 vez. Depois que o Master for criado, só ele poderá criar outros membros da equipe."}/></p>
          </form>
        )}
      </div>
    </div>
  )
}

