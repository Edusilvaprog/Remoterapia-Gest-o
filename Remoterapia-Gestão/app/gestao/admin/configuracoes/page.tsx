import {redirect} from 'next/navigation'
import {getPerfilAtual} from '@/lib/actions/auth'
import {createClient} from '@/lib/supabase/server'
import ConfiguracoesClient from './ConfiguracoesClient'
import {VisualContentSlot} from '@/components/ui/VisualContent'

export default async function ConfiguracoesPage(){
 const perfil=await getPerfilAtual();if(!perfil)redirect('/gestao/login');if(!['admin','dona'].includes(perfil.role))redirect('/gestao/selecionar-area')
 const supabase=await createClient()
 const {data,error}=await supabase.from('configuracoes').select('valor').eq('chave','tabela_clubes').maybeSingle()
 if(error)return <div className="rt-settings" data-rt-area="area-6ca21a6e9c3a"><div role="alert" className="rt-error-note">Não foi possível carregar as configurações. Atualize a página antes de editar.</div><VisualContentSlot id="area-6ca21a6e9c3a"/></div>
 const v=data?.valor||{}
 return <ConfiguracoesClient initial={{mensalista:Number(v.mensalista??150),guardaria:Number(v.guardaria??150),remadas_semanais:Number(v.remadas_semanais??2),horario_corte:v.horario_corte??'19:00',dia_manutencao:v.dia_manutencao??'Segunda-feira'}}/>
}
