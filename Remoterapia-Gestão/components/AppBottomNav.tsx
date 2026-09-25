'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface NavItem {
  label: string
  href?: string
  icon: string
  active?: boolean
  onClick?: () => void
}

interface AppBottomNavProps {
  items: NavItem[]
  centerAction?: {
    href: string
    label?: string
    icon?: string
  }
}

export default function AppBottomNav({ items, centerAction }: AppBottomNavProps) {
  const pathname = usePathname()

  // 1. MODELO COM BOTÃO CENTRAL ELEVADO DIAMANTE (+) - EX: EQUIPE AREIA (5 ITENS)
  if (centerAction) {
    const leftItems = items.slice(0, 2)
    const rightItems = items.slice(2, 4)

    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none">
        <nav className="max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-white/90 dark:border-slate-800 flex justify-between items-center rounded-[2.2rem] shadow-xl px-4 h-20 transition-all pointer-events-auto relative">
          
          {/* 2 ITENS DA ESQUERDA */}
          {leftItems.map((item, idx) => {
            const isActive = item.active !== undefined ? item.active : (item.href ? pathname === item.href : false)
            const content = (
              <div className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all cursor-pointer ${
                isActive ? 'text-blue-600 dark:text-cyan-400 font-black scale-105' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
              }`}>
                <span className="text-2xl drop-shadow-sm leading-none">{item.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
              </div>
            )

            return item.href ? (
              <Link key={idx} href={item.href} className="flex-1 h-full flex items-center justify-center">
                {content}
              </Link>
            ) : (
              <button key={idx} type="button" onClick={item.onClick} className="flex-1 h-full flex items-center justify-center cursor-pointer">
                {content}
              </button>
            )
          })}

          {/* BOTÃO CENTRAL ELEVADO (+) */}
          <div className="flex-1 flex justify-center items-center h-full relative z-10">
            <Link
              href={centerAction.href}
              className="absolute -top-3.5 w-[64px] h-[64px] bg-gradient-to-tr from-blue-600 to-cyan-400 text-white rounded-[1.8rem] shadow-[0_10px_25px_rgba(14,165,233,0.5)] hover:-translate-y-1 active:scale-95 transition-all border-4 border-white dark:border-slate-800 flex items-center justify-center rotate-45 group cursor-pointer"
              title={centerAction.label || 'Novo'}
            >
              <span className="text-3xl font-black leading-none mb-0.5 drop-shadow-md -rotate-45 group-hover:scale-110 transition-transform">
                {centerAction.icon || '+'}
              </span>
            </Link>
          </div>

          {/* 2 ITENS DA DIREITA */}
          {rightItems.map((item, idx) => {
            const isActive = item.active !== undefined ? item.active : (item.href ? pathname === item.href : false)
            const content = (
              <div className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all cursor-pointer ${
                isActive ? 'text-blue-600 dark:text-cyan-400 font-black scale-105' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
              }`}>
                <span className="text-2xl drop-shadow-sm leading-none">{item.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
              </div>
            )

            return item.href ? (
              <Link key={idx} href={item.href} className="flex-1 h-full flex items-center justify-center">
                {content}
              </Link>
            ) : (
              <button key={idx} type="button" onClick={item.onClick} className="flex-1 h-full flex items-center justify-center cursor-pointer">
                {content}
              </button>
            )
          })}

        </nav>
      </div>
    )
  }

  // 2. MODELO SEM BOTÃO CENTRAL (GRID RÍGIDO)
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none">
      <nav className="max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-white/90 dark:border-slate-800 rounded-[2.2rem] shadow-xl h-20 transition-all pointer-events-auto overflow-hidden">
        <div className={`grid w-full h-full ${items.length === 5 ? 'grid-cols-5' : items.length === 4 ? 'grid-cols-4' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {items.map((item, idx) => {
            const isActive = item.active !== undefined ? item.active : (item.href ? pathname === item.href : false)
            const content = (
              <div className={`flex flex-col items-center justify-center transition-all cursor-pointer w-full h-full ${
                isActive ? 'text-blue-600 dark:text-cyan-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-cyan-400'
              }`}>
                <div className="w-8 h-7 flex items-center justify-center text-2xl leading-none mb-1">
                  <span className="drop-shadow-sm">{item.icon}</span>
                </div>
                <div className="h-3.5 flex items-center justify-center text-[9px] font-black uppercase tracking-wider leading-none">
                  <span>{item.label}</span>
                </div>
              </div>
            )

            return item.href ? (
              <Link key={idx} href={item.href} className="flex items-center justify-center w-full h-full">
                {content}
              </Link>
            ) : (
              <button key={idx} type="button" onClick={item.onClick} className="flex items-center justify-center w-full h-full cursor-pointer outline-none">
                {content}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
