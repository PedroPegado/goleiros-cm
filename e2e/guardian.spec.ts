import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { login } from "./helpers";
import { createHmac } from "node:crypto";
import { encode } from "next-auth/jwt";
const db = new PrismaClient();
const prefix = `portal-${Date.now()}`;
const primary = `${prefix}-a`,
  sibling = `${prefix}-b`;
const phone = "11988887777";
const internal = `Observação interna exclusiva ${prefix}`;
const feedback = `Feedback compartilhado ${prefix}`;
let criterionId: string;
test.beforeAll(async () => {
  criterionId = (
    await db.evaluationCriterion.findFirstOrThrow({
      where: { active: true },
      orderBy: { order: "asc" },
    })
  ).id;
  for (const [id, name, guardianPhone] of [
    [primary, "Goleiro Portal Um", "(11) 98888-7777"],
    [sibling, "Goleiro Portal Dois", "+55 11 98888-7777"],
  ]) {
    await db.student.create({
      data: {
        id,
        name,
        guardianPhone,
        guardianName: "Responsável de teste",
        birthDate: new Date("2014-01-01"),
        joinedAt: new Date("2026-01-01"),
        dueDay: 10,
        monthlyFee: 150,
        notes: internal,
        evaluations: {
          create: [
            {
              date: new Date("2026-01-01"),
              notes: internal,
              scores: { create: { criterionId, value: 6 } },
            },
            {
              date: new Date("2026-02-01"),
              notes: internal,
              guardianFeedback: feedback,
              scores: { create: { criterionId, value: 8 } },
            },
          ],
        },
        measurements: {
          create: [
            { date: new Date("2026-01-01"), height: 150, weight: 40 },
            { date: new Date("2026-02-01"), height: 152, weight: 41 },
          ],
        },
        payments: {
          create: [
            {
              referenceYear: 2026,
              referenceMonth: 1,
              dueDate: new Date("2026-01-10"),
              amount: 150,
              status: "PAID",
              paidAt: new Date("2026-01-09"),
              notes: internal,
            },
            {
              referenceYear: 2026,
              referenceMonth: 2,
              dueDate: new Date("2026-02-10"),
              amount: 150,
              status: "PENDING",
              notes: internal,
            },
          ],
        },
        studentNotes: {
          create: { date: new Date("2026-01-01"), text: internal },
        },
      },
    });
  }
});
test.afterAll(async () => {
  await db.student.deleteMany({ where: { id: { in: [primary, sibling] } } });
  await db.$disconnect();
});
async function generate(page: Page, id = primary) {
  await page.goto(`/alunos/${id}`);
  await page
    .getByRole("button", { name: "Gerenciar acesso do responsável" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Acesso do responsável" });
  await dialog
    .getByRole("button", { name: /Ativar e gerar código|Gerar novo código/ })
    .click();
  await expect(dialog.getByLabel("Código gerado")).toBeVisible();
  const code = await dialog.getByLabel("Código gerado").inputValue();
  expect(code).toMatch(/^[A-Za-z0-9_-]{32}$/);
  return code;
}
async function enter(page: Page, code: string, number = phone) {
  await page.goto("/responsavel/entrar");
  await page.getByLabel("Telefone com DDD").fill(number);
  await page.getByLabel("Código de acesso", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
test("gera acesso uma vez, normaliza telefone, isola irmãos e não revela dados internos", async ({
  page,
  browser,
}) => {
  await login(page);
  const code = await generate(page);
  const record = await db.student.findUniqueOrThrow({ where: { id: primary } });
  expect(record.guardianAccessCodeHash).not.toBe(code);
  expect(record.guardianAccessCodeHash).toMatch(/^[a-f0-9]{64}$/);
  const whatsapp = await page
    .getByRole("link", { name: "Compartilhar pelo WhatsApp" })
    .getAttribute("href");
  expect(new URL(whatsapp!).searchParams.get("text")).toContain(
    `/responsavel/entrar`,
  );
  expect(new URL(whatsapp!).searchParams.get("text")).toContain(code);
  await page
    .getByRole("button", { name: "Fechar acesso do responsável" })
    .click();
  await page
    .getByRole("button", { name: "Gerenciar acesso do responsável" })
    .click();
  await expect(page.getByLabel("Código gerado")).toHaveCount(0);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    const p = await context.newPage();
    await enter(p, code, "+55 (11) 98888-7777");
    await expect(p).toHaveURL(/\/responsavel\/painel$/);
    await expect(
      p.getByRole("heading", { name: "Goleiro Portal Um", exact: true }),
    ).toBeVisible();
    const cookies = await context.cookies();
    const session = cookies.find(
      (c) => c.name === "__Secure-guardian-session",
    )!;
    expect(session.httpOnly).toBe(true);
    expect(session.secure).toBe(true);
    expect(session.sameSite).toBe("Lax");
    expect(session.path).toBe("/responsavel");
    expect(session.value).not.toContain(code);
    expect(session.expires).toBeGreaterThan(Date.now() / 1000 + 6 * 86400);
    for (const route of ["painel", "desempenho", "evolucao", "mensalidade"]) {
      await p.goto(`/responsavel/${route}?studentId=${sibling}&id=${sibling}`);
      await expect(p.locator("main h1")).toBeVisible();
      const response = await context.request.get(
        `/responsavel/${route}?studentId=${sibling}`,
        { headers: { RSC: "1" } },
      );
      const body = await response.text();
      for (const forbidden of [
        internal,
        "Goleiro Portal Dois",
        record.guardianAccessCodeHash!,
        "guardianAccessCodeHash",
        "guardianPhone",
        code,
      ])
        expect(body).not.toContain(forbidden);
      expect(
        await p
          .getByRole("button", { name: /Editar|Excluir|Salvar|Registrar/ })
          .count(),
      ).toBe(0);
    }
    await p.goto("/responsavel/desempenho");
    await expect(p.getByText(feedback, { exact: true })).toBeVisible();
    await expect(p.locator(".recharts-surface").first()).toBeVisible();
    await p.getByText("Consultar valores do gráfico").click();
    await expect(p.getByText("Média: 6.0", { exact: true })).toBeVisible();
    await expect(p.getByText("Média: 8.0", { exact: true })).toBeVisible();
    await p.goto("/responsavel/evolucao");
    await expect(p.locator(".recharts-surface")).toHaveCount(2);
    await p.goto("/responsavel/mensalidade");
    await expect(
      p.getByText("Pagamento registrado em: 09/01/2026"),
    ).toBeVisible();
    await expect(p.locator(".badge-overdue").first()).toBeVisible();
    for (const route of [
      "/dashboard",
      "/alunos",
      `/alunos/${sibling}`,
      "/pagamentos",
      "/configuracoes",
      "/avaliacoes/nova",
    ]) {
      await p.goto(route);
      await expect(p).toHaveURL(/\/login$/);
    }
    const resumed = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      storageState: await context.storageState(),
    });
    const restored = await resumed.newPage();
    await restored.goto("/responsavel/painel");
    await expect(
      restored.getByRole("heading", { name: "Goleiro Portal Um", exact: true }),
    ).toBeVisible();
    await resumed.close();
    const otherCode = await generate(page, sibling);
    await p.goto("/responsavel/painel");
    await p.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(p).toHaveURL(/\/responsavel\/entrar$/);
    await enter(p, otherCode);
    await expect(
      p.getByRole("heading", { name: "Goleiro Portal Dois", exact: true }),
    ).toBeVisible();
    await expect(p.getByText("Goleiro Portal Um", { exact: true })).toHaveCount(
      0,
    );
  } finally {
    await context.close();
  }
});

test("regeneração, desativação e logout invalidam inclusive cópias da sessão", async ({
  page,
  browser,
}) => {
  await login(page);
  const code = await generate(page);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    const p = await context.newPage();
    await enter(p, code);
    await expect(p).toHaveURL(/painel$/);
    const saved = await context.storageState();
    const fresh = await generate(page);
    expect(fresh).not.toBe(code);
    await p.goto("/responsavel/painel");
    await expect(p).toHaveURL(/entrar$/);
    await enter(p, code);
    await expect(p.locator(".login-form").getByRole("alert")).toHaveText(
      "Telefone ou código de acesso inválidos.",
    );
    await enter(p, fresh);
    await expect(p).toHaveURL(/painel$/);
    await page
      .getByRole("button", { name: "Desativar acesso", exact: true })
      .click();
    await expect(page.getByText(/Acesso desativado/)).toBeVisible();
    await p.goto("/responsavel/desempenho");
    await expect(p).toHaveURL(/entrar$/);
    const renewed = await generate(page);
    await enter(p, renewed);
    await expect(p).toHaveURL(/painel$/);
    const liveCopy = await context.storageState();
    await p.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(p).toHaveURL(/entrar$/);
    for (const storageState of [saved, liveCopy]) {
      const copied = await browser.newContext({
        baseURL: "http://127.0.0.1:3100",
        storageState,
      });
      const tab = await copied.newPage();
      await tab.goto("/responsavel/painel");
      await expect(tab).toHaveURL(/entrar$/);
      await copied.close();
    }
    // Teacher session remains valid after guardian logout.
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Bom treino, professor." }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("limita tentativas, rejeita código adulterado e protege rotas sem sessão", async ({
  page,
  browser,
}) => {
  await login(page);
  const code = await generate(page);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    const p = await context.newPage();
    for (const route of ["painel", "desempenho", "evolucao", "mensalidade"]) {
      await p.goto(`/responsavel/${route}`);
      await expect(p).toHaveURL(/entrar$/);
    }
    const number = "21999998888";
    for (let i = 0; i < 10; i++) {
      await enter(p, code, number);
      await expect(p.locator(".login-form").getByRole("alert")).toHaveText(
        "Telefone ou código de acesso inválidos.",
      );
    }
    // The code counter prevents bypassing the limit by changing the phone number.
    await enter(p, code);
    await expect(p.locator(".login-form").getByRole("alert")).toHaveText(
      "Telefone ou código de acesso inválidos.",
    );
    const newCode = await generate(page);
    await enter(p, newCode);
    await expect(p).toHaveURL(/painel$/);
    const cookie = (await context.cookies()).find(
      (c) => c.name === "__Secure-guardian-session",
    )!;
    await context.addCookies([
      { ...cookie, value: `${cookie.value.slice(0, -8)}tampered` },
    ]);
    await p.goto("/responsavel/painel");
    await expect(p).toHaveURL(/entrar$/);
  } finally {
    await context.close();
  }
});

