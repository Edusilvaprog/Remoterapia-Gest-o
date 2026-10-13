# Revisão do celular — Gestão e Portal do Aluno

Revisão de 13/10/2026, feita na prévia separada com dados fictícios em memória. Os aplicativos atuais e suas credenciais foram preservados.

## O que mudou

- **Nomes:** 68 ajustes de texto exclusivos do celular. Equipe de areia, Equipe de água, Eventos, Gestão e controle, Guardaria, Início, Histórico e Perfil mantêm sua função. Frases como “Um bom dia começa com clareza” e “Encontre seu próximo horizonte” deram lugar a “Visão geral” e “Próximos eventos”. A configuração de textos do computador foi preservada.
- **Cards:** espaçamento mais regular, sombras discretas, cantos consistentes e hierarquia entre título, informação e ação. A Guardaria recebeu o mesmo formato das outras áreas, com ícone SVG e indicação de abertura.
- **Navegação:** ícones SVG, nomes mais legíveis, indicação da área ativa, reação ao toque e áreas de acionamento maiores nos controles principais. Formulários usam tamanho de texto de 16 px na apresentação móvel.
- **Identidade:** logo existente preservada, azul e rosa usados a partir das cores do sistema. O botão principal de agendamento recebeu um tom mais escuro do rosa para melhorar o contraste do texto branco.
- **Animações:** transições curtas nos controles, sem efeitos que impeçam o uso. A versão móvel respeita `prefers-reduced-motion`.
- **Janelas:** foco contido no menu da Gestão e fechamento com Escape. A confirmação de cancelamento começa em “Manter agendamento”; Escape fecha essa confirmação sem cancelar a reserva. O foco retorna ao controle que abriu a janela. A leitura do título utiliza somente o texto visível, evitando anunciar juntos os títulos de celular e computador.
- **Atendimento:** opções fechadas saem da navegação por teclado. O menu aberto recebe foco, fecha com Escape e também ao trocar de aba. Nenhuma mensagem externa foi enviada durante a revisão.
- **Editor:** título e instruções diretos, nomes das áreas compatíveis com a navegação e lista de textos refletindo a versão selecionada. Foi testada uma edição pelo campo Texto, visualizada na prévia e revertida para “Equipe de areia”. As alterações de design ficaram na pasta separada.

## Critérios usados na pesquisa

Usar os termos que o público reconhece, mostrar o resultado das ações e facilitar a recuperação de erros são princípios de usabilidade. Por isso os títulos passaram a explicar a função da tela. Referência: [Nielsen Norman Group — heurísticas de usabilidade](https://www.nngroup.com/articles/ten-usability-heuristics/).

O mínimo geral de alvo de toque da WCAG 2.2 é 24 × 24 px, com exceções de espaçamento. Nesta revisão os controles principais visam dimensões maiores, como 44 px e barras de navegação com altura de 58 ou 64 px. Isso não significa que todo controle do aplicativo tenha sido certificado. Referência: [W3C — tamanho mínimo de alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

O contraste de texto comum deve atingir 4,5:1; textos grandes têm outro limite. As cores principais de texto e fundo foram conferidas, incluindo branco sobre azul (5,17:1), texto secundário sobre branco (4,75:1) e texto secundário do tema escuro sobre seu painel (7,62:1). Uma conferência completa deve considerar todas as combinações de cada tela, também depois de personalizações no editor. Referência: [W3C — contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Janelas precisam de foco previsível, Tab e Shift+Tab dentro delas, Escape para fechar e retorno ao acionador. Em confirmações irreversíveis, convém começar pela opção menos destrutiva. Referência: [W3C — padrão de diálogos](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Movimento deve respeitar as preferências do usuário. Essa orientação foi aplicada às animações da apresentação móvel. Referência: [W3C — animações de interação](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

## Conferência da entrega

- Verificação de tipos dos dois aplicativos: aprovada.
- Portal: abertura de Início, Agendar, Eventos, Histórico, Pagamentos e Perfil; seleção de data e exibição de horários no agendamento.
- Gestão: seleção de áreas, Equipe de areia e painel administrativo acessíveis; menu verificado com Tab, Shift+Tab e Escape.
- Cancelamento: Escape fechou a confirmação e o agendamento fictício permaneceu confirmado.
- Atendimento: opções ausentes quando fechado e retorno do foco ao botão após Escape.
- Editor: edição de texto refletida na prévia; retorno ao texto salvo deixou o painel sem alterações pendentes.
- Telas observadas em largura móvel: Portal em 390 px e administração da Gestão em 320 px, sem rolagem horizontal da página nesses exemplos.
- Comparação da base original de 162 arquivos: somente os dois `.gitignore`, modificados na configuração anterior do GitHub, diferem do registro original. Esta revisão não alterou os arquivos funcionais dos aplicativos atuais.

## Como continuar

Abra http://localhost:3010/, escolha o aplicativo e **Celular**. Use **Navegar** para conferir as funções e **Editar conteúdo** para selecionar textos na prévia ou em **Textos desta tela**. Salve os ajustes aprovados com **Salvar na nova versão**. Computador e celular mantêm ajustes próprios; copiar a aparência entre eles é uma ação explícita do editor.

Os rascunhos ainda no navegador e os exemplos em memória precisam ser exportados caso você queira guardá-los. O GitHub preserva o código e o design salvo na branch `preview-editor`. Essa branch não deve ser mesclada inteira nos aplicativos atuais: depois da aprovação, devem ser transportadas somente as mudanças escolhidas. As integrações reais de pagamento e autenticação continuam exigindo seus próprios testes fora da demonstração.
