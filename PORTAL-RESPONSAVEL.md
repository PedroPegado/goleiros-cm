# Portal do Responsável

## Como usar

No perfil administrativo de um aluno, clique em **Gerenciar acesso do responsável** e depois em **Ativar e gerar código**. Copie o código ou abra a mensagem preparada no WhatsApp. O envio é manual. Ao fechar o diálogo, o código deixa de estar disponível; para recuperá-lo, gere outro.

O responsável entra em `/responsavel/entrar` com telefone e código. O portal oferece início, desempenho técnico com notas e gráficos, feedbacks do professor, evolução física com gráficos separados e mensalidades. Todas as telas são de consulta. Cada código autoriza somente um aluno, mesmo quando irmãos compartilham o telefone. Para consultar outro filho, sair e entrar com o código dele.

Na criação/edição de uma avaliação, **Observações para o professor** continua sendo privado. Apenas **Feedback para o responsável** aparece no portal. Nenhum texto antigo é publicado automaticamente. As observações gerais do aluno e as anotações financeiras também continuam privadas.

**Gerar novo código** e **Desativar acesso** revogam sessões anteriores. Alterar o telefone no cadastro administrativo também desativa o acesso e exige gerar outro código. Sair do portal revoga as sessões do responsável daquele aluno em outros dispositivos, sem afetar o professor. Dados já vistos não podem ser retirados de um dispositivo; a revogação é aplicada às próximas requisições ao servidor.

## Banco e publicação

Migração incremental: `prisma/migrations/20261002190000_guardian_portal/migration.sql`.

- Student: `guardianAccessCodeHash` opcional e único; `guardianAccessEnabled` inicialmente `false`; `guardianAccessVersion` inicialmente `0`.
- Evaluation: `guardianFeedback` opcional. Avaliações existentes permanecem com feedback vazio.
- Sem tabela de responsáveis, recriação de tabelas, reset ou remoção de registros.

Em 03/10/2026, **`npm run db:deploy` foi executado com sucesso no Neon configurado no projeto**, aplicando esta migração e os índices pendentes `20261002000000_performance_indexes`. As contagens de usuários, alunos, avaliações, pagamentos, medidas e observações permaneceram iguais. Os acessos começaram desativados e nenhuma observação antiga foi publicada. Falta fazer o deploy do código na Vercel. Para outros ambientes, executar `npm run db:deploy` antes de publicar.

**Não há novas variáveis obrigatórias.** O portal reutiliza `AUTH_SECRET` existente, com derivação de chaves distinta para códigos e sessões. Manter esse secret estável e com pelo menos 32 caracteres. Alterá-lo invalida sessões e códigos do portal, exigindo regeneração. `DATABASE_URL` continua com pooling, e `DIRECT_URL` continua sendo a conexão de migrations. Não colocar secrets em variáveis `NEXT_PUBLIC_`.

O link de compartilhamento usa o domínio em que o professor abriu a aplicação, sem configurar outra URL. Gere acessos no domínio de produção para compartilhar o endereço correto.

## Segurança e performance

- Códigos de 32 caracteres, gerados com 24 bytes aleatórios criptográficos (192 bits). Banco guarda somente HMAC-SHA-256. Essa escolha é adequada a tokens aleatórios de alta entropia; a senha humana do professor continua usando bcrypt.
- O código em texto puro é retornado uma única vez ao professor autenticado durante a geração. Não é salvo em banco, localStorage, sessionStorage ou cookie. O hash nunca é enviado aos componentes do navegador.
- Sessão JWT criptografada com a biblioteca já instalada (`next-auth/jwt`), chave e cookie separados do professor, duração absoluta de sete dias, HttpOnly, SameSite=Lax, Secure em produção, Path=/responsavel. A autorização verifica habilitação e versão no banco a cada requisição, com memoização apenas dentro da requisição.
- Login limitado a dez tentativas por quinze minutos por telefone normalizado e por digest do código, usando o contador atômico existente no PostgreSQL. Erros não revelam se o telefone existe.
- Todas as consultas do portal obtêm o aluno exclusivamente da sessão e usam projeções explícitas. IDs na URL não escolhem outro aluno. Ações administrativas continuam exigindo a sessão do professor no servidor.
- Server Actions usam a proteção de origem do Next.js. Páginas dinâmicas, sem cache público, com `noindex` e bloqueio no robots.txt existente.
- Painel busca somente resumo, última avaliação, medidas atuais e última mensalidade. Históricos completos são buscados apenas nas telas correspondentes, sempre para o aluno autorizado. Nenhuma cobrança é criada pelo acesso do responsável: aparecem os registros disponibilizados pelo professor.
- Loading/Suspense preserva o layout interno; os links mostram progresso real. Não há temporizadores artificiais ou serviços pagos.

## Validação e operação

Testes automatizados cobrem geração, revogação, logout e cópias de cookies, expiração/adulteração, telefone em diferentes formatos, irmãos, tentativa de usar sessão do responsável em Server Action administrativa, proteção das rotas, separação de observações/feedback, gráficos reais, históricos vazios e telas de 375/390/430 px. A suíte anterior do professor também deve permanecer verde.

Resultado final: **build, TypeScript e lint aprovados; 59 testes unitários, 2 de integração e 37 de navegador passaram**. O PostgreSQL local de testes foi encerrado, assim como os processos/conexões iniciados para a validação. Na consulta final ao Neon, não havia outras conexões desse banco além da conexão de diagnóstico, também encerrada.

Comandos: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:db`, `npm run build` e `npm run test:e2e`. Os testes de banco/navegador exigem `.env.test` apontando para PostgreSQL local e recusam Neon.

O Prisma reutiliza um pool por processo do servidor; não deve desconectar após cada requisição. Scripts pontuais e testes chamam `$disconnect()` ao finalizar; ao parar o servidor, suas conexões se encerram. Uma conexão ociosa mantida pelo processo da aplicação/pooler não significa, por si só, uma transação travada. Não encerrar conexões de produção indiscriminadamente.
