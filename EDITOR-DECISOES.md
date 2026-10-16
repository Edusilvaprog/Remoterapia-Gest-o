# Editor e organização do trabalho — 16/10/2026

## Decisão para esta entrega

Concluir o editor local existente com correções pequenas. Ele já está separado em `tools/editor-visual`, servido na porta 3010. Gestão e Portal continuam nas portas 3015 e 3016. Os conectores dentro dos aplicativos recebem o rascunho apenas na prévia; não são um segundo editor.

Trocar agora todo o editor exigiria cadastrar os componentes, transportar o rascunho e repetir a conferência das funções. Isso prolongaria a entrega. Uma migração futura deve começar por uma tela isolada, com critérios de aprovação, antes de substituir o restante.

## Problemas encontrados e correções

- O conector instalava observadores e eventos também nos aplicativos abertos diretamente. Agora retorna sem instalá-los.
- Navegar provocava consultas e medições de todos os blocos. Agora acompanha apenas mudanças de rota; a inspeção visual ocorre em Editar.
- Cada prévia relia e expandia o catálogo e gerava CSS dos dois sites. O catálogo usa cache invalidado quando o arquivo muda; só o site ativo tem CSS gerado.
- Ajustar estilos reenviava conteúdo inalterado e provocava atualizações React. O editor evita o reenvio; o receptor também ignora conteúdo idêntico.
- Algumas abas eram texto comum, sem identificação para edição. Corrigidos menus de seção da Gestão, abas próprias da Administração, menu desktop do Portal, filtros de histórico e atalhos da visão geral.
- O painel ocupava espaço mesmo em Navegar. Agora fica recolhido. O zoom automático tem mínimo de 75%; em espaços menores, usa rolagem. Zoom manual continua disponível.

A limpeza foi do processamento e dos controles visuais ociosos. Não foram apagadas telas, dados ou camadas de CSS necessárias sem prova de inutilidade.

## Alternativas pesquisadas

| Opção | O que oferece | Adequação à Remoterapia |
|---|---|---|
| [Puck](https://puckeditor.com/docs) | Editor React, componentes próprios, campos configuráveis, colunas e visualização por dispositivo; núcleo MIT | Melhor candidato para uma futura base. Exige registrar componentes e transportar os ajustes existentes. |
| [GrapesJS](https://grapesjs.com/docs/modules/Components.html) | Modelo próprio de componentes para compor e editar páginas | Útil para páginas de conteúdo. Converter o SaaS completo exigiria adaptar seus componentes e preservar o comportamento React. |
| Editor local atual | Abre as telas reais; rascunho por site/dispositivo, seleção, texto, medidas, arraste restrito, desfazer | Menor mudança para terminar esta revisão. Sua cobertura depende dos elementos cadastrados. |

O Puck permite limitar edição, inserção, exclusão e duplicação por componente. É uma referência útil para manter áreas funcionais protegidas e liberar apenas conteúdo apropriado. [Permissões do Puck](https://puckeditor.com/docs/api-reference/permissions).

## Contexto, skills e agentes

Manter `STATUS.md` como entrada curta. Consultar detalhes apenas da tarefa atual. Uma causa por correção, um responsável pela escrita e até dois auxiliares para localizar código ou revisar. O resultado do auxiliar deve trazer evidência e caminhos, sem copiar arquivos inteiros. Esse fluxo foi utilizado nesta revisão.

As skills já disponíveis cobrem o necessário: `investigate-first` para causa desconhecida, `surgical-patch` para correção localizada, `verify-and-stop` para encerramento e `cavecrew` para divisão de investigação. `caveman` reduz a extensão das respostas; não elimina os custos de leitura e ferramentas. Não foi medida economia percentual de tokens.

O [catálogo oficial de skills](https://github.com/openai/skills/tree/main/skills/.curated) também oferece `security-best-practices` e `security-threat-model`, candidatos para uma revisão específica de segurança. Não foram instalados pacotes extras nesta etapa. A orientação oficial recomenda instruções curtas e referências carregadas sob demanda, evitando acumular regras extensas. [Organização de skills](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra).

Subagentes ajudam quando recebem tarefas independentes e devolvem resumos. Edições simultâneas nos mesmos arquivos aumentam interferência; por isso os dois auxiliares desta revisão trabalharam somente em leitura. [Documentação de subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents).

## Referência do podcast

Consultada a transcrição automática em português do vídeo enviado, em trechos relevantes; não foi feita revisão integral das mais de quatro horas.

- [48:14 — testes automatizados](https://www.youtube.com/watch?v=N3eU-2VIByQ&t=2894s): aplicado aqui como proteção contra regressões de navegação, seleção e rascunho.
- [1:49:43 — limites de contexto longo](https://www.youtube.com/watch?v=N3eU-2VIByQ&t=6583s): aplicado como instruções e investigações delimitadas.

Essas aplicações são decisões do projeto. A transcrição automática pode conter erros; o vídeo não substitui a verificação do código nem uma auditoria de segurança.

## Verificação e limites

Passaram os testes de seleção/modos, navegação da Gestão, menu/filtros/atalhos do Portal e Gestão, rascunho e arraste. Os tipos dos dois aplicativos passaram. Em 50 validações consecutivas, o catálogo foi lido uma vez; a prévia limitada ao site ativo produziu o mesmo CSS esperado. Isso comprova a remoção de trabalho repetido, sem alegar uma porcentagem de velocidade.

Na interface, confirmados campos livres em Navegar/protegidos em Editar, seleção exata da aba Frota pelo painel e abertura das abas Frota/Auditoria na Gestão direta. O adaptador de automação continua falhando ao clicar dentro do iframe; esses cliques e o gesto físico de arraste ainda precisam de homologação manual. Os testes isolados executam os handlers reais.

As seis áreas do menu desktop do Portal abriram na interface. No histórico, os filtros retornaram 2 concluídas, 1 cancelada, 1 evento e 3 atividades no total, conforme os exemplos locais.

O rascunho visual existente foi preservado. Dados reais, autenticação, pagamentos e publicação não foram exercitados por esta prévia local. Pendências externas permanecem em `RETOMAR.md`.
