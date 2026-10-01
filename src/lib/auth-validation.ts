import { z } from "zod";
export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const passwordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    "Use no máximo 72 bytes na senha (acentos podem ocupar mais de um byte).",
  );
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1)
    .max(254)
    .transform((v) => v.toLowerCase())
    .refine((v) =>
      v.includes("@")
        ? emailSchema.safeParse(v).success
        : /^[a-z0-9._-]{3,64}$/.test(v),
    ),
  password: z
    .string()
    .min(1)
    .max(72)
    .refine((v) => new TextEncoder().encode(v).length <= 72),
});
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Informe a senha atual.")
      .max(72)
      .refine(
        (v) => new TextEncoder().encode(v).length <= 72,
        "Senha atual inválida.",
      ),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "As novas senhas não coincidem.",
    path: ["confirmPassword"],
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "Escolha uma senha diferente da atual.",
    path: ["newPassword"],
  });
