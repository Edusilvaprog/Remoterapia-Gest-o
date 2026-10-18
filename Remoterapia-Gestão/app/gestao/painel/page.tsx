import {redirect} from 'next/navigation'
import {getPerfilAtual} from '@/lib/actions/auth'
import {createClient} from '@/lib/supabase/server'
import GestaoOverview from '@/components/desktop/GestaoOverview'
export default async function PainelPage(){
 const perfil=await getPerfilAtual();if(!perfil)redirect('/gestao/login')
 const supabase=await createClient()
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date())
 const [reservas,naAgua,frota,alunos,agenda]=await Promise.all([
  supabase.from('agendamentos').select('id',{head:true,count:'exact'}).eq('data_reserva',today).in('status',['pendente','confirmado']),
  supabase.from('locacoes').select('id',{head:true,count:'exact'}).in('status',['ativo','retornando']),
  supabase.from('caiaques').select('id',{head:true,count:'exact'}).or('status.eq.livre,status.is.null'),
  supabase.from('mensalistas').select('id',{head:true,count:'exact'}).is('arquivado_em',null),
  supabase.from('agendamentos').select('id,mensalista_nome,horario_reserva,status').eq('data_reserva',today).in('status',['pendente','confirmado']).order('horario_reserva',{ascending:true}).limit(12)
 ])
 return <GestaoOverview nome={perfil.nome} role={perfil.role} roles={perfil.roles||[]} data={{reservas:reservas.error?null:reservas.count,naAgua:naAgua.error?null:naAgua.count,frota:frota.error?null:frota.count,alunos:alunos.error?null:alunos.count,agenda:agenda.data||[],failed:!!(reservas.error||naAgua.error||frota.error||alunos.error||agenda.error),dateLabel:new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'long',day:'numeric',month:'long'}).format(new Date())}}/>
}
