# Economia, agentes e pagamentos — decisão prática

Atualizado em 14/10/2026. Aplicação atual: somente Remoterapia. Manutenção combinada: R$ 100/mês; infraestrutura e tarifas pertencem à cliente. Cursos, publicação e domínio continuam para depois.

## Banco e capacidade

Recomendo manter Supabase nesta etapa. Os aplicativos dependem de Auth, sessões, políticas RLS e funções próprias. Migrar apenas pelo preço do banco também exige substituir ou adaptar esses recursos e testar novamente as permissões. Gestão e Portal podem compartilhar um projeto: sessões e autorização permanecem separadas; os registros de negócio se comunicam.

O Free inclui 500 MB de banco por projeto, 1 GB de arquivos, 5 GB de transferência e 50 mil usuários ativos mensais. Permite dois projetos ativos; pausa após uma semana de inatividade e não inclui backup automático. O Pro parte de US$ 25/mês, inclui um projeto Micro, 8 GB de banco, 100 mil usuários ativos, 250 GB de transferência e backups diários retidos por sete dias. Projetos Micro adicionais partem de US$ 10/mês. Fonte: [preços Supabase](https://supabase.com/pricing).

Login diário não vira um novo usuário faturável a cada dia. A mesma pessoa que entra ou renova sessão durante o ciclo conta uma vez nesse ciclo. Trinta acessos do mesmo aluno continuam sendo um usuário ativo mensal; consultas e transferências continuam consumindo recursos. Fonte: [como MAUs são contados](https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users).

Não há uma quantidade de alunos garantida pelo tamanho do banco. Fotos, histórico, índices, logs, consultas e simultaneidade mudam a capacidade. Exemplo de planejamento, sem teste de carga: 500 alunos com 20 ações diárias produzem 300 mil ações em 30 dias. Com 10 KB de resposta por ação, seriam aproximadamente 3 GB de transferência, antes de imagens, repetição e outras consultas. Não é uma previsão do consumo atual.

O Free atende desenvolvimento e piloto com uso acompanhado. Para operação comercial, recomendo reservar o custo do Pro e recuperação testada antes de começar a depender do sistema diariamente. Não prometo um prazo gratuito: ele depende do consumo e das condições do fornecedor.

## Alternativa pesquisada: Neon

Neon anuncia Free sem prazo fixo, 100 projetos, 1 GB de banco e 100 CU-h mensais por projeto. O plano Launch cobra US$ 0,106 por CU-h e US$ 0,35 por GB-mês; outros recursos têm cobrança própria. Inatividade pode desligar o compute e economizar. Fonte: [preços Neon](https://neon.com/pricing).

Exemplos calculados, apenas compute e armazenamento: 20 CU-h + 1 GB dão US$ 2,47/mês; 182,5 CU-h + 1 GB dão aproximadamente US$ 19,70/mês. Esses valores excluem funções, armazenamento adicional, tráfego, retenção e trabalho de migração. Cem projetos disponíveis não garantem cem sistemas com carga contínua gratuita.

Neon merece um piloto isolado se quisermos migrar no futuro. Auth próprio do fornecedor não significa compatibilidade direta com Supabase Auth, JWT, RLS ou nossas funções. Agora, a economia potencial deve pagar a migração, manutenção e recuperação. AWS/Google não foram contratados; seus créditos promocionais também não substituem um orçamento completo de banco, autenticação, arquivos, backup e hospedagem.

Várias empresas no mesmo projeto só depois de isolamento por empresa, políticas, limites e testes de acesso cruzado. A base atual é para uma Remoterapia; não tratar os perfis de aluno/equipe como isolamento entre empresas. Para esta cliente, um projeto atende os dois aplicativos, sujeito à capacidade real.

## Controle de custo

- Paginar consultas; buscar apenas colunas necessárias; evitar consultar todo o histórico a cada clique.
- Usar imagens comprimidas e miniaturas. Não armazenar vídeos de cursos no banco.
- Atualizar dados quando necessário; evitar polling permanente e assinaturas Realtime em todas as tabelas.
- Acompanhar semanalmente banco, arquivos, tráfego, usuários ativos e latência; alerta de planejamento em 70% e revisão em 85% das franquias. Esses percentuais são sugestões, não alertas já instalados.
- Configurar limite de gastos no plano pago e conferir recursos excluídos desse limite. Pro inclui spend cap por padrão, conforme [preços Supabase](https://supabase.com/pricing).
- GitHub preserva código. Backup do banco e dos arquivos precisa de rotina separada, recuperação comprovada e acesso restrito.

Proposta comercial: R$ 100 fixos de manutenção + fatura efetiva dos serviços, preferencialmente em contas da cliente. Se forem seis horas de suporte, a manutenção representa R$ 16,67/h antes de despesas. Registrar o que está incluído e orçar novas funções separadamente protege a parceria. Não alterei o valor combinado.

## Pagamentos e CNPJ

Recomendo começar pelo Mercado Pago: a empresa já usa o serviço e a integração foi preparada. Os eventos terão um único recebedor, a própria Remoterapia. Manter conta empresarial, credenciais e identificação do recebedor da empresa. O documento informado pelo comprador não muda quem recebe o pagamento. Não precisamos implantar marketplace/split para esse fluxo.

Tarifas públicas consultadas em 14/10/2026; conferir condições da conta, parcelamento e serviços adicionais antes de ativar:

| Método | Mercado Pago Checkout | Stripe Brasil |
| --- | --- | --- |
| Pix | 0,99% | 1,19%; disponibilidade pública por convite |
| Cartão nacional | 4,98% imediato; 4,49% em 14 dias; 3,98% em 30 dias | 3,99% + R$ 0,39 por transação |
| Boleto | R$ 3,49 | R$ 3,45 por boleto pago |

Fontes: [Mercado Pago](https://www.mercadopago.com.br/ferramentas-para-vender/check-out), [Stripe Brasil](https://stripe.com/br/pricing).

Exemplo de R$ 100: cartão MP imediato custa R$ 4,98; MP em 30 dias custa R$ 3,98; Stripe custa R$ 4,38. Pix MP custa R$ 0,99. A escolha depende também do prazo de caixa. Não é uma equivalência de todas as tarifas e serviços.

A Stripe pede identificação e conta bancária brasileiras correspondentes ao titular; após verificação, mudar documento ou tipo de entidade tem restrições. Fontes: [cadastro brasileiro](https://support.stripe.com/questions/brazil-specific-information-to-open-a-stripe-account), [alteração de dados fiscais](https://support.stripe.com/questions/updating-tax-information-for-stripe-accounts-in-brazil).

Antes de dinheiro real: criar aplicação MP da Remoterapia, configurar credenciais só no servidor, confirmar collector ID, testar webhook assinado, duplicação, valores, cancelamento, devolução e pagamento tardio. Não liberar plano/evento apenas pelo retorno do navegador. Recibo do gateway não substitui a emissão fiscal; definir obrigação e emissão com contador conforme atividade/regime. Referência: [Portal NFS-e](https://www.gov.br/nfse/pt-br/). Stripe não foi integrado; cobranças reais não foram ativadas.

## Agentes e economia de contexto

Adotado Caveman lite: respostas curtas, STATUS para retomada, buscas dirigidas, tarefas delimitadas e verificação da área alterada. Não instalar toda a família Caveman por padrão. Mais skills e contexto repetido podem aumentar consumo. Não há economia percentual medida nem Caveman Cloud conectado.

Perfis preparados: investigador sem edição; executor para uma mudança delimitada; revisor sem edição. Até dois auxiliares, sem delegação recursiva, modelo herdado e relatório curto. Configurações TOML e caminhos foram conferidos. A validação automática numa nova sessão ainda precisa ser demonstrada: o CLI desta execução não resolveu seu diretório pessoal, impedindo o diagnóstico de carregamento. Isso não altera os aplicativos.

Dentro do SaaS, já existem dois assistentes locais: ajuda do aluno com seis assuntos e conferência de pagamentos/pendências. Não precisam de modelo pago nesta etapa. Ajuda não inventa preço, quotas, prazo de reembolso ou segurança climática; situações específicas voltam à equipe. Conferência recomenda revisão humana e não movimenta dinheiro. Manual oficial de regras comerciais ainda deve ser aprovado pela Remoterapia antes de ampliar a biblioteca.

Se depois for necessária IA generativa: definir provedor/orçamento, usar apenas conteúdo aprovado, enviar o mínimo de dados, limitar tamanho, chamadas e custo mensal, testar respostas e manter atendimento humano. A IA não deve autorizar acesso, confirmar recebimento ou executar estorno por conta própria. Nenhum desses serviços pagos foi conectado.
