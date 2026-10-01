import "server-only";
import { createHmac } from "node:crypto";
import { db } from "./db";
// An atomic database counter works across Vercel instances, without paid Redis.
export async function allowPasswordAttempt(identifier: string) {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET não configurado.");
  await db.loginThrottle.deleteMany({ where: { resetAt: { lt: new Date() } } });
  const key = createHmac("sha256", process.env.AUTH_SECRET)
    .update(identifier)
    .digest("hex");
  const result = await db.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "LoginThrottle" ("key","attempts","resetAt")
    VALUES (${key},1,(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '15 minutes')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "LoginThrottle"."resetAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN 1 ELSE LEAST("LoginThrottle"."attempts"+1,11) END,
      "resetAt" = CASE WHEN "LoginThrottle"."resetAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '15 minutes' ELSE "LoginThrottle"."resetAt" END
    RETURNING "attempts"`;
  return result[0].attempts <= 10;
}
export async function clearPasswordAttempts(identifier: string) {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET não configurado.");
  const key = createHmac("sha256", process.env.AUTH_SECRET)
    .update(identifier)
    .digest("hex");
  await db.loginThrottle.deleteMany({ where: { key } });
}
