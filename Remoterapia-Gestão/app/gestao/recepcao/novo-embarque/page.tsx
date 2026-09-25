import { createClient } from '@/lib/supabase/server'
import EmbarqueClient from './EmbarqueClient'

export default async function NovoEmbarquePage() {
  const supabase = await createClient()
  
  const { data: caiaquesData } = await supabase
    .from('caiaques')
    .select('id, nome, tipo, status, capacidade, preco_sem_instrutor, preco_com_instrutor')
    .neq('status', 'inoperante')
    .order('id', { ascending: true })

  const { data: lockersData } = await supabase
    .from('lockers')
    .select('id, status')
    .order('id', { ascending: true })

  const { data: instrutoresData } = await supabase
    .from('perfis_staff')
    .select('id, nome, role, roles')
    .or('role.eq.instrutor,role.eq.agua')
    .eq('ativo', true)

  const { data: configsData } = await supabase
    .from('configuracoes')
    .select('*')

  const precosConfig: Record<string, number> = {}
  if (configsData) {
    configsData.forEach((c: any) => {
      precosConfig[c.chave] = Number(c.valor)
    })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 flex flex-col h-full w-full overflow-hidden">
      <div className="max-w-md mx-auto flex-1 flex flex-col h-full w-full relative min-h-0 bg-transparent">
        <EmbarqueClient 
          caiaques={caiaquesData ?? []} 
          lockers={lockersData ?? []} 
          instrutores={instrutoresData ?? []} 
          precosConfig={precosConfig}
        />
      </div>
    </div>
  )
}


