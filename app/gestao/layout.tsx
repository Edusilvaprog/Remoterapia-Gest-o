import {getPerfilAtual} from '@/lib/actions/auth'
import GestaoDesktopShell from '@/components/desktop/GestaoDesktopShell'
export default async function GestaoLayout({children}:{children:React.ReactNode}){const perfil=await getPerfilAtual();return <GestaoDesktopShell perfil={perfil}>{children}</GestaoDesktopShell>}
