import { test, expect } from "@playwright/test";
import { today } from "../src/lib/rules";
import { PrismaClient } from "@prisma/client";
test("critério personalizado mantém histórico ao ser desativado", async ({
  page,
}) => {
  const name = `Critério temporário ${Date.now()}`;
  const db = new PrismaClient();
  let evaluationId: string | undefined;
  try {
    await page.goto("/configuracoes");
    await page
      .getByRole("button", { name: "Novo critério", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome do critério").fill(name);
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.goto("/avaliacoes/nova?aluno=demo-student-0");
    await page.getByLabel(name, { exact: true }).fill("9.5");
    await page
      .getByRole("button", { name: "Salvar avaliação", exact: true })
      .click();
    const card = page.locator("article").filter({ hasText: name });
    await expect(card).toBeVisible();
    const href = await card
      .getByRole("link", { name: "Editar avaliação" })
      .getAttribute("href");
    evaluationId = href?.split("/")[2];
    await page.goto("/configuracoes");
    await page
      .locator(".criterion-row")
      .filter({ hasText: name })
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    await dialog.getByLabel("Critério ativo").uncheck();
    await dialog.getByLabel("Ordem de exibição").fill("1");
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.goto("/avaliacoes/nova?aluno=demo-student-0");
    await expect(page.getByLabel(name, { exact: true })).toHaveCount(0);
    await page.goto("/alunos/demo-student-0?tab=avaliacoes");
    await expect(
      page.locator("article").filter({ hasText: name }),
    ).toBeVisible();
  } finally {
    if (evaluationId)
      await db.evaluation.deleteMany({ where: { id: evaluationId } });
    await db.evaluationCriterion.deleteMany({ where: { name } });
    await db.$disconnect();
  }
});
test("cadastro, avaliação parcial, evolução, pagamento, medidas e desativação", async ({
  page,
}) => {
  const name = `Atleta Teste ${Date.now()}`;
  await page.goto("/alunos/novo");
  await page.getByLabel("Nome completo", { exact: true }).fill(name);
  await page.getByLabel("Data de nascimento").fill("2014-05-20");
  await page.getByLabel("Nome do responsável").fill("Responsável Teste");
  await page.getByLabel("WhatsApp com DDD").fill("(84) 99999-9999");
  await page.getByLabel("Altura (cm)").fill("155");
  await page.getByRole("button", { name: "Cadastrar aluno" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const profile = new URL(page.url()).pathname;
  await expect(
    page.getByRole("link", { name: "Falar com responsável" }),
  ).toHaveAttribute("href", /^https:\/\/wa.me\/5584999999999\?text=/);
  await page.getByRole("link", { name: "Editar", exact: true }).click();
  await page
    .getByLabel("Observações gerais")
    .fill("Cadastro atualizado no teste.");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Cadastro atualizado no teste.")).toBeVisible();
  for (const score of [0, 8.5]) {
    await page.goto(`${profile}`);
    await page
      .getByRole("link", { name: "Nova avaliação", exact: true })
      .click();
    await page.getByLabel("Reflexo", { exact: true }).fill(String(score));
    await page
      .getByLabel("Observação da aula (opcional)")
      .fill(`Nota parcial ${score}`);
    await page.getByRole("button", { name: "Salvar avaliação" }).click();
    await expect(
      page.getByText(`Nota parcial ${score}`, { exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("link", { name: "Evolução", exact: true }).click();
  await expect(page.getByText("+8.5", { exact: true })).toBeVisible();
  await page.goto(`${profile}?tab=pagamentos`);
  await page
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Forma de pagamento").selectOption("PIX");
  await dialog.getByRole("button", { name: "Confirmar pagamento" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText(`Pago em ${today().split("-").reverse().join("/")} · PIX`),
  ).toBeVisible();
  await page.goto(profile);
  await page
    .getByRole("button", { name: "Registrar medidas", exact: true })
    .click();
  await dialog.getByLabel("Peso (kg)").fill("48.5");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("48.5 kg").first()).toBeVisible();
  await page.goto(`${profile}?tab=observacoes`);
  await page
    .getByRole("button", { name: "Nova observação", exact: true })
    .click();
  await dialog
    .getByLabel("Observação", { exact: true })
    .fill("Bom treino de defesa aérea.");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Bom treino de defesa aérea.")).toBeVisible();
  await page.goto("/alunos");
  await page.getByLabel("Pesquisar pelo nome").fill(name);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.goto(profile);
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Desativar aluno", exact: true })
    .click();
  await expect(page.locator(".badge-inactive")).toContainText("Inativo");
  await page
    .getByRole("button", { name: "Excluir definitivamente", exact: true })
    .click();
  await expect(page).toHaveURL(/\/alunos$/);
  await page.getByLabel("Pesquisar pelo nome").fill(name);
  await expect(
    page.getByRole("heading", { name: "Nenhum aluno encontrado" }),
  ).toBeVisible();
});
test("edição e exclusão de avaliação, critério e aviso configurável", async ({
  page,
}) => {
  await page.goto("/avaliacoes/nova?aluno=demo-student-0");
  await page.getByLabel("Reflexo", { exact: true }).fill("5");
  await page
    .getByLabel("Observação da aula (opcional)")
    .fill("Avaliação temporária E2E");
  await page.getByRole("button", { name: "Salvar avaliação" }).click();
  const card = page
    .locator("article")
    .filter({ hasText: "Avaliação temporária E2E" });
  await card.getByRole("link", { name: "Editar avaliação" }).click();
  await page.getByLabel("Reflexo", { exact: true }).fill("7.5");
  await page.getByRole("button", { name: "Salvar avaliação" }).click();
  await expect(card.getByText("7.5", { exact: true }).first()).toBeVisible();
  page.on("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.goto("/configuracoes");
  await page.getByLabel("Avisar quantos dias antes do vencimento?").fill("5");
  await page
    .getByRole("button", { name: "Salvar", exact: true })
    .first()
    .click();
  await expect(page.getByText("Configurações salvas.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Avisar quantos dias antes do vencimento?"),
  ).toHaveValue("5");
  await page.getByLabel("Avisar quantos dias antes do vencimento?").fill("3");
  await page
    .getByRole("button", { name: "Salvar", exact: true })
    .first()
    .click();
  await expect(page.getByText("Configurações salvas.")).toBeVisible();
});
test("dashboard, alertas e cabeçalhos de privacidade", async ({ page }) => {
  const response = await page.goto("/dashboard");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    page.getByRole("heading", { name: "Bom treino, professor." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Notificações:/ }).click();
  await expect(
    page.getByRole("heading", { name: "Notificações", exact: true }),
  ).toBeVisible();
  const alert = page.locator(".notification-panel a").first();
  const href = await alert.getAttribute("href");
  await alert.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await page.getByLabel("Busca global de alunos").fill("Gab");
  await page
    .locator(".search-results")
    .getByRole("link", { name: "Gabriel Henrique" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Gabriel Henrique", exact: true }),
  ).toBeVisible();
});
for (const width of [375, 390, 430, 768, 1024, 1440])
  test(`responsividade ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const routes = [
      "/dashboard",
      "/alunos",
      "/alunos/novo",
      "/alunos/demo-student-0",
      "/alunos/demo-student-0?tab=avaliacoes",
      "/alunos/demo-student-0?tab=evolucao",
      "/alunos/demo-student-0?tab=pagamentos",
      "/alunos/demo-student-0?tab=observacoes",
      "/alunos/demo-student-0/editar",
      "/avaliacoes/nova",
      "/pagamentos",
      "/configuracoes",
    ];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page.locator(".skeleton")).toHaveCount(0);
      if (route.includes("evolucao"))
        await expect(page.locator(".recharts-surface").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${route} overflow at ${width}`,
      ).toBe(true);
      const label = route.replaceAll(/[^a-z0-9]/gi, "-");
      await page.screenshot({
        path: `artifacts/screenshots/${width}${label}.png`,
        fullPage: true,
      });
    }
  });