test("avaliação mantém observação interna e feedback separados ao criar e editar", async ({
  page,
  browser,
}) => {
  await login(page);
  const code = await generate(page);
  await page.goto(`/avaliacoes/nova?aluno=${primary}`);
  const criterion = await db.evaluationCriterion.findUniqueOrThrow({
    where: { id: criterionId },
  });
  await page.getByLabel(criterion.name, { exact: true }).fill("9");
  await page.getByLabel("Observações para o professor").fill(internal);
  await page
    .getByLabel("Feedback para o responsável")
    .fill("Primeiro feedback visível");
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  const card = page
    .locator("article")
    .filter({ hasText: "Primeiro feedback visível" });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "Editar avaliação" }).click();
  await expect(page.getByLabel("Observações para o professor")).toHaveValue(
    internal,
  );
  await page
    .getByLabel("Feedback para o responsável")
    .fill("Feedback revisado visível");
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(
    page.getByText("Feedback revisado visível", { exact: true }),
  ).toBeVisible();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    const p = await context.newPage();
    await enter(p, code);
    await expect(p).toHaveURL(/painel$/);
    await p.goto("/responsavel/desempenho");
    await expect(
      p.getByText("Feedback revisado visível", { exact: true }),
    ).toBeVisible();
    expect(await p.content()).not.toContain(internal);
  } finally {
    await context.close();
  }
});

