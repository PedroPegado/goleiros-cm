# Goleiros — Centro de performance

Aplicação mobile-first para um professor de goleiros: cadastro de atletas, avaliações parciais, evolução, medidas físicas, observações e mensalidades com histórico. A entrada abre diretamente o Dashboard. Não há login, entidade User, envio de mensagens ou integração paga.

## Executar

Requisitos: Node.js **22.14 ou superior**, npm e PostgreSQL (Neon ou local).

```bash
npm ci
cp .env.example .env
# Preencha DATABASE_URL e DIRECT_URL no .env
npm run db:deploy
npm run db:seed
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env`. Abra [localhost:3000](http://localhost:3000). `db:seed` instala somente os 12 critérios padrão e configurações; não cadastra atletas reais ou fictícios.

### Demonstração gratuita inteiramente local

Em uma instalação nova, sem `.env`, execute `npm run db:local` em um terminal. Esse utilitário de desenvolvimento inicia PostgreSQL em `127.0.0.1:55432`, gera senha aleatória e cria `.env`. Não sobrescreve um `.env` existente. Em outro terminal:

```bash
npm run db:deploy
npm run db:seed:demo
npm run dev
```

O seed demo é explícito e idempotente: seis alunos fictícios, 36 avaliações, pagamentos pagos/atrasados/próximos, medidas e observações. Ele preserva registros existentes. Os números de telefone são placeholders; não envie mensagens a eles. Nunca execute o seed demo no banco real.

O PostgreSQL local permanece no terminal até Ctrl+C, e os arquivos ficam em `.local-postgres/`, ignorada pelo Git. Para reiniciá-lo, configure `LOCAL_DB_PASSWORD` com a senha já presente no seu `.env` antes de executar `npm run db:local`; não publique essa senha. O utilitário só escuta no loopback e não é usado na Vercel.

## Tecnologias e organização

- Next.js 16, App Router, React e TypeScript estrito.
- Tailwind CSS 4; componentes próprios com composição Radix Slot no padrão shadcn/ui, Lucide e Sonner.
- PostgreSQL e Prisma 6.19, preservando `url = env("DATABASE_URL")` no schema. O lockfile fixa as versões instaladas.
- React Hook Form, Zod, date-fns e Recharts.
- Vitest para regras, Playwright para fluxos e responsividade.

```text
src/app/          páginas e layouts Server Components
src/components/  interface, formulários, navegação e gráficos
src/actions/     Server Actions; fronteira central de mutação
src/services/    consultas e geração de mensalidades
src/lib/         Prisma, validação, datas, finanças e cálculos
prisma/          schema, migrations versionadas e seed
tests/           regras de negócio
e2e/             fluxos completos e seis larguras de tela
scripts/         utilitários locais
```

O browser recebe somente os dados necessários à interface. O acesso Prisma é marcado `server-only`; não há endpoints REST públicos de listagem, chaves no cliente ou persistência em localStorage. Os gráficos recebem notas reais consultadas no servidor. As fotos são redimensionadas para até 360px, convertidas para JPEG e guardadas no PostgreSQL, sem servidor de arquivos ou serviço pago. A imagem final tem limite validado de tamanho e tipos permitidos.

## Banco e Neon

Crie um projeto gratuito PostgreSQL no Neon. Em **Connect**, copie a conexão com pooling para `DATABASE_URL` e a conexão direta para `DIRECT_URL`:

```env
DATABASE_URL="postgresql://usuario:senha@host-pooler.neon.tech/banco?sslmode=require&connection_limit=5"
DIRECT_URL="postgresql://usuario:senha@host.neon.tech/banco?sslmode=require"
```

Os valores acima são exemplos. Prisma CLI/seed leem `.env`; Next.js também aceita `.env.local`. Para manter os comandos coerentes, prefira `.env` local. Na Vercel use Environment Variables. Nunca use prefixo `NEXT_PUBLIC_` para conexões.

O cliente Prisma é reaproveitado durante o desenvolvimento; a URL com pooling é indicada para funções serverless. Migrations usam `DIRECT_URL`. A aplicação roda no runtime Node, não no Edge. Não há serviço de banco obrigatório além do PostgreSQL.

```bash
npm run db:generate
npm run db:migrate -- --name descricao_da_mudanca  # desenvolvimento
npm run db:deploy                               # banco de destino
npm run db:seed                                 # dados essenciais
```

Use uma branch/banco Neon separado para testes e previews. Nunca execute `migrate reset` em produção. Faça backups com `pg_dump` e valide restauração antes de armazenar dados reais; retenção disponibilizada pelo provedor depende do plano.

## Modelo e regras

`Student` possui avaliações, pagamentos, medidas e observações. `EvaluationScore` liga uma avaliação a um `EvaluationCriterion`. As configurações ficam em `Setting`. Não há entidade User nem relacionamento com autor.

- Datas civis são PostgreSQL `DATE`, convertidas na fronteira para `YYYY-MM-DD`. A interface exibe `DD/MM/YYYY`. A data de hoje usa `America/Fortaleza`; não se formata nascimento/vencimento como um timestamp local.
- Idade é calculada a partir do nascimento. A altura e o peso atuais são a medida não nula mais recente de cada atributo; registrar apenas peso não apaga a altura.
- Notas variam de 0 a 10. Zero participa da média; campo vazio não participa. Ao menos um critério é necessário. Critérios inativos mantêm o histórico e podem ser preservados ao editar avaliações antigas.
- Evolução compara primeira e última média cronológica. Com menos de duas avaliações, exibe estado vazio; com primeira nota zero, não divide por zero para percentual. O desempenho atual usa a nota mais recente de cada critério, com a data correspondente.
- As mensalidades do mês atual são criadas na consulta para alunos ativos já matriculados, com `createMany(skipDuplicates)` e chave única `(studentId, referenceMonth, referenceYear)`. Na seleção de um mês anterior no financeiro, a geração também é idempotente para alunos atualmente ativos com matrícula até aquele mês. Não há inferência de períodos antigos de inatividade: pagamentos existentes são a fonte do histórico.
- Não são geradas cobranças automáticas de meses futuros. O professor pode registrar manualmente um pagamento por referência, inclusive antecipado. O cadastro feito depois do dia padrão de vencimento gera a primeira mensalidade integral, podendo ficar atrasada; não há cálculo proporcional.
- Dia 29/30/31 é limitado ao último dia do mês quando necessário. Vencimento no dia de hoje não está atrasado. Atraso é calculado na consulta, mesmo que o registro persistido esteja `PENDING`; não precisa de cron. O enum `OVERDUE` é aceito para compatibilidade, mas não depende de atualização diária.
- Alterar valor ou vencimento do cadastro afeta novas cobranças; nunca altera histórico automaticamente. Registrar a mesma referência atualiza um registro único. Ao editar um pagamento existente, a referência é imutável no servidor.
- Desativar preserva avaliações e cobranças existentes e impede novas avaliações/cobranças automáticas. Exclusão permanente é confirmada e remove os relacionamentos em cascata. Excluir a cobrança atual de aluno ativo permite sua recriação pendente na próxima consulta, explicado na confirmação.
- Notificações são derivadas das cobranças, uma por pagamento. Não foi criada tabela `Notification`: não há leitura individual persistente ou integração externa nesta versão, portanto persistir avisos duplicaria a fonte de verdade. O serviço pode alimentar canais futuros.
- O link `wa.me` normaliza o telefone brasileiro com DDD e preenche uma mensagem. Nada é enviado automaticamente.

## Rotas

`/dashboard`, `/alunos`, `/alunos/novo`, `/alunos/[id]`, `/alunos/[id]/editar`, `/avaliacoes/nova`, `/avaliacoes/[id]/editar`, `/pagamentos`, `/configuracoes`. O perfil tem visão geral, avaliações, evolução, pagamentos e observações. A navegação vira menu inferior no celular.

## Verificação

```bash
npm run typecheck
npm run lint
npm test
npm run test:db # PostgreSQL de teste: concorrência e preservação do histórico
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes E2E precisam do banco local de demonstração com migrations e seed aplicados. Iniciam `next start` se a porta 3000 estiver livre; faça build antes. Criam/excluem um atleta de teste e verificam edição, avaliação parcial com zero, evolução, pagamento, medidas, observações, busca, desativação e exclusão. Um teste altera temporariamente a janela de lembretes e a restaura para três dias. **Use banco de teste.**

As telas principais são capturadas em 375, 390, 430, 768, 1024 e 1440px em `artifacts/screenshots/`. Há checagem automática de overflow horizontal. Resultados detalhados ficam em `playwright-report/`. São verificações em Chromium; não substituem testes em aparelhos físicos/Safari.

## Build e Vercel

```bash
npm run build
npm run start
```

1. Envie o repositório para seu Git e importe na Vercel como Next.js.
2. Escolha Node 22.x (ou superior compatível).
3. Defina `DATABASE_URL` e `DIRECT_URL` separadamente em Production/Preview.
4. Execute `npm run db:deploy` e `npm run db:seed` contra o banco de destino em um ambiente confiável antes do primeiro acesso. Não execute o seed demo.
5. Use Install Command `npm ci` e Build Command `npm run build`. O postinstall/build geram o cliente Prisma.
6. Publique e confira Dashboard, cadastro e persistência.

Migrations são uma etapa de release explícita para evitar alterar banco de produção durante um preview. O build não precisa consultar o banco; as páginas são dinâmicas. Se faltar configuração, a interface orienta a configurar o banco, sem simular sucesso com dados de exemplo.

### Gratuidade: limite concreto da Vercel

Nenhuma funcionalidade exige assinatura, API de mensagens, armazenamento pago, IA ou cron. O PostgreSQL pode rodar no Neon Free dentro das cotas vigentes ou localmente. Porém, o **Vercel Hobby é restrito a uso pessoal e não comercial**, segundo a [documentação oficial](https://vercel.com/docs/plans/hobby). Um sistema usado na operação comercial de um professor/escola pode não se enquadrar. Portanto não se promete hospedagem comercial gratuita na Vercel e nenhum plano pago foi contratado. A alternativa sem assinatura já implementada é executar o sistema e o PostgreSQL localmente. As [cotas Neon](https://neon.com/docs/introduction/plans) também devem ser verificadas antes do uso.

### Privacidade sem login

Esta versão respeita o requisito de **não implementar autenticação**. Consequentemente, qualquer pessoa com acesso ao endereço pode ler/alterar registros e fotos; Server Actions e IDs não são barreira de acesso. `robots.txt`, metadados e `X-Robots-Tag` evitam indexação cooperativa, mas **não tornam o site privado**.

Não publique dados reais de menores em uma URL acessível sem controle de acesso. A demonstração usa somente dados fictícios. Para operação com dados reais, mantenha acesso restrito na infraestrutura ou inclua autenticação futuramente. O ponto central de mutações em `src/actions/index.ts` e os serviços de consulta permitem adicionar verificação de identidade sem remodelar alunos e avaliações; leituras e mutações precisam ser protegidas juntas. Não há login oculto ou senha padrão nesta entrega.

Nenhuma credencial Neon/Vercel foi presumida. A validação local não significa que um deploy remoto foi realizado.
