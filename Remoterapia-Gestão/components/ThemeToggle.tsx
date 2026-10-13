'use client'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({className}:{className?:string}) {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark') || (() => { try { return localStorage.getItem('theme') } catch(e) { return null } })() === 'dark'
    setIsDark(isDarkMode)
    if (isDarkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      try { localStorage.setItem('theme', 'dark') } catch(e) {}
    } else {
      document.documentElement.classList.remove('dark')
      try { localStorage.setItem('theme', 'light') } catch(e) {}
    }
  }

  return (
    <button 
      type="button" 
      onClick={toggle} 
      className={className || "w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-2xl text-base flex items-center justify-center transition-all border border-white/30 backdrop-blur-sm shadow-sm active:scale-95 shrink-0 select-none cursor-pointer"}
      title={isDark?'Mudar para modo claro':'Mudar para modo escuro'}
      aria-label={isDark?'Mudar para modo claro':'Mudar para modo escuro'}
    >
      {isDark ? <Sun size={19}/> : <Moon size={19}/>}
    </button>
  )
}
