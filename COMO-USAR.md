# Prévia local da Remoterapia

Esta pasta é uma versão separada dos aplicativos atuais. Gestão e Portal usam os mesmos componentes e fluxos existentes, com um adaptador de dados fictícios para revisar o visual sem senha e sem acessar o Supabase.

- Editor: http://localhost:3010/
- Gestão de demonstração: http://localhost:3015/gestao/painel
- Portal de demonstração: http://localhost:3016/
- Para iniciar novamente: abra `Abrir-Previa.cmd`.

## Editar e revisar

1. Escolha Gestão ou Portal, uma área e Celular ou Computador.
2. Use **Navegar** para abrir menus, abas e formulários.
3. Use **Editar conteúdo** para selecionar textos e blocos. Um clique seleciona; dois cliques permitem escrever nos textos cadastrados. A lista de textos também permite selecionar o elemento.
4. Dados de cadastros, valores calculados e controles de segurança não são textos estáticos. O painel explica a limitação; os formulários do próprio aplicativo podem alterar os exemplos locais suportados.
5. Os ajustes visuais aparecem primeiro no rascunho. Ele é recuperado neste navegador quando o painel é reaberto. **Salvar na nova versão** grava apenas os arquivos desta pasta. **Desfazer** recupera o último salvamento.
6. **Exportar revisão local** inclui o design em rascunho e os dados fictícios para documentar o que foi experimentado.

## Preservação

Os aplicativos atuais continuam em `C:\Users\Admin\Documents\remoterapia-v2`, nas portas 3005 e 3001. O editor desta pasta não escreve neles. `original-preservado.json` registra os hashes da base; `verificacao-original.json` documenta a conferência de preservação.

Os exemplos são compartilhados entre Gestão e Portal pelo processo do editor. Configurar um preço ou criar uma reserva nos exemplos pode ser observado no outro aplicativo após atualizar seus dados. Eles permanecem **somente em memória** e são restaurados quando o painel é reiniciado ou quando você escolhe **Reiniciar dados fictícios**. Essa ação preserva o design salvo.

Não foram copiadas credenciais para o ambiente ativo desta prévia. Uploads externos, autenticação real, recuperação de senha, MFA real, links de atendimento e pagamentos reais ficam indisponíveis. A prévia mostra os respectivos componentes, mas não valida essas integrações. O ambiente atual mantém suas próprias configurações e proteções.

## Depois da aprovação

A revisão deve comparar os arquivos desta pasta com a versão atual e transportar somente o design e as mudanças aprovadas. Os exemplos e seu histórico não são uma migração SQL, não representam regras de produção completas e não devem ser importados no banco real. Mudanças de banco, gateway, domínio e e-mail precisam de implantação e testes separados. Esta prévia bloqueia a publicação direta enquanto o modo local estiver ativo.

Validação desta entrega: verificação de tipos dos dois aplicativos; abertura das 14 rotas principais da Gestão e do Portal; reserva e cancelamento locais; dados compartilhados; bloqueio de uploads/webhook e origens externas; salvamento/desfazer do design; conferência dos 162 arquivos da versão atual.

O iniciador do editor antigo também foi redirecionado para esta prévia. Os dois aplicativos atuais não receberam essas mudanças. A cópia de recuperação dos iniciadores anteriores fica em work/backups-editor-original, no espaço de trabalho desta conversa.

A troca de áreas do Portal foi verificada mantendo o modo de edição ativo, o realce do texto e os campos de aparência. O rascunho visual também foi recuperado ao reabrir o painel.
