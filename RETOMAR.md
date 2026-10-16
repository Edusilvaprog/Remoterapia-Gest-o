# Retomar Remoterapia

Retomada autorizada em 14/10/2026. Prioridade atendida: editor simples, com rascunho separado dos aplicativos. Não retomar cursos, referência Imua, domínio ou publicação sem novo escopo.

## Concluído

- Revisão 16/10: detalhes em `EDITOR-DECISOES.md`. Conector isolado, varreduras suspensas em Navegar, prévia apenas do aplicativo ativo e cache do catálogo; menu desktop do Portal, filtros de histórico, atalhos e abas administrativas cadastrados para edição. Rascunho anterior mantido; nenhuma migração de editor instalada.

- Editor: somente selecionar site/tela/versão, editar palavras/fonte/tamanho/cor, redimensionar blocos, adicionar/remover, zoom, desfazer e restaurar tudo. Navegar/Editar restaurados a pedido em 15/10; sem exportação, ajustes globais ou aplicação na nova versão.
- Rascunho automático persistente em `.editor-draft.json`, ignorado pelo Git; recuperação de edição pendente no navegador; controle de revisão impede sobrescrita silenciosa por outra aba; até 30 etapas para desfazer. Restaurar volta à base visual, mantendo os aplicativos. Os endpoints antigos de aplicação foram desativados.
- Seleção por texto/bloco e listas; duplo clique para edição inline; Alt + clique para navegar. Área funcional protegida contra remoção; blocos novos removíveis. Largura/altura mínima não cortam conteúdo.
- Testes reutilizáveis: `tools/editor-visual/verify-drafts.cjs`, `verify-selection.cjs`, `scripts/verify-proxy.cjs`, `scripts/verify-assistants.cjs`. Dez cenários de proxy sem depender do arquivo antigo fora do Git. Tipos dos dois aplicativos passaram.
- Interface: campos, palavras, criação/remoção, tamanho/fonte, salvamento e recuperação após recarregar testados. Conferência de pagamentos no celular com largura 390 px e sem transbordamento horizontal.
- CSS, conteúdo e configuração base dos aplicativos conferidos intactos durante testes de API. Código dos originais preservado: 160 arquivos da aplicação sem mudanças, além das duas alterações anteriores conhecidas de `.gitignore`.
- Cinco reservas fictícias e 16 registros de alterações locais recuperados do snapshot anterior. Exemplos usados nos testes visuais foram removidos do rascunho; base e personalizações anteriores mantidas.
- Ajuda do aluno: seis tópicos locais, sem preços/quotas/prazos inventados; casos específicos enviados à equipe. Conferência financeira por regras, com consulta humana; não confirma, cobra ou estorna.
- Pesquisa e conselho finalizados em `ECONOMIA-AGENTES-PAGAMENTOS.md`: manter Supabase agora, Neon como alternativa a medir, custo/capacidade/logins, orçamento de manutenção, Mercado Pago x Stripe e único CNPJ recebedor.
- Caveman lite, instruções curtas e três perfis de agentes delimitados preparados. Não houve contratação de IA, conexão Cloud, economia medida ou envio de dados a modelos externos.

## Revisão do editor em 15/10/2026

- Largura agora usa margens automáticas iguais. Conferência real do bloco móvel já personalizado em 97%: 5,625 px de cada lado.
- Ajustes de laterais internas, acima/abaixo do conteúdo e distância antes/depois; medidas também podem ser digitadas.
- Apenas um destaque de mouse por vez. Cartões menores e botões recebem alvos próprios; a hierarquia no ponto selecionado permite alternar entre palavras, botão, bloco e seção. Áreas sem função de inserir conteúdo não exibem o comando de adicionar.
- Modos explícitos: Navegar libera controles; Editar intercepta ações e mostra o inspetor. Ao navegar, a seleção anterior é limpa.
- Testes de seleção, campos protegidos, centralização e espaçamentos adicionados aos testes reutilizáveis; dados fictícios e rascunho preservados.

## Arraste e réguas — 15/10/2026

- Escolha do usuário: reorganizar dentro de linhas/colunas, sem posicionamento livre ou sobreposição.
- Alça Mover no bloco selecionado; indicador do destino, réguas em pixels, guias de centro, cancelamento com Esc e campo de posição para teclado. Grupos fixos informam a restrição.
- Grades/linhas existentes usam ordem visual; blocos criados são reordenados no array do React, preservando o fluxo original. Não mover nós React manualmente nem converter indiscriminadamente contêineres para flex.
- Uma alteração por soltura; autosave no rascunho, desfazer, recuperação e isolamento por site/versão mantidos.
- Provas: reordenação e recuperação na Gestão; Portal reorganizado sem exceder os 1440 px de largura; celular independente; blocos adicionados reordenados e testes temporários desfeitos. Estado anterior e dados fictícios comparados integralmente.
- Testes: verify-move.cjs e verify-move-editor.cjs cobrem grupo, zoom, ponteiro, destino, posições fixas, Esc, cancelamento, modo e réguas.
- A tentativa nativa mudou uma posição, mas retornou erro de alvo/área ativa; foi desfeita e o rascunho anterior foi comparado integralmente. A precisão do gesto físico ainda não está homologada pelo adaptador. Testes de eventos isolados e do resultado na interface passaram. Conferência manual deve arrastar pela alça, testar Esc e soltar fora do grupo.
- Antes de produção, converter a ordem visual aprovada em estrutura/ordem de foco apropriada. Não publicar CSS de reordenação como substituto dessa revisão.

