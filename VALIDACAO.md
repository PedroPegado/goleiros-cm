# Validação da entrega

Atualizada em 01/10/2026 (America/Fortaleza), no Windows com Node 22.14, Chromium Playwright e PostgreSQL local real. Migrations e seed do administrador também foram aplicados no Neon. Login/logout e hash foram verificados contra o Neon, sem alterar alunos.

| Verificação                    | Resultado                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`            | Passou                                                                                                 |
| `npm run lint`                 | Passou, sem avisos                                                                                     |
| `npm test`                     | 49 testes de regras e autenticação passaram; integração separada                                       |
| `npm run test:db`              | 1 teste PostgreSQL passou                                                                              |
| Playwright                     | 10 testes funcionais existentes e 12 testes de autenticação passaram (suítes executadas separadamente) |
| `npm run build`                | Passou; inclui `/login` e `/api/auth/[...nextauth]`                                                    |
| `npm run db:deploy`            | Três migrations aplicadas no banco local e no Neon                                                     |
| Seeds essencial e demonstração | Executados com sucesso                                                                                 |
| `npm audit`                    | Zero vulnerabilidades reportadas                                                                       |

As regras testadas incluem idade, datas civis, meses curtos, anos bissextos, virada de ano, status financeiro, janela configurável, telefone brasileiro, notas zero/parciais e evolução com base zero.

A integração executou cinco gerações simultâneas e encontrou uma única cobrança, confirmou a preservação de valor e vencimento após alteração do cadastro e a interrupção de geração para aluno inativo.

O navegador validou cadastro, edição, desativação e exclusão de aluno; busca; telefone e URL WhatsApp; avaliações parciais e edição/exclusão; evolução calculada; registro de pagamento; medidas; observações; configuração de lembretes; criação e desativação de critério sem perda do histórico; alertas e cabeçalho de não indexação.

As 12 telas/variações principais foram verificadas em 375, 390, 430, 768, 1024 e 1440px. Os testes aguardam o conteúdo real após o loading e verificam ausência de overflow horizontal. Capturas estão em `artifacts/screenshots/` (não versionadas), com revisão visual de dashboard, cadastro, listagem, perfil, evolução, formulário de avaliação e configurações.

Autenticação: login correto/incorreto; acesso anônimo bloqueado em todas as rotas privadas, inclusive RSC; sessão persistente em novo contexto; cookie HttpOnly, Secure em produção e SameSite=Lax; logout e revogação de cookie antigo; alteração de senha e revogação das sessões; hash bcrypt com custo 12; secrets ausentes no bundle público e nas respostas da sessão; limite de tentativas persistente; tela de login nas seis larguras. Testes unitários também verificam o bloqueio de todas as Server Actions sem sessão.

Os testes destrutivos usam `.env.test`, PostgreSQL local e administrador fictício. A configuração recusa banco remoto. O teste contra o Neon apenas confirmou hash, ausência dos secrets reais no bundle, redirecionamento anônimo, login e logout do administrador solicitado.

Limites da evidência: Chromium local, sem dispositivos físicos ou Safari. A autenticação foi exercitada com build de produção local conectado ao Neon. **O critério de funcionamento após deploy Vercel permanece pendente**, pois nenhum deploy remoto foi realizado. Configuração e roteiro de verificação no domínio real estão em AUTENTICACAO.md.
