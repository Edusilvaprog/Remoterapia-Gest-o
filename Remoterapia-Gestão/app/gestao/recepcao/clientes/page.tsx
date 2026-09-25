import { listarMensalistas } from '@/lib/actions/mensalistas'
import ClientesClient from './ClientesClient'

export default async function ClientesPage() {
  const { data: mensalistas } = await listarMensalistas()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end px-1 mt-6 mb-3">
          <div>
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Base de Dados</h3>
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-none mt-1 drop-shadow-sm">Mensalistas</h2>
          </div>
      </div>

      <ClientesClient mensalistasIniciais={mensalistas || []} />
    </div>
  )
}


