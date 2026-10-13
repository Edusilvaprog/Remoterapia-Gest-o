import Link from 'next/link'
import {ArrowLeft,ShieldAlert} from 'lucide-react'
import DesktopAreaHeader from './desktop/DesktopAreaHeader'
import VisualLabel from '@/components/ui/VisualLabel'
import {VisualText} from '@/components/ui/VisualContent'

interface AppHeaderProps{title:string;nomeUsuario:string;showSOS?:boolean;showTrocarArea?:boolean;backHref?:string;showSair?:boolean}
export default function AppHeader({title,nomeUsuario,showSOS=false,backHref}:AppHeaderProps){return <>
 <DesktopAreaHeader title={title} nomeUsuario={nomeUsuario} backHref={backHref} showSOS={showSOS} showSair={false}/>
 <section className="rt-mobile-area-heading"><div>{backHref&&<Link href={backHref} className="rt-mobile-back" aria-label="Voltar à tela anterior"><ArrowLeft size={20}/></Link>}<h1><VisualLabel text={title}/></h1></div>{showSOS&&<details className="rt-mobile-emergency"><summary><ShieldAlert size={18}/><VisualLabel text="Orientações de emergência"/></summary><p><VisualText id="copy-1b3150edde6d" defaultText={"Acione a equipe responsável pelo canal operacional combinado. Esta tela não envia alertas de resgate. O contato e o protocolo precisam ser confirmados pela administração."}/></p></details>}</section>
 </>}
