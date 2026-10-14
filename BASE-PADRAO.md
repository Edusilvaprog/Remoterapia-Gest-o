# Base de edição — Remoterapia

Revisão concluída em 13–14/10/2026. Ambiente: prévia local separada, com dados fictícios compartilhados entre Gestão e Portal. Esta revisão prepara a apresentação para personalização e aprovação; não publica o produto nem comprova o funcionamento das integrações em produção.

## Acessos

- Editor: http://localhost:3010/
- Gestão da prévia: http://localhost:3015/gestao/painel
- Portal da prévia: http://localhost:3016/
- Inicialização: `Abrir-Previa.cmd`, nesta pasta.

Os acessos da prévia são fictícios e não precisam da senha real. Os aplicativos atuais permanecem nas pastas originais e nas versões principais do GitHub.

## Estrutura entregue

| Área | Computador | Celular | Funções mantidas |
| --- | --- | --- | --- |
| Portal / Início | Plano lateral e tabela de reservas | Cota semanal e cartões de reserva | Agendar, cancelar, consultar motivo e abrir eventos |
| Portal / Meu perfil | Identificação lateral; assinatura, conta e suporte em painéis | Identificação compacta e painéis empilhados | Foto, planos, inscrições, roteiros, senha, instalação, suporte e saída |
| Portal / Histórico | Tabela com ações, busca, mês e filtros | Cartões agrupados por mês, busca e filtros | Avaliar remada, reagendar, abrir inscrições e solicitar atendimento |
| Portal / Agendar | Etapas e resumo lateral fixo | Etapas sequenciais e resumo abaixo | Calendário, disponibilidade, horário, embarcação, armário e confirmação |
| Portal / Eventos | Cards e janela de detalhes existentes, com linguagem objetiva | Mesmas informações adaptadas ao espaço menor | Detalhes, quantidade, vagas e acesso ao pagamento preparado |
| Gestão / Visão geral | Indicadores, agenda e acessos administrativos | Indicadores e atalhos operacionais | Consultar agenda e acessar as áreas permitidas ao perfil |
| Gestão / Áreas | Agrupamento de administração e cadastros | Inclui também Equipe de água e Equipe de areia | Navegação conforme as funções do usuário |
| Gestão / Administrador | Resumo e navegação superior entre seções, tabelas e formulários | Resumo e navegação de celular preservada | Equipe, funções, frota, capacidade, tarifas, guarda-volumes e auditoria |
| Gestão / Demais áreas | Painéis e formulários existentes com padrões comuns de aparência | Operação e formulários existentes preservados | Alunos, reservas, planos, eventos, guardaria, diário, clima, mídia e configurações |

Perfil, Histórico e Início agora usam componentes de apresentação compartilhados, com estruturas diferentes por tamanho de tela. Foram removidos os dois componentes antigos de perfil e histórico para computador que deixaram de ter referências. Os manipuladores de negócio e a coordenação principal do Portal foram preservados.

As áreas operacionais de embarque continuam destinadas ao celular, conforme a decisão anterior. Elas não são oferecidas como tarefa do painel de computador.

## Padrões aplicados

Cores azul e rosa da identidade já utilizada, ícones SVG, hierarquia de títulos, espaços consistentes, campos e botões com resposta visual, foco de teclado, indicação de seleção e controles desabilitados quando falta uma escolha. As animações respeitam a preferência por movimento reduzido. O editor mantém os ajustes de celular e computador separados.

Foram registrados 31 blocos e 201 textos explícitos nos componentes revisados, além de sete rótulos editáveis de indicadores. Controles funcionais são protegidos contra ocultação; indicadores de apresentação podem ser ocultados e restaurados. Os ajustes visuais anteriores foram mantidos.

## Correções funcionais da revisão

- Ao trocar a data, o horário e as escolhas dependentes são limpos. A confirmação exige as escolhas completas. A troca de horário limpa embarcação e armário; a troca de embarcação limpa o armário.
- O botão de voltar do agendamento usa a ação existente de retorno ao Início.
- A ação de cancelamento recebe a data original do registro, incluindo no computador.
- Cancelamentos antigos ficam no Histórico e não ocupam a agenda do Início.
- As ações de reagendamento por clima e atendimento para reembolso também aparecem no Histórico do computador.
- A janela de inscrições informa a situação real do evento, inclusive concluído ou cancelado.
- A agenda da Gestão não duplica o intervalo de horário e não inventa uma hora final quando ela não foi registrada.
- Um preço ausente, inválido ou não positivo no evento apresenta “Preço a confirmar” e bloqueia a ação de pagamento; não aparece como zero ou `NaN`.
- A seleção no editor não força mais a rolagem da página inteira. Inspetor e prévia têm rolagem própria no computador.

