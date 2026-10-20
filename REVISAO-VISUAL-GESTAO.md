# Gestão — atualização dos trechos antigos — 19/10/2026

Referência funcional lida: `C:\Users\Admin\Music\remoterapia-v2\site-gestao`. Essa pasta não foi modificada. Implementação somente na prévia, usando cores, ícones SVG e componentes já presentes. Nenhuma referência nova foi enviada nesta etapa.

## Critério

Comparação dos componentes e das classes com o backup, considerando também os estilos atuais. Classes iguais, isoladamente, não provam que uma tela continua antiga. Painéis desktop já reconstruídos foram mantidos; trechos móveis que ainda renderizavam os cartões antigos receberam estilos identificados e limitados ao celular. Sem dependência adicional ou biblioteca de animações.

## Mapa por área

| Área | Computador | Celular |
|---|---|---|
| Entrada, recuperação e escolha de área | Base atual preservada | Base atual preservada |
| Visão geral | Painel atual preservado | Atalhos e cartões atuais preservados |
| Equipe de água | Continua exclusiva do celular | Cartões do Mar, nomes, tempo e ação de retorno com o padrão visual novo; abas Mar/Fotos/Tempo mantidas |
| Equipe de areia | Continua exclusiva do celular | Painel e fila já renovados preservados |
| Novo embarque | Continua exclusivo do celular | Formulário, campos, botões e total com apresentação atualizada; cálculo, opções e liberação preservados |
| Clientes da recepção | Nova tabela com cliente/contato, plano, créditos, vencimento, acesso e atendimento; busca e cadastro no topo | Lista, cadastro e filtros mantidos, com cartões e controles atualizados |
| Agendamentos da recepção | Nova tabela por aluno, data, horário, embarcação, plano, situação e avaliação; suspensão por clima preservada | Cartões e confirmação de suspensão atualizados; liberação da saída mantida no celular |
| Eventos da recepção | Cabeçalho e indicadores reorganizados; grade de dois cartões; diálogos com largura de computador | Lista em uma coluna, cartões, filtros e controles atualizados |
| Alunos e reservas: cinco abas | Painéis novos preservados | Base atual preservada |
| Administrador: quatro abas | Painéis novos preservados | Base atual preservada |
| Guardaria: quatro abas | Painéis novos preservados | Base atual preservada |
| Resultados | Painel novo preservado | Trechos antigos dos indicadores, relatórios e gráficos atualizados |
| Feedback | Organização desktop atual preservada | Resumo, distribuição e trechos antigos dos cartões atualizados |
| Galeria da Direção | Organização desktop atual preservada | Trechos antigos dos filtros/cartões atualizados; abertura de imagem e ações mantidas |
| Diário | Tabela desktop atual preservada | Cartões, data, duração e identificações com apresentação atualizada |
| Fechamento | Conferência desktop atual preservada | Trechos antigos da consulta, recebimentos e relatório atualizados |
| Clima | Painel desktop atual preservado | Cartões antigos de previsão e radar atualizados; temperatura principal continua em destaque |
| Mídia / Fotos | Área desktop atual preservada | Categorias e controles antigos de envio atualizados; câmera, galeria e limite de fotos mantidos |
| Pagamentos, configurações e segurança | Base atual preservada | Base atual preservada |

## O que foi preservado

- Funções, validações, filtros, cálculos, consultas, comandos e navegação existentes nas 12 telas alteradas.
- Os mesmos registros alimentam as duas apresentações. As tabelas não criam um cadastro paralelo.
- Campos, planos, permissões e nomes funcionais existentes. Textos de contexto acrescentados identificam a informação ou a ação concreta.
- Personalizações do rascunho do editor, banco de dados, autenticação e integrações.
- Movimento de embarcações no celular. O computador acompanha e administra.

## Sugestões para as áreas já novas — não implementadas

- **Visão geral:** indicar horário da última atualização e distinguir indicador sem dados de indicador igual a zero.
- **Alunos e reservas:** manter data/filtro ao abrir e fechar um cadastro; permitir voltar ao mesmo ponto da lista.
- **Administração:** destacar permissões por função ao editar um funcionário, antes da confirmação, sem criar atalhos que concedam acesso automaticamente.
- **Guardaria:** destacar no mesmo registro o vínculo cliente–embarcação, o vencimento e as pendências, evitando abrir telas para conferir essas três informações.
- **Pagamentos:** separar visualmente recebimento manual de pedido online e permitir abrir a origem do registro. Depende de escopo próprio; não ativar cobranças por efeito da revisão visual.
- **Configurações:** mostrar quais valores foram alterados antes de confirmar, especialmente regras compartilhadas com o Portal.
- **Títulos compartilhados:** revisar depois os pares Fotos/Mídia, Tempo/Clima e Registro/Diário, mantendo os termos conhecidos pela equipe.
- **Gráfico de Resultados:** foi observado um aviso React nos títulos das barras SVG, pois o título combina vários filhos. O componente desktop já novo não foi alterado; sugerida a conversão desse título para uma única string, sem mudar os dados do gráfico.

## Conferência

`scripts/verify-legacy-presentation.cjs` compara a lógica e os handlers das 12 telas com o estado anterior (`efa37d5`), verifica os comandos das novas tabelas e a separação da operação móvel. Também executadas verificações de navegação e tipos; as 12 rotas responderam HTTP 200. No navegador, conferidos abertura/fechamento do cadastro, filtros de clientes, formulário de evento e modal de suspensão por clima, sem submissão. Conferidos tabela e grade desktop, lista móvel, temperatura principal de 72 px e embarque com formulário de 358 px dentro da tela de 390 px, sem transbordamento horizontal. Evidências: `evidencias-editor/mensalistas-desktop-20261019.jpg` e `evidencias-editor/embarque-celular-20261019.jpg`. Conferência feita na prévia com dados fictícios; não houve cobrança, gravação no banco real ou envio de mensagem.

Esta revisão não representa teste completo das integrações de produção. Funcionalidades externas continuam com as dependências já registradas em STATUS.md.

## Áreas independentes — decisão de 20/10/2026

O painel combinado Alunos e reservas deixou de ser uma entrada de navegação. Em Clientes, agenda e eventos, cada item abre uma página própria: Clientes (/gestao/clientes), Agendamentos (/gestao/agendamentos) e Eventos (/gestao/eventos). Bloqueios (/gestao/bloqueios) e Planos (/gestao/planos) ficam em Regras da operação. Cada página monta somente o respectivo conteúdo, sem a barra de cinco abas do painel antigo.

As páginas compartilham a implementação e os registros existentes; as funções de edição, reserva, sincronização, eventos e planos não foram duplicadas nem removidas. O acesso exige perfil de equipe com função administrativa/direção/recepção; as permissões de dados continuam no servidor e no banco. O endereço /gestao/portal continua compatível, encaminhando para Agendamentos. As três páginas antigas da recepção continuam existentes para links antigos, mas os menus principais e o editor usam as novas áreas.

Atualizados menu lateral, menu móvel, seleção de áreas, atalhos de visão geral/configurações/financeiro e seletor do editor. Rótulos novos registrados no catálogo editável, sem restaurar o rascunho. Testes verificam isolamento das cinco páginas, navegação, perfis combinados, redirecionamento de visitante/perfil sem acesso, callbacks anteriores e histórico do editor. As cinco rotas novas e o endereço antigo responderam HTTP 200 na prévia. A conferência visual nova no navegador ficou pendente porque a política da sessão bloqueou a observação automatizada; as evidências de 19/10 acima mostram a revisão anterior.
