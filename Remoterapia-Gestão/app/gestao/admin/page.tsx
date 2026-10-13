import {getPerfilAtual} from '@/lib/actions/auth'
import {redirect} from 'next/navigation'
import AdminClient from './AdminClient'
export default async function AdminPainel(){const perfil=await getPerfilAtual();if(!perfil)redirect('/gestao/login');if(!['admin','dona'].includes(perfil.role))redirect('/gestao/selecionar-area');return <AdminClient/>}
