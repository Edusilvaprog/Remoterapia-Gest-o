import { listarAgendamentos } from '@/lib/actions/agendamentos'
import AgendamentosClient from './AgendamentosClient'
import {VisualText} from '@/components/ui/VisualContent'


export default async function AgendamentosPage() {
  const { data: agendamentos } = await listarAgendamentos()

  return (
    <div className="rt-base-page rt-reception-page">
      <header className="rt-base-heading"><div><span className="rt-base-eyebrow">Recepção</span><h1><VisualText id="copy-c4aeeecb2cee" defaultText={"Agendamentos"}/></h1></div></header>

      <AgendamentosClient agendamentosIniciais={agendamentos || []} />
    </div>
  )
}


