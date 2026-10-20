import {CalendarDays} from 'lucide-react'
import type {Agendamento} from '@/lib/types'
import VisualLabel from '@/components/ui/VisualLabel'

export default function ReceptionBookingsTable({agendamentos}:{agendamentos:Agendamento[]}){
 return <section className="rt-legacy-desktop rt-base-panel" aria-label="Agendamentos da recepção">
  <div className="rt-base-panel-title"><span className="rt-base-icon"><CalendarDays size={22}/></span><div><h2><VisualLabel text="Agendamentos"/></h2><p>{agendamentos.length} <VisualLabel text="reservas nesta seleção"/></p></div></div>
  <div className="rt-base-table-wrap"><table className="rt-base-table"><thead><tr>{['Aluno','Data','Horário','Embarcação','Plano','Situação','Avaliação'].map(label=><th key={label}><VisualLabel text={label}/></th>)}</tr></thead><tbody>{agendamentos.map(agendamento=><tr key={agendamento.id}>
   <td><strong>{agendamento.mensalista_nome||'Mensalista'}</strong></td><td>{new Date(agendamento.data_reserva+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>{agendamento.horario_reserva}</td><td>{agendamento.caiaque_id||'Não alocado'}</td><td>{agendamento.mensalista?.tipo_plano?.replaceAll('_',' ')||'—'}</td>
   <td><span className={`rt-base-badge ${agendamento.status==='confirmado'?'is-good':''}`}><VisualLabel text={agendamento.status.replaceAll('_',' ')}/></span></td><td>{agendamento.avaliacao?`${agendamento.avaliacao}/5`:'—'}</td>
  </tr>)}</tbody></table></div>
  {!agendamentos.length&&<p className="rt-legacy-empty"><VisualLabel text="Sem agendamentos hoje"/></p>}
  <p className="rt-base-caption"><VisualLabel text="A liberação da saída é feita pela equipe no celular."/></p>
 </section>
}
