'use client'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false)
  
  useEffect(() => {
    const checkTheme = () => {
      const saved = (() => { try { return localStorage.getItem('theme') } catch(e) { return null } })()
      const isHtmlDark = document.documentElement.classList.contains('dark')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const shouldBeDark = saved ? saved === 'dark' : (isHtmlDark || prefersDark)
      
      setIsDark(shouldBeDark)
      if (shouldBeDark) {
        document.documentElement.classList.add('dark')
        document.body?.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
        document.body?.classList.remove('dark')
      }
    }

    checkTheme()
    window.addEventListener('theme-change', checkTheme)
    return () => window.removeEventListener('theme-change', checkTheme)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      document.body?.classList.add('dark')
      try { localStorage.setItem('theme', 'dark') } catch(e) {}
    } else {
      document.documentElement.classList.remove('dark')
      document.body?.classList.remove('dark')
      try { localStorage.setItem('theme', 'light') } catch(e) {}
    }
    window.dispatchEvent(new Event('theme-change'))
  }

  return (
    <button 
      type="button" 
      onClick={toggle} 
      className={className || "w-9 h-9 bg-white/15 hover:bg-white/25 text-white rounded-xl flex items-center justify-center transition-all border border-white/25 backdrop-blur-sm shadow-xs active:scale-95 shrink-0 select-none cursor-pointer"}
      title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-white" />}
    </button>
  )
}
