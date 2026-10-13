import { listarMensalistas } from '@/lib/actions/mensalistas'
import ClientesClient from './ClientesClient'
import {VisualText} from '@/components/ui/VisualContent'


export default async function ClientesPage() {
  const { data: mensalistas } = await listarMensalistas()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end px-1 mt-6 mb-3">
          <div>
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest"><VisualText id="copy-8149e6926289" defaultText={"Base de Dados"}/></h3>
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-none mt-1 drop-shadow-sm"><VisualText id="copy-0ad3ee7c1c79" defaultText={"Mensalistas"}/></h2>
          </div>
      </div>

      <ClientesClient mensalistasIniciais={mensalistas || []} />
    </div>
  )
}


