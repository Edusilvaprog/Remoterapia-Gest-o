-- ============================================================
-- REMOTERAPIA GESTÃO — SCHEMA SUPABASE COMPLETO (CORRIGIDO)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. FUNÇÃO BASE (Precisa vir antes das tabelas)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ============================================================
-- TABELAS (Sem funções dependentes ainda)
-- ============================================================

CREATE TABLE IF NOT EXISTS perfis_staff (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'instrutor' CHECK (role IN ('admin','dona','instrutor','recepcao','guardaria')),
  permissions JSONB NOT NULL DEFAULT '{"qualidadeEmbarque": false, "avaria": false}',
  ativo      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_role ON perfis_staff(role);
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON perfis_staff FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS mensalistas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome                 TEXT NOT NULL,
  telefone             TEXT UNIQUE,
  tipo_plano           TEXT NOT NULL CHECK (tipo_plano IN ('mensalista','guardaria')),
  creditos             INTEGER NOT NULL DEFAULT 8,
  status_pagamento     TEXT NOT NULL DEFAULT 'ativo' CHECK (status_pagamento IN ('ativo','vencido','pendente')),
  data_vencimento      DATE,
  bloqueado            BOOLEAN NOT NULL DEFAULT false,
  primeiro_acesso      BOOLEAN NOT NULL DEFAULT true,
  precisa_trocar_senha BOOLEAN NOT NULL DEFAULT true,
  pin_hash             TEXT,
  avatar               TEXT,
  caiaque_vinculado    TEXT,
  pendencias           JSONB NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mensalistas_telefone ON mensalistas(telefone);
CREATE INDEX IF NOT EXISTS idx_mensalistas_plano ON mensalistas(tipo_plano);
CREATE TRIGGER trg_mensalistas_updated_at BEFORE UPDATE ON mensalistas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS caiaques (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL,
  tipo       TEXT NOT NULL DEFAULT 'individual' CHECK (tipo IN ('individual','duplo')),
  status     TEXT NOT NULL DEFAULT 'livre' CHECK (status IN ('livre','em_uso','inoperante','reservado')),
  dono       TEXT,
  mensalista_id UUID REFERENCES mensalistas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_caiaques_updated_at BEFORE UPDATE ON caiaques FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS agendamentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensalista_id     UUID REFERENCES mensalistas(id) ON DELETE CASCADE,
  mensalista_nome   TEXT,
  caiaque_id        TEXT REFERENCES caiaques(id) ON DELETE SET NULL,
  data_reserva      DATE NOT NULL,
  horario_reserva   TEXT NOT NULL,
  saida             TEXT,
  status            TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','concluido','recusado','falta','cancelado')),
  criado_por_admin  BOOLEAN NOT NULL DEFAULT false,
  manual            BOOLEAN NOT NULL DEFAULT false,
  fotos_enviadas    BOOLEAN NOT NULL DEFAULT false,
  vistoria_pulada   BOOLEAN NOT NULL DEFAULT false,
  avaliado          BOOLEAN NOT NULL DEFAULT false,
  percurso_min      INTEGER,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_reserva);
CREATE INDEX IF NOT EXISTS idx_agendamentos_mensalista ON agendamentos(mensalista_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE TRIGGER trg_agendamentos_updated_at BEFORE UPDATE ON agendamentos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS locacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente         TEXT NOT NULL,
  telefone        TEXT,
  rg              TEXT,
  tipo            TEXT NOT NULL DEFAULT 'avulso' CHECK (tipo IN ('avulso','mensalista','instrutor')),
  mensalista_id   UUID REFERENCES mensalistas(id) ON DELETE SET NULL,
  caiaques_ids    TEXT[] NOT NULL DEFAULT '{}',
  lockers_ids     TEXT[] NOT NULL DEFAULT '{}',
  entrada         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previsao        TIMESTAMPTZ,
  saida           TIMESTAMPTZ,
  qtd_pessoas     INTEGER NOT NULL DEFAULT 1,
  com_instrutor   BOOLEAN NOT NULL DEFAULT false,
  pagamento       TEXT,
  valor_original  NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_final     NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','retornando','finalizado','cancelado')),
  status_retorno  TEXT,
  instrutor_agua  TEXT,
  observacoes     TEXT,
  agendamento_id  UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES perfis_staff(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_locacoes_status ON locacoes(status);
CREATE INDEX IF NOT EXISTS idx_locacoes_entrada ON locacoes(entrada);
CREATE TRIGGER trg_locacoes_updated_at BEFORE UPDATE ON locacoes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS historico_locacoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locacao_id    UUID,
  cliente       TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'avulso',
  mensalista_id UUID,
  caiaques_ids  TEXT[] NOT NULL DEFAULT '{}',
  entrada       TIMESTAMPTZ NOT NULL,
  saida         TIMESTAMPTZ NOT NULL,
  duracao_min   INTEGER,
  valor         NUMERIC(10,2) NOT NULL DEFAULT 0,
  pagamento     TEXT,
  com_instrutor BOOLEAN NOT NULL DEFAULT false,
  atraso_min    INTEGER NOT NULL DEFAULT 0,
  taxa_atraso   NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_reserva  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_locacoes(created_at);

CREATE TABLE IF NOT EXISTS fechamentos_caixa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_fechamento DATE UNIQUE NOT NULL,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  visitantes      INTEGER NOT NULL DEFAULT 0,
  detalhes        JSONB NOT NULL DEFAULT '{"Pix":0,"Débito":0,"Dinheiro":0,"Crédito":0,"Cartão":0}',
  fechado_por     TEXT NOT NULL,
  fechado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES perfis_staff(id)
);
CREATE INDEX IF NOT EXISTS idx_fechamentos_data ON fechamentos_caixa(data_fechamento);

CREATE TABLE IF NOT EXISTS fotos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       TEXT NOT NULL CHECK (tipo IN ('Paisagem','Segurança')),
  autor      TEXT NOT NULL,
  img_url    TEXT NOT NULL,
  data       DATE NOT NULL DEFAULT CURRENT_DATE,
  hora       TEXT,
  created_by UUID REFERENCES perfis_staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fotos_data ON fotos(data DESC);
CREATE INDEX IF NOT EXISTS idx_fotos_tipo ON fotos(tipo);

CREATE TABLE IF NOT EXISTS avarias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caiaque_id  TEXT REFERENCES caiaques(id) ON DELETE SET NULL,
  nivel       TEXT NOT NULL CHECK (nivel IN ('leve','inoperante')),
  descricao   TEXT,
  cliente     TEXT,
  locacao_id  UUID REFERENCES locacoes(id) ON DELETE SET NULL,
  resolvido   BOOLEAN NOT NULL DEFAULT false,
  por         TEXT NOT NULL,
  created_by  UUID REFERENCES perfis_staff(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspecoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caiaque_id  TEXT REFERENCES caiaques(id) ON DELETE SET NULL,
  tipo        TEXT NOT NULL DEFAULT 'revisao',
  descricao   TEXT NOT NULL,
  resultado   TEXT NOT NULL CHECK (resultado IN ('ok','pendente','falha')),
  por         TEXT NOT NULL,
  proxima     DATE,
  created_by  UUID REFERENCES perfis_staff(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensalista_id UUID REFERENCES mensalistas(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
  nota          INTEGER CHECK (nota BETWEEN 1 AND 5),
  comentario    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dias_fechados (
  data DATE PRIMARY KEY,
  motivo TEXT,
  created_by UUID REFERENCES perfis_staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lockers (
  id         TEXT PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'Livre' CHECK (status IN ('Livre','Ocupado')),
  locacao_id UUID REFERENCES locacoes(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO lockers (id) SELECT lpad(n::text, 2, '0') FROM generate_series(1, 20) n ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS fila_espera (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  telefone   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave  TEXT PRIMARY KEY,
  valor  JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO configuracoes (chave, valor) VALUES
  ('preco_base', '60'), ('preco_instrutor', '70'), ('multa_falta_mensalista', '200'),
  ('multa_falta_guardaria', '50'), ('taxa_atraso_intervalo_min', '10'), 
  ('taxa_atraso_valor', '5'), ('creditos_mensais', '8')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS estado_sistema (
  chave  TEXT PRIMARY KEY,
  valor  JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO estado_sistema (chave, valor) VALUES
  ('aviso_global', '{"ativo": false, "texto": "", "data": ""}'),
  ('sos', '{"ativo": false, "por": null, "hora": null}')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS auditoria (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao       TEXT NOT NULL,
  usuario    TEXT,
  created_by UUID REFERENCES perfis_staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_created ON auditoria(created_at DESC);

-- ============================================================
-- 2. FUNÇÕES DEPENDENTES DAS TABELAS
-- ============================================================

CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM perfis_staff WHERE id = auth.uid() AND ativo = true);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM perfis_staff WHERE id = auth.uid() AND role IN ('admin','dona') AND ativo = true);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION handle_new_staff_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfis_staff (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'instrutor')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- O trigger de auto-criação da staff após cadastro
CREATE TRIGGER on_auth_user_staff_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_staff_user();

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE perfis_staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensalistas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE caiaques            ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE locacoes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_locacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fechamentos_caixa   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE avarias             ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspecoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias_fechados       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lockers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_espera         ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE estado_sistema      ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_perfis_staff"       ON perfis_staff       FOR ALL USING (is_staff());
CREATE POLICY "staff_all_mensalistas"        ON mensalistas        FOR ALL USING (is_staff());
CREATE POLICY "staff_all_caiaques"           ON caiaques           FOR ALL USING (is_staff());
CREATE POLICY "staff_all_agendamentos"       ON agendamentos       FOR ALL USING (is_staff());
CREATE POLICY "staff_all_locacoes"           ON locacoes           FOR ALL USING (is_staff());
CREATE POLICY "staff_all_historico"          ON historico_locacoes FOR ALL USING (is_staff());
CREATE POLICY "staff_all_fechamentos"        ON fechamentos_caixa  FOR ALL USING (is_staff());
CREATE POLICY "staff_all_fotos"              ON fotos              FOR ALL USING (is_staff());
CREATE POLICY "staff_all_avarias"            ON avarias            FOR ALL USING (is_staff());
CREATE POLICY "staff_all_inspecoes"          ON inspecoes          FOR ALL USING (is_staff());
CREATE POLICY "staff_all_avaliacoes"         ON avaliacoes         FOR ALL USING (is_staff());
CREATE POLICY "staff_all_dias_fechados"      ON dias_fechados      FOR ALL USING (is_staff());
CREATE POLICY "staff_all_lockers"            ON lockers            FOR ALL USING (is_staff());
CREATE POLICY "staff_all_fila_espera"        ON fila_espera        FOR ALL USING (is_staff());
CREATE POLICY "staff_all_configuracoes"      ON configuracoes      FOR ALL USING (is_staff());
CREATE POLICY "staff_all_estado_sistema"     ON estado_sistema     FOR ALL USING (is_staff());
CREATE POLICY "staff_all_auditoria"          ON auditoria          FOR ALL USING (is_staff());

CREATE POLICY "mensalista_self_read"          ON mensalistas   FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "mensalista_own_agendamentos_r" ON agendamentos  FOR SELECT USING (mensalista_id IN (SELECT id FROM mensalistas WHERE auth_id = auth.uid()));
CREATE POLICY "mensalista_own_agendamentos_i" ON agendamentos  FOR INSERT WITH CHECK (mensalista_id IN (SELECT id FROM mensalistas WHERE auth_id = auth.uid()));
CREATE POLICY "mensalista_own_agendamentos_u" ON agendamentos  FOR UPDATE USING (mensalista_id IN (SELECT id FROM mensalistas WHERE auth_id = auth.uid()));
CREATE POLICY "mensalista_caiaques_read"      ON caiaques      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mensalista_dias_fechados_read" ON dias_fechados FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mensalista_config_read"        ON configuracoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mensalista_estado_read"        ON estado_sistema FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mensalista_avaliacoes_insert"  ON avaliacoes    FOR INSERT WITH CHECK (mensalista_id IN (SELECT id FROM mensalistas WHERE auth_id = auth.uid()));
