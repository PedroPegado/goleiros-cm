import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env.test")) process.loadEnvFile(".env.test");
if (
  !process.env.DATABASE_URL ||
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error(
    "E2E exige PostgreSQL local em .env.test. Não execute contra o Neon.",
  );
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 390, height: 844 },
    trace: "off",
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
