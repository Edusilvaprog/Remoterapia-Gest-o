# 📋 PROMPT FINAL: GESTÃO DO PORTAL, PREÇOS DINÂMICOS E DIRETÓRIO DE CLIENTES

> **Instrução para a IA**: Atue como desenvolvedor full-stack sênior especialista em Next.js (App Router), TypeScript, Tailwind CSS e Supabase. Implemente as melhorias abaixo no projeto náutico **Remoterapia** (`site-gestao` e `site-agendamento`), preservando rigorosamente o design náutico existente (azul escuro náutico, detalhes em ciano, acabamento arredondado e tema escuro/claro), sem quebrar rotas ativas ou agendamentos diários.

---

## 1. BANCO DE DADOS (SUPABASE / SQL)

1. Na tabela `configuracoes`, garantir a chave `'tabela_clubes'` com a estrutura padrão editável:
   ```sql
   INSERT INTO configuracoes (chave, valor)
   VALUES (
     'tabela_clubes', 
     '{"mensalista": 150.00, "guardaria": 150.00, "remadas_semanais": 2, "horario_corte": "19:00", "dia_manutencao": "Segunda-feira"}'::jsonb
   )
   ON CONFLICT (chave) DO NOTHING;
   ```

2. Na tabela `inscricoes_eventos`:
   ```sql
   ALTER TABLE inscricoes_eventos 
     ADD COLUMN IF NOT EXISTS nomes_acompanhantes TEXT[] DEFAULT '{}',
     ADD COLUMN IF NOT EXISTS checkin_realizado BOOLEAN DEFAULT false,
     ADD COLUMN IF NOT EXISTS status_presenca TEXT DEFAULT 'pendente';
   ```

---

## 2. PAINEL DE GESTÃO DO PORTAL (`site-gestao/app/gestao/portal/PortalClient.tsx`)

### A. Navegação Inferior (`components/AppBottomNav.tsx` e `PortalClient.tsx`)
1. **Preservação das Abas e Desenhos**:
   - Manter rigorosamente os 4 desenhos originais que foram aprovados:
     - `AGENDAMENTOS`: 📅 (Calendário)
     - `BLOQUEIOS`: 🚫 (Símbolo de bloqueio vermelho)
     - `CLIENTES`: 👥 (Silhueta de pessoas)
     - `EVENTOS`: 🎟️ (Ticket dourado)
   - **Novo Desenho de PLANOS**:
     - Definir estritamente o ícone **`💳` (Cartão do Clube / Assinatura)** no `AppBottomNav` e no `PortalClient.tsx`, que possui formato retangular e harmônico compatível com o ticket de eventos.
2. **Correção Definitiva do Desalinhamento dos Botões**:
   - Em `components/AppBottomNav.tsx` (quando sem `centerAction`):
     - Substituir o container solto por **grid rigoroso de 5 colunas de largura idêntica** (`grid grid-cols-5 w-full items-center`) ou atribuir `flex-1` para cada botão, garantindo exatamente 20% da largura da barra para cada item.
     - **Container Fixo para os Ícones**: Envolver cada ícone em uma `div` com dimensões fixas (`w-8 h-7 flex items-center justify-center text-2xl leading-none`), para que ícones com proporções diferentes (como o ticket retangular e o calendário quadrado) fiquem exatamente no mesmo eixo vertical.
     - **Linha de Base Uniforme para os Textos**: Fixar os rótulos em `h-3.5 flex items-center justify-center text-[9px] font-black uppercase tracking-wider leading-none`, garantindo que todas as palavras fiquem na mesma linha horizontal milimétrica.
3. **Estado Inicial**:
   - Manter a aba padrão inicial ao carregar como **`agendamentos`**.

---

### A.1. Filtros Rápidos Interativos na Aba: `AGENDAMENTOS`
1. **Barra de Filtros Deslizante (Interativa e Sem Travar)**:
   - Na linha de filtros rápidos de agendamento (`Todos`, `🛶 Mensalista`, `🏖️ Guardaria`, `☀️ Nascer do Sol`, etc.), transformar a barra em um trilho deslizante fluido:
   - **Suporte a Mouse Drag (Desktop)**: Implementar interação de arraste com o mouse (`onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave`) para permitir clicar e puxar a barra para os lados livremente, com classes `cursor-grab active:cursor-grabbing select-none`.
   - **Suporte a Toque (Mobile/Tablet)**: Rolagem suave e sem atrito (`scroll-smooth touch-pan-x no-scrollbar`).
   - Adicionar espaçamento de respiro no final (`pe-4` ou `padding-right: 16px`) para que o último filtro nunca fique cortado ou travado na borda da tela.

