'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
    setIsDark(isDarkMode)
    if (isDarkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <button 
      type="button" 
      onClick={toggle} 
      className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-2xl text-base flex items-center justify-center transition-all border border-white/30 backdrop-blur-sm shadow-sm active:scale-95 shrink-0 select-none cursor-pointer"
      title="Alternar Modo Claro/Escuro"
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}
