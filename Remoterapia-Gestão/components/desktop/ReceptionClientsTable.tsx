import {LockKeyhole,LockKeyholeOpen,KeyRound,UsersRound} from 'lucide-react'
import type {Mensalista} from '@/lib/types'
import VisualLabel from '@/components/ui/VisualLabel'

export default function ReceptionClientsTable({clientes,busy,onBlock,onRecovery}:{clientes:Mensalista[];busy:boolean;onBlock:(id:string,blocked:boolean)=>void;onRecovery:()=>void}){
 return <section className="rt-legacy-desktop rt-base-panel" aria-label="Cadastro de mensalistas">
  <div className="rt-base-panel-title"><span className="rt-base-icon"><UsersRound size={22}/></span><div><h2><VisualLabel text="Mensalistas"/></h2><p>{clientes.length} <VisualLabel text="clientes nesta seleção"/></p></div></div>
  <div className="rt-base-table-wrap"><table className="rt-base-table"><thead><tr>{['Cliente','Plano','Créditos','Vencimento','Acesso','Atendimento'].map(label=><th key={label}><VisualLabel text={label}/></th>)}</tr></thead><tbody>{clientes.map(cliente=><tr key={cliente.id}>
   <td><strong>{cliente.nome}</strong><small className="rt-legacy-contact">{cliente.telefone||'Telefone não informado'}</small></td>
   <td>{cliente.tipo_plano?.replaceAll('_',' ')||'Sem plano'}</td><td>{cliente.creditos}</td><td>{cliente.data_vencimento?new Date(cliente.data_vencimento).toLocaleDateString('pt-BR'):'—'}</td>
   <td><span className={`rt-base-badge ${cliente.bloqueado?'is-warn':'is-good'}`}><VisualLabel text={cliente.bloqueado?'Bloqueado':'Liberado'}/></span></td>
   <td><div className="rt-legacy-row-actions"><button type="button" className="rt-base-secondary" disabled={busy} onClick={()=>onBlock(cliente.id,cliente.bloqueado)} aria-label={`${cliente.bloqueado?'Desbloquear':'Bloquear'} ${cliente.nome}`}>{cliente.bloqueado?<LockKeyholeOpen size={16}/>:<LockKeyhole size={16}/>}<VisualLabel text={cliente.bloqueado?'Desbloquear':'Bloquear'}/></button><button type="button" className="rt-base-text-button" disabled={busy} onClick={onRecovery}><KeyRound size={16}/><VisualLabel text="Como recuperar o acesso"/></button></div></td>
  </tr>)}</tbody></table></div>
  {!clientes.length&&<p className="rt-legacy-empty"><VisualLabel text="Nenhum cliente encontrado."/></p>}
 </section>
}
