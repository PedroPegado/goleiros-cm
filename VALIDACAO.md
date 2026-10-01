# Validação da entrega

Executada em 30/09/2026 (America/Fortaleza), no Windows com Node 22.14, Chromium Playwright e PostgreSQL local real. Nenhum banco remoto foi usado.

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | Passou |
| `npm run lint` | Passou, sem avisos |
| `npm test` | 43 testes de regras passaram; integração separada |
| `npm run test:db` | 1 teste PostgreSQL passou |
| `npm run test:e2e` | 10 testes passaram |
| `npm run build` | Passou; 11 rotas dinâmicas e robots estático |
| `npm run db:deploy` | Duas migrations aplicadas; segunda execução sem pendências |
| Seeds essencial e demonstração | Executados com sucesso |
| `npm audit` | Zero vulnerabilidades reportadas |

As regras testadas incluem idade, datas civis, meses curtos, anos bissextos, virada de ano, status financeiro, janela configurável, telefone brasileiro, notas zero/parciais e evolução com base zero.

A integração executou cinco gerações simultâneas e encontrou uma única cobrança, confirmou a preservação de valor e vencimento após alteração do cadastro e a interrupção de geração para aluno inativo.

O navegador validou cadastro, edição, desativação e exclusão de aluno; busca; telefone e URL WhatsApp; avaliações parciais e edição/exclusão; evolução calculada; registro de pagamento; medidas; observações; configuração de lembretes; criação e desativação de critério sem perda do histórico; alertas e cabeçalho de não indexação.

As 12 telas/variações principais foram verificadas em 375, 390, 430, 768, 1024 e 1440px. Os testes aguardam o conteúdo real após o loading e verificam ausência de overflow horizontal. Capturas estão em `artifacts/screenshots/` (não versionadas), com revisão visual de dashboard, cadastro, listagem, perfil, evolução, formulário de avaliação e configurações.

Limites da evidência: Chromium local, sem dispositivos físicos ou Safari. O Neon e o deploy Vercel ainda precisam de contas e variáveis de ambiente reais. A aplicação permanece deliberadamente sem autenticação. Leia os limites de acesso e do plano gratuito Vercel no README antes de usar dados reais.
