import BrandLabel from '@/components/ui/BrandLabel'
import Link from 'next/link'
import {ArrowLeft,Layers,LogOut,ShieldAlert} from 'lucide-react'
import {logoutStaff} from '@/lib/actions/auth'
import {VisualText} from '@/components/ui/VisualContent'

export default function DesktopAreaHeader({title,nomeUsuario,backHref,showTrocarArea,showSair,showSOS}:{title:string;nomeUsuario:string;backHref?:string;showTrocarArea?:boolean;showSair?:boolean;showSOS?:boolean}){
 const label=title.toLocaleLowerCase('pt-BR').replace(/^./,char=>char.toLocaleUpperCase('pt-BR'))
 return <header className="rt-area-desktop-header"><div><span className="rt-eyebrow"><VisualText id="copy-1e9b07bec7db" defaultText={"ESPAÇO DE TRABALHO"}/></span><h1><BrandLabel text={label}/><span className="rt-heading-dot">.</span></h1><p><VisualText id="copy-cb4ca0afb046" defaultText={"Equipe Remoterapia · "}/>{nomeUsuario}</p></div><div className="rt-area-actions">{showSOS&&<details className="rt-emergency-details"><summary><ShieldAlert size={18}/><VisualText id="copy-0364877f6636" defaultText={"Orientações de emergência"}/></summary><p><VisualText id="copy-8a7057a29fb7" defaultText={"Acione a equipe responsável pelo canal operacional combinado. Esta tela não envia alertas de resgate. O contato e o protocolo precisam ser confirmados pela administração."}/></p></details>}{backHref?<Link href={backHref}><ArrowLeft size={18}/><VisualText id="copy-0e8485afc727" defaultText={"Voltar"}/></Link>:showTrocarArea?<Link href="/gestao/selecionar-area"><Layers size={18}/><VisualText id="copy-45532d07b619" defaultText={"Trocar área"}/></Link>:null}{showSair&&<form action={logoutStaff}><button type="submit"><LogOut size={18}/><VisualText id="copy-0ae72acb7034" defaultText={"Sair"}/></button></form>}</div></header>
}
