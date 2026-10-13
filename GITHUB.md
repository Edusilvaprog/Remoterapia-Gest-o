# Versionamento e recuperacao

Este repositorio e privado. A branch `main` guarda o aplicativo atual; a branch `preview-editor` no repositorio da Gestao guarda, separadamente, os dois aplicativos de demonstracao e o editor local. A previa nao deve ser publicada nem mesclada inteira na versao atual.

Os uploads anteriores continuam no historico e na tag `antes-integracao-local-2026-10-13`. Nesta integracao o aplicativo atual passou a ficar na raiz do repositorio para conectar diretamente esta pasta ao Git. Nenhum arquivo funcional do aplicativo foi modificado por esta integracao.

Abra `Atualizar-Backup.cmd` na pasta principal da Remoterapia depois de salvar as mudancas aprovadas. Descreva a atualizacao. O comando verifica arquivos, cria um registro e envia para o GitHub; nao executa deploy. Alteracoes feitas no GitHub por outra pessoa interrompem o envio para permitir conciliacao. Cada um dos tres envios e independente; o comando informa quais ja foram concluidos caso haja falha.

No GitHub, abra **Commits** para consultar versoes e baixar uma copia. Para recuperar, clone em outra pasta e compare antes de substituir arquivos. Evite reset forçado e force push. O codigo da previa e o design salvo ficam na branch separada; rascunhos ainda no navegador e dados ficticios em memoria precisam ser exportados no editor.

Configuracoes secretas, contas, cadastros, fotos enviados ao servico e dados do Supabase nao sao copiados pelo Git. Guarde credenciais em um gerenciador seguro e mantenha backup separado do banco e do armazenamento. Para recriar uma instalacao, configure `.env.local` a partir do modelo e instale dependencias com `npm ci`. Os SQL versionados sao estrutura/migracoes, nao copias dos dados reais.

Uma verificacao local preventiva bloqueia arquivos privados e padroes conhecidos de segredos. Ela nao garante detectar todos os segredos: revise as alteracoes antes de enviar. Em novos clones use `git config core.hooksPath .githooks` para ativar a mesma verificacao.
