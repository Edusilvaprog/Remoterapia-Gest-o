# Usar o editor

Abra `Abrir-Previa.cmd` nesta pasta. Editor: http://localhost:3010/; Gestão: http://localhost:3015/gestao/painel; Portal: http://localhost:3016/.

Escolha site, tela e versão. Clique em texto/bloco na prévia; dois cliques permitem escrever diretamente em textos cadastrados. Os campos laterais alteram palavras, fonte, tamanho e cores. Para blocos, também ajustam largura e altura mínima. O conteúdo nunca é cortado para forçar uma altura menor.

Selecione uma área para adicionar um bloco de texto, aviso, botão ou SVG. Selecione o bloco para editar ou remover. Blocos adicionados são removíveis; áreas que mantêm funções do sistema ficam protegidas. As listas Área e Texto permitem selecionar o trecho quando ele estiver pequeno ou sobreposto.

Use Zoom para aproximar. Segure Alt ao clicar se quiser navegar por um menu interno. As ações normais são interceptadas no modo de edição para evitar executar funções ao selecionar. Campos de formulário ficam protegidos no editor; os aplicativos diretos permitem testar os exemplos de negócio.

O rascunho salva automaticamente neste computador em `tools/editor-visual/.editor-draft.json`, excluído do Git. Existe recuperação adicional no navegador enquanto uma edição ainda está sendo salva. Aguarde “Rascunho salvo” antes de fechar. Outra aba não pode sobrescrever silenciosamente uma revisão mais recente.

**Desfazer** volta uma etapa de edição, com até 30 etapas guardadas. Digitação contínua e ajustes rápidos são agrupados. **Restaurar tudo** volta o rascunho dos dois sites e das duas versões à base visual salva; também pode ser desfeito. Não remove cadastros.

Não existe botão de aplicar/publicar. O editor não grava CSS nem conteúdo nos aplicativos, e os endpoints antigos de aplicação foram desativados. Abrir os aplicativos fora do editor mostra a base, sem o rascunho. Transportar ajustes aprovados será uma etapa separada.

Os originais em `C:\Users\Admin\Documents\remoterapia-v2` ficam preservados. A prévia usa dados fictícios compartilhados entre Gestão e Portal. Cadastros e reservas são exemplos em memória; não são importação para o Supabase. O rascunho visual é persistente, mas não deve ser confundido com backup dos exemplos ou do banco real.

Autenticação real, SMTP, MFA e pagamentos externos não são validados pelo simulador. Nenhuma cobrança real foi ativada. Pendências de configuração estão em `RETOMAR.md`.

Testes desta revisão: armazenamento/reinício do rascunho, desfazer/restaurar, concorrência, origem das requisições, dimensões/fontes, proteção de blocos, regras de seleção/duplo clique, tipos dos dois aplicativos e preservação do CSS/conteúdo da base. A automação do navegador permitiu testar campos, adicionar/remover e recuperação; cliques dentro do iframe têm uma limitação registrada em `RETOMAR.md`.
