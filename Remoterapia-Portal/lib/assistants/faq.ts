export const FAQ_QUERY_LIMIT = 400

export type FaqArticle = {
  id: string
  title: string
  answer: string
  titleCopyId: string
  answerCopyId: string
  keywords: readonly string[]
}

export const FAQ_ARTICLES: readonly FaqArticle[] = [
  {
    id: 'agendamento', title: 'Como agendar uma remada?',
    answer: 'Use a área de agendamento do Portal para consultar as opções disponíveis. A possibilidade de reservar depende do seu plano e das vagas exibidas. Se a opção não estiver disponível ou você tiver dúvida sobre o plano, fale com a equipe.',
    titleCopyId: 'copy-b8c408c4a101', answerCopyId: 'copy-b8c408c4a102',
    keywords: ['agendar', 'agendamento', 'remada', 'reserva', 'reservar', 'plano', 'vaga', 'mensalista'],
  },
  {
    id: 'cancelamento', title: 'Como trocar ou cancelar uma reserva?',
    answer: 'Confira sua reserva e as ações disponíveis na interface do Portal. Use a opção de troca ou cancelamento quando ela estiver disponível. Se não encontrar a ação, procure o atendimento para confirmar o procedimento e as condições aplicáveis.',
    titleCopyId: 'copy-b8c408c4a103', answerCopyId: 'copy-b8c408c4a104',
    keywords: ['troca', 'trocar', 'cancelar', 'cancelamento', 'desmarcar', 'remarcar', 'reagendar'],
  },
  {
    id: 'clima', title: 'Quem confirma a remada em caso de mau tempo?',
    answer: 'A equipe define as orientações sobre o clima e a realização da atividade. Confira os avisos do Portal e, se precisar confirmar sua saída, fale com a equipe. Esta base de respostas não consulta a previsão nem confirma condições de segurança.',
    titleCopyId: 'copy-b8c408c4a105', answerCopyId: 'copy-b8c408c4a106',
    keywords: ['clima', 'chuva', 'chover', 'vento', 'tempo', 'previsao', 'tempestade', 'seguranca'],
  },
  {
    id: 'pagamentos', title: 'Como consultar planos e pagamentos?',
    answer: 'Os recursos de pagamentos estão em preparação. Consulte as informações e os avisos disponíveis na área de planos e pagamentos do Portal. Para confirmar cobranças ou meios de pagamento, fale com o atendimento. Esta ajuda não consulta sua situação financeira.',
    titleCopyId: 'copy-b8c408c4a107', answerCopyId: 'copy-b8c408c4a108',
    keywords: ['pagamento', 'pagar', 'cobranca', 'boleto', 'pix', 'cartao', 'mensalidade', 'assinatura'],
  },
  {
    id: 'reembolso', title: 'Como pedir orientação sobre reembolso?',
    answer: 'Fale com o atendimento para verificar seu caso e as condições aplicáveis. Esta base não define valores, prazos ou aprovação de reembolso e não faz solicitações em seu nome.',
    titleCopyId: 'copy-b8c408c4a109', answerCopyId: 'copy-b8c408c4a110',
    keywords: ['reembolso', 'reembolsar', 'estorno', 'devolucao', 'devolver', 'ressarcimento'],
  },
  {
    id: 'senha', title: 'Como recuperar ou mudar minha senha?',
    answer: 'Use a opção de recuperação de senha disponível na tela de entrada. Se já estiver conectado, confira a opção de mudar senha no perfil. Se não conseguir concluir pela interface, peça orientação à equipe. Não informe sua senha no atendimento nem nesta busca.',
    titleCopyId: 'copy-b8c408c4a111', answerCopyId: 'copy-b8c408c4a112',
    keywords: ['senha', 'recuperar', 'recuperacao', 'esqueci', 'acesso', 'entrar', 'login'],
  },
]

export function normalizeFaqQuery(query: string): string {
  return query.slice(0, FAQ_QUERY_LIMIT).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Busca somente na biblioteca local; a pontuação ordena correspondências de palavras. */
export function searchFaq(query: string): {article: FaqArticle; score: number}[] {
  const normalized = normalizeFaqQuery(query)
  const tokens = [...new Set(normalized.split(' ').filter(token => token.length > 2)
    .map(token => token.endsWith('s') ? token.slice(0, -1) : token))]
  if (!tokens.length) return []
  return FAQ_ARTICLES.map(article => ({
    article,
    score: tokens.reduce((score, token) => score + (article.keywords.some(keyword =>
      token === keyword || (token.length >= 5 && keyword.startsWith(token))
    ) ? 1 : 0), normalized === normalizeFaqQuery(article.title) ? 10 : 0),
  })).filter(result => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
}