---

### B. Nova Aba de Configurações: `PLANOS` (Layout Compacto com Trava de Segurança)
1. **Cabeçalho Limpo**:
   - Manter apenas o título: **`CONFIGURAÇÃO DE PLANOS`**.
   - **Remover completamente o subtítulo** (*"Defina os valores padrão..."*).
   - Exibir badge discreto de status: `🔒 Travado` (quando em visualização) ou `✏️ Em Edição` (quando destravado).

2. **Valores dos Clubes Compactos e Elegantes (Sem Blocos Gigantes)**:
   - Em vez de caixas grandes empilhadas, utilizar um cartão compacto com linhas enxutas e horizontais:
     - **Linha 🛶 MENSALISTA**:
       - Badge com ícone `🛶 MENSALISTA`.
       - Campo de valor: `R$ [ 150,00 ]` (compacto e alinhado à direita).
       - Campo de remadas: `Remadas: [ 2 ]` (campo numérico slim).
     - **Linha 🏖️ GUARDARIA**:
       - Badge com ícone `🏖️ GUARDARIA`.
       - Campo de valor: `R$ [ 150,00 ]` (compacto e alinhado à direita).
       - *(Atenção: Não incluir campos de embarcação, vaga ou armário para Guardaria nesta tela)*.

3. **Seção `REGRAS` (Nome Exato)**:
   - Título do bloco: estritamente **`REGRAS`**.
   - **Horário de Corte dos Agendamentos**:
     - Campo slim de horário (ex: `"19:00"`) acompanhado de legenda explicativa: *"Limite no dia anterior para confirmar remada no app"*.
   - **`Dia de manutenção`** (Rótulo Exato):
     - Grid de botõezinhos com as opções: `Segunda`, `Terça`, `Quarta`, `Quinta`, `Sexta`, `Sábado`, `Domingo` ou `Nenhum`.
     - O dia selecionado fica com preenchimento azul náutico sólido.
     - Aviso explicativo limpo e natural (sem banners robóticos):
       *"Selecione o dia de manutenção da base para bloquear automaticamente os agendamentos no Portal do Aluno."*

4. **Sistema de Trava e Edição (Segurança Operacional)**:
   - **Estado Inicial (Travado)**:
     - Todos os inputs de mensalidade, remadas, horário e botões de dias iniciam **desabilitados (`disabled`)** em modo somente-leitura com visual limpo.
     - Botão de ação inferior: **`✏️ ALTERAR PLANOS E REGRAS`** (com fundo azul náutico).
   - **Ao Clicar em "Alterar"**:
     - Habilita todos os inputs e botões de dias para edição.
     - O botão inferior se transforma em: **`SALVAR`** (com botão lateral `Cancelar`).
   - **Ao Clicar em "Salvar"**:
     - Grava via `upsert` na tabela `configuracoes` (`chave: 'tabela_clubes'`) com o payload:
       `{ mensalista: ..., guardaria: ..., remadas_semanais: ..., horario_corte: ..., dia_manutencao: ... }`.
     - Exibe toast de sucesso: *"Configurações salvas com sucesso!"*.
     - **Retorna automaticamente ao estado travado** para prevenir edições acidentais.

---

### C. Refatoração da Aba: `CLIENTES` (Diretório Limpo e Consulta)
1. **Lógica de Auto-Cadastro dos Alunos**:
   - Como os clientes realizam o auto-cadastro diretamente pelo Portal/Site de Agendamento, a gestão **não cria** e **não altera** cadastros.
   - **Remover o botão `+ Adicionar Aluno`** do cabeçalho.
   - **Remover qualquer badge ou bloco extra no topo direito** da linha de título. Deixar apenas o título limpo: `CLIENTES CADASTRADOS (N)`.
   - **Remover o botão `Editar`** dos cartões de cliente.

2. **Barra de Pesquisa**:
   - Campo de busca instantânea filtrando por Nome ou WhatsApp do cliente em tempo real.

3. **Filtros Rápidos Deslizantes (Interativos)**:
   - Barra horizontal de botões com rolagem suave e suporte a toque/arraste:
     - `Todos (N)`
     - `🛶 Mensalista (N)`
     - `🏖️ Guardaria (N)`
     - `Portal do Aluno (N)` (clientes cadastrados de forma autônoma pelo portal)

