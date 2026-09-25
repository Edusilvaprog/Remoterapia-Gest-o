# 📋 PROMPT FINAL: REFORMULAÇÃO DO PAINEL ADMIN, FROTA COM PREÇOS, CAPACIDADE DE 1 A 5 E GUARDA-VOLUMES

> **Instrução para a IA**: Atue como desenvolvedor full-stack sênior especialista em Next.js (App Router), TypeScript, Tailwind CSS e Supabase. Implemente as melhorias abaixo no painel administrativo do projeto **Remoterapia** (`site-gestao/app/gestao/admin/AdminClient.tsx`) e seu vínculo dinâmico com a Recepção (`site-gestao/app/gestao/recepcao/novo-embarque/EmbarqueClient.tsx`), preservando rigorosamente a paleta náutica (azul náutico `#032b57`, ciano `#0284c7`, céu `#38bdf8`), acabamentos refinados e a integridade do banco de dados.

---

> 🚨 **REGRA DE OURO (PRESERVAR A CASCA / LAYOUT GLOBAL DO APP)**:
> 1. **NUNCA REMOVA O CABEÇALHO SUPERIOR NÁUTICO**: O `<header>` com a Logo `/logo.png`, o título em itálico **PAINEL ADMIN**, o status verde pulsante **OLÁ, ADMINISTRADOR**, o botão de vidro **TROCAR ÁREA**, o botão de alternar tema `<ThemeToggle />` e o botão vermelho **SAIR** (`logoutStaff`) **DEVEM CONTINUAR EXATAMENTE COMO ESTÃO**.
> 2. **NUNCA REMOVA A BARRA FLUTUANTE INFERIOR**: O componente `<AppBottomNav items={...} />` no rodapé da tela deve ser mantido. Não coloque abas no topo da página.
> 3. **ALTERAÇÕES CIRÚRGICAS**: Modifique **EXCLUSIVAMENTE O MIOLO/CONTEÚDO DOS BLOCOS INTERNOS** de cada aba dentro do container principal.

---

## 1. BANCO DE DADOS (SUPABASE / SQL)

1. **Limpeza de Exemplos Falsos (Frota e Guarda-Volumes)**:
   ```sql
   -- Limpar caiaques e armários de teste/exemplo
   DELETE FROM caiaques WHERE nome ILIKE '%teste%' OR nome ILIKE '%exemplo%' OR id ILIKE 'teste%';
   DELETE FROM lockers WHERE nome ILIKE '%teste%' OR nome ILIKE '%exemplo%';
   ```

2. **Garantir Colunas de Tarifas, Capacidade e Papéis**:
   ```sql
   -- Colunas de tarifas por pessoa/hora e capacidade na tabela caiaques
   ALTER TABLE caiaques 
     ADD COLUMN IF NOT EXISTS capacidade INTEGER DEFAULT 1,
     ADD COLUMN IF NOT EXISTS preco_sem_instrutor NUMERIC(10,2) DEFAULT 0.00,
     ADD COLUMN IF NOT EXISTS preco_com_instrutor NUMERIC(10,2) DEFAULT 0.00;

   -- Suporte a múltiplos papéis no perfil do funcionário
   ALTER TABLE perfis_staff 
     ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';
   ```

---

## 2. PAINEL ADMIN (`site-gestao/app/gestao/admin/AdminClient.tsx`)

### A. Barra Inferior Flutuante (`AppBottomNav`)
- Atualizar a lista de itens da `<AppBottomNav>` para 4 abas perfeitamente equilibradas:
  ```tsx
  <AppBottomNav 
    items={[
      { label: 'USUÁRIOS', icon: '👤', active: tab === 'usuarios', onClick: () => setTab('usuarios') },
      { label: 'FROTA & PREÇOS', icon: '🛶', active: tab === 'frota', onClick: () => setTab('frota') },
      { label: 'GUARDA-VOLUMES', icon: '🔐', active: tab === 'lockers', onClick: () => setTab('lockers') },
      { label: 'AUDITORIA', icon: '📝', active: tab === 'auditoria', onClick: () => setTab('auditoria') },
    ]}
  />
  ```

---

### B. Bloco `USUÁRIOS` (`tab === 'usuarios'`)
1. **Bandeja Suave Azulada (`bg-[#eaf4fc]`)**:
   - Manter a seleção por **quadradinhos (checkboxes)** limpos e intuitivos:
     - `[ ] EQUIPE ÁGUA` (operador na água / instrutor - `/gestao/agua`)
     - `[ ] EQUIPE AREIA` (atendimento recepção / aluguel balcão - `/gestao/recepcao`)
     - `[ ] EVENTOS / PORTAL` (gestão de alunos e eventos - `/gestao/portal`)
     - `[ ] GESTÃO` (administrativo, guardaria e fechamento - `/gestao/dona`)
     - `[ ] TI (ADMIN)` (gerenciamento irrestrito do sistema - `/gestao/admin`)
