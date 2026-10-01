import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  [
    "--env-file=.env",
    "node_modules/vitest/vitest.mjs",
    "run",
    "tests/payments.integration.test.ts",
  ],
  { stdio: "inherit", env: { ...process.env, RUN_DB_TESTS: "true" } },
);
process.exitCode = result.status ?? 1;
