'use client'
import ClimateWorkspace from '@/components/desktop/ClimateWorkspace'
import BrandIcon from '@/components/ui/BrandIcon'
import { useState, useEffect } from 'react'
import {VisualText} from '@/components/ui/VisualContent'
import VisualLabel from '@/components/ui/VisualLabel'



interface ForecastItem {
  dia: string
  temp: string
  cond: string
  desc: string
}

interface WeatherData {
  temp: string
  ventoVelocidade: string
  ventoDirecao: string
  mareAltura: string
  mareStatus: string
  chuvaMm: string
  chuvaProb: string
  condAtual: string
  forecast: ForecastItem[]
  atualizadoEm: string
  fonte: string
}

const defaultWeather: WeatherData = {
 temp:'—',ventoVelocidade:'—',ventoDirecao:'—',mareAltura:'Não disponível',mareStatus:'Sem fonte de maré',chuvaMm:'—',chuvaProb:'—',condAtual:'',forecast:[],atualizadoEm:'Ainda não atualizado',fonte:'Praia Grande'
}

function weatherCodeToEmoji(code: number) {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 67) return '🌧️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}

function weatherCodeToDesc(code: number) {
  const map: Record<number, string> = {
    0: 'Céu limpo', 1: 'Maioritariamente limpo', 2: 'Parcialmente nublado',
    3: 'Nublado', 45: 'Neblina', 61: 'Chuva fraca', 63: 'Chuva moderada',
    65: 'Chuva forte', 80: 'Aguaceiros'
  }
  return map[code] || 'Condição variável'
}

