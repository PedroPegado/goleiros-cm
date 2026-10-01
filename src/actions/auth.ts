"use server";
import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import { changePasswordSchema } from "@/lib/auth-validation";
import { allowPasswordAttempt } from "@/lib/login-throttle";
export async function changePassword(input: unknown) {
  const sessionUser = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0].message };
  try {
    if (!(await allowPasswordAttempt(`change:${sessionUser.id}`)))
      return {
        ok: false as const,
        error: "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
      };
    const user = await db.user.findUnique({ where: { id: sessionUser.id } });
    if (
      !user ||
      !(await compare(parsed.data.currentPassword, user.passwordHash))
    )
      return {
        ok: false as const,
        error: "Não foi possível confirmar a senha atual.",
      };
    const passwordHash = await hash(parsed.data.newPassword, 12);
    const result = await db.user.updateMany({
      where: {
        id: user.id,
        sessionVersion: user.sessionVersion,
        passwordHash: user.passwordHash,
      },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    if (!result.count)
      return {
        ok: false as const,
        error: "A sessão mudou. Entre novamente e tente outra vez.",
      };
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Não foi possível alterar a senha. Tente novamente.",
    };
  }
}
