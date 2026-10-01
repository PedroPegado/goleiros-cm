import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
if (existsSync(".env.test")) process.loadEnvFile(".env.test");
if (
  !process.env.DATABASE_URL ||
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error("Teste de banco exige PostgreSQL local em .env.test.");
const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "tests/payments.integration.test.ts",
  ],
  { stdio: "inherit", env: { ...process.env, RUN_DB_TESTS: "true" } },
);
process.exitCode = result.status ?? 1;
