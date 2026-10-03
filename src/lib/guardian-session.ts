import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encode, decode } from "next-auth/jwt";
import { db } from "./db";
import { guardianSecret } from "./guardian-credentials";

const lifetime = 7 * 24 * 60 * 60;
export const guardianCookieName =
  process.env.NODE_ENV === "production"
    ? "__Secure-guardian-session"
    : "guardian-session";
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/responsavel",
};

export async function createGuardianSession(
  studentId: string,
  version: number,
) {
  const token = await encode({
    secret: guardianSecret("session"),
    maxAge: lifetime,
    token: { sub: studentId, role: "guardian", version },
  });
  (await cookies()).set(guardianCookieName, token, {
    ...options,
    maxAge: lifetime,
  });
}
export async function readGuardianToken() {
  const token = (await cookies()).get(guardianCookieName)?.value;
  if (!token) return null;
  try {
    const decoded = await decode({ token, secret: guardianSecret("session") });
    return decoded?.role === "guardian" &&
      typeof decoded.sub === "string" &&
      Number.isInteger(decoded.version)
      ? decoded
      : null;
  } catch {
    return null;
  }
}
export const currentGuardian = cache(async () => {
  const token = await readGuardianToken();
  if (!token) return null;
  const student = await db.student.findUnique({
    where: { id: token.sub },
    select: {
      id: true,
      guardianAccessEnabled: true,
      guardianAccessVersion: true,
    },
  });
  return student?.guardianAccessEnabled &&
    student.guardianAccessVersion === token.version
    ? { studentId: student.id }
    : null;
});
export const requireGuardian = cache(async () => {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/responsavel/entrar");
  return guardian;
});
export async function clearGuardianSession() {
  const token = await readGuardianToken();
  if (token)
    await db.student.updateMany({
      where: { id: token.sub, guardianAccessVersion: token.version as number },
      data: { guardianAccessVersion: { increment: 1 } },
    });
  (await cookies()).set(guardianCookieName, "", { ...options, maxAge: 0 });
}
