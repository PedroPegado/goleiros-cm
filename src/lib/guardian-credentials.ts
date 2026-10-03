import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { normalizeWhatsAppNumber } from "./rules";

export function guardianSecret(purpose: "session" | "code") {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Autenticação indisponível.");
  return createHmac("sha256", secret)
    .update(`guardian:${purpose}:v1`)
    .digest("hex");
}
// 192 bits of random entropy; HMAC is appropriate for a generated token (not a human password).
export function generateGuardianCode() {
  return randomBytes(24).toString("base64url");
}
export function hashGuardianCode(code: string) {
  return createHmac("sha256", guardianSecret("code"))
    .update(code)
    .digest("hex");
}
export function guardianPhone(value: string): string | null {
  try {
    return normalizeWhatsAppNumber(value);
  } catch {
    return null;
  }
}
