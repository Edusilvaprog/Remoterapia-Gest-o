# Remoterapia — trabalho pausado

Pausa solicitada pelo usuário em 14/10/2026. Não iniciar novos trabalhos até ele pedir a retomada. Os arquivos foram salvos na prévia; aplicativos e banco reais não foram alterados nesta revisão.

## Concluído nesta revisão

- Gestão: `middleware.ts` migrado para `proxy.ts`, preservando corpo, cookies, MFA e matcher. Dez cenários comparados entre as duas versões passaram. Build da Gestão passou sem os avisos antigos de middleware/Edge.
- Editor: clique e duplo clique agora compartilham a resolução do texto. Isso inclui ícone/espaço de controles com um único texto. Três cópias do bridge sincronizadas. A limitação da automação para clicar no iframe ainda não foi resolvida ou comprovada como problema humano.
- Três agentes de desenvolvimento configurados: investigador, executor e revisor. TOML validado, caminhos conferidos, máximo de dois auxiliares, modelo herdado e saídas curtas. Configurações em `.codex/config.toml` da prévia e do workspace desta conversa; perfis em `tools/agents/`.
- Instruções curtas de projeto em AGENTS.md e estado resumido em STATUS.md. Caveman lite adotado. Nenhuma porcentagem de economia foi medida.
- Portal / Perfil: Ajuda do Portal integrada, com seis tópicos, busca local e atendimento explícito. Dúvida conhecida e desconhecida testadas na interface. Não guarda perguntas nem consulta outros alunos.
- Gestão / Pagamentos: conferência local de pedidos e pendências integrada. Detecta prazo local encerrado, revisão, contestação, devolução, valor inválido e pendências cadastrais; recomenda conferência humana. Não confirma pagamentos, cobra, estorna ou altera registros.
- Os dois assistentes do SaaS são baseados em regras e **não têm IA generativa conectada**. Não foram criados serviços de IA pagos ou enviadas informações a modelos externos.
- Build final do Portal passou. A primeira tentativa simultânea com a Gestão falhou por memória do computador; a repetição individual passou.
- Testes do simulador e de regras financeiras passaram. Exemplos temporários inseridos para teste foram removidos apenas da memória local. Evidência: `evidencias-pendencias/conferencia-pagamentos.png`.

## Banco consultado, sem modificações

Projeto Supabase Remoterapia V: `dtrpfcxvqveijkoaylcw`.

- Vinte funções públicas SECURITY DEFINER revisadas: gates de equipe/ownership e search_path restrito conferidos; nenhum bypass de aluno para equipe reproduzível identificado nessa leitura.
- Helper atual `private.has_staff_role` confirma perfil ativo, papel e AAL2 quando há fator verificado.
- `private.cotas_upload` e `public.recebimentos_mp`: RLS ativa, acesso direto de anon/authenticated negado. Ausência de políticas nesses casos é intencional; não abrir acesso para eliminar avisos.
- Contagem atual: três perfis privilegiados ativos, zero fatores MFA verificados, zero pedidos online reais.
- Proteção contra senhas vazadas continua desativada, conforme advisor. Disponibilidade/configuração no plano precisam ser verificadas antes de produção.
- Arquivos de evidência de definições, fora da prévia: `work/security-live-definitions.json` e `work/security-live-helpers.json`.

## Decisões do usuário

- Domínio e publicação adiados; não registrar domínio agora.
- Agentes desejados tanto para desenvolvimento quanto para o SaaS.
- Prioridades do SaaS: dúvidas dos alunos e conferência de pagamentos/pendências, podendo ser assistentes separados.
- Eventos recebidos **somente pelo CNPJ da própria Remoterapia**.
- Manutenção acordada anteriormente: R$ 100/mês; infraestrutura paga pela cliente.

## Próximos passos, em ordem

