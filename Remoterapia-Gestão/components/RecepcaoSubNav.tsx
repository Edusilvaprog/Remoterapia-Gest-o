'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function RecepcaoSubNav() {
  const pathname = usePathname()

  const tabs = [
    { label: 'Mar', href: '/gestao/recepcao/dashboard', icon: '🌊' },
    { label: 'Agenda', href: '/gestao/recepcao/agendamentos', icon: '📅' },
    { label: 'Eventos', href: '/gestao/recepcao/eventos', icon: '🎟️' },
    { label: 'Alunos', href: '/gestao/recepcao/clientes', icon: '👥' },
  ]

  return (
    <div className="px-3 shrink-0">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/60 dark:border-slate-800 shadow-sm flex items-center gap-1">
        {tabs.map(tab => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span className="text-xs leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
