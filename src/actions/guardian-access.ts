"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import {
  generateGuardianCode,
  hashGuardianCode,
  guardianPhone,
} from "@/lib/guardian-credentials";

export async function generateGuardianAccess(studentId: string) {
  await requireUser();
  try {
    const student = await db.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { guardianPhone: true, guardianAccessVersion: true },
    });
    if (!guardianPhone(student.guardianPhone))
      return {
        ok: false as const,
        error:
          "Corrija o telefone do responsável no cadastro antes de gerar o acesso.",
      };
    const code = generateGuardianCode();
    const result = await db.student.updateMany({
      where: {
        id: studentId,
        guardianAccessVersion: student.guardianAccessVersion,
        guardianPhone: student.guardianPhone,
      },
      data: {
        guardianAccessCodeHash: hashGuardianCode(code),
        guardianAccessEnabled: true,
        guardianAccessVersion: { increment: 1 },
      },
    });
    if (!result.count)
      return {
        ok: false as const,
        error: "O cadastro foi alterado. Atualize a página e tente novamente.",
      };
    revalidatePath(`/alunos/${studentId}`);
    // The sole plaintext disclosure: returned once to the authenticated teacher who generated it.
    return { ok: true as const, code };
  } catch {
    return {
      ok: false as const,
      error: "Não foi possível gerar o acesso. Tente novamente.",
    };
  }
}
export async function disableGuardianAccess(studentId: string) {
  await requireUser();
  try {
    await db.student.update({
      where: { id: studentId },
      data: {
        guardianAccessEnabled: false,
        guardianAccessCodeHash: null,
        guardianAccessVersion: { increment: 1 },
      },
    });
    revalidatePath(`/alunos/${studentId}`);
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Não foi possível desativar o acesso.",
    };
  }
}
