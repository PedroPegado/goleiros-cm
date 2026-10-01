import EmbeddedPostgres from "embedded-postgres";
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const directory = ".local-postgres";
const password =
  process.env.LOCAL_DB_PASSWORD || randomBytes(18).toString("hex");
if (existsSync(`${directory}/PG_VERSION`) && !process.env.LOCAL_DB_PASSWORD) {
  console.error(
    "Banco existente. Informe LOCAL_DB_PASSWORD usando a senha do .env local.",
  );
  process.exit(1);
}
const pg = new EmbeddedPostgres({
  databaseDir: directory,
  user: "postgres",
  password,
  port: 55432,
  persistent: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(`${directory}/PG_VERSION`)) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("goleiros");
} catch {
  /* Already created on previous local run. */
}
if (!existsSync(".env"))
  writeFileSync(
    ".env",
    `DATABASE_URL="postgresql://postgres:${password}@127.0.0.1:55432/goleiros"\nDIRECT_URL="postgresql://postgres:${password}@127.0.0.1:55432/goleiros"\n`,
  );
console.log(
  "PostgreSQL local pronto em 127.0.0.1:55432. .env preservado quando já existente. Ctrl+C para parar.",
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
setInterval(() => {}, 60000);