2. **Gravação**:
   - Utilizar `criarStaff` (de `lib/actions/auth.ts`) gravando a conta no Supabase Auth e o perfil em `perfis_staff` com array de `roles`.

---

### C. Bloco `FROTA & PREÇOS` (`tab === 'frota'`)
1. **Formulário de Cadastro**:
   - **Valores iniciais zerados**: Os campos "Sem Instrutor" e "Com Instrutor" iniciam zerados (`0,00`).
   - **Capacidade padrão 1**: O seletor de capacidade inicia selecionado por padrão como `1 Pessoa (Solo / Individual)`, com dropdown contendo:
     - `1 Pessoa (Solo / Individual)` (Default)
     - `2 Pessoas (Duplo)`
     - `3 Pessoas (Triplo)`
     - `4 Pessoas (Família - 4 Lugares)`
     - `5 Pessoas (Família - 5 Lugares)`
2. **Edição Separada (Dois Modais)**:
   - **Modal 1: `✏️ Editar Dados da Embarcação`**:
     - Edita Nome/ID e a Capacidade de Lotação classificada de **1 a 5 Pessoas**.
     - Botão `✕ CANCELAR` estilizado e de alto contraste em cinza slate.
     - Botão `💾 SALVAR DADOS` em azul náutico.
   - **Modal 2: `💲 Ajustar Tarifas da Embarcação`**:
     - Dois cards: **Sem Instrutor (Remada Livre)** e **Com Instrutor (Acompanhado)** com badges, prefixo `R$` estilizado, sufixo `/pessoa/h` e botões rápidos (`- R$ 5`, `+ R$ 5`).
     - Botão `✕ CANCELAR` estilizado e nítido.
     - Botão `💾 SALVAR PREÇOS`.
3. **Ações no Card**:
   - `✏️ Editar Dados`, `💲 Editar Preço`, `⏸️ Pausar / 🟢 Reativar`, `🗑️ Excluir`.

---

### D. Vínculo Automático com a Recepção (`novo-embarque/EmbarqueClient.tsx`)
1. **Consulta no Server Component (`novo-embarque/page.tsx`)**:
   ```tsx
   const { data: caiaquesData } = await supabase
     .from('caiaques')
     .select('id, nome, tipo, status, capacidade, preco_sem_instrutor, preco_com_instrutor')
     .neq('status', 'inoperante')
     .order('id', { ascending: true })
   ```
2. **Cálculo Dinâmico na Recepção (`EmbarqueClient.tsx`)**:
   ```tsx
   const temInstrutor = Boolean(instrutor && instrutor !== 'Sem Instrutor')
   const precoUnitario = temInstrutor 
     ? (caiaqueAtual.preco_com_instrutor ?? 70) 
     : (caiaqueAtual.preco_sem_instrutor ?? 60)

   const valorBase = precoUnitario * qtdEfetiva
   const valorTotal = Math.round(valorBase * (tempo / 60))
   ```

---

### E. Bloco `GUARDA-VOLUMES` (`tab === 'lockers'`)
1. **Termo 100% em Português**: Nenhuma menção a "Lockers" na tela, somente **"Guarda-Volumes"**.
2. **Ações em Cada Guarda-Volumes**:
   - Badge de status: `Livre 🟢` / `Ocupado 🔴` (alterna ao clicar).
   - **Botão de Exclusão (`🗑️`)**: Botão com ícone de lixeira em cada card de guarda-volumes, solicitando confirmação de segurança e disparando `DELETE FROM lockers WHERE id = :id`.

---

### F. Bloco `AUDITORIA` (`tab === 'auditoria'`)
1. Card de "Aviso Global & SOS" (`COMUNICAÇÃO & SEGURANÇA`) totalmente **removido**.
2. Registro estritamente cronológico de ações e acessos da equipe náutica.

---

## 3. CHECKLIST DE VERIFICAÇÃO FINAL
- [ ] O cabeçalho náutico original (Logo, Título, Trocar Área, Tema, Sair) continua presente e intacto.
- [ ] A barra inferior flutuante (`AppBottomNav`) está visível no rodapé com 4 abas equilibradas.
- [ ] O formulário de cadastro de caiaque inicia com valores zerados (`0,00`) e capacidade padrão `1`.
- [ ] O modal de edição de dados possui classificação de capacidade de 1 a 5 pessoas.
- [ ] Cada card de Guarda-Volumes possui seu botão de exclusão (`🗑️`) funcional.
- [ ] Os botões `✕ CANCELAR` em todos os modais são visíveis, com texto legível e borda cinza.
- [ ] A recepção calcula o valor total multiplicando a tarifa da embarcação pelo número de tripulantes e tempo.
- [ ] Build do `site-gestao` compila sem erros (`npm run build`).
