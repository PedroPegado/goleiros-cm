import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import { PrismaClient } from "@prisma/client";

for (const width of [375, 390, 430]) {
  test(`navegação mantém conteúdo e controles em ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/alunos?*", async (route) => {
      if (route.request().headers()["rsc"] === "1") await gate;
      await route.continue();
    });
    await login(page);
    try {
      await page
        .locator(".bottom-nav")
        .getByRole("link", { name: "Alunos" })
        .click();
      await expect(
        page.getByRole("status").filter({ hasText: "Carregando..." }),
      ).toBeVisible();
      await expect(page.locator(".header")).toBeVisible();
      await expect(page.locator(".bottom-nav")).toBeVisible();
      await expect(page.locator("main")).not.toBeEmpty();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    } finally {
      release();
    }
    await expect(
      page.getByRole("heading", { name: "Seu time de goleiros." }),
    ).toBeVisible();
    await expect(page.locator(".navigation-pending")).toHaveCount(0);
  });
}

test("skeleton é transmitido com header e navegação enquanto o banco aguarda", async ({
  page,
}) => {
  await login(page);
  const db = new PrismaClient();
  let release!: () => void;
  let ready!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const locked = new Promise<void>((resolve) => {
    ready = resolve;
  });
  // Only the isolated local test database. No delay is added to application code.
  const transaction = db.$transaction(
    async (tx) => {
      await tx.$executeRaw`LOCK TABLE "Student" IN ACCESS EXCLUSIVE MODE`;
      ready();
      await gate;
    },
    { timeout: 20000 },
  );
  try {
    await locked;
    await page.goto("/alunos", { waitUntil: "commit" });
    await expect(page.locator("main [aria-label='Carregando']")).toBeVisible();
    await expect(page.locator(".header")).toBeVisible();
    await expect(page.locator(".bottom-nav")).toBeVisible();
    await page.screenshot({
      path: "artifacts/screenshots/loading-skeleton-390.png",
    });
  } finally {
    release();
    await transaction;
    await db.$disconnect();
  }
  await expect(
    page.getByRole("heading", { name: "Seu time de goleiros." }),
  ).toBeVisible();
});

test("filtro financeiro sinaliza espera e navega sem recarregar o documento", async ({
  page,
}) => {
  await login(page);
  await page.goto("/pagamentos");
  await page.evaluate(() => {
    document.body.dataset.navigationTest = "preserved";
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/pagamentos?*", async (route) => {
    if (route.request().headers()["rsc"] === "1") await gate;
    await route.continue();
  });
  try {
    await page.locator("select[name=status]").selectOption("PAID");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(
      page.getByRole("button", { name: "Carregando..." }),
    ).toBeDisabled();
    await expect(page.locator(".bottom-nav")).toBeVisible();
  } finally {
    release();
  }
  await expect(page).toHaveURL(/status=PAID/);
  await expect(
    page.getByRole("button", { name: "Aplicar filtros" }),
  ).toBeEnabled();
  expect(await page.locator("body").getAttribute("data-navigation-test")).toBe(
    "preserved",
  );
});
