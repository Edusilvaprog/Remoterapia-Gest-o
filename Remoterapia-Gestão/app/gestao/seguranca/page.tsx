import {redirect} from 'next/navigation'
import {getPerfilAtual} from '@/lib/actions/auth'
import MfaClient from './MfaClient'
export default async function SecurityPage(){const perfil=await getPerfilAtual();if(!perfil)redirect('/gestao/login');return <MfaClient/>}
