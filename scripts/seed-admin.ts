import { PrismaClient } from "@prisma/client";
import { seedAdmin } from "../prisma/admin";
const db = new PrismaClient();
seedAdmin(db)
  .catch(() => {
    console.error(
      "Não foi possível criar o administrador. Confira as variáveis ADMIN_EMAIL e ADMIN_PASSWORD e as migrations.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
