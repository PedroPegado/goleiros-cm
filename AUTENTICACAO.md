# Autenticação do professor

O campo de entrada aceita **usuário ou e-mail**. Nomes de usuário são normalizados para minúsculas (por exemplo, Fabio e fabio acessam a mesma conta). O professor Fabio tem acesso por nome de usuário, sem e-mail fictício; somente o hash da senha é persistido. O administrador por e-mail continua disponível. O seed administrativo não altera a conta do professor.

Implementada com a versão estável **next-auth 4.24.15**, Credentials e bcryptjs. Essa versão declara suporte a Next.js 16 e implementa `headers()`, `cookies()` e `params` assíncronos do App Router. Não há OAuth, cadastro público, recuperação por e-mail ou gestão de perfis.

## Configuração inicial

No `.env` local (ignorado pelo Git) ou nas variáveis da Vercel:

```env
DATABASE_URL=""
DIRECT_URL=""
AUTH_SECRET=""
AUTH_URL="https://seu-dominio"
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
```

`AUTH_SECRET` deve conter ao menos 32 bytes aleatórios, por exemplo o resultado de `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Use `AUTH_URL=http://127.0.0.1:3000` no desenvolvimento local e a URL HTTPS real em produção. Internamente esse valor configura o `NEXTAUTH_URL` utilizado pelo next-auth v4. Nunca coloque secrets em variáveis `NEXT_PUBLIC_*`.

```bash
npm run db:deploy
npm run db:seed:admin
npm run dev
```

O seed lê as credenciais do ambiente, normaliza o e-mail e gera bcrypt com custo 12 e salt aleatório. A senha precisa ter pelo menos 8 caracteres e no máximo 72 bytes UTF-8, para evitar truncamento do bcrypt. O banco armazena **somente passwordHash**, nunca `ADMIN_PASSWORD`. Nome inicial: Professor.

`db:seed` e `db:seed:demo` também criam/atualizam esse administrador. O comando específico `db:seed:admin` não modifica alunos, critérios ou mensalidades. A identidade fixa do seed evita criar outro administrador quando o e-mail de ambiente mudar.

**Reexecutar o seed redefine a senha para ADMIN_PASSWORD e invalida as sessões**, inclusive se a senha tiver sido alterada em Configurações. Execute-o apenas na instalação ou quando quiser redefinir conscientemente o acesso. Não faz parte do build. Depois da configuração, ADMIN_PASSWORD não é necessário em runtime; pode ser removido do ambiente de produção e informado somente durante um seed posterior.

A instalação local desta entrega tem o administrador solicitado e uma senha aleatória guardada em `ADMIN_PASSWORD` no `.env`. Não há senha padrão no código. O arquivo não deve ser compartilhado nem commitado.

## Sessão e proteção

- `/login` é público. Login bem-sucedido leva a `/dashboard`; entrar em `/login` já autenticado também leva ao Dashboard.
- O grupo `src/app/(private)` possui layout protegido. **Cada página também executa `requireUser()` antes de consultar o banco**, inclusive edição de avaliações. Isso evita depender da ordem de execução de layout/Server Components.
- As mutações existentes passam por `mutate()` em `src/actions/index.ts`, que verifica a sessão antes de validar ou consultar dados. A alteração de senha possui a mesma verificação. Serviços de consultas e geração de mensalidades também exigem sessão.
- O layout público não consulta alunos, pagamentos ou notificações. Não são enviados dados privados no HTML ou payload RSC do login.
- Cookie de sessão: HttpOnly, SameSite=Lax, Path=/, sem Domain; Secure e prefixo `__Secure-` em produção. O token JWT é cifrado pelo next-auth com AUTH_SECRET e não contém senha/hash. O navegador não usa localStorage/sessionStorage para credenciais.
- A sessão tem validade máxima de sete dias a partir do login, mesmo que o cookie seja renovado. Cada consulta valida a versão da sessão no banco.
- O botão **Sair** remove o cookie e incrementa `User.sessionVersion`. Para este administrador único, isso encerra o acesso **em todos os dispositivos**, inclusive por uma cópia antiga do cookie.
- **Alterar senha** exige senha atual, nova senha e confirmação. Cria novo hash, invalida as sessões e pede novo login. Não altera `.env`: esse arquivo pertence à configuração de instalação, não à senha atual do banco.
- Login e troca de senha têm limite de dez tentativas por identificador em quinze minutos, persistido em PostgreSQL por operação atômica. O login correto limpa o contador. As chaves são HMAC, sem e-mail em texto puro na tabela de tentativas. A mensagem de login é sempre “E-mail ou senha inválidos.”, inclusive no bloqueio temporário. Entradas expiradas são removidas ao consultar.
- Endpoints de login/logout usam a proteção CSRF do next-auth. Server Actions mantêm a verificação de origem do Next.js. O callback de redirecionamento restringe destinos ao próprio login/Dashboard.
- `robots` e cabeçalhos de não indexação permanecem como complemento à autenticação.

O modelo User não possui campo role ou relacionamento obrigatório com alunos. Não há interface para adicionar usuários. A autenticação aceita usuários futuros sem mudar o mecanismo; regras de acesso/isolamento de múltiplos professores exigiriam uma decisão de produto adicional.

## Testes isolados

Use `.env.test` com um PostgreSQL **local**, um administrador fictício e valores aleatórios diferentes dos reais. Configure `AUTH_URL=http://127.0.0.1:3100`. A configuração Playwright recusa banco remoto, incluindo Neon. As traces ficam desligadas para não capturar credenciais de testes.

```bash
node --env-file=.env.test node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.test node_modules/tsx/dist/cli.mjs scripts/seed-demo.ts
npm run build
npm test
npm run test:db
npm run test:e2e
```

Playwright inicia e encerra uma instância de produção na porta 3100. Testa login incorreto/correto, persistência entre contextos do navegador, flags de cookie, rotas privadas e RSC sem sessão, logout e revogação do cookie antigo, troca de senha, hash no banco, ausência de secrets no bundle público, limite de tentativas e login nas seis larguras. A suíte funcional anterior agora faz login antes dos fluxos.

## Vercel

Configure DATABASE_URL, DIRECT_URL e AUTH_SECRET no ambiente de execução, além de AUTH_URL com o domínio HTTPS efetivo de cada ambiente. Para o seed inicial configure ADMIN_EMAIL e ADMIN_PASSWORD em um ambiente confiável conectado ao mesmo banco. Use segredos e banco distintos para previews/testes.

Execute migrations antes do primeiro acesso à versão nova. O build continua `npm run build`, sem rodar seed. Use runtime Node (já configurado no handler Auth), não Edge. Nenhum serviço adicional pago é necessário.

Após o deploy, valide no domínio real: acesso anônimo a `/alunos` redireciona; login funciona; cookie tem Secure/HttpOnly/SameSite=Lax; atualização da página mantém a sessão; logout bloqueia novo acesso; troca de senha pede novo login. A validação local de produção não substitui esse teste remoto: **nenhum deploy Vercel foi realizado nesta entrega**.
