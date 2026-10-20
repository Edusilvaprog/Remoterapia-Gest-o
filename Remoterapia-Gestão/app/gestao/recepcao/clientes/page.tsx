import { listarMensalistas } from '@/lib/actions/mensalistas'
import ClientesClient from './ClientesClient'
import {VisualText} from '@/components/ui/VisualContent'


export default async function ClientesPage() {
  const { data: mensalistas } = await listarMensalistas()

  return (
    <div className="rt-base-page rt-reception-page">
      <header className="rt-base-heading"><div><span className="rt-base-eyebrow">Recepção</span><h1><VisualText id="copy-0ad3ee7c1c79" defaultText={"Mensalistas"}/></h1></div></header>

      <ClientesClient mensalistasIniciais={mensalistas || []} />
    </div>
  )
}


