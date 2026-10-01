import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { login } from "./helpers";
const db = new PrismaClient();
test.afterAll(async () => db.$disconnect());
test("login público e todas as rotas privadas protegidas, inclusive RSC", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page.getByLabel("Busca global de alunos")).toHaveCount(0);
  for (const route of [
    "/dashboard",
    "/alunos",
    "/alunos/novo",
    "/alunos/demo-student-0",
    "/alunos/demo-student-0/editar",
    "/avaliacoes/nova",
    "/avaliacoes/qualquer/editar",
    "/pagamentos",
    "/configuracoes",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByText("Gabriel Henrique", { exact: true }),
    ).toHaveCount(0);
    const rsc = await request.get(route, { headers: { RSC: "1" } });
    expect(await rsc.text()).not.toContain("Gabriel Henrique");
  }
  const session = await request.get("/api/auth/session");
  expect(await session.json()).toEqual({});
});
test("credenciais inválidas têm mensagem genérica", async ({ page }) => {
  for (const email of [process.env.ADMIN_EMAIL!, "nao-existe@example.test"]) {
    await page.goto("/login");
    await page.getByLabel("Usuário ou e-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-incorreta");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".login-form").getByRole("alert")).toHaveText(
      "Usuário/e-mail ou senha inválidos.",
    );
    await expect(page).toHaveURL(/\/login$/);
  }
});
test("sessão persistente, cookies seguros, logout e revogação de cookie antigo", async ({
  page,
  context,
  browser,
}) => {
  await login(page);
  const saved = await context.storageState();
  const cookie = saved.cookies.find((c) => c.name.includes("session-token"));
  expect(cookie).toBeDefined();
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.secure).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(cookie!.expires).toBeGreaterThan(Date.now() / 1000 + 6 * 86400);
  const resumed = await browser.newContext({ storageState: saved });
  const p = await resumed.newPage();
  await p.goto("http://127.0.0.1:3100/dashboard");
  await expect(
    p.getByRole("heading", { name: "Bom treino, professor." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await p.goto("http://127.0.0.1:3100/alunos");
  await expect(p).toHaveURL(/\/login$/);
  await resumed.close();
});
test("troca de senha valida senha atual e confirmação e revoga sessões", async ({
  page,
  context,
  browser,
}) => {
  const email = `change-${Date.now()}@example.test`,
    password = randomBytes(18).toString("hex"),
    newPassword = randomBytes(18).toString("hex");
  const user = await db.user.create({
    data: {
      email,
      name: "Professor de teste",
      passwordHash: await hash(password, 12),
    },
  });
  try {
    await login(page, email, password);
    const state = await context.storageState();
    await page.goto("/configuracoes");
    const form = page.getByLabel("Senha atual").locator("..").locator("..");
    await page
      .getByLabel("Senha atual", { exact: true })
      .fill("senha-incorreta");
    await page.getByLabel(/^Nova senha/).fill(newPassword);
    await page.getByLabel("Confirmar nova senha").fill(newPassword);
    await form.getByRole("button", { name: "Alterar senha" }).click();
    await expect(form.getByRole("alert")).toContainText("senha atual");
    await page.getByLabel("Senha atual", { exact: true }).fill(password);
    await page
      .getByLabel("Confirmar nova senha")
      .fill("OutraSenhaDiferente123");
    await form.getByRole("button", { name: "Alterar senha" }).click();
    await expect(form.getByRole("alert")).toContainText("não coincidem");
    await page.getByLabel("Confirmar nova senha").fill(newPassword);
    await form.getByRole("button", { name: "Alterar senha" }).click();
    await expect(page).toHaveURL(/\/login$/);
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await compare(newPassword, updated.passwordHash)).toBe(true);
    expect(await compare(password, updated.passwordHash)).toBe(false);
    const old = await browser.newContext({ storageState: state });
    const p = await old.newPage();
    await p.goto("http://127.0.0.1:3100/dashboard");
    await expect(p).toHaveURL(/\/login$/);
    await old.close();
    await page.getByLabel("Usuário ou e-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".login-form").getByRole("alert")).toContainText(
      "Usuário/e-mail ou senha inválidos.",
    );
    await login(page, email, newPassword);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
test("hash no banco e nenhum secret nos arquivos públicos ou sessão", async ({
  page,
  context,
}) => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: process.env.ADMIN_EMAIL! },
  });
  expect(user.passwordHash.startsWith("$2b$12$")).toBe(true);
  expect(user.passwordHash).not.toBe(process.env.ADMIN_PASSWORD);
  expect(await compare(process.env.ADMIN_PASSWORD!, user.passwordHash)).toBe(
    true,
  );
  const secrets = [
    process.env.ADMIN_PASSWORD!,
    process.env.AUTH_SECRET!,
    process.env.DATABASE_URL!,
    user.passwordHash,
  ];
  function inspect(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) inspect(p);
      else if (/\.(js|json|html)$/.test(p)) {
        const text = fs.readFileSync(p, "utf8");
        for (const secret of secrets)
          expect(text.includes(secret), `segredo no bundle ${p}`).toBe(false);
      }
    }
  }
  inspect(".next/static");
  await login(page);
  const response = await context.request.get("/api/auth/session");
  const body = await response.text();
  for (const secret of secrets) expect(body.includes(secret)).toBe(false);
  expect(body).not.toContain("passwordHash");
  expect(await page.content()).not.toContain(user.passwordHash);
});
test("limite de tentativas persiste entre requisições", async ({ page }) => {
  const email = `limited-${Date.now()}@example.test`;
  const password = randomBytes(20).toString("hex");
  const user = await db.user.create({
    data: {
      email,
      name: "Limite de teste",
      passwordHash: await hash(password, 12),
    },
  });
  try {
    await page.goto("/login");
    for (let i = 0; i < 11; i++) {
      const status = await page.evaluate(
        async ({ email, password }) => {
          const csrf = await (await fetch("/api/auth/csrf")).json();
          const response = await fetch("/api/auth/callback/credentials", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              csrfToken: csrf.csrfToken,
              email,
              password,
              json: "true",
              callbackUrl: "/dashboard",
            }),
          });
          return response.status;
        },
        { email, password: i === 10 ? password : "errada" },
      );
      expect(status).toBe(401);
    }
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
for (const width of [375, 390, 430, 768, 1024, 1440])
  test(`login mobile e desktop ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/screenshots/auth-login-${width}.png`,
      fullPage: true,
    });
  });
