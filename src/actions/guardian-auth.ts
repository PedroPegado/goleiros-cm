"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { guardianPhone, hashGuardianCode } from "@/lib/guardian-credentials";
import {
  createGuardianSession,
  clearGuardianSession,
} from "@/lib/guardian-session";
import {
  allowPasswordAttempt,
  clearPasswordAttempts,
} from "@/lib/login-throttle";

export async function guardianLogin(input: FormData) {
  const invalid = {
    ok: false as const,
    error: "Telefone ou código de acesso inválidos.",
  };
  const rawPhone = input.get("phone"),
    rawCode = input.get("code");
  if (
    typeof rawPhone !== "string" ||
    rawPhone.length > 40 ||
    typeof rawCode !== "string" ||
    rawCode.length > 100
  )
    return invalid;
  const phone = guardianPhone(rawPhone),
    code = rawCode.trim();
  if (!phone) return invalid;
  try {
    const hash = hashGuardianCode(code);
    const allowed = await Promise.all([
      allowPasswordAttempt(`guardian-phone:${phone}`),
      allowPasswordAttempt(`guardian-code:${hash}`),
    ]);
    if (allowed.some((value) => !value) || !/^[A-Za-z0-9_-]{32}$/.test(code))
      return invalid;
    const student = await db.student.findUnique({
      where: { guardianAccessCodeHash: hash },
      select: {
        id: true,
        guardianPhone: true,
        guardianAccessEnabled: true,
        guardianAccessVersion: true,
      },
    });
    if (
      !student?.guardianAccessEnabled ||
      guardianPhone(student.guardianPhone) !== phone
    )
      return invalid;
    await createGuardianSession(student.id, student.guardianAccessVersion);
    await Promise.all([
      clearPasswordAttempts(`guardian-phone:${phone}`),
      clearPasswordAttempts(`guardian-code:${hash}`),
    ]);
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Não foi possível entrar agora. Tente novamente.",
    };
  }
}
export async function guardianLogout() {
  await clearGuardianSession();
  redirect("/responsavel/entrar");
}
