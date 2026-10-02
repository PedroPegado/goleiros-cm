# Revisão de performance — 02/10/2026

## Evidências antes do novo deploy

Medições feitas a partir da máquina de desenvolvimento contra `https://goleiros-cm.vercel.app`, com Chromium e navegações completas. “Pronto” significa que o título principal ficou visível; inclui rede, servidor e renderização. São amostras pequenas, não percentis nem um teste controlado de cold start.

| Página publicada | Amostra 1 | Amostra 2 |
| --- | ---: | ---: |
| Dashboard autenticado | 2.472 ms | 4.436 ms |
| Alunos autenticado | 2.854 ms | 4.394 ms |
| Pagamentos autenticado | 2.780 ms | 1.144 ms |

- `/login`, sem autenticação, respondeu em 592, 218 e 208 ms, incluindo a leitura do corpo HTTP.
- `x-vercel-id` apresentou `gru1::iad1::…`: entrada por São Paulo e execução em Washington. O endpoint Neon configurado localmente é `sa-east-1`, São Paulo. Conferir se o `DATABASE_URL` da Vercel aponta para esse mesmo endpoint.
- A URL local já usa o hostname `-pooler`, com SSL. Nenhuma credencial foi alterada. O código já instanciava Prisma fora dos handlers; a reutilização global foi estendida à produção para evitar clientes extras no mesmo processo. Isso não compartilha pools entre instâncias serverless diferentes.
- Uma conexão nova ao Neon, executando apenas `SELECT 1`, levou 1.698 ms; duas consultas seguintes levaram 60 ms cada, a partir da máquina local. A primeira inclui abertura de conexão/TLS e possivelmente retomada do compute; não permite atribuir todo o tempo ao scale-to-zero.
- O código anterior validava a mesma sessão em duas consultas sequenciais, fazia hash bcrypt ao importar o módulo, tentava inserir mensalidades já existentes, carregava todo o histórico financeiro no dashboard e todos os relacionamentos em qualquer aba do aluno.

