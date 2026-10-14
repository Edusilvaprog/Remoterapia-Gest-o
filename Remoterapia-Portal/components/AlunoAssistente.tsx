'use client'

import {useState, type FormEvent} from 'react'
import {BookOpen, Search, MessageCircle, ArrowUpRight} from 'lucide-react'
import {VisualText, VisualContentSlot} from '@/components/ui/VisualContent'
import {FAQ_ARTICLES, FAQ_QUERY_LIMIT, searchFaq} from '@/lib/assistants/faq'

export default function AlunoAssistente({support}: {support: string}) {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)
  const results = submitted === null ? [] : searchFaq(submitted)
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (query.trim()) setSubmitted(query.slice(0, FAQ_QUERY_LIMIT))
  }
  return <section className="rt-base-panel" data-rt-area="area-b8c408c4a001" aria-labelledby="portal-help-title">
    <header className="rt-base-panel-title flex-wrap">
      <span className="rt-base-icon"><BookOpen size={23} aria-hidden="true"/></span>
      <div><h2 id="portal-help-title"><VisualText id="copy-b8c408c4a001" defaultText="Ajuda do Portal"/></h2>
        <p><VisualText id="copy-b8c408c4a002" defaultText="Encontre orientações sobre sua rotina na base."/></p></div>
      <span className="rt-base-badge"><VisualText id="copy-b8c408c4a003" defaultText="Respostas da base"/></span>
    </header>
    <p className="text-sm leading-relaxed mb-4" style={{color:'var(--rt-muted)'}}>
      <VisualText id="copy-b8c408c4a004" defaultText="As respostas são locais, retiradas desta biblioteca. Não há IA generativa conectada. A busca não consulta dados de alunos, reservas ou finanças e não salva perguntas."/>
    </p>
    <form onSubmit={search} className="grid gap-3">
      <label htmlFor="portal-help-query" className="text-sm font-semibold"><VisualText id="copy-b8c408c4a005" defaultText="Qual é sua dúvida?"/></label>
      <input id="portal-help-query" type="search" value={query} maxLength={FAQ_QUERY_LIMIT}
        onChange={event=>setQuery(event.target.value.slice(0, FAQ_QUERY_LIMIT))}
        autoComplete="off" aria-describedby="portal-help-limit"
        className="w-full min-w-0 rounded-xl border p-3 text-base"
        style={{borderColor:'var(--rt-line)',background:'var(--rt-surface)',color:'var(--rt-ink)'}}/>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="portal-help-limit" className="text-xs" style={{color:'var(--rt-muted)'}}><VisualText id="copy-b8c408c4a006" defaultText="Até 400 caracteres. Não inclua dados pessoais ou senhas."/></p>
        <button type="submit" className="rt-base-primary" disabled={!query.trim()}><Search size={17} aria-hidden="true"/><VisualText id="copy-b8c408c4a007" defaultText="Buscar na base"/></button>
      </div>
    </form>
    <div className="mt-5">
      <h3 className="text-sm font-semibold mb-3"><VisualText id="copy-b8c408c4a008" defaultText="Dúvidas frequentes"/></h3>
      <div className="flex flex-wrap gap-2">{FAQ_ARTICLES.map(article=><button key={article.id} type="button" className="rt-base-secondary"
        onClick={()=>{setQuery(article.title);setSubmitted(article.title)}}>
        <VisualText id={article.titleCopyId} defaultText={article.title}/>
      </button>)}</div>
    </div>
    <div role="status" aria-live="polite" aria-atomic="true" className="mt-5 grid gap-4">
      {submitted !== null && (results.length ? results.map(({article})=><article key={article.id} className="border-t pt-4" style={{borderColor:'var(--rt-line)'}}>
        <h3 className="text-sm font-semibold mb-2">{article.title}</h3>
        <p className="text-sm leading-relaxed" style={{color:'var(--rt-muted)'}}><VisualText id={article.answerCopyId} defaultText={article.answer}/></p>
      </article>) : <div>
        <h3 className="text-sm font-semibold mb-2"><VisualText id="copy-b8c408c4a009" defaultText="A base não tem orientação para essa dúvida."/></h3>
        <p className="text-sm leading-relaxed" style={{color:'var(--rt-muted)'}}><VisualText id="copy-b8c408c4a010" defaultText="Escolha um assunto sugerido ou fale com a equipe pelo atendimento."/></p>
      </div>)}
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <a className="rt-base-secondary" href={support} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true"/><VisualText id="copy-b8c408c4a011" defaultText="Abrir atendimento"/><ArrowUpRight size={16} aria-hidden="true"/></a>
      <p className="text-xs leading-relaxed" style={{color:'var(--rt-muted)'}}><VisualText id="copy-b8c408c4a012" defaultText="O atendimento abre somente ao clicar. Nenhuma mensagem é enviada automaticamente."/></p>
    </div>
    <VisualContentSlot id="area-b8c408c4a001"/>
  </section>
}
