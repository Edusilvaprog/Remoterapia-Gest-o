# Retomar Remoterapia

Retomada autorizada em 14/10/2026. Prioridade atendida: editor simples, com rascunho separado dos aplicativos. Não retomar cursos, referência Imua, domínio ou publicação sem novo escopo.

## Concluído

- Editor: somente selecionar site/tela/versão, editar palavras/fonte/tamanho/cor, redimensionar blocos, adicionar/remover, zoom, desfazer e restaurar tudo. Sem modos/botões duplicados, exportação, ajustes globais ou aplicação na nova versão.
- Rascunho automático persistente em `.editor-draft.json`, ignorado pelo Git; recuperação de edição pendente no navegador; controle de revisão impede sobrescrita silenciosa por outra aba; até 30 etapas para desfazer. Restaurar volta à base visual, mantendo os aplicativos. Os endpoints antigos de aplicação foram desativados.
- Seleção por texto/bloco e listas; duplo clique para edição inline; Alt + clique para navegar. Área funcional protegida contra remoção; blocos novos removíveis. Largura/altura mínima não cortam conteúdo.
- Testes reutilizáveis: `tools/editor-visual/verify-drafts.cjs`, `verify-selection.cjs`, `scripts/verify-proxy.cjs`, `scripts/verify-assistants.cjs`. Dez cenários de proxy sem depender do arquivo antigo fora do Git. Tipos dos dois aplicativos passaram.
- Interface: campos, palavras, criação/remoção, tamanho/fonte, salvamento e recuperação após recarregar testados. Conferência de pagamentos no celular com largura 390 px e sem transbordamento horizontal.
- CSS, conteúdo e configuração base dos aplicativos conferidos intactos durante testes de API. Código dos originais preservado: 160 arquivos da aplicação sem mudanças, além das duas alterações anteriores conhecidas de `.gitignore`.
- Cinco reservas fictícias e 16 registros de alterações locais recuperados do snapshot anterior. Exemplos usados nos testes visuais foram removidos do rascunho; base e personalizações anteriores mantidas.
- Ajuda do aluno: seis tópicos locais, sem preços/quotas/prazos inventados; casos específicos enviados à equipe. Conferência financeira por regras, com consulta humana; não confirma, cobra ou estorna.
- Pesquisa e conselho finalizados em `ECONOMIA-AGENTES-PAGAMENTOS.md`: manter Supabase agora, Neon como alternativa a medir, custo/capacidade/logins, orçamento de manutenção, Mercado Pago x Stripe e único CNPJ recebedor.
- Caveman lite, instruções curtas e três perfis de agentes delimitados preparados. Não houve contratação de IA, conexão Cloud, economia medida ou envio de dados a modelos externos.

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