4. **Padronização dos Cards de Cliente**:
   - **Status Consistente no Canto Superior Direito**:
     - Todos os cards (Mensalista, Guardaria ou Portal do Aluno) devem exibir a mesma pílula de status no canto superior direito:
       - `● Ativo` (`bg-emerald-100 text-emerald-800 border-emerald-200`)
       - `● Pendente` (`bg-amber-100 text-amber-800 border-amber-200`)
       - `● Bloqueado` (`bg-red-100 text-red-800 border-red-200`)
   - **Origem no Canto Superior Esquerdo**:
     - `🛶 Clube Mensalista`
     - `🏖️ Clube Guardaria`
     - `Portal do Aluno`
   - **Contato**: Nome completo em destaque, telefone formatado com máscara `📱 (13) 99740-3331` e e-mail.
   - **Bloco de Detalhes do Plano (Somente-Leitura)**:
     - **Mensalista**: Exibe mensalidade recorrente, créditos semanais e dia de vencimento.
     - **Guardaria**: Exibe mensalidade e **apenas a embarcação vinculada** (ex: `🛶 Epic V7 Surfski`) e dia de vencimento. **Sem menção a guarda-volume, armário ou vaga**.
     - **Portal do Aluno**: Exibe `Origem do Cadastro: Portal do Aluno`, `Plano / Vínculo: Nenhum Vinculado` e `Data do Cadastro: DD/MM/AAAA`.
   - **Ação Única em Largura Total (100%)**:
     - Botão verde destacado: **`💬 Falar no WhatsApp`**, abrindo diretamente a conversa pelo link `https://wa.me/55...`.

---

### D. Refatoração dos Modais de Evento (`Novo Evento` e `Nascer do Sol`)
1. **Título do Modal**:
   - O título no cabeçalho do modal deve ser estritamente **`Novo Evento`** (ou `Editar Evento` em modo de edição).

2. **Campos 100% Zerados por Padrão (Ambos os Modos)**:
   - Ao abrir o modal (seja pelo botão `+ Novo Evento` ou pelo atalho `☀️ Nascer do Sol`), **nenhuma informação deve vir pré-preenchida**:
     - Título: em branco (placeholders elegantes).
     - Data: em branco.
     - Horários início e fim: em branco.
     - Preço: zerado (`0,00`).
     - Vagas totais: zerado (`0`).
     - Local: em branco.
     - Observações: em branco.
2. **Preço**:
   - Rótulo exato: **`Preço`** (remover "por vaga").
   - Bloco compacto, com o valor centralizado (`text-align: center`) e símbolo `R$` discreto.
3. **Vagas Totais**:
   - Eliminar os spinners nativos do browser (`▲▼`). Utilizar controle limpo com botões circulares/arredondados `[ − ]` e `[ + ]` e valor numérico centralizado.
4. **Observações & Itens Inclusos**:
   - Bloco amplo e expansível (`rows={3}` ou mais), sem contadores ou limites de escrita.
5. **Roteiro / Linha do Tempo**:
   - **Desativado por padrão nos dois modos**.
   - Ao clicar no checkbox de inclusão, a lista de paradas deve iniciar **100% zerada**, com botão `+ Adicionar Parada` para preenchimento dinâmico.
6. **Botões de Ação Limpos (Sem Desenhos/Emojis)**:
   - No modal do Nascer do Sol: botão com texto exato **`Publicar`** (sem emojis ou ícones).
   - No modal de Novo Evento: botão com texto exato **`Publicar Evento no Site`** (sem emojis ou ícones).

---

### E. Refatoração e Sincronização Real da Aba: `BLOQUEIOS`
1. **Correção do Alinhamento dos Dias (Bug do Dia 1 no Domingo)**:
   - Calcular o dia da semana em que o mês começa: `const primeiroDiaSemana = new Date(ano, mesIndex, 1).getDay()`.
   - Renderizar células vazias no início da grade para que o dia 1º caia na coluna correta da semana (ex: 1º de Setembro de 2026 cai em uma Terça-feira e não no Domingo).
2. **Design Náutico dos Dias**:
   - Manter o título `CALENDÁRIO DE BLOQUEIOS` e o subtítulo `DIAS SELECIONADOS FICAM INDISPONÍVEIS NO APP`.
   - Botões de dias com cantos arredondados (`rounded-2xl` / 14px), números nítidos e feedback visual:
     - Dias livres: brancos com borda náutica suave.
     - Dias bloqueados: vermelho náutico destacado (`bg-red-500 text-white shadow-md shadow-red-500/25` com etiqueta `BLOQ`).
     - Dia de Hoje: contorno azul náutico.
   - Resumo no topo da grade: contador exibindo `X dia(s) bloqueado(s) neste mês`.
   - Botão inferior: **`Confirmar e Sincronizar com o Site`** com espaçamento amplo e sem quebra/sobreposição de texto.