As regiões são identificadas conforme a [documentação de headers da Vercel](https://vercel.com/docs/headers/request-headers) e a [lista de regiões](https://vercel.com/docs/regions).

## Mudanças implementadas

- Sessão validada em uma consulta por renderização/requisição, com memoização apenas durante a requisição. A versão da sessão continua sendo conferida no banco; logout e troca de senha continuam revogando cookies antigos. O hash usado para contas inexistentes só é preparado quando necessário.
- Prisma reutilizado em cada processo, sem desconectar ao final de cada requisição.
- Geração mensal busca apenas alunos sem a mensalidade da referência, mantém a restrição única e `skipDuplicates`, e deduplica chamadas da mesma referência durante a renderização. Não altera valores de pagamentos existentes.
- Dashboard usa contagens/somas no PostgreSQL e busca no máximo seis cobranças por bloco e quatro avaliações recentes. Consultas independentes rodam em paralelo. O financeiro agrega recebimentos pela data do pagamento.
- Lista de alunos seleciona campos básicos, pagamentos relevantes e primeira/última avaliação com notas. Não carrega histórico físico. Perfil busca avaliações, observações e histórico financeiro apenas nas abas correspondentes. A visão geral usa SQL parametrizado para a última nota de cada critério, preservando avaliações parciais. As medidas mais recentes continuam aparecendo em todas as abas.
- Notificações selecionam apenas os campos necessários. Cabeçalho carrega com Suspense sem bloquear o conteúdo e a navegação. A busca global mantém o comportamento existente.
- `loading.tsx` dentro do layout privado mantém header e navegação mobile. Links mostram estado real de navegação via `useLinkStatus` e impedem navegação repetida pelo mesmo link enquanto está pendente. Filtros financeiros navegam sem recarregar o documento, com botão desabilitado e spinner. Botões de gravação já tinham spinner/desabilitação e foram preservados.
- Removidos quatro `router.refresh()` redundantes após Server Actions. A revalidação compartilhada ficou restrita ao layout privado; ela continua ampla dentro dessa área para atualizar busca, notificações e totais. O refresh do login foi mantido.
- Migração aditiva com índices em `Evaluation(date, createdAt)` e `Payment(status, paidAt)`. Os índices existentes de aluno/data, status/vencimento e referência foram preservados. A migração foi aplicada e testada somente no PostgreSQL local.
- `vercel.json` define `gru1` para os próximos deploys.

Nenhum cache público de dados privados foi introduzido. Não houve reset, exclusão de dados nem migração no banco de produção. Os testes de escrita usaram exclusivamente o banco local.

## Medições seguras

Definir temporariamente `PERFORMANCE_LOGS=1` no ambiente a investigar e reiniciar/republicar. O padrão é desligado. Os logs JSON incluem:

- `app.timing`: duração de `auth.session`, `page.dashboard`, `page.students`, `page.profile` e `page.payments`.
- `db.operation`: nome do modelo/operação e duração total, incluindo espera por conexão.
- `db.query`: duração de cada instrução SQL, sem texto SQL nem parâmetros.

Não são registrados nomes, e-mails, IDs de alunos, senhas, cookies, URLs de conexão ou argumentos. `app.timing` da página começa após a autenticação e não corresponde ao tempo total no navegador. Uma operação Prisma com relacionamentos pode emitir várias instruções SQL; a contagem dos dois tipos de evento não é equivalente. Consultas paralelas não devem ter suas durações somadas como se fossem o tempo total da página. Desligar os logs após o diagnóstico para evitar volume desnecessário.

## Validação

- TypeScript, ESLint e build de produção passaram.
- 49 testes unitários passaram; os testes que exigem PostgreSQL são executados separadamente.
- Dois testes de integração com PostgreSQL passaram: concorrência/idempotência financeira e equivalência de resultados com histórico extenso.
- 27 testes de navegador passaram: 25 na suíte completa e dois adicionais de streaming/filtro. Cobrem login, bloqueio de rotas/RSC, senha inválida, persistência, logout, revogação, troca de senha, limites de tentativas, ausência de secrets no frontend, cadastro, edição, avaliações, gráficos, pagamentos, medidas, critérios e observações.
- Responsividade verificada em 375, 390, 430, 768, 1024 e 1440 px; navegação pendente testada especificamente nas três larguras mobile. Um bloqueio controlado no banco **local de testes** comprovou que o skeleton é transmitido com header e navegação visíveis. Não existe atraso artificial no código da aplicação.
- Em uma fixture com 60 avaliações e 24 pagamentos, a serialização do objeto retornado para o perfil caiu de **44.987 para 1.223 bytes** na visão geral, aproximadamente **97%**. A lista retornou duas avaliações para calcular a evolução. O teste confirmou os mesmos resultados e acesso integral aos históricos nas abas respectivas. Esses números não são tamanho HTTP nem ganho percentual de velocidade em produção.

## Para publicar e conferir na Vercel/Neon

1. Publicar este código na Vercel. Em **Project Settings → Functions → Function Region**, conferir São Paulo (`gru1`) e verificar a região do novo deployment. A configuração versionada em `vercel.json` só vale após novo deploy.
2. Confirmar que o `DATABASE_URL` de produção usa o endpoint Neon de São Paulo e hostname com `-pooler`; manter o `DIRECT_URL` para migrations. Nunca usar variáveis `NEXT_PUBLIC_` para esses valores.
3. Executar `npm run db:deploy` uma vez no ambiente configurado para o banco de destino para aplicar a migração de índices. Não executar `migrate dev`, reset ou seed em produção para esta atualização. A aplicação funciona sem os novos índices, mas só aproveita seus benefícios após a migração.
4. No Neon, conferir **Branch → Compute**: região, Scale to Zero e utilização/conexões. No plano gratuito a retomada após inatividade pode continuar adicionando latência. Não foi criado cron/ping para manter o banco acordado. Ver [gerenciamento de computes](https://neon.com/docs/manage/endpoints/).
5. Não alterar `connection_limit` às cegas: comparar operações Prisma com tempos SQL, conexões ativas e eventuais erros de pool. Um limite muito baixo serializa as consultas paralelas; muitos pools por instância aumentam conexões. A URL existente foi preservada. Ver [conexões no Prisma 6](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections).
6. Após publicar, repetir login/dashboard/alunos/perfil/pagamentos em um celular: uma visita após mais de cinco minutos sem uso e várias visitas seguidas. Comparar com as amostras acima, observar `x-vercel-id`, logs de duração e Network do navegador. Distinguir prefetch de solicitações duplicadas. Conferir também que salvar atualiza os totais e que logout volta a exigir login.

Não foi feito deploy nesta revisão. A diferença de região é uma evidência relevante, mas o impacto final da mudança e a contribuição de cold starts só podem ser confirmados no novo ambiente publicado. Históricos completos ainda crescem nas suas abas específicas, e a busca global/notificações continuam retornando todos os respectivos registros; paginação poderá ser necessária conforme o volume aumentar.
