# Reinstalar o comando de backup

Use uma pasta principal contendo os clones Remoterapia-Gestão e Remoterapia-Portal. Copie Atualizar-Backup.ps1 e backup-config.example.json para tools/github-backup nessa pasta principal. Renomeie o JSON para backup-config.json e preencha previewPath com o caminho da pasta da previa. Copie Atualizar-Backup.cmd.example para a pasta principal e renomeie para Atualizar-Backup.cmd. O comando verifica os destinos e as branches antes de enviar.

Para recriar a previa completa, clone a branch preview-editor do repositorio da Gestao em outra pasta. Configure .env.local a partir dos modelos de cada aplicativo e execute npm ci em cada um. O iniciador da previa usa um caminho de Node desta maquina; em outro computador ajuste o runtimeExe em tools/editor-visual/start.ps1 para sua instalacao de Node. Nenhuma configuracao do banco real e necessaria para os exemplos locais.
