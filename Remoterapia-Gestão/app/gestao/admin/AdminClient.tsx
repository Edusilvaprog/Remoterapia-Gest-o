'use client'

import {WorkspaceHeading,WorkspaceMetric,WorkspacePanel,WorkspaceEmpty,WorkspaceNote} from '@/components/desktop/DesktopWorkspace'
import BrandLabel from '@/components/ui/BrandLabel'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import VisualLabel from '@/components/ui/VisualLabel'
import AppBottomNav from '@/components/AppBottomNav'
import { criarStaff, definirAcessoStaff } from '@/lib/actions/auth'
import DesktopStaffTable from '@/components/desktop/DesktopStaffTable'
import {VisualText,VisualContentSlot} from '@/components/ui/VisualContent'


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
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [erroCarga, setErroCarga] = useState('')
  const carregarDados = async () => {
    setCarregandoDados(true); setErroCarga('')
    try {
      const supabase = createClient()

      // Usuários
      const allowedRoles = ['admin', 'dona', 'instrutor', 'recepcao', 'guardaria']
      const { data: uData, error: uError } = await supabase
        .from('perfis_staff')
        .select('*')
        .in('role', allowedRoles)
        .order('nome')
      if (uError) throw new Error('Falha ao consultar a equipe.')
      if (uData) {
        setUsuarios(uData.map((u: any) => ({
          id: u.id,
          name: u.nome || 'Funcionário',
          email: u.email || '',
          roles: [...new Set([u.role, ...(Array.isArray(u.roles) ? u.roles : [])])].filter(role => allowedRoles.includes(role)),
          ativo: u.ativo !== false
        })))
      }

      // Frota de Caiaques
      const { data: fData, error: fError } = await supabase.from('caiaques').select('*').order('id')
      if (fError) throw new Error('Falha ao consultar frota.')
      if (fData) {
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
      const { data: lData, error: lError } = await supabase.from('lockers').select('*').order('id')
      if (lError) throw new Error('Falha ao consultar lockers.')
      if (lData) {
        setLockers(lData.map((l: any) => ({
          id: String(l.id),
          nome: l.nome || `Guarda-Volumes #${l.id}`,
          status: l.status === 'Ocupado' ? 'Ocupado' : 'Livre'
        })))
      }

      // Auditoria
      const { data: aData, error: aError } = await supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(40)
      if (aError) throw new Error('Falha ao consultar auditoria.')
      if (aData) {
        setAuditoria(aData.map((a: any) => ({
          hora: a.created_at || new Date().toISOString(),
          acao: a.acao || 'Operação registrada'
        })))
      }
    } catch (e: any) {
      setErroCarga('Não foi possível carregar todos os dados administrativos. Tente atualizar.')
    } finally { setCarregandoDados(false) }
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
    if (!editandoId && (!formSenhaProvisoria || formSenhaProvisoria.length < 12 || formSenhaProvisoria.length > 128)) {
      return showToast('Defina uma senha provisória de 12 a 128 caracteres para o primeiro acesso.', 'info')
    }
    if (rolesSel.length === 0) return showToast('Selecione ao menos uma função/papel para o funcionário.', 'warning')

    startTransition(async () => {
      try {
        const supabase = createClient()
        const rolePrincipal = rolesSel.includes('admin') ? 'admin' : rolesSel.includes('dona') ? 'dona' : rolesSel[0]

        if (editandoId) {
          const { data: saved, error } = await supabase.from('perfis_staff').update({
            nome: formNome.trim(),
            email: formEmail.toLowerCase().trim(),
            role: rolePrincipal,
            roles: rolesSel
          }).eq('id', editandoId).select('id').maybeSingle()

          if (error || !saved) throw new Error('Alteração não confirmada.')

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
            const {data: savedRoles,error: rolesError}=await supabase.from('perfis_staff').update({ roles: rolesSel }).eq('id', res.data.id).select('id').maybeSingle()
            if(rolesError||!savedRoles)throw new Error('Conta criada, mas os acessos adicionais não foram confirmados. Atualize a lista e revise o cadastro.')
          }

          const novo: UsuarioItem = {
            id: res.data!.id,
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
    const result = await definirAcessoStaff(modalExcluirUsuario.id, false)
    if (!result.ok) return showToast(result.error || 'Acesso não atualizado.', 'error')
    setUsuarios(prev => prev.map(u => u.id === modalExcluirUsuario.id ? { ...u, ativo: false } : u))
    showToast('Acesso à Gestão desativado. O cadastro e o histórico foram preservados.')
    setModalExcluirUsuario(null)
  }
  const alternarAcesso = async (u: UsuarioItem) => {
    if (u.ativo !== false) return setModalExcluirUsuario(u)
    const result = await definirAcessoStaff(u.id, true)
    if (!result.ok) return showToast(result.error || 'Acesso não atualizado.', 'error')
    setUsuarios(prev => prev.map(item => item.id === u.id ? { ...item, ativo: true } : item))
    showToast('Acesso à Gestão reativado.')
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
    <main className="max-w-md lg:max-w-7xl mx-auto flex-1 flex flex-col h-screen overflow-hidden w-full relative min-h-0 bg-transparent dw-admin rt-base-admin" data-rt-area="area-997d948784a2"><div className="dw-only"><WorkspaceHeading eyebrow="Administração da base" title="Equipe e equipamentos" description="Organize os acessos da equipe, a frota, as tarifas e os guarda-volumes."/></div><div className="dw-only">{carregandoDados&&<p className="dw-operation-info" role="status"><VisualText id="copy-2be53fa50253" defaultText={"Carregando administração…"}/></p>}{erroCarga&&<div role="alert" className="rt-error-note">{erroCarga}<button type="button" onClick={carregarDados}><VisualText id="copy-d246484a1a27" defaultText={"Atualizar dados"}/></button></div>}</div>
      
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
                <BrandLabel text={toast.tipo === 'success' ? '✅' : toast.tipo === 'warning' ? '⚠️' : toast.tipo === 'error' ? '❌' : '🛶'}/>
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
      <section className="rt-mobile-area-heading"><h1><VisualLabel text="Painel administrativo"/></h1><p><VisualLabel text="Organize a equipe, os equipamentos e os planos da base."/></p>{carregandoDados&&<p role="status"><VisualText id="copy-ee8490cadd41" defaultText={"Carregando dados…"}/></p>}{erroCarga&&<div role="alert">{erroCarga}<button type="button" onClick={carregarDados}><VisualText id="copy-61c676d8a15e" defaultText={"Atualizar dados"}/></button></div>}</section>
      <section className="rt-base-metrics rt-base-four-metrics rt-base-admin-summary" data-rt-area="area-b6c408c4a001" aria-label="Resumo da administração">
       <article><span><VisualText id="copy-b6c408c4a002" defaultText="Usuários ativos"/></span><strong>{carregandoDados||erroCarga?'—':usuarios.filter(u=>u.ativo!==false).length}</strong></article>
       <article><span><VisualText id="copy-b6c408c4a003" defaultText="Embarcações"/></span><strong>{carregandoDados||erroCarga?'—':frota.length}</strong></article>
       <article><span><VisualText id="copy-b6c408c4a004" defaultText="Guarda-volumes"/></span><strong>{carregandoDados||erroCarga?'—':lockers.length}</strong></article>
       <article><span><VisualText id="copy-b6c408c4a005" defaultText="Registros de auditoria"/></span><strong>{carregandoDados||erroCarga?'—':auditoria.length}</strong></article><VisualContentSlot id="area-b6c408c4a001"/>
      </section>
      <nav className="rt-base-management-sections rt-base-desktop" aria-label="Seções da administração">{[{id:'usuarios',label:'Usuários',copy:'copy-558cc1ffd2af'},{id:'frota',label:'Frota e preços',copy:'copy-18274b7d5cde'},{id:'lockers',label:'Guarda-volumes',copy:'copy-4f4bccf3777e'},{id:'auditoria',label:'Auditoria',copy:'copy-958980b31298'}].map(section=><button key={section.id} type="button" aria-pressed={tab===section.id} onClick={()=>setTab(section.id as typeof tab)}><VisualText id={section.copy} defaultText={section.label}/></button>)}</nav>


      {/* CONTEÚDO PRINCIPAL (COM SCROLL INTERNO) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-36 no-scrollbar w-full min-h-0">
        
        {/* ============================================================== */}
        {/* 1. ABA USUÁRIOS (COM QUADRADINHOS CLÁSSICOS NA BANDEJA AZULADA)*/}
        {/* ============================================================== */}
        {tab === 'usuarios' && (
          <div className="rt-admin-users space-y-4 dw-split">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-4 dw-editor" data-rt-area="area-d5061b15404d">
              
              <div className="text-center pb-1">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  <BrandLabel text={editandoId ? '✏️ EDITAR ACESSO DO FUNCIONÁRIO' : 'Adicionar novo acesso'}/>
                </h4>
                <p className="text-[9.5px] font-bold text-slate-500 mt-0.5"><VisualText id="copy-3c12df2cadd0" defaultText={"Cadastre os funcionários e defina suas funções no sistema"}/></p>
              </div>

              <div>
                <label htmlFor="rt-adminclient-1" className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-a88d72fb387a" defaultText={"Nome Completo"}/></label>
                <input id="rt-adminclient-1" 
                  type="text" 
                  value={formNome} 
                  onChange={e => setFormNome(e.target.value)} 
                  placeholder="Ex: Carlos Alberto da Silva" 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rt-adminclient-2" className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-0297f1c9573f" defaultText={"E-mail de Acesso"}/></label>
                  <input id="rt-adminclient-2" 
                    type="email" 
                    value={formEmail} 
                    onChange={e => setFormEmail(e.target.value)} 
                    placeholder="carlos@remoterapia.com.br" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="rt-adminclient-3" className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider">
                    {editandoId ? 'Senha: use recuperação de acesso' : 'Senha Provisória'}
                  </label>
                  <input id="rt-adminclient-3" 
                    type="password" autoComplete="new-password"
                    value={formSenhaProvisoria} 
                    onChange={e => setFormSenhaProvisoria(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* BANDEJA SUAVE AZULADA COM OS QUADRADINHOS */}
              <div className="bg-[#eaf4fc] dark:bg-slate-800/70 border border-[#bae6fd] dark:border-blue-900/50 rounded-2xl p-4 space-y-2.5">
                <label className="text-[9px] font-black text-[#0369a1] dark:text-sky-400 uppercase tracking-wider block"><VisualText id="copy-edd1171f3d44" defaultText={"Funções de acesso"}/></label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'instrutor', label: 'Equipe Água' },
                    { id: 'recepcao', label: 'Recepção / Areia' },
                    { id: 'guardaria', label: 'Guardaria' },
                    { id: 'dona', label: 'Direção' }
                  ].map(r => (
                    <label key={r.id} className="dw-role"><input type="checkbox" checked={rolesSel.includes(r.id)} onChange={()=>toggleRole(r.id)}/><span>{r.label}</span></label>
                  ))}
                  <label className="dw-role"><input type="checkbox" checked={rolesSel.includes('admin')} onChange={()=>toggleRole('admin')}/><span><VisualText id="copy-19582e9c48d4" defaultText={"TI (Admin)"}/></span></label>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {editandoId && (
                  <button 
                    type="button" 
                    onClick={limparFormUsuario} 
                    className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase cursor-pointer"
                  ><VisualText id="copy-cd0a176229c6" defaultText={"CANCELAR"}/></button>
                )}
                <button 
                  type="button" 
                  onClick={salvarUsuario} 
                  disabled={isPending}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <VisualLabel text={editandoId ? 'SALVAR ALTERAÇÕES' : '+ CRIAR NOVO ACESSO'}/>
                </button>
              </div>

            <VisualContentSlot id="area-d5061b15404d"/></div>

            <div className="dw-only"><DesktopStaffTable users={usuarios} onEdit={handleEditarUsuario} onToggle={alternarAcesso}/></div>
            {/* LISTA DE USUÁRIOS ATIVOS */}
            <div className="rt-mobile-user-list space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-center"><VisualText id="copy-07059a268fc3" defaultText={"USUÁRIOS ATIVOS ("}/>{usuarios.length})
              </span>
              <div className="space-y-2">
                {usuarios.map(u => (
                  <div 
                    key={u.id} 
                    className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm border-l-4 !border-l-blue-600"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                        <BrandIcon name="user"/>
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
                        <BrandIcon name="edit"/>
                      </button>
                      <button 
                        onClick={() => alternarAcesso(u)} 
                        className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-xs hover:bg-red-100 transition-all cursor-pointer"
                        title="Remover"
                      >
                        <BrandIcon name="trash"/>
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
          <div className="rt-admin-frota space-y-4 dw-split"><div className="dw-only"><WorkspacePanel title="Frota e tarifas" description="Valores por pessoa e por hora. Edite a capacidade ou os preços de cada embarcação."><div className="dw-table-scroll"><table className="dw-table"><thead><tr><th><VisualText id="copy-9aeefb03edfb" defaultText={"Embarcação"}/></th><th><VisualText id="copy-30a3c201ee87" defaultText={"Capacidade"}/></th><th><VisualText id="copy-b86ad552f0d3" defaultText={"Sem instrutor"}/></th><th><VisualText id="copy-ed0ade7d6ee4" defaultText={"Com instrutor"}/></th><th><VisualText id="copy-43268b5daa0d" defaultText={"Situação"}/></th><th><VisualText id="copy-30a19b6c7a9f" defaultText={"Ações"}/></th></tr></thead><tbody>{frota.map(c=><tr key={c.id}><td><strong>{c.nome}</strong><small><VisualText id="copy-ddc4a2903a38" defaultText={"Identificação "}/>{c.id}</small></td><td>{getCapTexto(c.capacidade)}</td><td>R$ {c.preco_sem_instrutor.toFixed(2).replace('.',',')}</td><td>R$ {c.preco_com_instrutor.toFixed(2).replace('.',',')}</td><td><span className={'dw-badge '+(c.status==='inoperante'?'is-warn':'is-good')}><VisualLabel text={c.status==='inoperante'?'Manutenção':'Operacional'}/></span></td><td><div className="dw-actions"><button type="button" onClick={()=>{setModalEditDados(c);setEditCaiCap(c.capacidade)}} ><BrandIcon name="users" size={15}/><VisualText id="copy-45bc5fe3d74c" defaultText={"Capacidade"}/></button><button type="button" onClick={()=>{setModalEditPreco(c);setEditCaiSem(c.preco_sem_instrutor.toFixed(2).replace('.',','));setEditCaiCom(c.preco_com_instrutor.toFixed(2).replace('.',','))}} ><BrandIcon name="wallet" size={15}/><VisualText id="copy-b772ce23705f" defaultText={"Preços"}/></button><button type="button" onClick={()=>alternarStatusCaiaque(c)} ><BrandIcon name="refresh" size={15}/><VisualLabel text={c.status==='inoperante'?'Reativar':'Pausar'}/></button><button type="button" onClick={()=>removerCaiaque(c.id)} aria-label={'Excluir '+c.nome} className="dw-danger"><BrandIcon name="trash" size={15}/></button></div></td></tr>)}</tbody></table></div>{!frota.length&&<WorkspaceEmpty title="Nenhum registro nesta seleção"/>}</WorkspacePanel></div>
            
            <div className="dw-mobile"><div className="bg-[#f0fdf4] dark:bg-emerald-950/30 border border-dashed border-[#86efac] dark:border-emerald-800 rounded-2xl p-3 text-[10px] font-bold text-[#166534] dark:text-emerald-300 leading-snug flex items-start gap-2">
              <span className="text-sm">⚡</span>
              <div>
                <strong><VisualText id="copy-17d3e5ca0d15" defaultText={"Cálculo Automático na Recepção:"}/></strong> Ao selecionar o caiaque no balcão de praia, o sistema identifica automaticamente as tarifas cadastradas aqui e multiplica pelos tripulantes e tempo escolhidos!
              </div>
            </div></div>

            {/* FORMULÁRIO DE CADASTRO */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-3.5 dw-editor" data-rt-area="area-b2d49c508066">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider text-center"><VisualText id="copy-31d056ceba8f" defaultText={"Cadastrar embarcação e tarifas"}/></h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rt-adminclient-4" className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-596acca6d330" defaultText={"Identificação / ID"}/></label>
                  <input id="rt-adminclient-4" 
                    type="text" 
                    value={caiId} 
                    onChange={e => setCaiId(e.target.value)} 
                    placeholder="Ex: 01 ou Pelican" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="rt-adminclient-5" className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-080c3fc628f3" defaultText={"Capacidade Padrão"}/></label>
                  <select id="rt-adminclient-5" 
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
                  <label htmlFor="rt-adminclient-6" className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-e608ec07c138" defaultText={"Sem Instrutor (R$/p/h)"}/></label>
                  <input id="rt-adminclient-6" 
                    type="text" 
                    value={caiSem} 
                    onChange={e => setCaiSem(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="rt-adminclient-7" className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-fa54e4156b68" defaultText={"Com Instrutor (R$/p/h)"}/></label>
                  <input id="rt-adminclient-7" 
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
              ><VisualText id="copy-bf63c9a69779" defaultText={"Salvar na frota"}/></button>
            <VisualContentSlot id="area-b2d49c508066"/></div>

            {/* LISTA DE EMBARCAÇÕES REAIS */}
            <div className="dw-mobile"><div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-center"><VisualText id="copy-3281271713b3" defaultText={"EMBARCAÇÕES NA BASE ("}/>{frota.length})
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
                          <BrandLabel text={c.status === 'inoperante' ? '🔴 Em Manutenção' : '🟢 Operacional'}/>
                        </span>
                      </div>

                      {/* FAIXA DE PREÇOS */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase block"><VisualText id="copy-87a913016fd5" defaultText={"Sem Instrutor:"}/></span>
                          <span className="font-black text-blue-600 dark:text-sky-400">
                            R$ {c.preco_sem_instrutor.toFixed(2).replace('.', ',')} <span className="text-[8px] text-slate-400"><VisualText id="copy-c09fccb4f1f2" defaultText={"/p/h"}/></span>
                          </span>
                        </div>
                        <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700"></div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase block"><VisualText id="copy-1a006623b284" defaultText={"Com Instrutor:"}/></span>
                          <span className="font-black text-cyan-600 dark:text-cyan-400">
                            R$ {c.preco_com_instrutor.toFixed(2).replace('.', ',')} <span className="text-[8px] text-slate-400"><VisualText id="copy-e70fdb8b77e2" defaultText={"/p/h"}/></span>
                          </span>
                        </div>
                      </div>

                      {/* BOTÕES DE AÇÃO: DADOS vs PREÇO */}
                      <div className="flex gap-1.5 pt-1">
                        <button 
                          onClick={() => { setModalEditDados(c); setEditCaiCap(c.capacidade); }} 
                          className="flex-1 py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white rounded-xl text-[9.5px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span><BrandIcon name="edit"/></span><VisualText id="copy-d1d2467b35da" defaultText={" Capacidade"}/></button>
                        <button 
                          onClick={() => { 
                            setModalEditPreco(c); 
                            setEditCaiSem(c.preco_sem_instrutor.toFixed(2).replace('.', ',')); 
                            setEditCaiCom(c.preco_com_instrutor.toFixed(2).replace('.', ',')); 
                          }} 
                          className="flex-1 py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white rounded-xl text-[9.5px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span><BrandIcon name="wallet"/></span><VisualText id="copy-aade0a0bcb60" defaultText={" Preço"}/></button>
                        <button 
                          onClick={() => alternarStatusCaiaque(c)} 
                          className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white rounded-xl text-[9.5px] font-black uppercase transition-all cursor-pointer"
                          title="Pausar/Reativar"
                        >
                          <span><BrandIcon name="pause"/></span>
                        </button>
                        <button 
                          onClick={() => removerCaiaque(c.id)} 
                          className="py-2 px-3 bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[9.5px] font-black uppercase transition-all cursor-pointer"
                          title="Excluir"
                        >
                          <span><BrandIcon name="trash"/></span>
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div></div>

          </div>
        )}

        {/* ============================================================== */}
        {/* 3. ABA GUARDA-VOLUMES (COM BOTÃO DE EXCLUSÃO 🗑️)              */}
        {/* ============================================================== */}
        {tab === 'lockers' && (
          <div className="rt-admin-lockers space-y-4 dw-split"><div className="dw-only"><WorkspacePanel title="Guarda-volumes" description="Consulte a disponibilidade e gerencie os armários da base."><div className="dw-table-scroll"><table className="dw-table"><thead><tr><th><VisualText id="copy-ba3f535e73b6" defaultText={"Identificação"}/></th><th><VisualText id="copy-d14696d849d5" defaultText={"Descrição"}/></th><th><VisualText id="copy-f2feecd318c7" defaultText={"Disponibilidade"}/></th><th><VisualText id="copy-fe58ebac1aff" defaultText={"Ações"}/></th></tr></thead><tbody>{lockers.map(l=><tr key={l.id}><td><strong><VisualText id="copy-5608b4b9e3de" defaultText={"Guarda-volumes #"}/>{l.id}</strong></td><td>{l.nome}</td><td><span className={'dw-badge '+(l.status==='Livre'?'is-good':'is-warn')}>{l.status}</span></td><td><div className="dw-actions"><button type="button" onClick={()=>alternarStatusLocker(l.id)} ><BrandIcon name="key" size={15}/><VisualLabel text={l.status==='Livre'?'Marcar ocupado':'Marcar livre'}/></button><button type="button" onClick={()=>removerLocker(l.id)} className="dw-danger"><BrandIcon name="trash" size={15}/><VisualText id="copy-bf3ca0469b14" defaultText={"Remover"}/></button></div></td></tr>)}</tbody></table></div>{!lockers.length&&<WorkspaceEmpty title="Nenhum registro nesta seleção"/>}</WorkspacePanel></div>
            
            {/* CADASTRO DE GUARDA-VOLUMES */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-3.5 dw-editor" data-rt-area="area-67d256cc3728">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider text-center"><VisualText id="copy-f2760eef9aee" defaultText={"Cadastrar guarda-volumes"}/></h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rt-adminclient-8" className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-bf060f916d95" defaultText={"Número"}/></label>
                  <input id="rt-adminclient-8" 
                    type="text" 
                    value={novoLockerNum} 
                    onChange={e => setNovoLockerNum(e.target.value)} 
                    placeholder="Ex: 01" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="rt-adminclient-9" className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block tracking-wider"><VisualText id="copy-30c5d398f5ee" defaultText={"Identificação"}/></label>
                  <input id="rt-adminclient-9" 
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
              ><VisualText id="copy-fce8b5868a0d" defaultText={"Cadastrar guarda-volumes"}/></button>
            <VisualContentSlot id="area-67d256cc3728"/></div>

            {/* LISTA DE GUARDA-VOLUMES COM STATUS E BOTÃO DE EXCLUSÃO 🗑️ */}
            <div className="dw-mobile"><div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-center"><VisualText id="copy-35bd3daf11d9" defaultText={"GUARDA-VOLUMES CADASTRADOS ("}/>{lockers.length})
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
                        <span className="text-xl"><BrandIcon name="key"/></span>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-b0decbdddab8" defaultText={"GUARDA-VOLUMES #"}/>{l.id}</p>
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
                          <BrandLabel text={l.status === 'Livre' ? '🟢 Livre' : '🔴 Ocupado'}/>
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => removerLocker(l.id)} 
                          className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-xs hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                          title="Remover Guarda-Volumes"
                        >
                          <BrandIcon name="trash"/>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div></div>

          </div>
        )}

        {/* ============================================================== */}
        {/* 4. ABA AUDITORIA (SEM SOS, SEM COMUNICADO GLOBAL)              */}
        {/* ============================================================== */}
        {tab === 'auditoria' && (
          <div className="rt-admin-auditoria space-y-4"><div className="dw-only"><div className="dw-admin-audit"><WorkspacePanel title="Histórico de atividades" description="Registros carregados pela administração"><div className="dw-table-scroll"><table className="dw-table"><thead><tr><th><VisualText id="copy-eed0b6c6a66d" defaultText={"Data e hora"}/></th><th><VisualText id="copy-4ca7b97dd0e2" defaultText={"Atividade"}/></th></tr></thead><tbody>{auditoria.map((a,i)=><tr key={i}><td>{new Date(a.hora).toLocaleString('pt-BR')}</td><td>{a.acao}</td></tr>)}</tbody></table></div>{!auditoria.length&&<WorkspaceEmpty title="Nenhuma atividade registrada"/>}</WorkspacePanel><WorkspaceNote title="Rastreabilidade da base"><p><VisualText id="copy-a80bdd62f95e" defaultText={"Consulte o histórico para acompanhar as ações registradas pela equipe."}/></p><p><VisualText id="copy-83e0ccd966b0" defaultText={"Este painel apresenta os registros existentes, sem alterar os dados da operação."}/></p></WorkspaceNote></div></div>
            
            <div className="dw-mobile"><div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/5 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider"><VisualText id="copy-9e696ac69ef4" defaultText={"REGISTRO DE AUDITORIA"}/></h4>
                  <p className="text-[9.5px] font-bold text-slate-500"><VisualText id="copy-cb8ba1d1d993" defaultText={"Histórico de ações e operações na base náutica"}/></p>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                  {auditoria.length}<VisualText id="copy-77af6dba6443" defaultText={" registros"}/></span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto no-scrollbar">
                {auditoria.length === 0 ? (
                  <p className="py-8 text-center text-[11px] font-bold text-slate-400 uppercase"><VisualText id="copy-4d4a030fe60d" defaultText={"Nenhum registro de auditoria no momento."}/></p>
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
            </div></div>

          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: EDITAR CAPACIDADE (FOCADO DE 1 A 5 PESSOAS)           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {modalEditDados && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-blue-600 rounded-[2rem] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase"><BrandIcon name="edit"/><VisualText id="copy-7d16dd9a8438" defaultText={" EDITAR CAPACIDADE"}/></h3>
              <button aria-label="Fechar janela" onClick={() => setModalEditDados(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div>
              <label htmlFor="rt-adminclient-10" className="text-[9px] font-black text-slate-400 uppercase block mb-1"><VisualText id="copy-f6a39f840eea" defaultText={"Embarcação"}/></label>
              <input id="rt-adminclient-10" 
                type="text" 
                value={modalEditDados.nome} 
                disabled 
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="rt-adminclient-11" className="text-[9px] font-black text-slate-400 uppercase block mb-1"><VisualText id="copy-8122d288e7d2" defaultText={"Capacidade de Lotação (1 a 5)"}/></label>
              <select id="rt-adminclient-11" 
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
              ><VisualText id="copy-2d90234223ab" defaultText={"✕ CANCELAR"}/></button>
              <button 
                type="button" 
                onClick={salvarEdicaoCapacidade} 
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              >
                <BrandIcon name="save"/><VisualText id="copy-e17b6003efcd" defaultText={" SALVAR DADOS"}/></button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: EDITAR PREÇO (SEM +5/-5, CAMPOS LIMPOS E DIRETOS)     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {modalEditPreco && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-cyan-600 rounded-[2rem] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-317edbe23f24" defaultText={"💲 AJUSTAR TARIFAS DA EMBARCAÇÃO"}/></h3>
              <button aria-label="Fechar janela" onClick={() => setModalEditPreco(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-slate-700 space-y-1">
              <label htmlFor="rt-adminclient-12" className="text-[9px] font-black text-blue-600 dark:text-sky-400 uppercase block"><VisualText id="copy-bd3328e12ada" defaultText={"SEM INSTRUTOR (R$/PESSOA/H)"}/></label>
              <input id="rt-adminclient-12" 
                type="text" 
                value={editCaiSem} 
                onChange={e => setEditCaiSem(e.target.value)} 
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-black text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="p-3 bg-cyan-50 dark:bg-slate-800/80 rounded-xl border border-cyan-200 dark:border-slate-700 space-y-1">
              <label htmlFor="rt-adminclient-13" className="text-[9px] font-black text-cyan-700 dark:text-cyan-400 uppercase block"><VisualText id="copy-2f112f5d626e" defaultText={"COM INSTRUTOR (R$/PESSOA/H)"}/></label>
              <input id="rt-adminclient-13" 
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
              ><VisualText id="copy-f198e8383240" defaultText={"✕ CANCELAR"}/></button>
              <button 
                type="button" 
                onClick={salvarEdicaoPreco} 
                className="flex-1 py-3 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"
              >
                <BrandIcon name="save"/><VisualText id="copy-22501d471743" defaultText={" SALVAR PREÇOS"}/></button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE USUÁRIO */}
      {modalExcluirUsuario && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-red-500 rounded-[2rem] shadow-2xl space-y-3">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider"><VisualText id="copy-c9038cb732f7" defaultText={"CONFIRMAÇÃO DE EXCLUSÃO"}/></p>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-f9ff0deb22a7" defaultText={"REMOVER ACESSO"}/></h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300"><VisualText id="copy-c79bb2ae6265" defaultText={"Deseja desativar o acesso à Gestão do funcionário "}/><strong>{modalExcluirUsuario.name}</strong> ({modalExcluirUsuario.email})?
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalExcluirUsuario(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase cursor-pointer"><VisualText id="copy-28c3a6d90c91" defaultText={"CANCELAR"}/></button>
              <button type="button" onClick={confirmarExcluirUsuario} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"><VisualText id="copy-3bbbe10e25fd" defaultText={"DESATIVAR"}/></button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO GENÉRICA (FROTA, GUARDA-VOLUMES) */}
      {modalConfirmacao && (
        <div data-rt-modal className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 border-t-4 !border-t-red-500 rounded-[2rem] shadow-2xl space-y-3">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider"><VisualText id="copy-d7e285c7dbfd" defaultText={"CONFIRMAÇÃO DE EXCLUSÃO"}/></p>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase"><VisualText id="copy-3bbd19343a9f" defaultText={"REMOVER ITEM"}/></h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {modalConfirmacao.msg}
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalConfirmacao(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase cursor-pointer"><VisualText id="copy-a7c4e888a95b" defaultText={"CANCELAR"}/></button>
              <button type="button" onClick={modalConfirmacao.acao} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md cursor-pointer"><VisualText id="copy-58de2764e724" defaultText={"EXCLUIR"}/></button>
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
    <VisualContentSlot id="area-997d948784a2"/></main>
  )
}