1. Conferir o diff desta revisão e fechar a validação do editor por clique/duplo clique. Testar os novos blocos no editor e a conferência em celular; os campos/listas de edição já funcionavam antes.
2. Tornar o teste de proxy reutilizável no repositório. A prova atual está em `work/verify-preview-proxy.cjs`; sua referência antiga está em `work/base-padrao-recuperacao/middleware-antes.ts`, fora do Git.
3. Revisar os textos e orientações dos assistentes com as regras oficiais da Remoterapia. A biblioteca atual evita inventar preço, quota ou política de cancelamento.
4. Validar o carregamento dos agentes numa nova sessão do Codex. Arquivos e referências foram validados; a sessão atual não demonstrou o carregamento automático dos novos perfis.
5. Finalizar o documento de economia, agentes e pagamentos. Não instalar toda a família Caveman nem conectar Caveman Cloud por padrão: CLI/credenciais de Cloud não estão configurados e não há chamadas de LLM nos aplicativos atuais. Economia real ainda não mensurada.
6. Entregar o conselho de pagamento: comparar Mercado Pago já preparado com Stripe, regras de titularidade CNPJ, tarifas, prazos e responsabilidades fiscais. Nenhuma integração Stripe foi criada.
7. Enviar o checkpoint ao GitHub quando a retomada for autorizada. A última versão remota confirmada antes desta revisão era `06d5b59`, branch `preview-editor`. Conferir o commit local de pausa e o estado remoto antes de enviar.

## Pagamentos — pesquisa já realizada

Recomendação em elaboração: começar com Mercado Pago na conta CNPJ da Remoterapia, aproveitando a integração preparada e a conta existente. Um único recebedor dispensa arquitetura de marketplace/split neste estágio. O recebedor é definido pela conta/credencial verificada do gateway, não pelo CPF/CNPJ informado pelo comprador.

Tarifas públicas consultadas em 14/10/2026, sujeitas ao contrato e à conta:

| Método | Mercado Pago Checkout | Stripe Brasil |
| --- | --- | --- |
| Pix | 0,99% | 1,19%; página pública informa disponibilidade por convite |
| Cartão nacional | 4,98% na hora; 4,49% em 14 dias; 3,98% em 30 dias | 3,99% + R$ 0,39 por transação |
| Boleto | R$ 3,49 | R$ 3,45 |

Fontes primárias já consultadas:

- [Mercado Pago — Checkout e tarifas](https://www.mercadopago.com.br/ferramentas-para-vender/check-out)
- [Stripe — preços Brasil](https://stripe.com/br/pricing)
- [Stripe — cadastro brasileiro, CPF/CNPJ e conta bancária correspondente](https://support.stripe.com/questions/brazil-specific-information-to-open-a-stripe-account)
- [Stripe — documento/tipo de conta não pode ser alterado após verificação](https://support.stripe.com/questions/updating-tax-information-for-stripe-accounts-in-brazil)
- [Receita Federal — Portal NFS-e](https://www.gov.br/nfse/pt-br/)
- [Codex — configuração de agentes](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [OpenAI — instruções e skills menores](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)

A conta empresarial e os documentos precisam corresponder ao recebedor; emissão fiscal deve ser definida com o contador conforme atividade/regime. O gateway preparado não implementa emissão de NFS-e. Não contratar serviços, registrar CNPJ, ativar cobranças ou cadastrar contas sem escopo próprio.

## Dependências externas mantidas para depois

Aplicação e credenciais do Mercado Pago, homologação/webhooks, SMTP e recuperação real, MFA configurado pelo titular, definição de fornecedor/modelo e orçamento se for desejada IA generativa, publicação com o modo local desativado. Cursos e referência Imua permanecem fora do escopo atual.

## Recuperação e evidências

- Código anterior: `work/base-padrao-recuperacao/antes-das-pendencias.zip`.
- Sites atuais: conferência de 162 arquivos encontrou somente as duas alterações conhecidas de `.gitignore` da etapa anterior de backup; os 160 arquivos de aplicação conferidos continuam iguais.
- Os exemplos de negócio ficam na memória do editor e não no Git. Para preservá-los entre reinícios, exportar a revisão local ou usar o snapshot de recuperação; não reiniciar os exemplos como forma de salvar código.
- Scripts auxiliares desta revisão estão em `work/`; copiar apenas os úteis/reutilizáveis para o repositório, após revisão.
