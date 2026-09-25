import { createClient } from '@/lib/supabase/server'
import EventosClient from './EventosClient'

export const dynamic = 'force-dynamic'

export default async function EventosPage() {
  const supabase = await createClient()

  const { data: eventos, error } = await supabase
    .from('eventos')
    .select('*, inscricoes_eventos(count)')
    .order('data_evento', { ascending: true })

  if (error) {
    console.warn('Aviso ao carregar eventos no gestão:', error.message)
  }

  return (
    <div className="space-y-4">
      <EventosClient eventosIniciais={eventos ?? []} />
    </div>
  )
}
