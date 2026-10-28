# Remoterapia portátil — transferência

A pasta contém Gestão, Portal do Aluno e editor visual, com os rascunhos salvos. Não publica os sites e não copia o banco real.

## O que acompanha

- Código, imagens e arquivos de versões fixadas dos dois projetos.
- Editor, catálogo de textos/blocos, rascunho e histórico de desfazer.
- Captura dos dados fictícios, com origem e data em transferencia.json.
- Iniciador sem caminhos específicos deste computador.

Não acompanham node_modules, caches .next, histórico .git, arquivos .env, chaves privadas ou logs antigos. As dependências serão reinstaladas conforme cada package-lock.json.

## Antes de enviar

1. Aguarde "Rascunho salvo" no editor. Uma alteração guardada somente na aba não está garantida na cópia.
2. Prefira gerar a cópia com o editor aberto, para capturar os dados fictícios atuais.
3. Se estiver desligado, será usada a captura disponível em disco. Confira dataSource e dataCapturedAt em transferencia.json. Uma recuperação antiga não representa alterações posteriores que existiram apenas na memória.
4. Leve o ZIP por pendrive, rede ou transferência privada. Guarde uma cópia intacta antes de editar.

## No outro computador Windows

1. Instale Node.js 24, compatível com o ambiente usado neste projeto. Codex não é necessário para executar o editor.
2. Extraia todo o ZIP para uma pasta local gravável, como C:\Projetos\Remoterapia. Não execute de dentro do ZIP. Prefira uma pasta fora da sincronização automática do OneDrive durante a execução.
3. Execute Verificar-Transferencia.cmd antes da primeira abertura.
4. Execute 1-Preparar.cmd. A primeira preparação precisa de internet e pode levar vários minutos. Se falhar, corrija a conexão e tente novamente.
5. Execute 2-Abrir-Editor.cmd e mantenha a janela aberta.
6. Abra http://localhost:3010/. Gestão usa 3015; Portal usa 3016.

As três portas precisam estar livres. Feche a outra prévia antes. A primeira tela de cada projeto pode demorar por causa da compilação inicial.

Esta prévia usa dados fictícios, sem credenciais de produção. Não digite senhas reais para tentar conectar o banco.

## Guardar o trabalho

- O editor salva em tools/editor-visual/.editor-draft.json, incluindo o histórico.
- O iniciador tenta salvar os dados fictícios a cada 10 segundos em dados/previa-local.json.
- Para encerrar, pressione Ctrl+C na janela do iniciador e aguarde a mensagem de salvamento. Não feche à força.
- Queda de energia ou encerramento forçado pode perder os dados fictícios alterados desde a última captura. O rascunho visual tem seu próprio salvamento.
- Sessão, zoom e alterações ainda não salvas no navegador não são transportados como perfil de navegador.
- O rascunho não é aplicado ou publicado automaticamente no código dos aplicativos.

## Levar as alterações de volta

Com o editor aberto e o rascunho salvo, execute Exportar-Nova-Copia.cmd. Uma nova pasta e um novo ZIP serão criados em entrega-portatil. A cópia anterior não será apagada.

Trabalhe em um computador por vez. Não copie um rascunho antigo por cima do novo. Compare data e revisão em transferencia.json. O GitHub guarda o código; rascunhos e capturas privadas precisam acompanhar a transferência por arquivo.

## macOS ou Linux

Com Node.js 24 instalado, execute no terminal desta pasta:

    node tools/portatil/cli.cjs install
    node tools/portatil/cli.cjs start

Os arquivos .cmd são atalhos para Windows. Nos outros sistemas, o exportador gera a pasta; compacte-a pelo gerenciador de arquivos se não houver ZIP automático.

## Limites

Não inclui backup do Supabase, contas/senhas, sessões de navegador ou credenciais. Não ativa pagamentos, e-mails, domínio ou hospedagem. Alguns relatórios e testes antigos citam caminhos do computador original; o iniciador portátil não usa esses caminhos.

A verificação de integridade é para a cópia recém-recebida. Depois de editar, diferenças no rascunho e na captura são esperadas.