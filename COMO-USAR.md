# Usar o editor

Abra `Abrir-Previa.cmd` nesta pasta. Editor: http://localhost:3010/; Gestão: http://localhost:3015/gestao/painel; Portal: http://localhost:3016/.

Escolha site, tela e versão na barra superior. O editor inicia em Navegar, com menus e formulários liberados. Use Editar somente para ajustar o layout; nesse modo, os cliques selecionam elementos e não executam as ações dos botões. Clique em texto/bloco na prévia; dois cliques permitem escrever diretamente em textos cadastrados. Os campos laterais alteram palavras, fonte, tamanho e cores. Para blocos, também ajustam largura e altura mínima. O conteúdo nunca é cortado para forçar uma altura menor.

A lista Tela inclui também fechamento, clientes/agendamentos/eventos da recepção, feedback, mídia da direção e segurança. No computador, o menu da Gestão oferece Equipe de areia, Equipe de água e Fechamento. As abas da recepção abrem os cadastros existentes. Novo embarque continua reservado ao celular.

No campo Selecionar neste ponto, alterne entre texto, botão, bloco menor e seção. Clique nas palavras para selecionar o texto; no fundo ou ícone do botão para selecionar sua caixa. O destaque azul acompanha somente o alvo sob o mouse; rosa identifica a seleção.

A largura diminui dos dois lados, mantendo o bloco centralizado. Os campos de espaçamento ajustam laterais internas, espaço acima/abaixo do conteúdo e distância antes/depois do bloco. Digite uma medida ou use o controle deslizante. A largura percentual continua sendo relativa ao espaço reservado ao item pelo layout.

Selecione uma área para adicionar um bloco de texto, aviso, botão ou SVG. Selecione o bloco para editar ou remover. Blocos adicionados são removíveis; áreas que mantêm funções do sistema ficam protegidas. As listas Área e Texto permitem selecionar o trecho quando ele estiver pequeno ou sobreposto.

Para mover, selecione um bloco e segure a alça Mover que aparece acima dele. Arraste até outro bloco do mesmo grupo e solte. O contorno mostra o lugar de encaixe; as guias indicam os centros. Esc, soltar fora do grupo ou mudar de modo cancela o gesto. A ordem mantém as linhas/colunas do layout.

O campo Posição no grupo permite digitar a posição usando teclado. Réguas e guias pode ser ligado/desligado junto ao zoom; as medidas usam pixels da prévia e acompanham o zoom. Grades com posições fixas, controles e estruturas principais ficam protegidos e mostram o motivo. Blocos novos podem ser reordenados entre irmãos da mesma área. Cada site e versão mantém a própria ordem.

Use Zoom para aproximar. Escolha Navegar para abrir menus internos ou testar formulários. Alt + clique continua disponível como atalho. As ações normais são interceptadas no modo de edição para evitar executar funções ao selecionar. Campos de formulário ficam protegidos no editor; os aplicativos diretos permitem testar os exemplos de negócio.

O rascunho salva automaticamente neste computador em `tools/editor-visual/.editor-draft.json`, excluído do Git. Existe recuperação adicional no navegador enquanto uma edição ainda está sendo salva. Aguarde “Rascunho salvo” antes de fechar. Outra aba não pode sobrescrever silenciosamente uma revisão mais recente.

**Desfazer** volta uma etapa de edição, com até 30 etapas guardadas. Digitação contínua e ajustes rápidos são agrupados. **Restaurar tudo** volta o rascunho dos dois sites e das duas versões à base visual salva; também pode ser desfeito. Não remove cadastros.

Não existe botão de aplicar/publicar. O editor não grava CSS nem conteúdo nos aplicativos, e os endpoints antigos de aplicação foram desativados. Abrir os aplicativos fora do editor mostra a base, sem o rascunho. Transportar ajustes aprovados será uma etapa separada.

Os originais em `C:\Users\Admin\Documents\remoterapia-v2` ficam preservados. A prévia usa dados fictícios compartilhados entre Gestão e Portal. Cadastros e reservas são exemplos em memória; não são importação para o Supabase. O rascunho visual é persistente, mas não deve ser confundido com backup dos exemplos ou do banco real.

Autenticação real, SMTP, MFA e pagamentos externos não são validados pelo simulador. Nenhuma cobrança real foi ativada. Pendências de configuração estão em `RETOMAR.md`.

Testes desta revisão: armazenamento/reinício do rascunho, desfazer/restaurar, concorrência, origem das requisições, dimensões/fontes, proteção de blocos, regras de seleção/duplo clique, tipos dos dois aplicativos e preservação do CSS/conteúdo da base. A automação do navegador permitiu testar campos, adicionar/remover e recuperação; cliques dentro do iframe têm uma limitação registrada em `RETOMAR.md`.

A ordem das grades existentes é uma alteração visual do rascunho. Antes de transportar para produção, adequar também estrutura e ordem de foco dos componentes. Os blocos adicionados são reordenados pelo próprio componente React, preservando o fluxo e os espaçamentos.