## Verificação realizada

| Conferência | Resultado |
| --- | --- |
| Compilação otimizada do Portal e da Gestão em pasta separada | Passou nos dois aplicativos |
| TypeScript dos dois aplicativos | Passou |
| Teste do simulador local | Passou: acesso fictício, compartilhamento, reserva, cancelamento e bloqueio de integrações |
| Agendamento no Portal | Confirmado com horário, caiaque e armário; cota e Início atualizados |
| Reserva compartilhada na Gestão | Mesma reserva encontrada na agenda, com horário correto |
| Alteração de data durante agendamento | Escolhas limpas e confirmação desabilitada |
| Histórico | Filtro, busca sem resultados, avaliação de quatro estrelas, agrupamento mensal e abertura do reagendamento conferidos |
| Perfil | Layouts dos dois tamanhos e abertura de inscrições conferidos |
| Administração no computador | Usuários, frota, janela de tarifas, guarda-volumes e auditoria abertos |
| Recepção no celular | Inclusão, edição e remoção de entrada fictícia na fila confirmadas |
| Eventos | Janela de detalhes, preço ausente bloqueado, preço válido e mensagem de integração em preparação conferidos |
| Editor | Texto alterado pelo seletor, separação das versões e inclusão/remoção de bloco conferidos; rascunhos de teste descartados |
| Telas pequenas | Perfil, Histórico e Agendar sem transbordamento horizontal em 320 px; conferência visual também em 390 px |
| Recarregamento do editor | Tabelas e histórico de alterações fictícias preservados e comparados integralmente |
| Aplicativos originais | 160 arquivos de aplicação conferidos sem alterações; as duas diferenças do manifesto são os `.gitignore` da etapa anterior de backup |

As capturas desta revisão estão em `evidencias-base/`. A compilação da Gestão ainda emite avisos da convenção antiga de middleware e de uma API interna do Next no Edge Runtime; não impediram a compilação, mas devem ser tratados na preparação de produção. Esta revisão não altera a autenticação para resolver esses avisos.

O clique direto e o duplo clique do editor continuam disponíveis. A automação do navegador não conseguiu completar esses cliques na prévia incorporada; por isso a comprovação de alteração de texto foi feita pela lista “Textos desta tela”. Esse ponto merece a confirmação manual durante a aprovação.

## Como personalizar

1. Escolha Gestão ou Portal e a área desejada no editor.
2. Escolha Celular ou Computador. Cada versão possui seu próprio rascunho.
3. Use **Navegar** para testar as ações. Ative **Editar conteúdo** para selecionar textos ou blocos; se necessário, use as listas de textos e áreas.
4. Ajuste texto, cor, cantos e espaçamento. Selecione uma área para adicionar conteúdo.
5. Salve na nova versão. Use restaurar elemento, desfazer ou descartar rascunho para recuperar o resultado anterior.

Nomes de alunos, preços cadastrados, datas e situações são dados do sistema: edite-os nos cadastros correspondentes, não como texto de apresentação. Adicionar um bloco visual não cria uma função nova de negócio.

## Antes de publicar

Após a aprovação visual, a versão precisa de uma preparação própria de produção: aplicação e credenciais do Mercado Pago, webhooks e testes de cobrança; domínio e serviço de e-mails; validação dos acessos reais, permissões e políticas do Supabase; revisão dos avisos de middleware; implantação com o modo local desativado. Senhas, uploads, MFA e cobranças reais não foram executados nesta revisão. Os endpoints desses recursos continuam separados da simulação.

O GitHub guarda o código e os ajustes salvos do editor. Os exemplos de negócio ficam na memória do processo e devem ser exportados pelo editor caso você queira guardar uma revisão deles. O ZIP anterior à mudança e os estados locais de recuperação estão fora desta pasta, em `work/base-padrao-recuperacao/`, para evitar publicação acidental de snapshots.
