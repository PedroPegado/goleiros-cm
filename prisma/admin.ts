import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { emailSchema, passwordSchema } from "../src/lib/auth-validation";
export async function seedAdmin(db: PrismaClient) {
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL);
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD);
  if (!email.success || !password.success)
    throw new Error(
      "Configure ADMIN_EMAIL válido e ADMIN_PASSWORD com 8 caracteres e até 72 bytes.",
    );
  const passwordHash = await hash(password.data, 12);
  // A fixed seed identity keeps one administrator when ADMIN_EMAIL changes.
  await db.user.upsert({
    where: { id: "initial-administrator" },
    create: {
      id: "initial-administrator",
      email: email.data,
      name: "Professor",
      passwordHash,
    },
    update: {
      email: email.data,
      passwordHash,
      sessionVersion: { increment: 1 },
    },
  });
  console.log(
    "Administrador atualizado com hash bcrypt. Nenhuma senha foi exibida.",
  );
}
