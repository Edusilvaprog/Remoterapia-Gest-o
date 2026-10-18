# Edição visual mais eficiente — pesquisa de 18/10/2026

Pesquisa e proposta para aprovação. Nenhum recurso novo foi implementado nesta etapa.

## Recomendação principal

Adotar seleção direta, um painel de camadas e organização automática por grupos. Você arrasta o bloco até um destino; o grupo mantém alinhamento, espaçamento e adaptação ao tamanho da tela. Isso atende à escolha anterior de reorganizar em linhas/colunas sem sobreposição.

O objetivo é oferecer a facilidade de manipulação de um editor gráfico com as regras de uma página web responsiva. Liberdade para reorganizar conteúdo; estruturas funcionais continuam respeitando seus limites.

Figma organiza elementos conforme direção, espaçamento e alinhamento; também distingue tamanho pelo conteúdo, preenchimento e tamanho fixo. O Framer explica como linhas/colunas mantêm o fluxo quando textos e blocos crescem. São referências para o comportamento proposto, não instruções para copiar suas interfaces. [Figma — Auto layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma), [Framer — Frames e Stacks](https://www.framer.com/academy/lessons/frames-vs-stacks).

## O que limita o editor atual

Conferência localizada do estado salvo e do mecanismo de estilos:

- Já existem seleção por clique, hierarquia do alvo, edição de texto, medidas, espaçamentos, rascunho, desfazer e restauração.
- O arraste atual reorganiza dentro do mesmo grupo; há réguas e guias, mas ainda falta homologação manual do gesto físico.
- A largura de um elemento é percentual e centralizada automaticamente. Isso não equivale a editar a largura das colunas que o contêm.
- Há espaçamento interno e margens, mas não um controle geral de distância entre os filhos do grupo.
- Faltam um painel de camadas em árvore e controles completos de organização do contêiner.
- Alterações de ordem de grades existentes usam CSS `order`. Para finalizar a versão aprovada, será necessário conferir também a ordem estrutural e de foco.

Responsáveis: `tools/editor-visual/VisualPreviewBridge.tsx`, `style-engine.cjs`, `editor.js` e `STATUS.md`. Esta conferência não substitui um teste de todas as telas.

## Funções que valem incluir

Prioridade 1 resolve a dificuldade atual. Prioridade 2 aumenta produtividade depois que a seleção estiver confiável.

| Função | Como funcionaria para você | Prioridade |
|---|---|---|
| Camadas em árvore | Abrir “Página → Agenda → Cartão → Título”; selecionar sem acertar um alvo pequeno na prévia | 1 |
| Destaque e nome do alvo | Passar o mouse mostra exatamente o limite e o nome: texto, botão, cartão ou grupo | 1 |
| Seleção precisa e caminho | Clique seleciona o menor alvo válido; o caminho permite subir para o cartão ou grupo | 1 |
| Arraste com encaixe | Mostrar o espaço de destino antes de soltar, reorganizando os vizinhos sem sobreposição | 1 |
| Alinhamento do grupo | Escolher esquerda, centro ou direita; topo, meio ou base quando houver espaço no eixo | 1 |
| Distância entre blocos | Um campo altera o intervalo entre os itens de uma linha ou coluna, mantendo regularidade | 1 |
| Tamanho automático ou definido | Escolher “Pelo conteúdo”, “Preencher espaço” ou “Definir medida”, conforme o elemento | 1 |
| Alças de redimensionamento | Arrastar a borda e ver a medida; o campo numérico permite ajuste exato | 1 |
| Colunas proporcionais | Divisão igual, 1/3 + 2/3 ou 2/3 + 1/3, somente em grupos preparados para isso | 1 |
| Espaçamentos vinculados | Alterar as duas laterais juntas; desvincular para ajustar cada lado intencionalmente | 1 |
| Ajustes por dispositivo | Identificar claramente se o ajuste pertence ao celular ou computador | 1 |
| Restaurar só uma propriedade | Recuperar apenas largura, espaçamento ou cor sem apagar outras edições | 1 |
| Seleção múltipla | Selecionar cartões irmãos para igualar largura, espaçamento ou aparência | 2 |
| Copiar aparência | Copiar fonte, cor e acabamento para outro bloco compatível, preservando texto e ação | 2 |
| Duplicação de conteúdo | Duplicar um aviso ou bloco criado no editor com nova identificação | 2 |
| Favoritos de aparência | Guardar poucas combinações da identidade visual para reaplicar | 2 |

### Seleção: a primeira melhoria

Canva permite encontrar e reorganizar camadas pelo painel, inclusive selecionar várias. O Navigator do Webflow mostra a hierarquia e permite selecionar e mover elementos pela estrutura. Essa abordagem atende diretamente ao problema de clicar no filho e acabar selecionando o bloco externo. [Canva — Camadas](https://www.canva.com/help/finding-and-arranging-layers/), [Webflow — Navigator](https://university.webflow.com/videos/navigator).

Proposta: transformar “Encontrar outro elemento” em uma árvore compacta com nomes claros, busca e destaque sincronizado. O painel deve seguir a tela e a aba abertas. Elementos ocultos aparecem identificados e podem ser encontrados sem depender do clique na prévia.

Dois cliques no texto entram na escrita. Durante a escrita, arraste e atalhos de movimentação ficam suspensos. Navegar continua disponível para abrir abas e executar as funções do SaaS; Editar seleciona a aparência. O alvo selecionado deve permanecer identificado ao trocar um campo do painel.

### Alinhar sem corrigir cada bloco manualmente

O Webflow distingue alinhamento do conjunto, do item individual e distância entre itens. Grades permitem alterar proporções de colunas e o espaço entre elas. Isso explica por que reduzir a largura de um cartão pode não reorganizar toda a seção. [Webflow — Flexbox](https://help.webflow.com/hc/en-us/articles/33961260795155-Flexbox), [Webflow — Grid](https://help.webflow.com/hc/en-us/articles/33961365794451-Grid).

O painel proposto deve distinguir três operações:

1. **Centralizar o bloco:** posiciona sua caixa dentro do espaço disponível.
2. **Centralizar o conteúdo:** posiciona texto, ícones e botões dentro da caixa.
3. **Organizar o grupo:** define distribuição e intervalo entre os blocos irmãos.

Exemplo: para dois cartões lado a lado, escolher o grupo, duas colunas iguais e intervalo de 16 px. Depois, selecionar apenas um cartão para mudar sua cor. No celular, o grupo pode formar uma coluna mantendo a sequência de leitura.

### Tamanho e movimento com limites compreensíveis

Um título normalmente acompanha o conteúdo; um cartão pode preencher a coluna; uma imagem pode ter medida definida e proporção preservada. O painel deve mostrar só as opções compatíveis com o alvo. Altura automática permanece como padrão para textos, formulários e listas.

Durante o arraste, mostrar origem, destino permitido, posição de encaixe e linha central relevante. As guias devem desaparecer ao terminar. Próximo da borda da área de trabalho, a prévia deve rolar para permitir alcançar outros destinos.

Encaixar em células e posições válidas deve ter preferência sobre deslocamentos livres. Uma grade visual de 8 px pode ser testada como preferência de espaçamento, não imposta a todos os componentes. Esses números e comportamentos são propostas do projeto, sujeitos à avaliação de uso.

## Interface enxuta

Manter a barra com site, tela, dispositivo, Navegar/Editar, zoom, desfazer e restaurar. O rascunho continua automático.

Um único painel lateral reúne a árvore recolhível e as propriedades da seleção. Quando nada estiver selecionado, apresenta a estrutura da tela. Quando selecionar um texto, mostra palavras e tipografia; para cartão, tamanho e acabamento; para grupo, alinhamento, colunas e espaçamentos. Recursos secundários ficam recolhidos.

“Adicionar” e “Remover” aparecem perto da seleção quando permitidos. Mensagens devem explicar restrições concretas, como “Este formulário mantém os campos necessários ao cadastro”. Evitar comandos técnicos como `justify-content`, `grid-template` e `z-index` na interface.

## Regras necessárias para preservar o SaaS

- Distinguir uma instância selecionada de uma aparência compartilhada. Alterar um botão não pode modificar outros de mesmo nome acidentalmente.
- Movimentação entre grupos só será liberada onde o destino aceitar aquele tipo de conteúdo. Inicialmente, manter o mesmo grupo; depois, abrir zonas compatíveis.
- Não permitir separar campos e botões de suas estruturas funcionais, duplicar ações de cobrança ou remover controles obrigatórios como se fossem decoração.
- Validar medidas e operações permitidas; manter conteúdo como dados, sem executar código digitado no editor.
- Ao finalizar a ordem aprovada, manter leitura e foco coerentes com o visual. CSS `order` isoladamente não reorganiza a ordem lógica de navegação. [MDN — order e acessibilidade](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/order#accessibility).
- Toda movimentação precisa de uma alternativa sem arrastar: posição numérica ou comandos contextuais para antes/depois. Teclado também deve funcionar. A W3C trata a alternativa de ponteiro sem arraste e a acessibilidade por teclado como requisitos distintos. [W3C — Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).
- Um arraste ou redimensionamento gera uma etapa de desfazer ao terminar. Esc cancela; gestos interrompidos não salvam posições incompletas.

## Como construir sem pesar mais

Registrar explicitamente grupos, elementos e operações permitidas. Medir apenas a seleção e os possíveis destinos durante o gesto; atualizar a indicação visual no ritmo de desenho da tela; persistir o resultado ao terminar. Evitar varreduras completas em cada movimento do mouse.

O Puck demonstra zonas de conteúdo com layouts aninhados e restrições de componentes aceitos. É uma referência de arquitetura útil para esse registro. A documentação não comprova que ele substituiria nosso editor sem adaptação; migrar todo o aplicativo continua sendo outro projeto. [Puck — Layouts e zonas de conteúdo](https://puckeditor.com/docs/integrating-puck/multi-column-layouts).

## Sequência de implementação proposta

1. **Seleção e organização:** árvore de camadas, nomes, caminho do alvo, rolagem até a seleção e inspeção contextual.
2. **Layout do grupo:** alinhamento, intervalo, colunas e preenchimento; preservar os ajustes de espaçamento existentes.
3. **Manipulação direta:** alças de tamanho, encaixe e rolagem durante arraste, posição por clique/campo numérico.
4. **Produtividade:** seleção múltipla, copiar aparência e duplicação apenas de conteúdo apropriado.

Começar por uma seção representativa da Gestão e uma do Portal. Aprovar os gestos nessas áreas antes de cadastrar as demais. Não transformar indiscriminadamente todas as estruturas em um mesmo tipo de layout.

## Critérios para aprovar a primeira etapa

- Selecionar título, botão, cartão e grupo pelo clique e pela árvore sem trocar o alvo inesperadamente.
- Abrir abas em Navegar e retornar a Editar mantendo a identificação da tela correta.
- Centralizar um cartão com margens equilibradas e distinguir isso de centralizar seu texto.
- Organizar cartões com intervalos iguais, mudar tamanho e manter conteúdo legível.
- Mover um bloco sem sobreposição; cancelar e desfazer restauram exatamente a posição anterior.
- Conferir 390, 768 e 1440 px, incluindo textos longos e zoom de 75% e 100%. São larguras de teste, sem criar obrigatoriamente três conjuntos de ajustes.
- Recuperar o rascunho após recarregar; manter os outros dispositivos e o outro site intactos quando a alteração for específica.

**Aprovação recomendada:** primeiro seleção por camadas e layout do grupo. Essas duas melhorias atacam as dificuldades relatadas antes de ampliar a quantidade de ferramentas.
