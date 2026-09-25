// ============================================================
// TIPOS TYPESCRIPT COMPLETOS — Remoterapia Gestão
// ============================================================

export type StaffRole = 'admin' | 'dona' | 'instrutor' | 'recepcao' | 'guardaria'
export type TipoPlano = 'mensalista' | 'guardaria'
export type StatusPagamento = 'ativo' | 'vencido' | 'pendente'
export type StatusCaiaque = 'livre' | 'em_uso' | 'inoperante' | 'reservado'
export type StatusAgendamento = 'pendente' | 'confirmado' | 'concluido' | 'recusado' | 'falta' | 'cancelado'
  | 'cancelado_clima'
export type StatusLocacao = 'ativo' | 'retornando' | 'finalizado' | 'cancelado'
export type TipoLocacao = 'avulso' | 'mensalista' | 'instrutor'
export type TipoFoto = 'Paisagem' | 'Segurança'
export type NivelAvaria = 'leve' | 'inoperante'
export type MetodoPagamento = 'Pix' | 'Débito' | 'Crédito' | 'Cartão' | 'Dinheiro'

// ============================================================
// ENTIDADES PRINCIPAIS
// ============================================================

export interface PerfilStaff {
  id: string
  nome: string
  email: string | null
  role: StaffRole
  permissions: {
    qualidadeEmbarque: boolean
    avaria: boolean
  }
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Pendencia {
  id: string
  data: string
  valor: number
  motivo: string
  pago: boolean
}

export interface Mensalista {
  id: string
  auth_id: string | null
  nome: string
  telefone: string | null
  tipo_plano: TipoPlano
  creditos: number
  status_pagamento: StatusPagamento
  data_vencimento: string | null
  bloqueado: boolean
  primeiro_acesso: boolean
  precisa_trocar_senha: boolean
  pin_hash: string | null
  avatar: string | null
  caiaque_vinculado: string | null
  pendencias: Pendencia[]
  created_at: string
  updated_at: string
}

export interface Caiaque {
  id: string
  nome: string
  tipo: 'individual' | 'duplo'
  status: StatusCaiaque
  dono: string | null
  mensalista_id: string | null
  created_at: string
  updated_at: string
}

export interface Agendamento {
  avaliacao?: number;
  motivo_cancelamento?: string;
  id: string
  mensalista_id: string | null
  mensalista_nome: string | null
  caiaque_id: string | null
  data_reserva: string
  horario_reserva: string
  saida: string | null
  status: StatusAgendamento
  criado_por_admin: boolean
  manual: boolean
  fotos_enviadas: boolean
  vistoria_pulada: boolean
  avaliado: boolean
  percurso_min: number | null
  observacoes: string | null
  created_at: string
  updated_at: string
  // Relations (from join)
  mensalista?: Mensalista
  caiaque?: Caiaque
}

export interface Locacao {
  id: string
  cliente: string
  telefone: string | null
  rg: string | null
  tipo: TipoLocacao
  mensalista_id: string | null
  caiaques_ids: string[]
  caiaque_nome?: string
  lockers_ids: string[]
  entrada: string
  previsao: string | null
  saida: string | null
  qtd_pessoas: number
  com_instrutor: boolean
  instrutor_nome?: string
  pagamento: MetodoPagamento | null
  valor_original: number
  valor_final: number | null
  status: StatusLocacao
  status_retorno: string | null
  instrutor_agua: string | null
  observacoes: string | null
  agendamento_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Computed (not in DB)
  minutosNaAgua?: number
  minutosAtraso?: number
}

export interface HistoricoLocacao {
  id: string
  locacao_id: string | null
  cliente: string
  tipo: TipoLocacao
  mensalista_id: string | null
  caiaques_ids: string[]
  entrada: string
  saida: string
  duracao_min: number | null
  valor: number
  pagamento: MetodoPagamento | null
  com_instrutor: boolean
  atraso_min: number
  taxa_atraso: number
  data_reserva: string | null
  created_at: string
}

export interface FechamentoCaixa {
  id: string
  data_fechamento: string
  total: number
  visitantes: number
  detalhes: Record<MetodoPagamento, number>
  fechado_por: string
  fechado_em: string
  created_by: string | null
}

export interface Foto {
  id: string
  tipo: TipoFoto
  autor: string
  img_url: string
  data: string
  hora: string | null
  created_by: string | null
  created_at: string
}

export interface Avaria {
  id: string
  caiaque_id: string | null
  nivel: NivelAvaria
  descricao: string | null
  cliente: string | null
  locacao_id: string | null
  resolvido: boolean
  por: string
  created_by: string | null
  created_at: string
}

export interface Inspecao {
  id: string
  caiaque_id: string | null
  tipo: string
  descricao: string
  resultado: 'ok' | 'pendente' | 'falha'
  por: string
  proxima: string | null
  created_by: string | null
  created_at: string
}

export interface Avaliacao {
  id: string
  mensalista_id: string | null
  agendamento_id: string | null
  nota: number | null
  comentario: string | null
  created_at: string
}

export interface Locker {
  id: string // '01' a '20'
  status: 'Livre' | 'Ocupado'
  locacao_id: string | null
  updated_at: string
}

export interface FilaEspera {
  id: string
  nome: string
  telefone: string | null
  created_at: string
}

export interface ConfiguracaoSistema {
  preco_base: number
  preco_instrutor: number
  multa_falta_mensalista: number
  multa_falta_guardaria: number
  taxa_atraso_intervalo_min: number
  taxa_atraso_valor: number
  creditos_mensais: number
}

export interface AvisoGlobal {
  ativo: boolean
  texto: string
  data: string
}

export interface SOS {
  ativo: boolean
  por: string | null
  hora: string | null
}

// ============================================================
// TYPES PARA FORMULÁRIOS E ACTIONS
// ============================================================

export interface CheckinPayload {
  cliente: string
  telefone?: string
  rg?: string
  tipo: TipoLocacao
  mensalista_id?: string
  caiaques_ids: string[]
  lockers_ids?: string[]
  com_instrutor: boolean
  instrutor_nome?: string
  instrutor_agua?: string
  pagamento?: MetodoPagamento
  agendamento_id?: string
  qtd_pessoas?: number
  valor_final?: number
}

export interface AgendamentoPayload {
  mensalista_id: string
  caiaque_id?: string
  data_reserva: string
  horario_reserva: string
  saida?: string
  observacoes?: string
  criado_por_admin?: boolean
}

export interface MensalistaPayload {
  nome: string
  telefone: string
  tipo_plano: TipoPlano
  creditos?: number
  data_vencimento?: string
  caiaque_vinculado?: string
}

export interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

// ============================================================
// WEATHER (Open-Meteo)
// ============================================================

export interface WeatherData {
  temp: string
  ventoVelocidade: string
  ventoDirecao: string
  mareAltura: string
  mareStatus: string
  chuvaMm: string
  chuvaProb: string
  condAtual: string
  forecast: WeatherForecastDay[]
  atualizadoEm: string
}

export interface WeatherForecastDay {
  dia: string
  temp: string
  cond: string
  desc: string
}

// ============================================================
// EVENTOS & INSCRIÇÕES
// ============================================================

export interface Evento {
  id: string
  titulo: string
  data_evento: string
  horario: string
  local: string
  ponto_saida?: string | null
  duracao?: string | null
  nivel?: string | null
  preco: number
  vagas_totais: number
  vagas_ocupadas: number
  foto_url?: string | null
  itens_inclusos?: string[] | null
  roteiro?: string | null
  o_que_levar?: string | null
  descricao?: string | null
  ativo?: boolean
  created_at?: string
  inscricoes_eventos?: { count: number }[]
}

export interface InscricaoEvento {
  id: string
  evento_id: string
  mensalista_id?: string | null
  nome_completo: string
  telefone_whatsapp: string
  email?: string | null
  qtd_vagas: number
  embarcacoes_alocadas?: string | null
  valor_total: number
  codigo_voucher: string
  status_pagamento: string
  metodo_pagamento: string
  created_at: string
}

