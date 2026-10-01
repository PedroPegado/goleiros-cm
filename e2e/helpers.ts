import { expect, type Page } from "@playwright/test";
export async function login(
  page: Page,
  email = process.env.ADMIN_EMAIL!,
  password = process.env.ADMIN_PASSWORD!,
) {
  await page.goto("/login");
  await page.getByLabel("Usuário ou e-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Bom treino, professor." }),
  ).toBeVisible();
}
