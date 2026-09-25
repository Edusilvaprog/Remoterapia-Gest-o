'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import AppBottomNav from '@/components/AppBottomNav'
import { logoutStaff, criarStaff } from '@/lib/actions/auth'

interface UsuarioItem {
  id: string
  name: string
  email: string
  roles: string[]
  ativo?: boolean
}

interface CaiaqueItem {
  id: string
  nome: string
  capacidade: number
  preco_sem_instrutor: number
  preco_com_instrutor: number
  status?: string | null
  tipo?: string
}

interface LockerItem {
  id: string
  nome: string
  status: 'Livre' | 'Ocupado'
}

interface AuditoriaItem {
  hora: string
  acao: string
}

export default function AdminClient() {
  const [tab, setTab] = useState<'usuarios' | 'frota' | 'lockers' | 'auditoria'>('usuarios')
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)
  const [modalConfirmacao, setModalConfirmacao] = useState<{ msg: string; acao: () => void } | null>(null)
  const [isPending, startTransition] = useTransition()

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // 1. USUÁRIOS
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([])
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSenhaProvisoria, setFormSenhaProvisoria] = useState('')
  const [rolesSel, setRolesSel] = useState<string[]>(['admin'])
  const [modalExcluirUsuario, setModalExcluirUsuario] = useState<UsuarioItem | null>(null)

  // 2. FROTA & PREÇOS
  const [frota, setFrota] = useState<CaiaqueItem[]>([])
  const [caiId, setCaiId] = useState('')
  const [caiCapacidade, setCaiCapacidade] = useState<number>(1)
  const [caiSem, setCaiSem] = useState('0,00')
  const [caiCom, setCaiCom] = useState('0,00')

  // Modais de Edição Separada
  const [modalEditDados, setModalEditDados] = useState<CaiaqueItem | null>(null)
  const [editCaiCap, setEditCaiCap] = useState<number>(1)

  const [modalEditPreco, setModalEditPreco] = useState<CaiaqueItem | null>(null)
  const [editCaiSem, setEditCaiSem] = useState('0,00')
  const [editCaiCom, setEditCaiCom] = useState('0,00')

  // 3. GUARDA-VOLUMES
  const [lockers, setLockers] = useState<LockerItem[]>([])
  const [novoLockerNum, setNovoLockerNum] = useState('')
  const [novoLockerNome, setNovoLockerNome] = useState('')

  // 4. AUDITORIA
  const [auditoria, setAuditoria] = useState<AuditoriaItem[]>([])

  // CARREGAR DADOS DO SUPABASE
  const carregarDados = async () => {
    try {
      const supabase = createClient()

      // Usuários
      const allowedRoles = ['admin', 'dona', 'instrutor', 'agua', 'areia', 'recepcao', 'gestao', 'portal']
      const { data: uData } = await supabase
        .from('perfis_staff')
        .select('*')
        .in('role', allowedRoles)
        .order('nome')
      if (uData && uData.length > 0) {
        setUsuarios(uData.map((u: any) => ({
          id: u.id,
          name: u.nome || 'Funcionário',
          email: u.email || '',
          roles: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role || 'instrutor'],
          ativo: u.ativo !== false
        })))
      }

      // Frota de Caiaques
      const { data: fData } = await supabase.from('caiaques').select('*').order('id')
      if (fData && fData.length > 0) {
        setFrota(fData.map((c: any) => ({
          id: String(c.id),
          nome: c.nome || `Caiaque #${c.id}`,
          capacidade: Number(c.capacidade) || 1,
          preco_sem_instrutor: Number(c.preco_sem_instrutor) || 0,
          preco_com_instrutor: Number(c.preco_com_instrutor) || 0,
          status: c.status
        })))
      }

      // Guarda-Volumes
      const { data: lData } = await supabase.from('lockers').select('*').order('id')
      if (lData && lData.length > 0) {
        setLockers(lData.map((l: any) => ({
          id: String(l.id),
          nome: l.nome || `Guarda-Volumes #${l.id}`,
          status: l.status === 'Ocupado' ? 'Ocupado' : 'Livre'
        })))
      }

      // Auditoria
      const { data: aData } = await supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(40)
      if (aData && aData.length > 0) {
        setAuditoria(aData.map((a: any) => ({
          hora: a.created_at || new Date().toISOString(),
          acao: a.acao || 'Operação registrada'
        })))
      }
    } catch (e: any) {
      console.error('Erro ao carregar dados admin:', e)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // HANDLERS: USUÁRIOS
  const toggleRole = (r: string) => {
    setRolesSel(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  const handleEditarUsuario = (u: UsuarioItem) => {
    setEditandoId(u.id)
    setFormNome(u.name)
    setFormEmail(u.email)
    setFormSenhaProvisoria('')
    setRolesSel(u.roles)
    showToast(`Editando acesso de ${u.name}`)
  }

  const limparFormUsuario = () => {
    setEditandoId(null)
    setFormNome('')
    setFormEmail('')
    setFormSenhaProvisoria('')
    setRolesSel(['admin'])
  }

  const salvarUsuario = async () => {
    if (!formNome.trim()) return showToast('Informe o nome completo do funcionário.', 'info')
    if (!formEmail.trim() || !formEmail.includes('@')) return showToast('Informe um e-mail corporativo ou válido.', 'info')
    if (!editandoId && (!formSenhaProvisoria || formSenhaProvisoria.length < 6)) {
      return showToast('Defina uma senha provisória de pelo menos 6 dígitos para o primeiro acesso.', 'info')
    }
    if (rolesSel.length === 0) return showToast('Selecione ao menos uma função/papel para o funcionário.', 'warning')

    startTransition(async () => {
      try {
        const supabase = createClient()
        const rolePrincipal = rolesSel[0] || 'admin'

        if (editandoId) {
          const { error } = await supabase.from('perfis_staff').update({
            nome: formNome.trim(),
            email: formEmail.toLowerCase().trim(),
            role: rolePrincipal,
            roles: rolesSel
          }).eq('id', editandoId)

          if (error) throw error

          setUsuarios(prev => prev.map(u => u.id === editandoId ? {
            ...u,
            name: formNome.trim(),
            email: formEmail.toLowerCase().trim(),
            roles: rolesSel
          } : u))
          showToast('Acessos do funcionário atualizados!', 'success')
        } else {
          const res = await criarStaff(
            formEmail.toLowerCase().trim(),
            formSenhaProvisoria,
            formNome.trim(),
            rolePrincipal
          )

          if (!res.ok) {
            return showToast(res.error || 'Erro ao criar funcionário.', 'error')
          }

          // Atualiza com array de roles completo
          if (res.data?.id) {
            await supabase.from('perfis_staff').update({ roles: rolesSel }).eq('id', res.data.id)
          }

          const novo: UsuarioItem = {
            id: res.data?.id || `staff-${Date.now()}`,
            name: formNome.trim(),
            email: formEmail.toLowerCase().trim(),
            roles: rolesSel,
            ativo: true
          }
          setUsuarios(prev => [...prev, novo])
          showToast('Staff criado com sucesso!', 'success')
        }
        limparFormUsuario()
      } catch (e: any) {
        showToast('Erro ao salvar funcionário: ' + e.message, 'error')
      }
    })
  }

  const confirmarExcluirUsuario = async () => {
    if (!modalExcluirUsuario) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('perfis_staff').delete().eq('id', modalExcluirUsuario.id)
      if (error) throw error

      setUsuarios(prev => prev.filter(u => u.id !== modalExcluirUsuario.id))
      showToast('Acesso removido com sucesso.')
      setModalExcluirUsuario(null)
    } catch (e: any) {
      showToast('Erro ao remover usuário: ' + e.message, 'error')
    }
  }

  // HANDLERS: FROTA & PREÇOS
  const adicionarCaiaque = async () => {
    const idLimpo = caiId.trim()
    if (!idLimpo) return showToast('Informe a identificação ou número da embarcação.', 'info')
    if (frota.some(c => c.id === idLimpo)) return showToast('Já existe uma embarcação com esta identificação.', 'info')

    const valorSem = parseFloat(caiSem.replace(',', '.')) || 0
    const valorCom = parseFloat(caiCom.replace(',', '.')) || 0

    try {
      const supabase = createClient()
      const nomeFinal = idLimpo.toLowerCase().includes('caiaque') ? idLimpo : `Caiaque #${idLimpo}`

      const { error } = await supabase.from('caiaques').insert({
        id: idLimpo,
        nome: nomeFinal,
        capacidade: caiCapacidade,
        preco_sem_instrutor: valorSem,
        preco_com_instrutor: valorCom,
        status: 'livre',
        tipo: caiCapacidade > 1 ? 'duplo' : 'individual'
      })

      if (error) throw error

      const novo: CaiaqueItem = {
        id: idLimpo,
        nome: nomeFinal,
        capacidade: caiCapacidade,
        preco_sem_instrutor: valorSem,
        preco_com_instrutor: valorCom,
        status: 'livre',
        tipo: caiCapacidade > 1 ? 'duplo' : 'individual'
      }

      setFrota(prev => [...prev, novo])
      setCaiId('')
      setCaiCapacidade(1)
      setCaiSem('0,00')
      setCaiCom('0,00')
      showToast(`Embarcação ${novo.nome} adicionada à frota!`, 'success')
    } catch (e: any) {
      showToast('Erro ao adicionar embarcação: ' + e.message, 'error')
    }
  }

  const salvarEdicaoCapacidade = async () => {
    if (!modalEditDados) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('caiaques').update({
        capacidade: editCaiCap
      }).eq('id', modalEditDados.id)

      if (error) throw error

      setFrota(prev => prev.map(c => c.id === modalEditDados.id ? { ...c, capacidade: editCaiCap } : c))
      showToast('Capacidade atualizada!', 'success')
      setModalEditDados(null)
    } catch (e: any) {
      showToast('Erro ao atualizar capacidade: ' + e.message, 'error')
    }
  }

  const salvarEdicaoPreco = async () => {
    if (!modalEditPreco) return
    const vSem = parseFloat(editCaiSem.replace(',', '.')) || 0
    const vCom = parseFloat(editCaiCom.replace(',', '.')) || 0

    try {
      const supabase = createClient()
      const { error } = await supabase.from('caiaques').update({
        preco_sem_instrutor: vSem,
        preco_com_instrutor: vCom
      }).eq('id', modalEditPreco.id)

      if (error) throw error

      setFrota(prev => prev.map(c => c.id === modalEditPreco.id ? {
        ...c,
        preco_sem_instrutor: vSem,
        preco_com_instrutor: vCom
      } : c))
      showToast('Tarifas da embarcação atualizadas!', 'success')
      setModalEditPreco(null)
    } catch (e: any) {
      showToast('Erro ao atualizar preços: ' + e.message, 'error')
    }
  }

  const alternarStatusCaiaque = async (c: CaiaqueItem) => {
    try {
      const novoStatus = c.status === 'inoperante' ? null : 'inoperante'
      const supabase = createClient()

      const { error } = await supabase.from('caiaques').update({
        status: novoStatus
      }).eq('id', c.id)

      if (error) throw error

      setFrota(prev => prev.map(item => item.id === c.id ? { ...item, status: novoStatus } : item))
      showToast(novoStatus === 'inoperante' ? 'Embarcação pausada para manutenção.' : 'Embarcação reativada!', 'info')
    } catch (e: any) {
      showToast('Erro ao atualizar status: ' + e.message, 'error')
    }
  }

  const removerCaiaque = (id: string) => {
    setModalConfirmacao({
      msg: `Deseja realmente remover a embarcação #${id} da base?`,
      acao: async () => {
        try {
          const supabase = createClient()
          const { error } = await supabase.from('caiaques').delete().eq('id', id)
          if (error) throw error

          setFrota(prev => prev.filter(c => c.id !== id))
          showToast('Embarcação removida da base.')
          setModalConfirmacao(null)
        } catch (e: any) {
          showToast('Erro ao remover: ' + e.message, 'error')
        }
      }
    })
  }

  // HANDLERS: GUARDA-VOLUMES
  const adicionarLocker = async () => {
    const numLimpo = novoLockerNum.trim()
    if (!numLimpo) return showToast('Informe o número do guarda-volumes.', 'info')
    const idFormatado = numLimpo.padStart(2, '0')
    if (lockers.some(l => l.id === idFormatado)) return showToast('Já existe um guarda-volumes com esse número.', 'info')

    try {
      const supabase = createClient()
      const nomeFormatado = novoLockerNome.trim() || `Guarda-Volumes #${idFormatado}`

      const { error } = await supabase.from('lockers').insert({
        id: idFormatado,
        nome: nomeFormatado,
        status: 'Livre'
      })

      if (error) throw error

      const novo: LockerItem = { id: idFormatado, nome: nomeFormatado, status: 'Livre' }
      setLockers(prev => [...prev, novo].sort((a, b) => a.id.localeCompare(b.id)))
      setNovoLockerNum('')
      setNovoLockerNome('')
      showToast(`Guarda-volumes #${idFormatado} cadastrado!`, 'success')
    } catch (e: any) {
      showToast('Erro ao criar guarda-volumes: ' + e.message, 'error')
    }
  }

  const alternarStatusLocker = async (id: string) => {
    try {
      const locker = lockers.find(l => l.id === id)
      if (!locker) return

      const novoStatus = locker.status === 'Livre' ? 'Ocupado' : 'Livre'
      const supabase = createClient()

      const { error } = await supabase.from('lockers').update({
        status: novoStatus
      }).eq('id', id)

      if (error) throw error

      setLockers(prev => prev.map(l => l.id === id ? { ...l, status: novoStatus } : l))
    } catch (e: any) {
      showToast('Erro ao atualizar guarda-volumes: ' + e.message, 'error')
    }
  }

  const removerLocker = (id: string) => {
    setModalConfirmacao({
      msg: `Deseja realmente remover o guarda-volumes #${id}?`,
      acao: async () => {
        try {
          const supabase = createClient()
          const { error } = await supabase.from('lockers').delete().eq('id', id)
          if (error) throw error

          setLockers(prev => prev.filter(l => l.id !== id))
          showToast('Guarda-volumes removido com sucesso.')
          setModalConfirmacao(null)
        } catch (e: any) {
          showToast('Erro ao remover: ' + e.message, 'error')
        }
      }
    })
  }

  const getCapTexto = (cap: number) => {
    switch (cap) {
      case 1: return '1 PESSOA (SOLO / INDIVIDUAL)'
      case 2: return '2 PESSOAS (DUPLO)'
      case 3: return '3 PESSOAS (TRIPLO)'
      case 4: return '4 PESSOAS (FAMÍLIA - 4 LUGARES)'
      case 5: return '5 PESSOAS (FAMÍLIA - 5 LUGARES)'
      default: return `${cap} PESSOAS`
    }
  }

  return (
    <main className="max-w-md mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent">
      
      {/* TOAST NÁUTICO PLORIX COM ALTO CONTRASTE */}
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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CABEÇALHO NÁUTICO OFICIAL PRESERVADO COM BOTÕES QUADRADINHOS   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <header className="m-3 p-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl shadow-lg z-50 border-2 border-white/40 dark:border-white/10 transition-colors duration-300 shrink-0">
        <div className="flex justify-between items-center gap-2">
          
          {/* LADO ESQUERDO: LOGO + PAINEL ADMIN + STATUS DO SUPABASE */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img 
              src="/logo.png" 
              alt="Remoterapia" 
              className="w-11 h-11 object-contain drop-shadow-md shrink-0 select-none"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black uppercase text-white leading-none tracking-tight italic drop-shadow-sm truncate">
                PAINEL ADMIN
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-green-400 border border-white/60 shadow-[0_0_6px_rgba(74,222,128,0.9)] shrink-0 animate-pulse"></span>
                <p className="text-[10px] font-black text-blue-100 uppercase tracking-wider truncate">
                  OLÁ, ADMINISTRADOR
                </p>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: 3 BOTÕES QUADRADINHOS */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 1: TROCAR ÁREA */}
            <Link 
              href="/gestao/selecionar-area" 
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-2xl flex flex-col items-center justify-center transition-all border border-white/30 backdrop-blur-sm shadow-sm active:scale-95 shrink-0 select-none cursor-pointer text-center"
              title="Trocar de Área"
            >
              <span className="text-[7px] font-black uppercase leading-tight tracking-wider">TROCAR</span>
              <span className="text-[7px] font-black uppercase leading-tight tracking-wider">ÁREA</span>
            </Link>

            {/* 2: TEMA */}
            <ThemeToggle />

            {/* 3: SAIR */}
            <form action={logoutStaff} className="shrink-0 m-0 p-0 flex">
              <button 
                type="submit" 
                className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm border border-red-400 shadow-red-500/30 active:scale-95 shrink-0 cursor-pointer select-none"
                title="Sair do Sistema"
              >
                <span className="text-[8px] font-black uppercase tracking-wider leading-none">SAIR</span>
              </button>
            </form>
          </div>

        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (COM SCROLL INTERNO) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-36 no-scrollbar w-full min-h-0">
        
        {/* ============================================================== */}
        {/* 1. ABA USUÁRIOS (COM QUADRADINHOS CLÁSSICOS NA BANDEJA AZULADA)*/}
        {/* ============================================================== */}
        {tab === 'usuarios' && (
          <div className="space-y-4">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-4">
              
              <div className="text-center pb-1">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {editandoId ? '✏️ EDITAR ACESSO DO FUNCIONÁRIO' : 'ADICIONAR NOVO ACESSO'}
                </h4>
                <p className="text-[9.5px] font-bold text-slate-500 mt-0.5">Cadastre os funcionários e defina suas funções no sistema</p>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Nome Completo</label>
                <input 
                  type="text" 
                  value={formNome} 
                  onChange={e => setFormNome(e.target.value)} 
                  placeholder="Ex: Carlos Alberto da Silva" 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">E-mail de Acesso</label>
                  <input 
                    type="email" 
                    value={formEmail} 
                    onChange={e => setFormEmail(e.target.value)} 
                    placeholder="carlos@remoterapia.com.br" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">
                    {editandoId ? 'Nova Senha (opcional)' : 'Senha Provisória'}
                  </label>
                  <input 
                    type="password" 
                    value={formSenhaProvisoria} 
                    onChange={e => setFormSenhaProvisoria(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* BANDEJA SUAVE AZULADA COM OS QUADRADINHOS */}
              <div className="bg-[#eaf4fc] dark:bg-slate-800/70 border border-[#bae6fd] dark:border-blue-900/50 rounded-2xl p-4 space-y-2.5">
                <label className="text-[9px] font-black text-[#0369a1] dark:text-sky-400 uppercase tracking-wider block">
                  PAPÉIS (FUNÇÕES DE ACESSO)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'agua', label: 'Equipe Água' },
                    { id: 'areia', label: 'Equipe Areia' },
                    { id: 'portal', label: 'Eventos / Portal' },
                    { id: 'gestao', label: 'Gestão' }
                  ].map(r => (
                    <div 
                      key={r.id} 
                      onClick={() => toggleRole(r.id)} 
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <div className={`w-[18px] h-[18px] rounded-[6px] border-2 border-[#0284c7] flex items-center justify-center text-[11px] font-black transition-all ${
                        rolesSel.includes(r.id) ? 'bg-[#0284c7] text-white' : 'bg-white text-transparent'
                      }`}>✓</div>
                      <span className="text-[9.5px] font-black text-[#032b57] dark:text-slate-200 uppercase tracking-tight">{r.label}</span>
                    </div>
                  ))}
                  <div 
                    onClick={() => toggleRole('admin')} 
                    className="flex items-center gap-2 cursor-pointer select-none col-span-2 pt-1 border-t border-blue-200/60 dark:border-slate-700"
                  >
                    <div className={`w-[18px] h-[18px] rounded-[6px] border-2 border-[#0284c7] flex items-center justify-center text-[11px] font-black transition-all ${
                      rolesSel.includes('admin') ? 'bg-[#0284c7] text-white' : 'bg-white text-transparent'
                    }`}>✓</div>
                    <span className="text-[9.5px] font-black text-[#032b57] dark:text-slate-200 uppercase tracking-tight">TI (Admin)</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {editandoId && (
                  <button 
                    type="button" 
                    onClick={limparFormUsuario} 
                    className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase cursor-pointer"
                  >
                    CANCELAR
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={salvarUsuario} 
                  disabled={isPending}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  {editandoId ? 'SALVAR ALTERAÇÕES' : '+ CRIAR NOVO ACESSO'}
                </button>
              </div>

            </div>

            {/* LISTA DE USUÁRIOS ATIVOS */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-center">
                USUÁRIOS ATIVOS ({usuarios.length})
              </span>
              <div className="space-y-2">
                {usuarios.map(u => (
                  <div 
                    key={u.id} 
                    className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm border-l-4 !border-l-blue-600"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                        👤
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{u.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 truncate">{u.email}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {u.roles.map(r => (
                            <span key={r} className="text-[7.5px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => handleEditarUsuario(u)} 
                        className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs hover:bg-blue-50 transition-all cursor-pointer"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => setModalExcluirUsuario(u)} 
                        className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-xs hover:bg-red-100 transition-all cursor-pointer"
                        title="Remover"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. ABA FROTA & PREÇOS (VALORES ZERADOS E CAPACIDADE 1 A 5)     */}
        {/* ============================================================== */}
        {tab === 'frota' && (
          <div className="space-y-4">
            
            <div className="bg-[#f0fdf4] dark:bg-emerald-950/30 border border-dashed border-[#86efac] dark:border-emerald-800 rounded-2xl p-3 text-[10px] font-bold text-[#166534] dark:text-emerald-300 leading-snug flex items-start gap-2">
              <span className="text-sm">⚡</span>
              <div>
                <strong>Cálculo Automático na Recepção:</strong> Ao selecionar o caiaque no balcão de praia, o sistema identifica automaticamente as tarifas cadastradas aqui e multiplica pelos tripulantes e tempo escolhidos!
              </div>
            </div>

            {/* FORMULÁRIO DE CADASTRO */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-3.5">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider text-center">
                + CADASTRAR EMBARCAÇÃO & TARIFAS
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Identificação / ID</label>
                  <input 
                    type="text" 
                    value={caiId} 
                    onChange={e => setCaiId(e.target.value)} 
                    placeholder="Ex: 01 ou Pelican" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Capacidade Padrão</label>
                  <select 
                    value={caiCapacidade} 
                    onChange={e => setCaiCapacidade(Number(e.target.value))} 
                    className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all h-[42px]"
                  >
                    <option value={1}>1 Pessoa (Solo)</option>
                    <option value={2}>2 Pessoas (Duplo)</option>
                    <option value={3}>3 Pessoas (Triplo)</option>
                    <option value={4}>4 Pessoas (Família - 4)</option>
                    <option value={5}>5 Pessoas (Família - 5)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Sem Instrutor (R$/p/h)</label>
                  <input 
                    type="text" 
                    value={caiSem} 
                    onChange={e => setCaiSem(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Com Instrutor (R$/p/h)</label>
                  <input 
                    type="text" 
                    value={caiCom} 
                    onChange={e => setCaiCom(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button 
                type="button" 
                onClick={adicionarCaiaque} 
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                + SALVAR NA FROTA
              </button>
            </div>

            {/* LISTA DE EMBARCAÇÕES REAIS */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-center">
                EMBARCAÇÕES NA BASE ({frota.length})
              </span>

              <div className="space-y-2.5">
                {frota.length === 0 ? (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-8 rounded-3xl text-center border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs font-bold">
                    Nenhuma embarcação cadastrada na base.
                  </div>
                ) : (
                  frota.map(c => (
                    <div 
                      key={c.id} 
                      className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2.5 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                            #{c.id} · {getCapTexto(c.capacidade)}
                          </span>
                          <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase">{c.nome}</h5>
                        </div>
                        <span className={`text-[8.5px] font-black uppercase px-2.5 py-1 rounded-xl border ${
                          c.status === 'inoperante' 
                            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-900/50' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50'
                        }`}>
                          {c.status === 'inoperante' ? '🔴 Em Manutenção' : '🟢 Operacional'}
                        </span>
                      </div>

                      {/* FAIXA DE PREÇOS */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase block">Sem Instrutor:</span>
                          <span className="font-black text-blue-600 dark:text-sky-400">
                            R$ {c.preco_sem_instrutor.toFixed(2).replace('.', ',')} <span className="text-[8px] text-slate-400">/p/h</span>
                          </span>
                        </div>
                        <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700"></div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase block">Com Instrutor:</span>
                          <span className="font-black text-cyan-600 dark:text-cyan-400">
                            R$ {c.preco_com_instrutor.toFixed(2).replace('.', ',')} <span className="text-[8px] text-slate-400">/p/h</span>
                          </span>
                        </div>
                      </div>

                      {/* BOTÕES DE AÇÃO: DADOS vs PREÇO */}
                      <div className="flex gap-1.5 pt-1">
                        <button 
                          onClick={() => { setModalEditDados(c); setEditCaiCap(c.capacidade); }} 
                          className="flex-1 py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white rounded-xl text-[9.5px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>✏️</span> Capacidade
                        </button>
                        <button 
                          onClick={() => { 
                            setModalEditPreco(c); 
                            setEditCaiSem(c.preco_sem_instrutor.toFixed(2).replace('.', ',')); 
                            setEditCaiCom(c.preco_com_instrutor.toFixed(2).replace('.', ',')); 
                          }} 
                          className="flex-1 py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white rounded-xl text-[9.5px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>💲</span> Preço
                        </button>
                        <button 
                          onClick={() => alternarStatusCaiaque(c)} 
                          className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white rounded-xl text-[9.5px] font-black uppercase transition-all cursor-pointer"
                          title="Pausar/Reativar"
                        >
                          <span>⏸️</span>
                        </button>
                        <button 
                          onClick={() => removerCaiaque(c.id)} 
                          className="py-2 px-3 bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[9.5px] font-black uppercase transition-all cursor-pointer"
                          title="Excluir"
                        >
                          <span>🗑️</span>
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* 3. ABA GUARDA-VOLUMES (COM BOTÃO DE EXCLUSÃO 🗑️)              */}
        {/* ============================================================== */}
        {tab === 'lockers' && (
          <div className="space-y-4">
            
            {/* CADASTRO DE GUARDA-VOLUMES */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-3.5">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider text-center">
                + CADASTRAR GUARDA-VOLUMES
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Número</label>
                  <input 
                    type="text" 
                    value={novoLockerNum} 
                    onChange={e => setNovoLockerNum(e.target.value)} 
                    placeholder="Ex: 01" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Identificação</label>
                  <input 
                    type="text" 
                    value={novoLockerNome} 
                    onChange={e => setNovoLockerNome(e.target.value)} 
                    placeholder="Ex: Armário Recepção" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button 
                type="button" 
                onClick={adicionarLocker} 
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                + CADASTRAR GUARDA-VOLUMES
              </button>
            </div>

            {/* LISTA DE GUARDA-VOLUMES COM STATUS E BOTÃO DE EXCLUSÃO 🗑️ */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-center">
                GUARDA-VOLUMES CADASTRADOS ({lockers.length})
              </span>

              <div className="space-y-2">
                {lockers.length === 0 ? (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-8 rounded-3xl text-center border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs font-bold">
                    Nenhum guarda-volumes cadastrado.
                  </div>
                ) : (
                  lockers.map(l => (
                    <div 
                      key={l.id} 
                      className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔐</span>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase">GUARDA-VOLUMES #{l.id}</p>
                          <p className="text-[10px] font-bold text-slate-500">{l.nome}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => alternarStatusLocker(l.id)} 
                          className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
                            l.status === 'Livre' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 hover:bg-emerald-100' 
                              : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-900/50 hover:bg-red-100'
                          }`}
                        >
                          {l.status === 'Livre' ? '🟢 Livre' : '🔴 Ocupado'}
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => removerLocker(l.id)} 
                          className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-xs hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                          title="Remover Guarda-Volumes"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* 4. ABA AUDITORIA (SEM SOS, SEM COMUNICADO GLOBAL)              */}
        {/* ============================================================== */}
        {tab === 'auditoria' && (
          <div className="space-y-4">
            
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    REGISTRO DE AUDITORIA
                  </h4>
                  <p className="text-[9.5px] font-bold text-slate-500">Histórico de ações e operações na base náutica</p>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                  {auditoria.length} registros
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto no-scrollbar">
                {auditoria.length === 0 ? (
                  <p className="py-8 text-center text-[11px] font-bold text-slate-400 uppercase">
                    Nenhum registro de auditoria no momento.
                  </p>
                ) : (
                  auditoria.map((item, i) => (
                    <div key={i} className="py-3 flex justify-between items-center gap-3">
                      <span className="text-[9px] font-black text-slate-400 whitespace-nowrap shrink-0">
                        {new Date(item.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 text-right leading-tight">
                        {item.acao}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: EDITAR CAPACIDADE (FOCADO DE 1 A 5 PESSOAS)           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {modalEditDados && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-blue-600 rounded-[2rem] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase">✏️ EDITAR CAPACIDADE</h3>
              <button onClick={() => setModalEditDados(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Embarcação</label>
              <input 
                type="text" 
                value={modalEditDados.nome} 
                disabled 
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Capacidade de Lotação (1 a 5)</label>
              <select 
                value={editCaiCap} 
                onChange={e => setEditCaiCap(Number(e.target.value))} 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value={1}>1 Pessoa (Solo / Individual)</option>
                <option value={2}>2 Pessoas (Duplo)</option>
                <option value={3}>3 Pessoas (Triplo)</option>
                <option value={4}>4 Pessoas (Família - 4 Lugares)</option>
                <option value={5}>5 Pessoas (Família - 5 Lugares)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setModalEditDados(null)} 
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              >
                ✕ CANCELAR
              </button>
              <button 
                type="button" 
                onClick={salvarEdicaoCapacidade} 
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              >
                💾 SALVAR DADOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: EDITAR PREÇO (SEM +5/-5, CAMPOS LIMPOS E DIRETOS)     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {modalEditPreco && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-cyan-600 rounded-[2rem] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase">💲 AJUSTAR TARIFAS DA EMBARCAÇÃO</h3>
              <button onClick={() => setModalEditPreco(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-slate-700 space-y-1">
              <label className="text-[9px] font-black text-blue-600 dark:text-sky-400 uppercase block">
                SEM INSTRUTOR (R$/PESSOA/H)
              </label>
              <input 
                type="text" 
                value={editCaiSem} 
                onChange={e => setEditCaiSem(e.target.value)} 
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-black text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="p-3 bg-cyan-50 dark:bg-slate-800/80 rounded-xl border border-cyan-200 dark:border-slate-700 space-y-1">
              <label className="text-[9px] font-black text-cyan-700 dark:text-cyan-400 uppercase block">
                COM INSTRUTOR (R$/PESSOA/H)
              </label>
              <input 
                type="text" 
                value={editCaiCom} 
                onChange={e => setEditCaiCom(e.target.value)} 
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-black text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setModalEditPreco(null)} 
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer"
              >
                ✕ CANCELAR
              </button>
              <button 
                type="button" 
                onClick={salvarEdicaoPreco} 
                className="flex-1 py-3 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              >
                💾 SALVAR PREÇOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE USUÁRIO */}
      {modalExcluirUsuario && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-red-500 rounded-[2rem] shadow-2xl space-y-3">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">CONFIRMAÇÃO DE EXCLUSÃO</p>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">REMOVER ACESSO</h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Deseja realmente excluir o acesso do funcionário <strong>{modalExcluirUsuario.name}</strong> ({modalExcluirUsuario.email})?
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalExcluirUsuario(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase cursor-pointer">CANCELAR</button>
              <button type="button" onClick={confirmarExcluirUsuario} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer">EXCLUIR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO GENÉRICA (FROTA, GUARDA-VOLUMES) */}
      {modalConfirmacao && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-red-500 rounded-[2rem] shadow-2xl space-y-3">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">CONFIRMAÇÃO DE EXCLUSÃO</p>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">REMOVER ITEM</h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {modalConfirmacao.msg}
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalConfirmacao(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase cursor-pointer">CANCELAR</button>
              <button type="button" onClick={modalConfirmacao.acao} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer">EXCLUIR</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BARRA INFERIOR FLUTUANTE OFICIAL COM AS 4 ABAS DO ADMIN        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AppBottomNav 
        items={[
          { label: 'USUÁRIOS', icon: '👤', active: tab === 'usuarios', onClick: () => setTab('usuarios') },
          { label: 'FROTA & PREÇOS', icon: '🛶', active: tab === 'frota', onClick: () => setTab('frota') },
          { label: 'GUARDA-VOLUMES', icon: '🔐', active: tab === 'lockers', onClick: () => setTab('lockers') },
          { label: 'AUDITORIA', icon: '📝', active: tab === 'auditoria', onClick: () => setTab('auditoria') },
        ]}
      />
    </main>
  )
}
