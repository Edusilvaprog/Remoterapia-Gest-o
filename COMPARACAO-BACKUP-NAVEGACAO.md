# Backup antigo e organização da prévia — 18/10/2026

Referência somente para leitura: `C:\Users\Admin\Music\remoterapia-v2`, com `site-gestao` e `site-agendamento`. O backup não foi executado nem alterado. Ajustes feitos exclusivamente em `work/versao-preview`.

## O que a comparação mostrou

A ordem das abas internas principais continua igual à do backup. O problema não era uma inversão geral dessas abas: surgiram novos acessos gerais, opções operacionais no computador e diferenças de apresentação entre dispositivos.

| Área | Ordem encontrada no backup e preservada na prévia |
|---|---|
| Equipe de água | Mar → Fotos → Tempo |
| Equipe de areia | Mar → Registro → Fechamento → Clima; Novo embarque no centro |
| Administração | Usuários → Frota & preços → Guarda-volumes → Auditoria |
| Gestão do Portal | Agendamentos → Bloqueios → Clientes → Eventos → Planos |
| Guardaria | Frota → Agendamentos → Bloqueios → Clientes |
| Direção | Resultados → Feedback → Mídia |
| Portal do aluno no celular | Início → Agendar, quando permitido → Eventos → Histórico → Perfil |

No seletor antigo, as entradas eram Equipe de água, Equipe de areia, Eventos, Gestão e controle e Acesso administrador, conforme o perfil. A prévia havia colocado Guardaria antes de Gestão e controle. A ordem de referência foi recuperada, mantendo Guardaria como acesso adicional ao final.

O nome principal “Eventos” também foi recuperado nesse seletor, com descrição que explica o acesso ao Portal de alunos. Ícones SVG e apresentação atual continuam sendo utilizados; não foi copiado o código antigo de autenticação, banco ou regras de negócio.

## Separação por dispositivo

| Função | Celular | Computador | Situação nesta revisão |
|---|---|---|---|
| Equipe de areia, fila e atendimento operacional | Operar | Sem entrada operacional | Retirada do menu, abas e seletor do desktop |
| Equipe de água e acompanhamento operacional de retornos | Operar | Sem entrada operacional | Retirada do menu, abas e seletor do desktop |
| Novo embarque / colocar cliente na água | Operar | Sem entrada operacional | Mantida exclusividade do celular |
| Liberar saída / confirmar retorno | Operar | Consulta dos registros | Portal e Guardaria já possuem apresentações desktop de consulta; não foram eliminadas suas telas de cadastro |
| Alunos, clientes, reservas, eventos e planos | Acesso conforme perfil | Administrar | Mantidos |
| Guardaria: frota, clientes e bloqueios | Acesso conforme perfil | Administrar | Mantidos |
| Diário e registros de saídas | Consultar | Consultar | Mantidos |
| Fechamento e pagamentos | Acesso conforme perfil | Conferir e administrar | Mantidos |
| Resultados, feedback, mídia e clima | Consultar/usar conforme perfil | Consultar/administrar conforme a função | Mantidos |
| Equipe, tarifas, armários e configurações | Acesso conforme perfil | Administrar | Mantidos |
| Login, recuperação, perfil e segurança | Acessíveis | Acessíveis | Sem alteração de autenticação |

Dados como “Na água agora” podem continuar no painel do computador como informação. O que foi separado é a operação de campo. Ocultar a interface por dispositivo é uma decisão de uso; as permissões do servidor continuam determinando quem pode executar as ações.

As rotas operacionais acessadas diretamente no computador agora apresentam uma orientação de uso no celular. Seus componentes e funções móveis foram preservados.

## Ajustes preparados no editor

- No computador, o seletor de telas da Gestão oferece 19 entradas, sem Água, Areia e Novo embarque.
- No celular, continuam disponíveis as 22 entradas.
- Se uma tela exclusiva do celular estiver aberta e a versão mudar para computador, o editor abre a visão geral. Nas telas compartilhadas, a troca de versão mantém a rota.
- O Portal do aluno conserva as sete telas de edição nas duas versões.
- Rascunho, textos personalizados, dimensões e histórico de edição continuam separados da base. Não foi restaurado o rascunho para aplicar esta organização.

## Problema de apresentação corrigido

Um botão “Configurações”, marcado no código como exclusivo do computador, aparecia também no celular. A regra que escondia `.rt-desktop-only` era sobrescrita pelo estilo visual de botão carregado depois. A ocultação agora é explícita no intervalo do celular, preservando o estilo desktop.

Isso demonstra por que a adaptação precisa conferir visibilidade e comportamento, além da aparência dos cartões.

## Melhorias de experiência recomendadas para a próxima etapa

1. **Entrada móvel orientada ao trabalho:** Equipe de água e Equipe de areia primeiro; administração abaixo, conforme o perfil. Preservar os nomes conhecidos.
2. **Um cabeçalho principal:** logo, identificação da área e acesso ao menu. Troca de área e sair ficam em local consistente; remover duplicações apenas onde forem confirmadas.
3. **Barra inferior estável:** preservar a ordem antiga e a ação central de embarque na recepção. Conferir rótulos, espaçamento, área de toque e rodapé de cada tela.
4. **Computador orientado à administração:** menu lateral com cadastros, agenda, financeiro, resultados e configurações; ações de campo permanecem no celular.
5. **Portal do aluno familiar:** preservar as cinco entradas móveis. Pagamentos e suporte devem ser fáceis de encontrar sem ocupar a barra com atalhos duplicados.
6. **Editor com camadas e propriedades por alvo:** seguir a proposta de `PESQUISA-EDICAO-VISUAL.md`, começando por seleção e organização do grupo. Essas novas ferramentas ainda não foram implementadas.

Este trabalho prepara a separação e recupera a referência de navegação. Não representa uma reformulação visual completa de todas as telas móveis.

## Verificação

Testes de navegação cobrem exclusão das operações no desktop, preservação de perfis, acesso móvel e abas administrativas. Testes do editor conferem as listas por dispositivo e preservação das ações do Portal. Rascunhos e medidas possuem verificação própria.

Esses testes e a conferência de tipos da Gestão passaram. No navegador, confirmados: menu desktop sem Água/Areia, grupo operacional oculto no computador, Novo embarque visível no celular e botão desktop de Configurações oculto no cabeçalho móvel. Trocar de Água no celular para computador levou o editor à visão geral, conforme previsto.

A navegação do backup foi inspecionada pelo código; o sistema antigo não foi iniciado. A aparência da prévia foi inspecionada no navegador. O gesto de arraste dentro do iframe continua sujeito à limitação de automação já registrada em `RETOMAR.md`.