## Revisão funcional da Gestão — 15/10/2026

- Causa geral no editor: abertura em Editar interceptava links, abas e formulários. Agora inicia em Navegar; o título e a orientação deixam explícita a diferença. Navegar/Editar conferidos por campos habilitados/desabilitados, mantendo o rascunho.
- Restrição de desktop excessiva: a camada principal escondia água e recepção junto com novo embarque. Recuperadas as duas telas existentes e seus controles, mantendo somente novo embarque no celular. Links por perfil preservados; sem duplicar as entradas do menu móvel.
- Recuperados no menu: Equipe de areia, Equipe de água, Fechamento. Na recepção, abas de clientes, agendamentos e eventos acessíveis no computador. Seletor do editor ampliado de 14 para 22 telas.
- Comando legado Resetar PIN removido da recepção: o servidor já recusava essa operação após a migração para e-mail/senha. Substituído por orientação de recuperação no Portal; não altera credenciais nem envia mensagens.
- Verificação: 22 rotas internas responderam sem erro de compilação; 13 abas (administração, Portal e Guardaria) alternaram. Conferidos planos em edição/cancelamento, fila, clientes, eventos, caixa, diário, resultados, feedback, mídia, configurações, clima, pagamentos e segurança. Formulários de fila/eventos e relatório por período abriram e fecharam. Não executar publicação, pagamentos, exclusões ou troca de credenciais para testar interface.
- Testes locais: `scripts/verify-management-navigation.cjs` cobre telas recuperadas, menus por perfil e separação celular/computador. Seleção, rascunho, arraste, dados locais, proxy e tipos passaram. Dados e histórico comparados ao snapshot de retomada; arquivo do rascunho permaneceu intacto.
- Limite da prova: não foi homologado todo efeito de gravação de todos os botões. O clique automatizado dentro do iframe continua falhando no adaptador; seleção de tela, troca de modo e liberação dos campos foram comprovadas. Cliques e formulários nas abas diretas da Gestão funcionaram. Integrações reais continuam dependendo das configurações externas já registradas.

## Limitações ainda abertas

1. Clique humano dentro do iframe: a ferramenta de navegador retorna “Click target is no longer available” para alvos visíveis da prévia. Isso também ocorre com coordenadas. Os handlers reais de texto, ícone, bloco, duplo clique, edição inline e Alt passaram nos testes isolados; seleção por campos funcionou no navegador. Não considerar a automação do clique como aprovada. A próxima conferência manual deve selecionar título, botão com ícone, espaço de bloco e editar com dois cliques nos dois sites.
2. Agentes em nova sessão: TOML e caminhos conferidos; diagnóstico do CLI não resolveu seu diretório pessoal nesta execução. Carregamento automático dos perfis ainda não demonstrado. Não inventar economia percentual.
3. Regras oficiais da Remoterapia: ampliar a biblioteca de ajuda só depois de confirmar políticas de reserva, reembolso e cobrança. A biblioteca atual evita fixar condições comerciais desconhecidas.

## Antes de produção, quando autorizado

- Configurar SMTP e testar recuperação de senha real; titular cadastrar MFA; verificar proteção contra senhas vazadas no plano.
- Criar aplicação Mercado Pago no CNPJ da Remoterapia; credenciais apenas no servidor, collector ID, webhook assinado e homologação de plano/evento, duplicação, valor, cancelamento e pagamento tardio. Receber somente na conta empresarial definida. Orientação fiscal com contador.
- Publicar com a simulação local desligada. Validar novamente autenticação, permissões/RLS e funcionalidades reais; a prévia não prova segurança de produção.
- Rotina de backup de banco/arquivos e recuperação. GitHub é backup do código.
- Se for desejada IA generativa: definir provedor e orçamento antes de conectar. Hoje os dois assistentes locais não exigem API paga.

## Onde procurar

`STATUS.md` é a entrada curta. `COMO-USAR.md` explica o editor. `BASE-PADRAO.md` conserva a prova das telas anteriores; `REVISAO-MOBILE.md` conserva a revisão móvel. Evidência da conferência financeira anterior em `evidencias-pendencias/`; editor simplificado em `evidencias-editor/`.

Recuperação anterior fora do Git: `work/base-padrao-recuperacao/antes-das-pendencias.zip` e `restart-local.json`. Banco Supabase consultado anteriormente, sem mutações nesta revisão; definições em `work/security-live-definitions.json` e `security-live-helpers.json`. Não repetir toda a auditoria por padrão.

Backup do código desta retomada: branch privada `preview-editor`. Confirmar estado remoto pelo Git antes de nova atualização; nunca forçar push ou misturar os originais.