export default function ClimaClient() {
  const [weather, setWeather] = useState<WeatherData>(defaultWeather)
  const [loading, setLoading] = useState(false)
  const [weatherError, setWeatherError] = useState('')
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'warning' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, tipo: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3800)
  }

  const fetchWeather = async () => {
    setLoading(true)
    setWeatherError('')
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=-24.0058&longitude=-46.4028&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=America/Sao_Paulo&forecast_days=5'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Falha ao obter clima')
      const data = await res.json()
      const c = data.current
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
      const windDir = dirs[Math.round((c.wind_direction_10m || 0) / 45) % 8]
      
      const now = new Date()
      const horaStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

      const newWeather: WeatherData = {
        temp: Math.round(c.temperature_2m) + '°C',
        ventoVelocidade: Math.round(c.wind_speed_10m) + 'km/h',
        ventoDirecao: windDir,
        mareAltura: 'Não disponível',
        mareStatus: 'Sem fonte de maré',
        chuvaMm: (c.precipitation || 0).toFixed(1) + 'mm',
        chuvaProb: (data.daily.precipitation_probability_max[0] || 0) + '%',
        condAtual: weatherCodeToEmoji(c.weather_code),
        forecast: data.daily.time.slice(0, 4).map((day: string, i: number) => {
          const d = new Date(day + 'T12:00:00')
          return {
            dia: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase(),
            temp: Math.round(data.daily.temperature_2m_max[i]) + '°',
            cond: weatherCodeToEmoji(data.daily.weather_code[i]),
            desc: weatherCodeToDesc(data.daily.weather_code[i])
          }
        }),
        atualizadoEm: horaStr,
        fonte: 'Praia Grande'
      }

      setWeather(newWeather)
    } catch {
      setWeatherError('Não foi possível atualizar a previsão. Confira o horário da última consulta; dados antigos não descrevem necessariamente as condições atuais.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
  }, [])

  return (
    <div className="rt-climate-workspace space-y-6 relative"><ClimateWorkspace weather={weather} loading={loading} refresh={fetchWeather} forecastClick={f=>showToast(f.dia+': '+f.temp+' — '+f.desc,'info')}/>
      {weatherError&&<div role="alert" className="rt-error-note">{weatherError}</div>}
      {/* TOAST FLUTUANTE */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[90%] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-3.5 rounded-2xl shadow-2xl border text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 bg-blue-600 text-white border-blue-400 shadow-blue-600/30">
            <span>ℹ</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
      
      {/* BARRA SUPERIOR: CIDADE, HORÁRIO E BOTÃO ATUALIZAR EXPANDIDO */}
      <div className="dw-mobile"><div className="flex justify-between items-center gap-3 px-1 py-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base select-none"><BrandIcon name="pin"/></span>
          <p className="text-xs sm:text-sm font-black text-blue-950 dark:text-white uppercase tracking-wider truncate drop-shadow-sm"><VisualText id="copy-dfe1dd93748d" defaultText={"PRAIA GRANDE · "}/>{weather.atualizadoEm}
          </p>
        </div>

        <button 
          type="button" 
          onClick={fetchWeather}
          disabled={loading}
          className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider active:scale-95 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 shrink-0 cursor-pointer flex items-center gap-2"
        >
          <span className={`text-xs ${loading ? 'animate-spin' : ''}`}>↻</span>
          <span><VisualLabel text={loading ? 'CARREGANDO...' : 'ATUALIZAR'}/></span>
        </button>
      </div></div>

      {/* CARD 1: TEMPERATURA ATUAL */}
      <div className="dw-mobile"><div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-6 sm:p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden text-center border-2 border-white/40">
        <div className="absolute -right-8 -top-8 text-[150px] opacity-10 font-black italic drop-shadow-xl select-none pointer-events-none">
          {weather.condAtual}
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase text-blue-100 mb-2 tracking-wider bg-white/20 inline-block px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/30 shadow-sm"><VisualText id="copy-591f907c11e9" defaultText={"Temperatura Atual · Praia Grande"}/></p>
          <h3 className="text-7xl font-black italic tracking-tighter drop-shadow-lg my-1">
            {weather.temp}
          </h3>
          
          <div className="grid grid-cols-3 gap-2.5 mt-6 justify-center">
            
            {/* VENTO */}
            <div className="bg-white/20 p-3 rounded-2xl border border-white/30 backdrop-blur-md hover:bg-white/30 transition-colors shadow-sm flex flex-col items-center justify-center min-w-0">
              <p className="text-[8px] uppercase font-black text-blue-100 mb-1 tracking-wider whitespace-nowrap"><VisualText id="copy-4f213f874998" defaultText={"Vento"}/></p>
              <p className="text-xs sm:text-sm font-black drop-shadow-sm whitespace-nowrap leading-none">
                {weather.ventoVelocidade} {weather.ventoDirecao}
              </p>
            </div>

            {/* MARÉ */}
            <div className="bg-white/20 p-3 rounded-2xl border border-white/30 backdrop-blur-md hover:bg-white/30 transition-colors shadow-sm flex flex-col items-center justify-center min-w-0">
              <p className="text-[8px] uppercase font-black text-blue-100 mb-1 tracking-wider whitespace-nowrap"><VisualText id="copy-4571ef317510" defaultText={"Maré"}/></p>
              <p className="text-xs sm:text-sm font-black drop-shadow-sm whitespace-nowrap leading-none">
                {weather.mareAltura} <span className="text-[9px] opacity-85 font-bold">({weather.mareStatus})</span>
              </p>
            </div>

            {/* CHUVA */}
            <div className="bg-white/20 p-3 rounded-2xl border border-white/30 backdrop-blur-md hover:bg-white/30 transition-colors shadow-sm flex flex-col items-center justify-center min-w-0">
              <p className="text-[8px] uppercase font-black text-blue-100 mb-1 tracking-wider whitespace-nowrap"><VisualText id="copy-545e369b7499" defaultText={"Chuva"}/></p>
              <p className="text-xs sm:text-sm font-black drop-shadow-sm whitespace-nowrap leading-none">
                {weather.chuvaMm} <span className="text-[9px] opacity-85 font-bold">/ {weather.chuvaProb}</span>
              </p>
            </div>

          </div>
        </div>
      </div></div>

      {/* CARD 2: PREVISÃO DA SEMANA COM BANDEJA AZULADA DE ALTO CONTRASTE */}
      <div className="dw-mobile"><div className="bg-white/95 dark:bg-slate-900/95 p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/10 border-t-4 !border-t-cyan-500 border border-white/60 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 text-center"><VisualText id="copy-6eeb5afa746e" defaultText={"PREVISÃO DA SEMANA"}/></h4>
        
        {/* BANDEJA AZULADA SUAVE QUE DESTACA OS BLOCOS BRANCOS */}
        <div className="bg-[#eaf4fc] dark:bg-slate-800/80 p-3 rounded-2xl border border-blue-100 dark:border-slate-700/60 shadow-inner">
          <div className="grid grid-cols-4 gap-2.5">
            {weather.forecast.map((f, i) => (
              <button 
                key={i}
                type="button" 
                onClick={() => showToast(`${f.dia}: ${f.cond} ${f.temp} — ${f.desc}`, 'info')}
                className="text-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-white dark:border-slate-700 hover:-translate-y-1 hover:border-cyan-400 dark:hover:border-cyan-400 transition-all cursor-pointer shadow-md w-full active:scale-95"
              >
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{f.dia}</p>
                <p className="text-3xl my-2 drop-shadow-sm">{f.cond}</p>
                <p className="text-sm font-black text-blue-600 dark:text-cyan-400 leading-none">{f.temp}</p>
              </button>
            ))}
          </div>
        </div>
      </div></div>

      {/* CARD 3: RADAR WINDY COM PÍLULA AO VIVO EM DESTAQUE */}
      <div className="dw-shared-radar"><div className="bg-white/95 dark:bg-slate-900/95 p-6 rounded-[2.2rem] shadow-xl shadow-blue-500/10 border-t-4 !border-t-blue-600 border border-white/60 dark:border-slate-800 mb-6 space-y-4">
        
        {/* PÍLULA VIBRANTE AZUL COM INDICADOR VERMELHO PULSANTE */}
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2 rounded-full shadow-md shadow-blue-500/20 flex items-center gap-2 border border-white/30">
            <span className="text-[10px] font-black uppercase tracking-wider"><VisualText id="copy-d4e30735a88a" defaultText={"RADAR WINDY"}/></span>
            <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              <span className="text-[8px] font-black uppercase tracking-widest text-red-100"><VisualText id="copy-6106251d8880" defaultText={"AO VIVO"}/></span>
            </div>
          </div>
        </div>

        {/* CONTAINER DO MAPA WINDY */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 h-[350px]">
          <iframe title="Radar meteorológico de Praia Grande" loading="lazy" 
            width="100%" 
            height="100%" 
            src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=10&overlay=radar&product=radar&level=surface&lat=-24.005&lon=-46.412" 
            frameBorder="0"
          />
        </div>
      </div></div>

    </div>
  )
}



