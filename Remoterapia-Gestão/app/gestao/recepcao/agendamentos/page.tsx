import { listarAgendamentos } from '@/lib/actions/agendamentos'
import AgendamentosClient from './AgendamentosClient'

export default async function AgendamentosPage() {
  const { data: agendamentos } = await listarAgendamentos()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end px-1 mt-6 mb-3">
          <div>
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Controle</h3>
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-none mt-1 drop-shadow-sm">Agendamentos</h2>
          </div>
      </div>

      <AgendamentosClient agendamentosIniciais={agendamentos || []} />
    </div>
  )
}