3. **Sincronização Completa com Supabase**:
   - Ao salvar, além de inserir/atualizar os dias bloqueados, **deletar da tabela `dias_fechados`** os dias que o administrador desmarcou no calendário.
4. **Integração Dinâmica no Site de Agendamento do Aluno (`site-agendamento/components/AgendamentoWizard.tsx`)**:
   - Conectar o seletor de datas do aluno tanto à tabela `dias_fechados` quanto à regra de manutenção de `configuracoes` (`tabela_clubes`).
   - **Remover a regra fixa/hardcoded de segunda-feira** (`if (d.getDay() === 1) return true`).
   - Substituir pela verificação dinâmica do `dia_manutencao` cadastrado na aba Planos:
     - Mapear o nome do dia configurado (`Segunda-feira` -> 1, `Terça-feira` -> 2, etc.) para o índice correspondente. Se for `Nenhum`, não bloquear nenhum dia da semana por padrão.
   - Na função `isLocked(d: Date)`:
     - Se o dia da semana bater com o `dia_manutencao` ativo, bloquear o dia no app.
     - Se a data estiver registrada em `dias_fechados`, bloquear o dia no app.
   - Desta forma, tanto o dia de folga/manutenção semanal definido em Planos quanto as datas pontuais fechadas em Bloqueios funcionam perfeitamente sincronizados no agendamento do aluno!

---

## 3. CHECKLIST DE VERIFICAÇÃO FINAL
- [ ] O build do `site-gestao` (`npm run build`) compila com 0 erros.
- [ ] A barra inferior (`AppBottomNav`) possui os 5 botões perfeitamente alinhados na mesma linha horizontal (grid de 20% para cada), mantendo os desenhos originais de Agendamentos, Bloqueios, Clientes e Eventos, e com o ícone do Cartão `💳` para Planos.
- [ ] Na aba `AGENDAMENTOS`, a barra de filtros rápidos é interativa, deslizando livremente para os lados no toque e com suporte a clique e arraste (drag-to-scroll) no mouse.
- [ ] Na aba `PLANOS`, o subtítulo foi removido, exibindo apenas o título limpo `CONFIGURAÇÃO DE PLANOS` com badge de status.
- [ ] Na aba `PLANOS`, os valores de Mensalista e Guardaria são exibidos em linhas compactas sem blocos gigantes e sem campos extras de embarcação em Guardaria.
- [ ] O bloco de regras tem o título estrito `REGRAS` e o campo de folga tem o rótulo estrito `Dia de manutenção`.
- [ ] Na aba `PLANOS`, os campos iniciam travados (somente leitura) e só liberam edição ao clicar em 'Alterar Planos e Regras', salvando no Supabase e travando novamente ao clicar em 'Salvar'.
- [ ] Na aba `PLANOS`, o seletor de Dia de Manutenção permite escolher interativamente o dia (ou Nenhum) e salva dinamicamente em `tabela_clubes`.
- [ ] O topo da aba Clientes não possui botão de adicionar nem texto 'Cadastro Online' no canto direito.
- [ ] A barra de filtros desliza suavemente e filtra entre Todos, Mensalista, Guardaria e Portal do Aluno.
- [ ] O card do cliente exibe o status `● Ativo` no canto superior direito e `Portal do Aluno` na origem.
- [ ] O card de guardaria exibe somente a embarcação vinculada, sem guarda-volumes ou vaga.
- [ ] Os modais de Evento abrem 100% zerados em ambos os atalhos.
- [ ] O título do modal de criação é 'Novo Evento'.
- [ ] O campo de preço tem rótulo 'Preço' e valor centralizado.
- [ ] O roteiro abre zerado sem paradas prévias quando marcado.
- [ ] Os botões de envio não contêm desenhos/emojis ('Publicar' e 'Publicar Evento no Site').
- [ ] O calendário de Bloqueios alinha o dia 1º no dia da semana correto (ex: terça-feira em setembro/2026).
- [ ] Os dias bloqueados na gestão impedem o agendamento no `site-agendamento` do aluno.
- [ ] Dias desmarcados na gestão são removidos corretamente da tabela `dias_fechados`.
- [ ] O app do aluno respeita dinamicamente o dia de manutenção configurado em Planos, sem travar segundas-feiras por código estático.
