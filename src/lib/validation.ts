import { z } from "zod";
import { civil, normalizeWhatsAppNumber, toDate, today } from "./rules";
export const civilSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine(
    (v) => !Number.isNaN(toDate(v).getTime()) && civil(toDate(v)) === v,
    "Data inválida.",
  );
const pastDate = civilSchema.refine(
  (v) => v <= today(),
  "A data não pode estar no futuro.",
);
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(min).max(max).optional(),
  );
export const studentSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(120),
  birthDate: pastDate.refine(
    (v) => v >= "1900-01-01",
    "Data de nascimento inválida.",
  ),
  guardianName: z.string().trim().min(3, "Informe o responsável.").max(120),
  guardianPhone: z.string().transform((v, ctx) => {
    try {
      return normalizeWhatsAppNumber(v);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Telefone inválido. Inclua o DDD.",
      });
      return z.NEVER;
    }
  }),
  dueDay: z.coerce.number().int().min(1).max(31),
  monthlyFee: z.coerce.number().min(0).max(999999.99),
  joinedAt: pastDate,
  notes: z.string().max(5000).default(""),
  photo: z
    .string()
    .max(350000)
    .refine(
      (v) =>
        v === "" ||
        /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
      "Foto inválida.",
    )
    .default(""),
  height: optionalNumber(30, 250),
  weight: optionalNumber(1, 300),
});
export const evaluationSchema = z.object({
  studentId: z.string().min(1),
  date: pastDate,
  notes: z.string().max(5000),
  scores: z
    .array(
      z.object({
        criterionId: z.string().min(1),
        value: z.number().min(0).max(10),
      }),
    )
    .min(1, "Avalie ao menos um critério.")
    .max(100)
    .refine(
      (s) => new Set(s.map((x) => x.criterionId)).size === s.length,
      "Critérios duplicados.",
    ),
});
export const paymentSchema = z.object({
  studentId: z.string().min(1),
  referenceMonth: z.coerce.number().int().min(1).max(12),
  referenceYear: z.coerce.number().int().min(2000).max(2100),
  amount: z.coerce.number().min(0).max(999999.99),
  paidAt: pastDate,
  paymentMethod: z.enum([
    "PIX",
    "DINHEIRO",
    "TRANSFERENCIA",
    "CARTAO",
    "OUTRO",
    "",
  ]),
  notes: z.string().max(5000),
});
export const measurementSchema = z
  .object({
    studentId: z.string().min(1),
    date: pastDate,
    height: optionalNumber(30, 250),
    weight: optionalNumber(1, 300),
  })
  .refine(
    (v) => v.height !== undefined || v.weight !== undefined,
    "Informe altura ou peso.",
  );