test("sessão do responsável não autoriza uma Server Action administrativa", async ({
  page,
  browser,
}) => {
  await login(page);
  await generate(page);
  const mutation = page.waitForRequest(
    (request) =>
      request.method() === "POST" && !!request.headers()["next-action"],
  );
  await page
    .getByRole("button", { name: "Desativar acesso", exact: true })
    .click();
  const request = await mutation;
  await expect(page.getByText(/Acesso desativado/)).toBeVisible();
  const code = await generate(page);
  const before = await db.student.findUniqueOrThrow({ where: { id: primary } });
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    const p = await context.newPage();
    await enter(p, code);
    await expect(p).toHaveURL(/painel$/);
    const session = (await context.cookies()).find(
      (c) => c.name === "__Secure-guardian-session",
    )!;
    const response = await context.request.post(`/alunos/${primary}`, {
      headers: {
        "Next-Action": request.headers()["next-action"],
        "Content-Type": request.headers()["content-type"],
        Origin: "http://127.0.0.1:3100",
        Cookie: `__Secure-next-auth.session-token=${session.value}`,
      },
      data: request.postDataBuffer()!,
      maxRedirects: 0,
    });
    expect(
      response.headers()["x-action-redirect"] ?? (await response.text()),
    ).toContain("/login");
    const after = await db.student.findUniqueOrThrow({
      where: { id: primary },
    });
    expect(after.guardianAccessEnabled).toBe(true);
    expect(after.guardianAccessVersion).toBe(before.guardianAccessVersion);
    await page.goto("/responsavel/painel");
    await expect(page).toHaveURL(/responsavel\/entrar$/);
  } finally {
    await context.close();
  }
});

