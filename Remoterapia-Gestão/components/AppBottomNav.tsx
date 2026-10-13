'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {Waves,ClipboardList,LockKeyhole,CloudSun,Ship,UsersRound,CalendarDays,Ticket,Wallet,Camera,ShieldCheck,Compass,Plus,Star} from 'lucide-react'
import GestaoSectionNav from './desktop/GestaoSectionNav'
import VisualLabel from '@/components/ui/VisualLabel'
export interface NavItem{label:string;href?:string;icon:string;active?:boolean;onClick?:()=>void}
interface Props{items:NavItem[];centerAction?:{href:string;label?:string;icon?:string}}
function symbol(label:string){return /frota|caiaque/i.test(label)?Ship:/cliente|aluno|usu|equipe/i.test(label)?UsersRound:/agenda|reserva/i.test(label)?CalendarDays:/evento/i.test(label)?Ticket:/fechamento/i.test(label)?LockKeyhole:/caixa|plano|pagamento/i.test(label)?Wallet:/agua|água|mar/i.test(label)?Waves:/di.rio|auditoria|registro/i.test(label)?ClipboardList:/clima/i.test(label)?CloudSun:/m.dia/i.test(label)?Camera:/feedback/i.test(label)?Star:/bloqueio/i.test(label)?ShieldCheck:Compass}
export default function AppBottomNav({items,centerAction}:Props){
 const pathname=usePathname()
 const create=centerAction&&<Link href={centerAction.href} className="rt-mobile-tab-create" aria-label={centerAction.label||'Novo embarque'}><Plus size={23}/><span><VisualLabel text={centerAction.label||'Novo embarque'}/></span></Link>
 return <>
  <GestaoSectionNav items={items} pathname={pathname} centerAction={centerAction}/>
  <div className="rt-mobile-tabs-wrap"><nav aria-label="Navegação da gestão" className="rt-mobile-tabs">
   {items.map((item,index)=>{
    const Icon=symbol(item.label),active=item.active??(item.href===pathname)
    const content=<><Icon size={21} strokeWidth={1.8}/><span><VisualLabel text={item.label}/></span></>
    return <span className="rt-mobile-tab-unit" key={item.href||item.label}>
     {index===2&&create}
     {item.href?<Link href={item.href} aria-current={active?'page':undefined}>{content}</Link>:<button type="button" onClick={item.onClick} aria-current={active?'page':undefined}>{content}</button>}
    </span>
   })}
   {items.length<3&&create}
  </nav></div>
 </>
}