test("sessão expirada e alteração do telefone exigem novo acesso", async ({
  page,
  browser,
}) => {
  await login(page);
  const code = await generate(page);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    const p = await context.newPage();
    await enter(p, code);
    await expect(p).toHaveURL(/painel$/);
    const cookie = (await context.cookies()).find(
      (c) => c.name === "__Secure-guardian-session",
    )!;
    const student = await db.student.findUniqueOrThrow({
      where: { id: primary },
    });
    const secret = createHmac("sha256", process.env.AUTH_SECRET!)
      .update("guardian:session:v1")
      .digest("hex");
    const expired = await encode({
      secret,
      maxAge: -3600,
      token: {
        sub: primary,
        role: "guardian",
        version: student.guardianAccessVersion,
      },
    });
    await context.addCookies([{ ...cookie, value: expired }]);
    await p.goto("/responsavel/painel");
    await expect(p).toHaveURL(/entrar$/);
    await context.addCookies([cookie]);
    await page.goto(`/alunos/${primary}/editar`);
    await page
      .getByLabel("WhatsApp com DDD", { exact: false })
      .fill("11977776666");
    await page
      .getByRole("button", { name: "Salvar alterações", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Goleiro Portal Um", exact: true }),
    ).toBeVisible();
    await p.goto("/responsavel/painel");
    await expect(p).toHaveURL(/entrar$/);
    const updated = await db.student.findUniqueOrThrow({
      where: { id: primary },
    });
    expect(updated.guardianAccessEnabled).toBe(false);
    expect(updated.guardianAccessCodeHash).toBeNull();
    await enter(p, code, "11977776666");
    await expect(p.locator(".login-form").getByRole("alert")).toHaveText(
      "Telefone ou código de acesso inválidos.",
    );
  } finally {
    await db.student.update({
      where: { id: primary },
      data: { guardianPhone: phone },
    });
    await context.close();
  }
});

test("históricos vazios e uma única medida não inventam gráficos nem feedback", async ({
  page,
  browser,
}) => {
  const id = `${prefix}-empty`;
  await db.student.create({
    data: {
      id,
      name: "Aluno Sem Histórico",
      guardianName: "Responsável",
      guardianPhone: phone,
      birthDate: new Date("2015-01-01"),
      joinedAt: new Date("2026-01-01"),
      dueDay: 10,
      monthlyFee: 150,
      status: "INACTIVE",
      measurements: { create: { date: new Date("2026-01-01"), height: 151 } },
    },
  });
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    await login(page);
    const code = await generate(page, id);
    const p = await context.newPage();
    await enter(p, code);
    await expect(p).toHaveURL(/painel$/);
    await expect(
      p.getByText("Nenhuma mensalidade registrada", { exact: true }),
    ).toBeVisible();
    await p.goto("/responsavel/desempenho");
    await expect(
      p.getByText("Ainda não há avaliações", { exact: true }),
    ).toBeVisible();
    await expect(
      p.getByText("Nenhum feedback compartilhado por enquanto", {
        exact: true,
      }),
    ).toBeVisible();
    await p.goto("/responsavel/evolucao");
    await expect(
      p.getByText(/Ainda não existem dados suficientes/),
    ).toBeVisible();
    await expect(p.locator(".recharts-surface")).toHaveCount(0);
    await p.goto("/responsavel/mensalidade");
    await expect(
      p.getByText("Nenhuma mensalidade registrada", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
    await db.student.delete({ where: { id } });
  }
});

for (const width of [375, 390, 430])
  test(`portal mobile ${width}px e feedback de navegação`, async ({
    page,
    browser,
  }) => {
    await login(page);
    const code = await generate(page);
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width, height: 844 },
    });
    try {
      const p = await context.newPage();
      await enter(p, code);
      await expect(p).toHaveURL(/painel$/);
      for (const route of ["painel", "desempenho", "evolucao", "mensalidade"]) {
        await p.goto(`/responsavel/${route}`);
        await expect(p.locator("main h1")).toBeVisible();
        expect(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(
          p.getByRole("navigation", { name: "Navegação do responsável" }),
        ).toBeVisible();
        await p.screenshot({
          path: `artifacts/screenshots/portal-${width}-${route}.png`,
          fullPage: true,
        });
      }
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await p.route("**/responsavel/desempenho?*", async (route) => {
        await gate;
        await route.continue();
      });
      try {
        await p
          .getByRole("navigation")
          .getByRole("link", { name: "Desempenho" })
          .click();
        await expect(p.locator(".navigation-pending")).toBeVisible();
        await expect(p.locator(".guardian-header")).toBeVisible();
        await expect(p.locator("main")).not.toBeEmpty();
      } finally {
        release();
      }
      await expect(p.locator("main h1")).toHaveText("Desempenho do goleiro");
    } finally {
      await context.close();
    }
  });
